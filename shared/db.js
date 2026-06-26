import mongoose from 'mongoose';

let connectionPromise = null;

export function connectDB(uri = process.env.MONGO_URI) {
  if (!uri) {
    throw new Error('MONGO_URI is not set');
  }
  if (!connectionPromise) {
    mongoose.set('strictQuery', true);
    connectionPromise = mongoose.connect(uri);
  }
  return connectionPromise;
}

export async function disconnectDB() {
  await mongoose.disconnect();
  connectionPromise = null;
}

export { mongoose };
