// lib/queue.js
import { Queue } from "bullmq"
import IORedis from "ioredis"

const connection = new IORedis("redis://localhost:6379")
const campaignQueue = new Queue("campaign", { connection })

export default campaignQueue
