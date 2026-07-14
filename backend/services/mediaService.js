import MetaService from './metaService.js';
import CacheService from './cacheService.js';

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
        fields: 'picture,thumbnails{id,uri,width,height}'
      });

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
      let mediaUrl = currentCreative.image_url || currentCreative.thumbnail_url || null;

      // Auto-refresh expired URLs or fetch missing ones
      if (!mediaUrl || this.isUrlExpired(mediaUrl)) {
        try {
          const fresh = await MetaService.get(creative.id, user, {
            fields: 'image_url,thumbnail_url,video_id,body,object_story_spec'
          });
          if (fresh) {
            currentCreative = { ...currentCreative, ...fresh };
            mediaUrl = fresh.image_url || fresh.thumbnail_url || null;
          }
        } catch (err) {
          console.warn(`[MediaService] Failed to refetch creative details for ${creative.id}:`, err.message);
        }
      }

      // Check carousel_spec child attachments if mediaUrl is still missing
      const spec = currentCreative.object_story_spec;
      if (!mediaUrl && spec) {
        const childAttachments = spec.link_data?.child_attachments || spec.carousel_spec?.child_attachments;
        if (Array.isArray(childAttachments) && childAttachments.length > 0) {
          const firstPic = childAttachments.find(att => att.picture)?.picture;
          if (firstPic) {
            mediaUrl = firstPic;
          }
        }
      }

      let isVideo = !!currentCreative.video_id;

      // Resolve video thumbnail if video and mediaUrl is missing or expired
      if (isVideo && currentCreative.video_id && (!mediaUrl || this.isUrlExpired(mediaUrl))) {
        const videoThumb = await this.getVideoThumbnail(currentCreative.video_id, user);
        if (videoThumb) {
          mediaUrl = videoThumb;
        }
      }

      // Extract body text copy from body field or fallback to object_story_spec if available
      let copyText = currentCreative.body || '';
      if (spec && !copyText) {
        copyText = spec.link_data?.message || 
                   spec.video_data?.message || 
                   spec.photo_data?.message || 
                   spec.template_data?.message || 
                   '';
      }

      return {
        id: currentCreative.id,
        name: currentCreative.name,
        isVideo,
        mediaUrl,
        imageUrl: mediaUrl, // Map to imageUrl for frontend consistency
        thumbnailUrl: mediaUrl, // Map to thumbnailUrl for frontend consistency
        copyText,
        video_id: currentCreative.video_id
      };
    }));

    return enriched;
  }
}

export default MediaService;
