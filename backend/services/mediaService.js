import MetaService from './metaService.js';
import CacheService from './cacheService.js';

class MediaService {
  /**
   * Resolve highest-resolution thumbnail for a Meta Video ID
   */
  static async getVideoThumbnail(videoId, user) {
    if (!videoId) return null;

    // Check CacheService first (cache for 24h since video thumbnails don't change)
    const cacheKey = `video_thumb::${videoId}`;
    const cached = CacheService.get(cacheKey);
    if (cached) return cached;

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
      let mediaUrl = creative.image_url || creative.thumbnail_url || null;
      let isVideo = !!creative.video_id;

      // Only query getVideoThumbnail if mediaUrl is not already present
      if (isVideo && creative.video_id && !mediaUrl) {
        const videoThumb = await this.getVideoThumbnail(creative.video_id, user);
        if (videoThumb) {
          mediaUrl = videoThumb;
        }
      }

      // Extract body text copy from body field or fallback to object_story_spec if available
      let copyText = creative.body || '';
      const spec = creative.object_story_spec;
      if (spec && !copyText) {
        copyText = spec.link_data?.message || 
                   spec.video_data?.message || 
                   spec.photo_data?.message || 
                   spec.template_data?.message || 
                   '';
      }

      return {
        id: creative.id,
        name: creative.name,
        isVideo,
        mediaUrl,
        copyText,
        video_id: creative.video_id
      };
    }));

    return enriched;
  }
}

export default MediaService;
