require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../db/Users');
const SuperAdmin = require('../db/SuperAdmin');

const run = async () => {
  try {
    const dbUrl = process.env.DB_URL_OFFICE || 'mongodb+srv://naveenfp:naveenfp@cluster0.5c8ne.mongodb.net/carrier';
    await mongoose.connect(dbUrl);
    console.log('📊 Connected to REMOTE MongoDB:', mongoose.connection.name);

    const existingSuperAdmins = await SuperAdmin.find({});
    console.log(`📊 Found ${existingSuperAdmins.length} SuperAdmin records`);

    const missingUserId = existingSuperAdmins.filter(sa => !sa.userId);
    console.log(`⚠️ Found ${missingUserId.length} SuperAdmin records missing userId`);

    for (const superAdmin of missingUserId) {
      console.log(`🔍 Fixing SuperAdmin userId for email: ${superAdmin.email}`);
      const matchingUser = await User.findOne({ email: superAdmin.email, role: 3 });
      if (matchingUser) {
        await SuperAdmin.findByIdAndUpdate(superAdmin._id, { userId: matchingUser._id });
        console.log(`✅ Updated SuperAdmin with userId: ${matchingUser._id}`);
      } else {
        console.log(`❌ No matching admin user found for ${superAdmin.email}`);
      }
    }

    if (existingSuperAdmins.length === 0) {
      console.log('📝 No SuperAdmin records found. Creating one from an admin user...');
      const adminUser = await User.findOne({ role: 3 }).select('+password').sort({ createdAt: 1 });
      if (!adminUser) {
        console.log('❌ No admin user found (role: 3). Populate sample data first.');
        await mongoose.connection.close();
        process.exit(2);
      }

      console.log(`👤 Creating SuperAdmin from user: ${adminUser.name} (${adminUser.email})`);
      const newSuperAdmin = new SuperAdmin({
        userId: adminUser._id,
        name: adminUser.name,
        email: adminUser.email,
        password: adminUser.password, // already hashed
        status: 'active',
        permissions: [
          'tenants.create','tenants.read','tenants.update','tenants.delete',
          'billing.manage','analytics.view','system.configure','users.manage','reports.generate'
        ],
        createdBy: adminUser._id
      });
      newSuperAdmin._skipPasswordHash = true;
      await newSuperAdmin.save();
      console.log('✅ SuperAdmin record created successfully!');
    }

    const finalSuperAdmins = await SuperAdmin.find({}).populate('userId');
    console.log('\n🎯 Final SuperAdmin Records:');
    for (const sa of finalSuperAdmins) {
      console.log(`- ${sa.name} (${sa.email}) | userId: ${sa.userId ? sa.userId._id : 'MISSING'} | status: ${sa.status}`);
    }

    await mongoose.connection.close();
    console.log('\n✅ Remote SuperAdmin fix completed!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error fixing remote SuperAdmin:', err);
    try { await mongoose.connection.close(); } catch (_) {}
    process.exit(1);
  }
};

run();