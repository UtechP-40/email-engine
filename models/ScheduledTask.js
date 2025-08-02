import mongoose from 'mongoose';

const ScheduledTaskSchema = new mongoose.Schema({
  campaignRunId: { type: mongoose.Types.ObjectId, required: true },
  nodeId: { type: String, required: true },
  schema: { type: Object, required: true },
  executeAt: { type: Date, required: true },
});

export const ScheduledTask = mongoose.models.ScheduledTask || mongoose.model('ScheduledTask', ScheduledTaskSchema);
