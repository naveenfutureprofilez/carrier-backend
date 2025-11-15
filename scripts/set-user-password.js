const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../db/Users');

async function connectDB() {
  try {
    const dbUrl = process.env.DB_URL_OFFICE || process.env.MONGO_URI || process.env.DATABASE_URL;
    await mongoose.connect(dbUrl);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

async function setPassword({ email, tenantId, newPassword }) {
  try {
    if (!email || !tenantId || !newPassword) {
      console.error('Usage: node scripts/set-user-password.js <email> <tenantId> <newPassword>');
      process.exit(1);
    }

    const user = await User.findOne({ email, tenantId }, null, { includeInactive: true });
    if (!user) {
      console.error('❌ User not found for given email and tenantId');
      process.exit(1);
    }

    user.password = newPassword;
    await user.save();
    console.log(`✅ Password updated for ${email} in tenant ${tenantId}`);
  } catch (error) {
    console.error('❌ Error setting password:', error);
    process.exit(1);
  }
}

async function main() {
  try {
    await connectDB();
    const [email, tenantId, newPassword] = process.argv.slice(2);
    await setPassword({ email, tenantId, newPassword });
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

main();