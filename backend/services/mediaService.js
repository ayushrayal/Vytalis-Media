import MetaService from './metaService.js';
import CacheService from './cacheService.js';
import { videoFields, creativeFields } from '../config/metaFields.js';

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
   * Resolve highest-resolution thumbnail for a Meta Video ID
   */
  static async getVideoThumbnail(videoId, user) {
    if (!videoId) return null;

    const cacheKey = `video_thumb::${videoId}`;
    const cached = CacheService.get(cacheKey);
    if (cached && !this.isUrlExpired(cached)) {
      return cached;
    }
    if (cached) {
      CacheService.delete(cacheKey);
    }

    try {
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
        CacheService.set(cacheKey, result, 86400); // 24 hours TTL
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
  static async enrichCreativeAssets(creatives, user) {
    const enriched = await Promise.all(creatives.map(async (creative) => {
      let currentCreative = { ...creative };
      let initialMedia = currentCreative.image_url || currentCreative.thumbnail_url || null;

      // Auto-refresh expired URLs or fetch missing ones
      if (!initialMedia || this.isUrlExpired(initialMedia)) {
        try {
          const fresh = await MetaService.get(creative.id, user, {
            fields: creativeFields.join(',')
          }, { resourceType: 'creative' });
          if (fresh) {
            currentCreative = { ...currentCreative, ...fresh };
          }
        } catch (err) {
          console.warn(`[MediaService] Failed to refetch creative details for ${creative.id}:`, err.message);
        }
      }

      const spec = currentCreative.object_story_spec;
      const assetFeed = currentCreative.asset_feed_spec;
      const isVideo = !!currentCreative.video_id;

      // 1. Image selection priority
      let mediaUrl = null;

      // Layer 1: image_url
      if (currentCreative.image_url && !this.isUrlExpired(currentCreative.image_url)) {
        mediaUrl = currentCreative.image_url;
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
      if (!mediaUrl && isVideo && currentCreative.video_id) {
        const videoThumb = await this.getVideoThumbnail(currentCreative.video_id, user);
        if (videoThumb && !this.isUrlExpired(videoThumb)) {
          mediaUrl = videoThumb;
        }
      }
      // Layer 7: thumbnail_url
      if (!mediaUrl && currentCreative.thumbnail_url && !this.isUrlExpired(currentCreative.thumbnail_url)) {
        mediaUrl = currentCreative.thumbnail_url;
      }
      // Layer 8: Fallback placeholder
      if (!mediaUrl) {
        mediaUrl = 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=500&q=80';
      }

      // 2. Product Name priority-based extraction
      let productName = '';
      if (currentCreative.product_set_id) {
        productName = `Catalog Set (${currentCreative.product_set_id})`;
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

      let copyText = currentCreative.body || '';
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
        let temp = currentCreative.name || '';
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

      const createdDate = currentCreative.created_time || new Date().toISOString();

      return {
        id: currentCreative.id,
        name: currentCreative.name,
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
        video_id: currentCreative.video_id
      };
    }));

    return enriched;
  }
}

export default MediaService;
