require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../db/config');
const SubscriptionPlan = require('../db/SubscriptionPlan');

(async () => {
  try {
    await connectDB();
    console.log('Connected. Syncing SubscriptionPlan indexes...');
    const res = await SubscriptionPlan.syncIndexes();
    console.log('syncIndexes result:', res);

    const indexes = await mongoose.connection.db.collection('subscription_plans').indexes();
    console.log('Current indexes on subscription_plans:\n', indexes);
    console.log('Done. You can now create plans with duplicate names; slug remains unique.');
  } catch (err) {
    console.error('Failed to sync indexes:', err);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
})();