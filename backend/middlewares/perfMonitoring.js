import { perfStorage, PerfTracker } from '../utils/perfTracker.js';

const perfMonitoringMiddleware = (req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    return next();
  }

  const context = PerfTracker.start();

  perfStorage.run(context, () => {
    res.on('finish', () => {
      const store = perfStorage.getStore();
      if (!store) return;

      const duration = Date.now() - store.start;
      const path = req.originalUrl || req.url;

      console.log(`
==================================================
[Performance Summary - ${req.method} ${path}]
- Total Request Duration: ${duration} ms
- Cache Lookup Time:      ${store.cacheLookup || store.cacheTime || 0} ms
- Meta API Call Time:     ${store.metaApi || store.metaApiTime || 0} ms
- Enrichment Time:        ${store.enrichment || store.enrichmentTime || 0} ms
- Recommendations Time:   ${store.recommendations || store.recommendationsTime || 0} ms
- Cache Status:           ${store.cacheStatus || 'MISS'}
- Meta Requests Made:     ${store.metaRequests || 0}
- Cache Hits:             ${store.cacheHits || 0}
- Cache Misses:           ${store.cacheMisses || 0}
- Images Fetched:         ${store.imagesFetched || 0}
- Videos Fetched:         ${store.videosFetched || 0}
==================================================`);
    });

    next();
  });
};

export default perfMonitoringMiddleware;
