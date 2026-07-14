export const campaignFields = [
  'id',
  'name',
  'status',
  'objective',
  'daily_budget',
  'lifetime_budget',
  'budget_remaining',
  'buying_type',
  'start_time',
  'stop_time',
  'created_time',
  'updated_time'
];

export const adSetFields = [
  'id',
  'name',
  'status',
  'campaign_id',
  'created_time',
  'updated_time'
];

export const adFields = [
  'id',
  'name',
  'status',
  'campaign_id',
  'adset_id',
  'created_time',
  'campaign{id,name,objective}',
  'adset{id,name}',
  'creative{id,name,image_url,thumbnail_url,video_id,body,product_set_id}'
];

export const creativeFields = [
  'id',
  'name',
  'image_url',
  'thumbnail_url',
  'video_id',
  'body',
  'object_story_spec',
  'asset_feed_spec',
  'product_set_id'
];

export const imageFields = [
  'id',
  'name',
  'created_time'
];

export const videoFields = [
  'id',
  'name',
  'picture',
  'thumbnails{id,uri,width,height}'
];

// Helper to extract base field from potentially nested Graph API fields (e.g., campaign{id,name})
export function getBaseField(field) {
  if (!field) return '';
  return field.split('{')[0].trim();
}

// Allowed base field names for validation checks
export const allowedBases = {
  campaign: ['id', 'name', 'status', 'objective', 'daily_budget', 'lifetime_budget', 'budget_remaining', 'buying_type', 'start_time', 'stop_time', 'created_time', 'updated_time'],
  adset: ['id', 'name', 'status', 'campaign_id', 'created_time', 'updated_time'],
  ad: ['id', 'name', 'status', 'campaign_id', 'adset_id', 'campaign', 'adset', 'creative', 'created_time', 'updated_time'],
  creative: ['id', 'name', 'image_url', 'thumbnail_url', 'video_id', 'body', 'object_story_spec', 'asset_feed_spec', 'product_set_id'],
  image: ['id', 'name', 'created_time'],
  video: ['id', 'name', 'picture', 'thumbnails']
};

// Validation mapping helper
export const fieldMap = allowedBases;
