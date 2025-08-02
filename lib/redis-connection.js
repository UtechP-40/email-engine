// lib/redis-connection.js
import IORedis from 'ioredis';

let redisConnection = null;

export function createRedisConnection() {
  if (redisConnection) {
    return redisConnection;
  }

  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  console.log('🔍 Redis URL being used:', redisUrl.substring(0, 20) + '...');
  
  try {
    redisConnection = new IORedis(redisUrl, {
      maxRetriesPerRequest: 3, // Required by BullMQ, but not null
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      lazyConnect: true,
      connectTimeout: 10000,
      commandTimeout: 5000,
      reconnectOnError: (err) => {
        console.log('Redis reconnecting due to error:', err.message);
        return err.message.includes('READONLY') || err.message.includes('ECONNRESET');
      },
    });

    redisConnection.on('connect', () => {
      console.log('✅ Redis connected successfully');
    });

    redisConnection.on('error', (err) => {
      console.error('❌ Redis connection error:', err.message);
    });

    redisConnection.on('close', () => {
      console.log('🔌 Redis connection closed');
    });

    redisConnection.on('reconnecting', () => {
      console.log('🔄 Redis reconnecting...');
    });

    return redisConnection;
  } catch (error) {
    console.error('Failed to create Redis connection:', error);
    throw error;
  }
}

export function getRedisConnection() {
  if (!redisConnection) {
    return createRedisConnection();
  }
  return redisConnection;
}

export async function closeRedisConnection() {
  if (redisConnection) {
    await redisConnection.quit();
    redisConnection = null;
    console.log('Redis connection closed');
  }
}