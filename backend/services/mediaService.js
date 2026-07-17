import MetaService from './metaService.js';
import CacheService from './cacheService.js';
import { videoFields, creativeFields } from '../config/metaFields.js';
import { PerfTracker } from '../utils/perfTracker.js';

class MediaService {
  /**
   * Check if a Meta CDN URL is expired or near expiration (by parsing the hex 'oe' parameter)
   */
  static isUrlExpired(url) {
    if (!url) return true;
    try {
      const urlObj = new URL(url);
      const oe = urlObj.searchParams.get('oe');
      if (!oe) return false; // If no 'oe' param, assume it does not expire
      const expireTimestamp = parseInt(oe, 16);
      const currentTimestamp = Math.floor(Date.now() / 1000);
      // If it expires in less than 2 hours (7200 seconds), treat it as expired so we refresh it
      return (expireTimestamp - currentTimestamp) < 7200;
    } catch (e) {
      return false;
    }
  }

  /**
   * Batch get creative details from Meta Graph API using node batching (ids=id1,id2...)
   * Refinement 2: Batch size 25
   */
  static async batchGetCreatives(creativeIds, user) {
    if (creativeIds.length === 0) return {};
    const results = {};
    const batchSize = 25;
    for (let i = 0; i < creativeIds.length; i += batchSize) {
      const chunk = creativeIds.slice(i, i + batchSize);
      try {
        const response = await MetaService.get('', user, {
          ids: chunk.join(','),
          fields: creativeFields.join(',')
        }, { resourceType: 'creative' });
        
        if (response) {
          Object.assign(results, response);
        }
      } catch (err) {
        console.warn(`[MediaService] Batch fetch failed for creative chunk:`, err.message);
      }
    }
    return results;
  }

  /**
   * Batch get video thumbnails from Meta Graph API using node batching (ids=id1,id2...)
   * Refinement 2: Batch size 25
   */
  static async batchGetVideoThumbnails(videoIds, user) {
    if (videoIds.length === 0) return {};
    const results = {};
    const batchSize = 25;
    for (let i = 0; i < videoIds.length; i += batchSize) {
      const chunk = videoIds.slice(i, i + batchSize);
      try {
        const response = await MetaService.get('', user, {
          ids: chunk.join(','),
          fields: videoFields.join(',')
        }, { resourceType: 'video' });
        
        if (response) {
          Object.assign(results, response);
        }
      } catch (err) {
        console.warn(`[MediaService] Batch fetch failed for video chunk:`, err.message);
      }
    }
    return results;
  }

  /**
   * Resolve highest-resolution thumbnail for a Meta Video ID
   */
  static async getVideoThumbnail(videoId, user, tracker = null) {
    if (!videoId) return null;

    const cacheKey = `video_thumb::${videoId}`;
    const cached = CacheService.get(cacheKey);
    if (cached && !this.isUrlExpired(cached)) {
      if (tracker) tracker.cacheHits++;
      return cached;
    }
    if (tracker) tracker.cacheMisses++;
    if (cached) {
      CacheService.delete(cacheKey);
    }

    try {
      if (tracker) tracker.videoThumbsFetched++;
      if (process.env.NODE_ENV !== 'production') {
        PerfTracker.increment('videosFetched');
      }
      const response = await MetaService.get(videoId, user, {
        fields: videoFields.join(',')
      }, { resourceType: 'video' });

      const thumbnails = response.thumbnails?.data || [];
      let result = response.picture || null;
      if (thumbnails.length > 0) {
        // Find the thumbnail with the largest pixel area (width * height)
        const largest = thumbnails.reduce((max, curr) => {
          const maxArea = (max.width || 0) * (max.height || 0);
          const currArea = (curr.width || 0) * (curr.height || 0);
          return currArea > maxArea ? curr : max;
        }, thumbnails[0]);

        result = largest.uri || response.picture || null;
      }

      if (result) {
        CacheService.set(cacheKey, result, 86400); // 24 hours TTL (Refinement 3)
      }
      return result;
    } catch (error) {
      console.warn(`[MediaService] Failed to fetch thumbnail for video ${videoId}:`, error.message);
      return null;
    }
  }

