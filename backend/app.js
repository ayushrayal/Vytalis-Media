import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import ErrorService from './services/errorService.js';

// Import routers (will be created in upcoming steps)
import authRouter from './routes/auth.js';
import dashboardRouter from './routes/dashboard.js';
import campaignRouter from './routes/campaigns.js';
import creativeRouter from './routes/creative.js';
import aiRouter from './routes/ai.js';

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

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check route
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/campaigns', campaignRouter);
app.use('/api/creatives', creativeRouter);
app.use('/api/analysis', aiRouter);

// Centralized Error Handling Middleware
app.use(ErrorService.handleExpressError);

export default app;
