import mongoose from 'mongoose';

const EventSchema = new mongoose.Schema({
  userId: { type: mongoose.Types.ObjectId, required: true },
  campaignId: { type: mongoose.Types.ObjectId, required: true },
  type: { type: String, required: true },
  data: { type: Object },
  timestamp: { type: Date, default: Date.now },
});

export const Event = mongoose.models.Event || mongoose.model('Event', EventSchema);
