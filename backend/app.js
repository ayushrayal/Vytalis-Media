import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import ErrorService from './services/errorService.js';
import requestTracer from './middlewares/requestTracer.js';

// Import routers
import authRouter from './routes/auth.js';
import dashboardRouter from './routes/dashboard.js';
import campaignRouter from './routes/campaigns.js';
import creativeRouter from './routes/creative.js';
import aiRouter from './routes/ai.js';
import debugRouter from './routes/debug.js';

const app = express();

// Security Middlewares
app.use(helmet());
app.use(cors({
  origin: '*', // For development flexibility; restrict in production
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Request Logging
app.use(morgan('dev'));

// Request Tracer Middleware
app.use(requestTracer);

// Response Interceptor to inject requestId into JSON response meta
app.use((req, res, next) => {
  const originalJson = res.json;
  res.json = function (body) {
    if (body && typeof body === 'object' && !Array.isArray(body)) {
      if (!body.meta) {
        body.meta = {};
      }
      body.meta.requestId = req.requestId;
    }
    return originalJson.call(this, body);
  };
  next();
});

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check route
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    version: process.env.APP_VERSION || '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/api/auth', authRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/campaigns', campaignRouter);
app.use('/api/creatives', creativeRouter);
app.use('/api/analysis', aiRouter);

if (process.env.NODE_ENV !== 'production') {
  app.use('/api/debug', debugRouter);
}

// Centralized Error Handling Middleware
app.use(ErrorService.handleExpressError);

export default app;
