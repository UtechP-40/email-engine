import Queue from 'bull';
import { processCampaign } from '../../lib/campaign-engine.js'; // adjust if needed

// Connect to Redis — adjust the URL or options if needed
const campaignQueue = new Queue('campaign-queue', {
  redis: { host: '127.0.0.1', port: 6379 }
});

// Define the processor logic
campaignQueue.process(async (job) => {
  const { campaignId } = job.data;
  await processCampaign(campaignId);
});

export default campaignQueue;
