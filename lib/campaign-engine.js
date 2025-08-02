// File: lib/campaign-engine.js
import { getDatabase } from './db.js';
import { sendEmailWithRetry } from './email.js';
import { ObjectId } from 'mongodb';
import { campaignQueue } from './queues/campaign.queue.js';

export class CampaignEngine {
  constructor() {
    this.db = null;
    this.io = null; // Socket.IO instance for real-time updates
  }

  async init() {
    this.db = await getDatabase();
  }

  setSocketIO(io) {
    this.io = io;
  }

  // Emit real-time updates to connected clients
  emitCampaignUpdate(campaignId, eventType, data) {
    if (this.io) {
      this.io.to(`campaign-${campaignId}`).emit('campaign-status', {
        campaignId,
        eventType,
        data,
        timestamp: new Date()
      });
    }
  }

  /**
   * Queue campaigns scheduled at or before now
   */
  async processScheduledTasks() {
    if (!this.db) await this.init();
    
    const now = new Date();

    const campaigns = await this.db.collection('campaigns').find({
      status: 'scheduled',
      scheduledAt: { $lte: now },
    }).toArray();

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

      try {
        await campaignQueue.add('sendCampaign', jobData, {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: 10,
          removeOnFail: 50,
        });

        // Update campaign status
        await this.db.collection('campaigns').updateOne(
          { _id: campaign._id },
          { $set: { status: 'queued', updatedAt: new Date() } }
        );

        // Emit real-time update
        this.emitCampaignUpdate(campaign._id.toString(), 'queued', {
          message: 'Campaign queued for execution'
        });

      } catch (err) {
        console.error(`[ENGINE] ❌ Failed to queue campaign ${campaign._id}:`, err.message);
        
        // Update campaign status to error
        await this.db.collection('campaigns').updateOne(
          { _id: campaign._id },
          { $set: { status: 'error', error: err.message, updatedAt: new Date() } }
        );

        // Emit error update
        this.emitCampaignUpdate(campaign._id.toString(), 'error', {
          message: 'Failed to queue campaign',
          error: err.message
        });
      }
    }

