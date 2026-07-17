import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import path from 'path';
import { fileURLToPath } from 'url';

import ErrorService from './services/errorService.js';
import requestTracer from './middlewares/requestTracer.js';
import perfMonitoring from './middlewares/perfMonitoring.js';

// Routers
import authRouter from './routes/auth.js';
import dashboardRouter from './routes/dashboard.js';
import campaignRouter from './routes/campaigns.js';
import adsetRouter from './routes/adsets.js';
import creativeRouter from './routes/creative.js';
import aiRouter from './routes/ai.js';
import userRouter from './routes/user.js';
import shopifyRouter from './routes/shopify.js';
import debugRouter from './routes/debug.js';

const app = express();

// Required for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Compression
app.use(compression());

// Security
app.use(
  cors({
    origin: [
      'http://' + 'localhost' + ':5173',
      'https://vytalis-media.onrender.com',
      process.env.FRONTEND_URL,
    ].filter(Boolean),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(helmet());
app.use(morgan('dev'));

// Serve React Build
app.use(express.static(path.join(__dirname, 'public')));

// Middlewares
app.use(requestTracer);
app.use(perfMonitoring);

app.use((req, res, next) => {
  const originalJson = res.json;

  res.json = function (body) {
    if (body && typeof body === 'object' && !Array.isArray(body)) {
      body.meta = body.meta || {};
      body.meta.requestId = req.requestId;
    }

    return originalJson.call(this, body);
  };

  next();
});

// Body Parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Route
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    version: process.env.APP_VERSION || '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/shopify', shopifyRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/campaigns', campaignRouter);
app.use('/api/adsets', adsetRouter);
app.use('/api/creatives', creativeRouter);
app.use('/api/analysis', aiRouter);

if (process.env.NODE_ENV !== 'production') {
  app.use('/api/debug', debugRouter);
}

// IMPORTANT: Keep this AFTER all API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error Handler
app.use(ErrorService.handleExpressError);

export default app;
