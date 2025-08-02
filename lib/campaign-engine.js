// File: lib/campaign-engine.js
import Campaign from '../models/Campaign.js';
import { campaignQueue } from './queues/campaign.queue.js';

export const campaignEngine = {
  /**
   * Queue campaigns scheduled at or before now
   */
  async processScheduledTasks() {
    const now = new Date();

    const campaigns = await Campaign.find({
      status: 'scheduled',
      scheduledAt: { $lte: now },
    });

    if (!campaigns.length) {
      console.log(`[${now.toISOString()}] ℹ️ No campaigns to schedule right now.`);
      return;
    }

    for (const campaign of campaigns) {
      console.log(`[ENGINE] Queuing campaign ${campaign._id} for user ${campaign.userId}`);

      const jobData = {
        campaignId: campaign._id.toString(),
        userId: campaign.userId?.toString(),
        userData: campaign.userData || {},
      };

      await campaignQueue.add('sendCampaign', jobData, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
        removeOnFail: false,
      });

      try {
        campaign.status = 'queued';
        await campaign.save();
      } catch (err) {
        console.warn(`[ENGINE] ⚠️ Failed to update status for campaign ${campaign._id}:`, err.message);
      }
    }

    console.log(`[ENGINE] ✅ Queued ${campaigns.length} campaigns.`);
  },

  /**
   * Run a campaign from the queue
   */
  async startCampaign(campaignId, userId, userData) {
    console.log(`[ENGINE] 🚀 Starting campaign ${campaignId} for user ${userId}`);

    // Your actual sending logic can go here (e.g., nodemailer, sendgrid, etc.)

    await Campaign.findByIdAndUpdate(campaignId, { status: 'completed' });

    console.log(`[ENGINE] ✅ Campaign ${campaignId} completed.`);
  },
};
