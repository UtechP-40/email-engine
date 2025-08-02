// lib/mongodb.js
import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/email-engine';

if (!mongoose.connection.readyState) {
  mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
}

mongoose.connection.once('open', () => {
  console.log(`[MONGO] Connected to database`);
});
