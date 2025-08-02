// pages/api/scheduler/status.js
import { requireAuth } from '../../../lib/auth.js';
import { scheduler } from '../../../lib/scheduler.js';

async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const status = await scheduler.getSchedulerStatus();
      res.json({ success: true, status });
    } catch (error) {
      console.error('Get scheduler status error:', error);
      res.status(500).json({ error: 'Failed to get scheduler status' });
    }
  } else if (req.method === 'POST') {
    try {
      const { action } = req.body;

      switch (action) {
        case 'start':
          await scheduler.start();
          res.json({ success: true, message: 'Scheduler started' });
          break;
        case 'stop':
          await scheduler.stop();
          res.json({ success: true, message: 'Scheduler stopped' });
          break;
        case 'restart':
          await scheduler.stop();
          await scheduler.start();
          res.json({ success: true, message: 'Scheduler restarted' });
          break;
        case 'cleanup':
          const { daysOld = 30 } = req.body;
          const cleanupResult = await scheduler.cleanupOldTasks(daysOld);
          res.json({ success: true, message: 'Cleanup completed', result: cleanupResult });
          break;
        default:
          res.status(400).json({ error: 'Invalid action' });
      }
    } catch (error) {
      console.error('Scheduler action error:', error);
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

export default requireAuth(handler);