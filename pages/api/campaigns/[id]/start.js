import { getDatabase } from '../../../../lib/db.js';
import { requireAuth } from '../../../../lib/auth.js';
import { campaignEngine } from '../../../../lib/campaign-engine.js';
import { Campaign } from '../../../../models/Campaign.js';
import { ObjectId } from 'mongodb';

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  const { userId, userData } = req.body;

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid campaign ID' });
  }

  if (!userId || !userData?.email) {
    return res.status(400).json({ error: 'User ID and email are required' });
  }

  try {
    await getDatabase();

    const campaign = await Campaign.findOne({
      _id: new ObjectId(id),
      userId: new ObjectId(req.user.userId),
    });

    if (!campaign || campaign.status !== 'active') {
      return res.status(400).json({ error: 'Campaign not found or inactive' });
    }

    const campaignRunId = await campaignEngine.startCampaign(id, userId, userData);

    res.json({
      success: true,
      campaignRunId,
    });
  } catch (error) {
    console.error('Start campaign error:', error);
    res.status(500).json({ error: error.message });
  }
}

export default requireAuth(handler);
