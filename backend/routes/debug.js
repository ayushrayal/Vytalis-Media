import express from 'express';
import User from '../models/User.js';
import CacheService from '../services/cacheService.js';
import metaApi from '../config/metaApi.js';
import DiagnosticsService from '../services/diagnosticsService.js';
import MetaService from '../services/metaService.js';

const router = express.Router();

// GET /api/debug/meta
router.get('/meta', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not Found' });
  }

  try {
    const firstUser = await User.findOne();
    const queueStatus = typeof MetaService.getQueueStatus === 'function' 
      ? MetaService.getQueueStatus() 
      : { running: 0, waiting: 0 };

    res.json({
      environment: process.env.NODE_ENV || 'development',
      graphApiVersion: metaApi.version,
      connectedAdAccount: firstUser ? {
        userId: firstUser._id.toString(),
        companyName: firstUser.companyName,
        metaAccountId: firstUser.metaAccountId,
        isActive: firstUser.isActive
      } : null,
      cacheStatistics: {
        hits: CacheService.hits || 0,
        misses: CacheService.misses || 0,
        totalKeys: CacheService.cache.size || 0
      },
      queueStatistics: queueStatus,
      requestMetrics: DiagnosticsService.getHistory(),
      lastMetaError: DiagnosticsService.getLastError()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