    console.log(`[ENGINE] ✅ Processed ${campaigns.length} scheduled campaigns.`);
  }

  /**
   * Start a campaign execution
   */
  async startCampaign(campaignId, userId, userData) {
    if (!this.db) await this.init();

    console.log(`[ENGINE] 🚀 Starting campaign ${campaignId} for user ${userId}`);

    try {
      const campaign = await this.db.collection('campaigns').findOne({
        _id: new ObjectId(campaignId),
      });

      if (!campaign) {
        throw new Error('Campaign not found');
      }

      // Create campaign run
      const campaignRun = {
        campaignId: new ObjectId(campaignId),
        userId,
        userData,
        currentNodeId: this.findStartNode(campaign.schema),
        status: 'active',
        startedAt: new Date(),
        lastProcessedAt: new Date(),
      };

      const result = await this.db.collection('campaign_runs').insertOne(campaignRun);

      // Update campaign status
      await this.db.collection('campaigns').updateOne(
        { _id: new ObjectId(campaignId) },
        { $set: { status: 'running', updatedAt: new Date() } }
      );

      // Emit start update
      this.emitCampaignUpdate(campaignId, 'started', {
        campaignRunId: result.insertedId,
        userId,
        startedAt: campaignRun.startedAt
      });

      // Process first node
      await this.processNode(result.insertedId, campaignRun.currentNodeId, campaign.schema);

      return result.insertedId;

    } catch (error) {
      console.error(`[ENGINE] ❌ Failed to start campaign ${campaignId}:`, error.message);
      
      // Update campaign status to error
      await this.db.collection('campaigns').updateOne(
        { _id: new ObjectId(campaignId) },
        { $set: { status: 'error', error: error.message, updatedAt: new Date() } }
      );

      // Emit error update
      this.emitCampaignUpdate(campaignId, 'error', {
        message: 'Failed to start campaign',
        error: error.message
      });

      throw error;
    }
  }

  findStartNode(schema) {
    return schema.nodes.find((node) => node.type === 'start')?.id || schema.nodes[0]?.id;
  }

  async processNode(campaignRunId, nodeId, schema) {
    if (!this.db) await this.init();

    const node = schema.nodes.find((n) => n.id === nodeId);
    if (!node) return;

    const campaignRun = await this.db.collection('campaign_runs').findOne({
      _id: new ObjectId(campaignRunId),
    });

    if (!campaignRun) {
      console.error(`Campaign run ${campaignRunId} not found`);
      return;
    }

    console.log(`[ENGINE] Processing ${node.type} node ${nodeId} for campaign run ${campaignRunId}`);

    try {
      switch (node.type) {
        case 'email':
          await this.processEmailNode(campaignRun, node, schema);
          break;
        case 'delay':
          await this.processDelayNode(campaignRun, node, schema);
          break;
        case 'condition':
          await this.processConditionNode(campaignRun, node, schema);
          break;
        case 'end':
          await this.endCampaignRun(campaignRunId);
          break;
        default:
          await this.moveToNextNode(campaignRun, node, schema);
      }
    } catch (error) {
      console.error(`[ENGINE] ❌ Error processing node ${nodeId}:`, error.message);
      
      // Log error and continue or stop based on error type
      await this.logEvent(campaignRun.userId, campaignRun.campaignId, 'node_error', {
        nodeId,
        nodeType: node.type,
        error: error.message
      });

      // Emit error update
      this.emitCampaignUpdate(campaignRun.campaignId.toString(), 'node_error', {
        nodeId,
        nodeType: node.type,
        error: error.message
      });
    }
  }

  async processEmailNode(campaignRun, node, schema) {
    console.log(`[ENGINE] 📧 Sending email: ${node.data.subject}`);

    const emailResult = await sendEmailWithRetry({
      to: campaignRun.userData.email,
      subject: node.data.subject,
      content: node.data.content,
      templateData: campaignRun.userData,
      campaignId: campaignRun.campaignId.toString(),
      userId: campaignRun.userId
    });

    // Log email event
    await this.logEvent(campaignRun.userId, campaignRun.campaignId, 'email_sent', {
      nodeId: node.id,
      success: emailResult.success,
      error: emailResult.error,
      messageId: emailResult.messageId
    });

    // Emit email update
    this.emitCampaignUpdate(campaignRun.campaignId.toString(), 'email_sent', {
      nodeId: node.id,
      success: emailResult.success,
      recipient: campaignRun.userData.email,
      subject: node.data.subject,
      messageId: emailResult.messageId
    });

    if (emailResult.success) {
      await this.moveToNextNode(campaignRun, node, schema);
    } else {
      throw new Error(`Email sending failed: ${emailResult.message}`);
    }
  }

  async processDelayNode(campaignRun, node, schema) {
    const delayMs = this.parseDuration(node.data.duration);
    const executeAt = new Date(Date.now() + delayMs);

    console.log(`[ENGINE] ⏳ Scheduling delay of ${delayMs}ms until ${executeAt.toISOString()}`);

    // Schedule next processing
    await this.db.collection('scheduled_tasks').insertOne({
      campaignRunId: campaignRun._id,
      executeAt,
      nodeId: this.getNextNodeId(node, schema),
      schema,
      createdAt: new Date()
    });

    // Emit delay update
    this.emitCampaignUpdate(campaignRun.campaignId.toString(), 'delay_scheduled', {
      nodeId: node.id,
      delayMs,
      executeAt,
      nextNodeId: this.getNextNodeId(node, schema)
    });
  }

  async processConditionNode(campaignRun, node, schema) {
    const conditionMet = await this.evaluateCondition(
      node.data.condition, 
      campaignRun.userId, 
      campaignRun.campaignId
    );

    const nextNodeId = conditionMet
      ? this.getNextNodeId(node, schema, 'true')
      : this.getNextNodeId(node, schema, 'false');

    console.log(`[ENGINE] ❓ Condition ${node.data.condition?.type} evaluated to: ${conditionMet}`);

    // Emit condition update
    this.emitCampaignUpdate(campaignRun.campaignId.toString(), 'condition_evaluated', {
      nodeId: node.id,
      conditionType: node.data.condition?.type,
      conditionMet,
      nextNodeId
    });

    await this.updateCampaignRun(campaignRun._id, { currentNodeId: nextNodeId });
    await this.processNode(campaignRun._id, nextNodeId, schema);
  }

  async evaluateCondition(condition, userId, campaignId) {
    const events = await this.db
      .collection('events')
      .find({
        userId,
        campaignId: new ObjectId(campaignId),
        timestamp: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // Last 30 days
      })
      .toArray();

    switch (condition.type) {
      case 'email_opened':
        return events.some((e) => e.type === 'email_opened');
      case 'email_clicked':
        return events.some((e) => e.type === 'email_clicked');
      case 'purchase_made':
        return events.some((e) => e.type === 'purchase');
      case 'idle_time':
        const lastEvent = events[0];
        if (!lastEvent) return true;
        const daysSinceLastEvent = (Date.now() - lastEvent.timestamp) / (1000 * 60 * 60 * 24);
        return daysSinceLastEvent >= condition.days;
      default:
        return false;
    }
  }

  async moveToNextNode(campaignRun, currentNode, schema) {
    const nextNodeId = this.getNextNodeId(currentNode, schema);

    if (nextNodeId) {
      await this.updateCampaignRun(campaignRun._id, { currentNodeId: nextNodeId });
      await this.processNode(campaignRun._id, nextNodeId, schema);
    } else {
      await this.endCampaignRun(campaignRun._id);
    }
  }

  getNextNodeId(node, schema, edgeType = 'default') {
    const edge = schema.edges.find((e) => e.source === node.id && (e.type === edgeType || !e.type));
    return edge?.target;
  }

  async updateCampaignRun(campaignRunId, updates) {
    await this.db.collection('campaign_runs').updateOne(
      { _id: new ObjectId(campaignRunId) },
      {
        $set: {
          ...updates,
          lastProcessedAt: new Date(),
        },
      }
    );
  }

  async endCampaignRun(campaignRunId) {
    const campaignRun = await this.db.collection('campaign_runs').findOne({
      _id: new ObjectId(campaignRunId)
    });

    if (campaignRun) {
      await this.updateCampaignRun(campaignRunId, {
        status: 'completed',
        completedAt: new Date(),
      });

      // Update campaign status
      await this.db.collection('campaigns').updateOne(
        { _id: campaignRun.campaignId },
        { $set: { status: 'completed', updatedAt: new Date() } }
      );

      console.log(`[ENGINE] ✅ Campaign run ${campaignRunId} completed`);

      // Emit completion update
      this.emitCampaignUpdate(campaignRun.campaignId.toString(), 'completed', {
        campaignRunId,
        completedAt: new Date()
      });
    }
  }

  async logEvent(userId, campaignId, type, data = {}) {
    await this.db.collection('events').insertOne({
      userId,
      campaignId: new ObjectId(campaignId),
      type,
      data,
      timestamp: new Date(),
    });
  }

  parseDuration(duration) {
    if (typeof duration === 'object' && duration.value && duration.unit) {
      const value = parseInt(duration.value);
      switch (duration.unit) {
        case 'minutes':
          return value * 60 * 1000;
        case 'hours':
          return value * 60 * 60 * 1000;
        case 'days':
          return value * 24 * 60 * 60 * 1000;
        default:
          return value * 60 * 1000; // Default to minutes
      }
    }

    // Fallback for string format
    const match = duration.match(/(\d+)\s*(minutes?|hours?|days?)/);
    if (!match) return 0;

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 'minute':
      case 'minutes':
        return value * 60 * 1000;
      case 'hour':
      case 'hours':
        return value * 60 * 60 * 1000;
      case 'day':
      case 'days':
        return value * 24 * 60 * 60 * 1000;
      default:
        return 0;
    }
  }

  async simulateUserJourney(campaignId, userData, events = []) {
    if (!this.db) await this.init();

    const campaign = await this.db.collection('campaigns').findOne({
      _id: new ObjectId(campaignId),
    });

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    const simulation = {
      steps: [],
      currentNode: this.findStartNode(campaign.schema),
      userData,
      events,
    };

    let currentNodeId = simulation.currentNode;
    let stepCount = 0;
    const maxSteps = 50; // Prevent infinite loops

    while (currentNodeId && stepCount < maxSteps) {
      const node = campaign.schema.nodes.find((n) => n.id === currentNodeId);
      if (!node) break;

      simulation.steps.push({
        nodeId: currentNodeId,
        nodeType: node.type,
        nodeData: node.data,
        timestamp: new Date(),
      });

      if (node.type === 'condition') {
        const conditionMet = this.simulateCondition(node.data.condition, events);
        currentNodeId = conditionMet
          ? this.getNextNodeId(node, campaign.schema, 'true')
          : this.getNextNodeId(node, campaign.schema, 'false');
      } else if (node.type === 'end') {
        break;
      } else {
        currentNodeId = this.getNextNodeId(node, campaign.schema);
      }

      stepCount++;
    }

    return simulation;
  }

  simulateCondition(condition, events) {
    switch (condition.type) {
      case 'email_opened':
        return events.some((e) => e.type === 'email_opened');
      case 'email_clicked':
        return events.some((e) => e.type === 'email_clicked');
      case 'purchase_made':
        return events.some((e) => e.type === 'purchase');
      default:
        return false;
    }
  }
}

// Create singleton instance
export const campaignEngine = new CampaignEngine();
