// lib/queues/campaign.queue.js
import { Queue } from 'bullmq';
import { getRedisConnection } from '../redis-connection.js';

const connection = getRedisConnection();

export const campaignQueue = new Queue('campaignQueue', { 
  connection,
  defaultJobOptions: {
    removeOnComplete: 10,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
});
