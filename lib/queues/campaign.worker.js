import { Worker } from 'bullmq';
import { getRedisConnection } from '../redis-connection.js';
import { campaignEngine } from '../campaign-engine.js';
import { getDatabase } from '../db.js';

const connection = getRedisConnection();

// Initialize database connection
await getDatabase();

const worker = new Worker('campaignQueue', async job => {
  console.log(`[WORKER] Processing job ${job.id} - Campaign: ${job.data.campaignId}`);
  
  try {
    const { campaignId, userId, userData } = job.data;
    
    if (!campaignId || !userId) {
      throw new Error('Missing required job data: campaignId or userId');
    }

    await campaignEngine.startCampaign(campaignId, userId, userData);
    
    console.log(`[WORKER] ✅ Successfully completed job ${job.id}`);
    return { success: true, campaignId, userId };
    
  } catch (error) {
    console.error(`[WORKER] ❌ Job ${job.id} failed:`, error.message);
    throw error; // Re-throw to trigger retry mechanism
  }
}, {
  connection,
  concurrency: 5,
  removeOnComplete: 10,
  removeOnFail: 50,
});

worker.on('completed', (job, result) => {
  console.log(`[WORKER] Job ${job.id} completed successfully:`, result);
});

worker.on('failed', (job, err) => {
  console.error(`[WORKER] Job ${job.id} failed after ${job.attemptsMade} attempts:`, err.message);
});

worker.on('error', (err) => {
  console.error('[WORKER] Worker error:', err);
});

export { worker };
