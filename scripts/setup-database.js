import { MongoClient } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/email-campaigns";

const COLLECTIONS = ["users", "campaigns", "campaign_runs", "events", "scheduled_tasks"];
const INDEXES = {
  users: [{ key: { email: 1 }, options: { unique: true } }],
  campaigns: [{ key: { userId: 1 } }],
  events: [{ key: { userId: 1, campaignId: 1, timestamp: -1 } }],
  campaign_runs: [{ key: { campaignId: 1, userId: 1 } }],
  scheduled_tasks: [{ key: { executeAt: 1 } }],
};

const SAMPLE_USER = {
  email: "admin@example.com",
  password: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6uk6L7Q1NO",
  name: "Admin User",
  role: "admin",
  createdAt: new Date(),
  lastLoginAt: null,
};

async function setupDatabase() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db("email_campaigns");

    for (const name of COLLECTIONS) {
      const exists = await db.listCollections({ name }).hasNext();
      if (!exists) {
        await db.createCollection(name);
      }
    }

    for (const [collectionName, indexDefs] of Object.entries(INDEXES)) {
      for (const { key, options } of indexDefs) {
        await db.collection(collectionName).createIndex(key, options);
      }
    }

    const userExists = await db.collection("users").findOne({ email: SAMPLE_USER.email });
    if (!userExists) {
      await db.collection("users").insertOne(SAMPLE_USER);
    }

    console.log("Database setup completed.");
  } catch (error) {
    console.error("Database setup failed:", error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

setupDatabase();
