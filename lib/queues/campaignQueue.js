// lib/queues/campaignQueue.js (BullMQ example)
import { Queue } from "bullmq";
import { createClient } from "redis";

const connection = createClient({ url: process.env.REDIS_URL });
await connection.connect();

export const campaignQueue = new Queue("campaigns", { connection });