  /**
   * Fetch high-res image and details for a list of creatives
   * We enrich each creative with its optimal high-res asset URL
   */
  static async enrichCreativeAssets(creatives, user, forceEnrich = false) {
    const startEnrichment = Date.now();
    if (process.env.NODE_ENV !== 'production') {
      CacheService.safeTime("Enrichment");
    }

    const tracker = {
      imagesFetched: 0,
      videoThumbsFetched: 0,
      cacheHits: 0,
      cacheMisses: 0
    };

    // 1. Check cache for individual enriched creatives first
    const enrichedMap = new Map();
    const creativesToEnrich = [];

    for (const creative of creatives) {
      const cacheKey = `creative_enriched::${creative.id}`;
      const cached = CacheService.get(cacheKey);
      if (cached) {
        tracker.cacheHits++;
        enrichedMap.set(creative.id, cached);
      } else {
        tracker.cacheMisses++;
        
        // Only fetch from API if forceEnrich is enabled
        if (forceEnrich) {
          const initialMedia = creative.image_url || creative.thumbnail_url || null;
          if (!initialMedia || this.isUrlExpired(initialMedia) || !creative.object_story_spec) {
            creativesToEnrich.push(creative);
          }
        }
      }
    }

    // 2. Batch fetch creative details from Meta API (size 25)
    let freshDetails = {};
    if (creativesToEnrich.length > 0) {
      tracker.imagesFetched += creativesToEnrich.length;
      if (process.env.NODE_ENV !== 'production') {
        PerfTracker.increment('imagesFetched', creativesToEnrich.length);
      }
      freshDetails = await this.batchGetCreatives(creativesToEnrich.map(c => c.id), user);
    }

    // 3. Combine raw info and fresh details
    const intermediateCreatives = creatives.map(creative => {
      if (enrichedMap.has(creative.id)) {
        return enrichedMap.get(creative.id);
      }

      let currentCreative = { ...creative };
      const fresh = freshDetails[creative.id];
      if (fresh) {
        currentCreative = { ...currentCreative, ...fresh };
      }
      return currentCreative;
    });

    // 4. Identify video IDs that need thumbnails and are not cached
    const videosToFetch = [];
    const videoThumbMap = new Map();

    for (const creative of intermediateCreatives) {
      if (enrichedMap.has(creative.id)) continue;

      const isVideo = !!creative.video_id;
      let mediaUrl = null;

      // Layer 1-5 selection (without video thumbnail)
      if (creative.image_url && !this.isUrlExpired(creative.image_url)) {
        mediaUrl = creative.image_url;
      }
      if (!mediaUrl && creative.object_story_spec?.photo_data?.url && !this.isUrlExpired(creative.object_story_spec.photo_data.url)) {
        mediaUrl = creative.object_story_spec.photo_data.url;
      }
      if (!mediaUrl && creative.asset_feed_spec?.images && Array.isArray(creative.asset_feed_spec.images) && creative.asset_feed_spec.images.length > 0) {
        const assetImage = creative.asset_feed_spec.images.find(img => img.url && !this.isUrlExpired(img.url));
        if (assetImage) mediaUrl = assetImage.url;
      }
      if (!mediaUrl && creative.object_story_spec?.link_data?.picture && !this.isUrlExpired(creative.object_story_spec.link_data.picture)) {
        mediaUrl = creative.object_story_spec.link_data.picture;
      }
      if (!mediaUrl && creative.object_story_spec) {
        const spec = creative.object_story_spec;
        const childAttachments = spec.link_data?.child_attachments || spec.carousel_spec?.child_attachments;
        if (Array.isArray(childAttachments) && childAttachments.length > 0) {
          const firstPic = childAttachments.find(att => att.picture && !this.isUrlExpired(att.picture))?.picture;
          if (firstPic) mediaUrl = firstPic;
        }
      }

      // If we don't have mediaUrl yet, and it is a video, check video thumbnail cache
      if (!mediaUrl && isVideo && creative.video_id) {
        const thumbCacheKey = `video_thumb::${creative.video_id}`;
        const cachedThumb = CacheService.get(thumbCacheKey);
        if (cachedThumb && !this.isUrlExpired(cachedThumb)) {
          tracker.cacheHits++;
          videoThumbMap.set(creative.video_id, cachedThumb);
        } else {
          tracker.cacheMisses++;
          if (cachedThumb) {
            CacheService.delete(thumbCacheKey);
          }
          if (forceEnrich) {
            videosToFetch.push(creative.video_id);
          }
        }
      }
    }

    // 5. Batch fetch video thumbnails (size 25)
    let freshVideoDetails = {};
    if (videosToFetch.length > 0) {
      tracker.videoThumbsFetched += videosToFetch.length;
      if (process.env.NODE_ENV !== 'production') {
        PerfTracker.increment('videosFetched', videosToFetch.length);
      }
      freshVideoDetails = await this.batchGetVideoThumbnails(videosToFetch, user);
    }

    // Process and cache the fresh video thumbnails
    Object.entries(freshVideoDetails).forEach(([videoId, details]) => {
      const thumbnails = details.thumbnails?.data || [];
      let result = details.picture || null;
      if (thumbnails.length > 0) {
        const largest = thumbnails.reduce((max, curr) => {
          const maxArea = (max.width || 0) * (max.height || 0);
          const currArea = (curr.width || 0) * (curr.height || 0);
          return currArea > maxArea ? curr : max;
        }, thumbnails[0]);
        result = largest.uri || details.picture || null;
      }
      if (result) {
        videoThumbMap.set(videoId, result);
        CacheService.set(`video_thumb::${videoId}`, result, 86400); // 24 hours TTL
      }
    });

    // 6. Map and return final enriched creative assets
    const enriched = intermediateCreatives.map(creative => {
      if (enrichedMap.has(creative.id)) {
        return enrichedMap.get(creative.id);
      }

      const spec = creative.object_story_spec;
      const assetFeed = creative.asset_feed_spec;
      const isVideo = !!creative.video_id;

      let mediaUrl = null;

      // Layer 1: image_url
      if (creative.image_url && !this.isUrlExpired(creative.image_url)) {
        mediaUrl = creative.image_url;
      }
      // Layer 2: photo_data.url
      if (!mediaUrl && spec?.photo_data?.url && !this.isUrlExpired(spec.photo_data.url)) {
        mediaUrl = spec.photo_data.url;
      }
      // Layer 3: asset_feed_spec.images
      if (!mediaUrl && assetFeed?.images && Array.isArray(assetFeed.images) && assetFeed.images.length > 0) {
        const assetImage = assetFeed.images.find(img => img.url && !this.isUrlExpired(img.url));
        if (assetImage) mediaUrl = assetImage.url;
      }
      // Layer 4: object_story_spec.link_data.picture
      if (!mediaUrl && spec?.link_data?.picture && !this.isUrlExpired(spec.link_data.picture)) {
        mediaUrl = spec.link_data.picture;
      }
      // Layer 5: Carousel child attachment picture
      if (!mediaUrl && spec) {
        const childAttachments = spec.link_data?.child_attachments || spec.carousel_spec?.child_attachments;
        if (Array.isArray(childAttachments) && childAttachments.length > 0) {
          const firstPic = childAttachments.find(att => att.picture && !this.isUrlExpired(att.picture))?.picture;
          if (firstPic) mediaUrl = firstPic;
        }
      }
      // Layer 6: Highest resolution video thumbnail
      if (!mediaUrl && isVideo && creative.video_id) {
        const videoThumb = videoThumbMap.get(creative.video_id);
        if (videoThumb && !this.isUrlExpired(videoThumb)) {
          mediaUrl = videoThumb;
        }
      }
      // Layer 7: thumbnail_url
      if (!mediaUrl && creative.thumbnail_url && !this.isUrlExpired(creative.thumbnail_url)) {
        mediaUrl = creative.thumbnail_url;
      }
      // Layer 8: Fallback placeholder
      if (!mediaUrl) {
        mediaUrl = 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=500&q=80';
      }

      // Cache resolved image URL for 24 hours (Refinement 3: Creative Images)
      if (mediaUrl && !isVideo) {
        const imageCacheKey = `creative_image::${creative.id}`;
        CacheService.set(imageCacheKey, mediaUrl, 86400); // 24 hours TTL
      }

      // 2. Product Name priority-based extraction
      let productName = '';
      if (creative.product_set_id) {
        productName = `Catalog Set (${creative.product_set_id})`;
      }

      const feedName = spec?.template_data?.multi_share_spec?.product_catalog_info?.product_set_name || 
                       spec?.template_data?.multi_share_spec?.product_catalog_info?.catalog_name;
      if (!productName && feedName) {
        productName = feedName;
      }

      // Extract headline and copyText
      const headline = spec?.link_data?.name || 
                       spec?.video_data?.call_to_action?.value?.title || 
                       spec?.photo_data?.caption || 
                       spec?.template_data?.multi_share_spec?.name || 
                       '';

      let copyText = creative.body || '';
      if (spec && !copyText) {
        copyText = spec.link_data?.message || 
                   spec.video_data?.message || 
                   spec.photo_data?.message || 
                   spec.template_data?.message || 
                   '';
      }

      if (!productName && headline) {
        const cleanHeadline = headline.trim();
        if (cleanHeadline && cleanHeadline.length < 40 && !cleanHeadline.includes('%') && !cleanHeadline.toLowerCase().includes('off')) {
          productName = cleanHeadline;
        }
      }

      if (!productName && copyText) {
        const lines = copyText.split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length > 0 && lines[0].length < 30 && !lines[0].toLowerCase().includes('http')) {
          productName = lines[0].replace(/[!#*]/g, '');
        }
      }

      if (!productName) {
        let temp = creative.name || '';
        temp = temp.replace(/_[0-9]+x[0-9]+/gi, '')
                   .replace(/_[0-9]{4,}/g, '')
                   .replace(/[-_](active|paused|draft|copy|winner|poor)/gi, '')
                   .replace(/[_-]/g, ' ')
                   .trim();
        productName = temp.replace(/\b\w/g, c => c.toUpperCase());
      }

      // Extract CTA
      let cta = '';
      if (spec) {
        cta = spec.link_data?.call_to_action?.type || 
              spec.video_data?.call_to_action?.type || 
              spec.template_data?.multi_share_spec?.call_to_action?.type || 
              '';
      }

      // Extract landing page
      let landingPage = '';
      if (spec) {
        landingPage = spec.link_data?.link || 
                      spec.video_data?.call_to_action?.value?.link || 
                      spec.photo_data?.link || 
                      spec.template_data?.multi_share_spec?.link || 
                      '';
      }

      const createdDate = creative.created_time || new Date().toISOString();

      const finalCreative = {
        id: creative.id,
        name: creative.name,
        isVideo,
        mediaUrl,
        imageUrl: mediaUrl,
        thumbnailUrl: mediaUrl,
        copyText,
        headline,
        cta,
        landingPage,
        productName,
        createdDate,
        lastUpdated: new Date().toISOString(),
        video_id: creative.video_id,
        object_story_spec: creative.object_story_spec,
        asset_feed_spec: creative.asset_feed_spec
      };

      // Cache enriched creative metadata (Refinement 3: 6 hours = 21600 seconds)
      CacheService.set(`creative_enriched::${creative.id}`, finalCreative, 21600);

      return finalCreative;
    });

    const duration = Date.now() - startEnrichment;
    if (process.env.NODE_ENV !== 'production') {
      CacheService.safeTimeEnd("Enrichment");
      console.log(`[Enrichment Summary]
  Creatives Enriched:    ${creatives.length}
  Images Fetched:        ${tracker.imagesFetched}
  Video Thumbs Fetched:  ${tracker.videoThumbsFetched}
  Cache Hits:            ${tracker.cacheHits}
  Cache Misses:          ${tracker.cacheMisses}`);
      
      PerfTracker.track('enrichmentTime', duration);
    }
    return enriched;
  }
}

export default MediaService;
