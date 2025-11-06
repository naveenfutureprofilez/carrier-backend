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

async function listUsers() {
  try {
    console.log('👥 Listing all users with tenant information...\n');
    
    const users = await User.find({}).select('name email tenantId corporateID role is_admin status').lean();
    
    console.log(`Found ${users.length} users:\n`);
    
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (${user.email})`);
      console.log(`   Tenant ID: ${user.tenantId}`);
      console.log(`   Corporate ID: ${user.corporateID}`);
      console.log(`   Role: ${user.role}, Admin: ${user.is_admin}, Status: ${user.status}`);
      console.log('');
    });
    
    // Group by tenant ID
    const tenantGroups = {};
    users.forEach(user => {
      const tenantId = user.tenantId || 'null';
      if (!tenantGroups[tenantId]) {
        tenantGroups[tenantId] = [];
      }
      tenantGroups[tenantId].push(user);
    });
    
    console.log('\n📊 Users grouped by tenant ID:');
    Object.entries(tenantGroups).forEach(([tenantId, userList]) => {
      console.log(`\n${tenantId}: ${userList.length} users`);
      userList.forEach(user => {
        console.log(`  • ${user.email} (${user.name}) - Role: ${user.role}, Admin: ${user.is_admin}`);
      });
    });
    
  } catch (error) {
    console.error('❌ Error listing users:', error);
    throw error;
  }
}

async function main() {
  try {
    await connectDB();
    await listUsers();
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

main();