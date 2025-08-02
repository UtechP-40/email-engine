#!/usr/bin/env node
// scripts/test-scheduling-connection.js
import { getRedisConnection, closeRedisConnection } from '../lib/redis-connection.js';
import { campaignQueue } from '../lib/queues/campaign.queue.js';
import { campaignEngine } from '../lib/campaign-engine.js';
import { scheduler } from '../lib/scheduler.js';
import { getDatabase } from '../lib/db.js';

async function testConnections() {
  console.log('🧪 Testing Client-Server Scheduling Connections...\n');

  let allTestsPassed = true;

  // Test 1: Redis Connection
  console.log('1️⃣ Testing Redis Connection...');
  try {
    const redis = getRedisConnection();
    await redis.ping();
    console.log('✅ Redis connection successful');
  } catch (error) {
    console.error('❌ Redis connection failed:', error.message);
    allTestsPassed = false;
  }

  // Test 2: MongoDB Connection
  console.log('\n2️⃣ Testing MongoDB Connection...');
  try {
    const db = await getDatabase();
    // Test connection with a simple operation
    await db.collection('campaigns').countDocuments();
    console.log('✅ MongoDB connection successful');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    allTestsPassed = false;
  }

  // Test 3: Campaign Queue
  console.log('\n3️⃣ Testing Campaign Queue...');
  try {
    const testJob = await campaignQueue.add('test', { 
      message: 'Test job',
      timestamp: new Date()
    }, {
      removeOnComplete: 1,
      removeOnFail: 1
    });
    
    console.log(`✅ Campaign queue job created: ${testJob.id}`);
    
    // Clean up test job
    await testJob.remove();
    console.log('✅ Test job cleaned up');
  } catch (error) {
    console.error('❌ Campaign queue test failed:', error.message);
    allTestsPassed = false;
  }

  // Test 4: Campaign Engine Initialization
  console.log('\n4️⃣ Testing Campaign Engine...');
  try {
    await campaignEngine.init();
    console.log('✅ Campaign engine initialized successfully');
  } catch (error) {
    console.error('❌ Campaign engine initialization failed:', error.message);
    allTestsPassed = false;
  }

  // Test 5: Scheduler Status
  console.log('\n5️⃣ Testing Scheduler...');
  try {
    const status = await scheduler.getSchedulerStatus();
    console.log('✅ Scheduler status retrieved:', {
      isRunning: status.isRunning,
      scheduledCampaigns: status.scheduledCampaigns,
      delayedTasks: status.delayedTasks
    });
  } catch (error) {
    console.error('❌ Scheduler test failed:', error.message);
    allTestsPassed = false;
  }

  // Test 6: Database Collections
  console.log('\n6️⃣ Testing Database Collections...');
  try {
    const db = await getDatabase();
    const collections = ['campaigns', 'campaign_runs', 'events', 'scheduled_tasks'];
    
    for (const collectionName of collections) {
      const count = await db.collection(collectionName).countDocuments();
      console.log(`✅ Collection '${collectionName}': ${count} documents`);
    }
  } catch (error) {
    console.error('❌ Database collections test failed:', error.message);
    allTestsPassed = false;
  }

  // Test 7: Socket.IO Path Test
  console.log('\n7️⃣ Testing Socket.IO Configuration...');
  try {
    const response = await fetch('http://localhost:3000/api/socket', {
      method: 'GET'
    }).catch(() => null);
    
    if (response) {
      console.log('✅ Socket.IO endpoint accessible');
    } else {
      console.log('⚠️ Socket.IO endpoint not accessible (server may not be running)');
    }
  } catch (error) {
    console.log('⚠️ Socket.IO test skipped (server not running)');
  }

  // Summary
  console.log('\n📊 Test Summary:');
  if (allTestsPassed) {
    console.log('🎉 All connection tests passed! Your scheduling system is ready.');
  } else {
    console.log('⚠️ Some tests failed. Please check the errors above.');
  }

  // Cleanup
  await closeRedisConnection();
  process.exit(allTestsPassed ? 0 : 1);
}

// Run tests
testConnections().catch((error) => {
  console.error('💥 Test runner failed:', error);
  process.exit(1);
});