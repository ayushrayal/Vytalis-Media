export default {
  dashboard: 120,
  // Meta API responses are shared by multiple dashboard widgets and reports.
  // Keep this short so the UI stays responsive without making live data stale.
  metaApi: 120,
  metaApiDaily: 60,
  campaigns: 300,
  campaignDetails: 300,
  breakdowns: 300,
  creatives: 1800,
  images: 86400,
  thumbnails: 86400
};
