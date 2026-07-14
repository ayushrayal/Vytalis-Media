import dns from 'dns';
dns.setServers(['8.8.8.8', '8.8.4.4']);


import 'dotenv/config';
import app from './app.js';
import connectDB from './utils/db.js';

// Validate crucial environment variables at startup
const requiredEnvs = ['MONGODB_URL', 'JWT_SECRET', 'OPENAI_API_KEY', 'SIGNUP_ACCESS_CODE', 'TOKEN_ENCRYPTION_KEY'];
const missingEnvs = requiredEnvs.filter(env => !process.env[env]);

if (missingEnvs.length > 0) {
  console.error(`[SERVER] Startup Error: Missing required environment variables: ${missingEnvs.join(', ')}`);
  process.exit(1);
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
