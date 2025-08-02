// lib/scheduler.js
import { campaignEngine } from './campaign-engine.js';
import { getDatabase } from './db.js';
import { ObjectId } from 'mongodb';

export class Scheduler {
  constructor() {
    this.db = null;
    this.isRunning = false;
    this.intervalId = null;
    this.processingInterval = 30000; // 30 seconds
  }

  async init() {
    if (!this.db) {
      this.db = await getDatabase();
    }
  }

  async start() {
    if (this.isRunning) {
      console.log('[SCHEDULER] Already running');
      return;
    }

    await this.init();
    this.isRunning = true;

    console.log('[SCHEDULER] 🚀 Starting scheduler...');

    // Process any missed tasks on startup
    await this.processMissedTasks();

    // Set up regular processing
    this.intervalId = setInterval(async () => {
      try {
        await this.processScheduledTasks();
        await this.processDelayedTasks();
      } catch (error) {
        console.error('[SCHEDULER] ❌ Error during scheduled processing:', error);
      }
    }, this.processingInterval);

    console.log(`[SCHEDULER] ✅ Scheduler started with ${this.processingInterval}ms interval`);
  }

  async stop() {
    if (!this.isRunning) {
      console.log('[SCHEDULER] Not running');
      return;
    }

    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    console.log('[SCHEDULER] 🛑 Scheduler stopped');
  }

  async processMissedTasks() {
    console.log('[SCHEDULER] 🔍 Processing missed tasks...');

    try {
      // Process missed scheduled campaigns
      await campaignEngine.processScheduledTasks();

      // Process missed delayed tasks
      await this.processDelayedTasks();

      console.log('[SCHEDULER] ✅ Missed tasks processed');
    } catch (error) {
      console.error('[SCHEDULER] ❌ Error processing missed tasks:', error);
    }
  }

  async processScheduledTasks() {
    try {
      await campaignEngine.processScheduledTasks();
    } catch (error) {
      console.error('[SCHEDULER] ❌ Error processing scheduled campaigns:', error);
    }
  }

  async processDelayedTasks() {
    if (!this.db) await this.init();

    try {
      const now = new Date();

      const delayedTasks = await this.db.collection('scheduled_tasks').find({
        executeAt: { $lte: now }
      }).toArray();

      if (!delayedTasks.length) {
        return;
      }

      console.log(`[SCHEDULER] 📋 Processing ${delayedTasks.length} delayed tasks`);

      for (const task of delayedTasks) {
        try {
          console.log(`[SCHEDULER] ⏰ Processing delayed task for campaign run ${task.campaignRunId}`);

          // Process the next node in the campaign
          await campaignEngine.processNode(task.campaignRunId, task.nodeId, task.schema);

          // Remove the completed task
          await this.db.collection('scheduled_tasks').deleteOne({ _id: task._id });

          console.log(`[SCHEDULER] ✅ Delayed task completed for campaign run ${task.campaignRunId}`);

        } catch (error) {
          console.error(`[SCHEDULER] ❌ Error processing delayed task ${task._id}:`, error);

          // Mark task as failed but don't delete it immediately
          await this.db.collection('scheduled_tasks').updateOne(
            { _id: task._id },
            {
              $set: {
                failed: true,
                error: error.message,
                failedAt: new Date(),
                retryCount: (task.retryCount || 0) + 1
              }
            }
          );

          // Retry logic: retry up to 3 times with exponential backoff
          const maxRetries = 3;
          const retryCount = (task.retryCount || 0) + 1;

          if (retryCount <= maxRetries) {
            const retryDelay = Math.pow(2, retryCount) * 60000; // 2^n minutes
            const retryAt = new Date(Date.now() + retryDelay);

            await this.db.collection('scheduled_tasks').updateOne(
              { _id: task._id },
              {
                $set: {
                  executeAt: retryAt,
                  failed: false,
                  retryScheduledAt: new Date()
                }
              }
            );

            console.log(`[SCHEDULER] 🔄 Task ${task._id} scheduled for retry ${retryCount}/${maxRetries} at ${retryAt.toISOString()}`);
          } else {
            console.error(`[SCHEDULER] 💀 Task ${task._id} failed permanently after ${maxRetries} retries`);

            // Move to failed_tasks collection for analysis
            await this.db.collection('failed_tasks').insertOne({
              ...task,
              finalError: error.message,
              finalFailedAt: new Date(),
              totalRetries: retryCount
            });

            // Remove from scheduled_tasks
            await this.db.collection('scheduled_tasks').deleteOne({ _id: task._id });
          }
        }
      }

    } catch (error) {
      console.error('[SCHEDULER] ❌ Error processing delayed tasks:', error);
    }
  }

  async getSchedulerStatus() {
    if (!this.db) await this.init();

    try {
      const [scheduledCampaigns, delayedTasks, failedTasks] = await Promise.all([
        this.db.collection('campaigns').countDocuments({ status: 'scheduled' }),
        this.db.collection('scheduled_tasks').countDocuments(),
        this.db.collection('failed_tasks').countDocuments()
      ]);

      return {
        isRunning: this.isRunning,
        processingInterval: this.processingInterval,
        scheduledCampaigns,
        delayedTasks,
        failedTasks,
        lastCheck: new Date()
      };
    } catch (error) {
      console.error('[SCHEDULER] ❌ Error getting scheduler status:', error);
      return {
        isRunning: this.isRunning,
        error: error.message
      };
    }
  }

  async cleanupOldTasks(daysOld = 30) {
    if (!this.db) await this.init();

    try {
      const cutoffDate = new Date(Date.now() - (daysOld * 24 * 60 * 60 * 1000));

      const [deletedFailed, deletedCompleted] = await Promise.all([
        this.db.collection('failed_tasks').deleteMany({
          finalFailedAt: { $lt: cutoffDate }
        }),
        this.db.collection('campaign_runs').deleteMany({
          status: 'completed',
          completedAt: { $lt: cutoffDate }
        })
      ]);

      console.log(`[SCHEDULER] 🧹 Cleanup completed: ${deletedFailed.deletedCount} failed tasks, ${deletedCompleted.deletedCount} completed runs`);

      return {
        deletedFailedTasks: deletedFailed.deletedCount,
        deletedCompletedRuns: deletedCompleted.deletedCount
      };
    } catch (error) {
      console.error('[SCHEDULER] ❌ Error during cleanup:', error);
      throw error;
    }
  }
}

// Create singleton instance
export const scheduler = new Scheduler();