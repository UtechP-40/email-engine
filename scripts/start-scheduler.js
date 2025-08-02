#!/usr/bin/env node
// scripts/start-scheduler.js
import { scheduler } from '../lib/scheduler.js';
import { campaignEngine } from '../lib/campaign-engine.js';

async function startScheduler() {
  console.log('🚀 Starting Email Campaign Scheduler...');

  try {
    // Initialize campaign engine
    await campaignEngine.init();
    console.log('✅ Campaign engine initialized');

    // Start scheduler
    await scheduler.start();
    console.log('✅ Scheduler started successfully');

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n🛑 Received SIGINT, shutting down gracefully...');
      await scheduler.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
      await scheduler.stop();
      process.exit(0);
    });

    // Keep the process alive
    console.log('📡 Scheduler is running. Press Ctrl+C to stop.');

  } catch (error) {
    console.error('❌ Failed to start scheduler:', error);
    process.exit(1);
  }
}

// Only run if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startScheduler();
}