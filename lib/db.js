// File: lib/db.js
import mongoose from 'mongoose';

let isConnected = false;

export async function getDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri || typeof uri !== 'string') {
    throw new Error("MONGODB_URI is not defined in environment variables");
  }

  if (isConnected) {
    return mongoose.connection;
  }

  try {
    await mongoose.connect(uri, {
      dbName: process.env.MONGODB_DB || 'email-campaigns',
    });

    isConnected = true;
    console.log('[MONGO] Connected to database');
    console.log('[MONGO] Database name:', mongoose.connection.db.databaseName);
    console.log(uri);
    return mongoose.connection;
  } catch (error) {
    console.error('[MONGO] Connection error:', error.message);
    throw error;
  }
}
