import mongoose from 'mongoose';

const CampaignRunSchema = new mongoose.Schema({
  campaignId: { type: mongoose.Types.ObjectId, required: true },
  userId: { type: mongoose.Types.ObjectId, required: true },
  userData: { type: Object, required: true },
  currentNodeId: { type: String },
  status: { type: String, enum: ['active', 'completed'], default: 'active' },
  startedAt: { type: Date, default: Date.now },
  lastProcessedAt: { type: Date },
  completedAt: { type: Date },
});

export const CampaignRun = mongoose.models.CampaignRun || mongoose.model('CampaignRun', CampaignRunSchema);
