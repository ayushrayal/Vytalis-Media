import mongoose from 'mongoose';

export async function connectDB() {
  const mongodbUrl = process.env.MONGODB_URL;
  if (!mongodbUrl) {
    console.error('[Database] Error: MONGODB_URL is not defined in environment variables.');
    process.exit(1);
  }

  try {
    await mongoose.connect(mongodbUrl);
    console.log('[Database] MongoDB connected successfully.');
  } catch (error) {
    console.error('[Database] Connection failed:', error.message);
    process.exit(1);
  }
}

export default connectDB;
