import { AsyncLocalStorage } from 'async_hooks';

export const perfStorage = new AsyncLocalStorage();

export class PerfTracker {
  static start() {
    return {
      start: Date.now(),
      auth: 0,
      cacheLookup: 0,
      cacheStatus: 'MISS',
      metaApi: 0,
      enrichment: 0,
      recommendations: 0,
      filtering: 0,
      serialization: 0,
      // New telemetry fields
      metaRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      imagesFetched: 0,
      videosFetched: 0
    };
  }

  static track(field, duration) {
    const store = perfStorage.getStore();
    if (store) {
      if (store[field] === undefined) {
        store[field] = 0;
      }
      store[field] += duration;
    }
  }

  static increment(field, count = 1) {
    const store = perfStorage.getStore();
    if (store) {
      if (store[field] === undefined) {
        store[field] = 0;
      }
      store[field] += count;
    }
  }

  static setCacheStatus(status) {
    const store = perfStorage.getStore();
    if (store) {
      store.cacheStatus = status;
    }
  }
}

