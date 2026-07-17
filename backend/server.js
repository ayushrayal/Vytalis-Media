import dns from 'dns';
dns.setServers(['8.8.8.8', '8.8.4.4']);

import 'dotenv/config';
import app from './app.js';
import connectDB from './utils/db.js';

// Validate crucial environment variables at startup before Express / DB init
const requiredEnvs = ['JWT_SECRET', 'TOKEN_ENCRYPTION_KEY'];

// Check Mongo URL specifically
if (!process.env.MONGODB_URL && !process.env.MONGO_URI) {
  console.error('[SERVER] Startup Error: Missing required environment variable MONGODB_URL or MONGO_URI');
  process.exit(1);
}

const missingEnvs = requiredEnvs.filter(env => !process.env[env]);

if (missingEnvs.length > 0) {
  console.error(`[SERVER] Startup Error: Missing required environment variables: ${missingEnvs.join(', ')}`);
  process.exit(1);
}

// Default Shopify API version fallback if not provided
if (!process.env.SHOPIFY_API_VERSION) {
  process.env.SHOPIFY_API_VERSION = '2025-01';
}

// Check Shopify OAuth credentials
const oauthVars = ['SHOPIFY_CLIENT_ID', 'SHOPIFY_CLIENT_SECRET', 'SHOPIFY_REDIRECT_URI'];
const missingOAuth = oauthVars.filter(v => !process.env[v]);
if (missingOAuth.length > 0) {
  console.warn(`[SERVER] Warning: Shopify OAuth variables missing: ${missingOAuth.join(', ')}. Set them in environment settings to enable full Partner App OAuth.`);
}

const PORT = process.env.PORT || 5000;

// Connect to Database and start server
async function startServer() {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`[SERVER] Running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });
}

startServer();
