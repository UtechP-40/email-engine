import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { campaignEngine } from '../campaign-engine.js';
import { getDatabase } from '../db.js';

const connection = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null, // Required by BullMQ
});

await getDatabase();

new Worker('campaignQueue', async job => {
  console.log(`[WORKER] Processing job ${job.id}`);
  const { campaignId, userId, userData } = job.data;

  await campaignEngine.startCampaign(campaignId, userId, userData);
}, {
  connection,
  concurrency: 5,
});
