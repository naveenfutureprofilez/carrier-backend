const mongoose = require('mongoose');
const User = require('../db/Users');
const SuperAdmin = require('../db/SuperAdmin');
const bcrypt = require('bcrypt');

// Connect to database
const connectDB = async () => {
  const connection = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/carrier';
  await mongoose.connect(connection);
  console.log('📊 Connected to MongoDB');
};

const fixSuperAdmin = async () => {
  try {
    console.log('🔧 Starting Super Admin fix...');
    
    // Connect to database
    await connectDB();
    
    // Find existing super admin records that might be missing userId
    const existingSuperAdmins = await SuperAdmin.find({});
    console.log(`📊 Found ${existingSuperAdmins.length} existing SuperAdmin records`);
    
    // Check if any are missing userId
    const missingUserId = existingSuperAdmins.filter(sa => !sa.userId);
    console.log(`⚠️ Found ${missingUserId.length} SuperAdmin records missing userId`);
    
    // Fix missing userId by matching email
    for (const superAdmin of missingUserId) {
      console.log(`🔍 Fixing SuperAdmin record for email: ${superAdmin.email}`);
      
      // Find matching user by email
      const matchingUser = await User.findOne({ 
        email: superAdmin.email,
        role: 3 // Admin role
      });
      
      if (matchingUser) {
        console.log(`✅ Found matching user: ${matchingUser.name} (${matchingUser._id})`);
        
        // Update SuperAdmin with userId
        await SuperAdmin.findByIdAndUpdate(superAdmin._id, {
          userId: matchingUser._id
        });
        
        console.log(`✅ Updated SuperAdmin record with userId: ${matchingUser._id}`);
      } else {
        console.log(`❌ No matching user found for ${superAdmin.email}`);
      }
    }
    
    // If no SuperAdmin records exist, create one from an admin user
    if (existingSuperAdmins.length === 0) {
      console.log('📝 No SuperAdmin records found. Creating one from admin user...');
      
      // Find an admin user (role 3)
      const adminUser = await User.findOne({ role: 3 })
        .select('+password')
        .sort({ createdAt: 1 });
      
      if (!adminUser) {
        console.log('❌ No admin user found to create SuperAdmin from');
        console.log('💡 Make sure you have an admin user (role: 3) in your database first');
        mongoose.connection.close();
        return;
      }
      
      console.log(`👤 Creating SuperAdmin from user: ${adminUser.name} (${adminUser.email})`);
      
      // Create new SuperAdmin record
      const newSuperAdmin = new SuperAdmin({
        userId: adminUser._id,
        name: adminUser.name,
        email: adminUser.email,
        password: adminUser.password, // Use existing hashed password
        permissions: [
          'tenants.create',
          'tenants.read', 
          'tenants.update',
          'tenants.delete',
          'billing.manage',
          'analytics.view',
          'system.configure',
          'users.manage',
          'reports.generate'
        ],
        status: 'active',
        createdBy: adminUser._id
      });
      
      // Skip password hashing since we're using already hashed password
      newSuperAdmin._skipPasswordHash = true;
      await newSuperAdmin.save();
      
      console.log('✅ SuperAdmin record created successfully!');
      
      // Update the user to mark as tenant admin
      await User.findByIdAndUpdate(adminUser._id, { 
        isTenantAdmin: true 
      });
      
      console.log('✅ User marked as tenant admin');
    }
    
    // Validation - check final state
    const finalSuperAdmins = await SuperAdmin.find({}).populate('userId');
    console.log('\n🎯 Final SuperAdmin Records:');
    
    for (const sa of finalSuperAdmins) {
      console.log(`- ${sa.name} (${sa.email})`);
      console.log(`  UserID: ${sa.userId ? sa.userId._id : 'MISSING'}`);
      console.log(`  Status: ${sa.status}`);
      console.log(`  Permissions: ${sa.permissions.length} permissions`);
      console.log('');
    }
    
    if (finalSuperAdmins.every(sa => sa.userId)) {
      console.log('🎉 All SuperAdmin records now have valid userId fields!');
      console.log('\n🔐 Super Admin Login Credentials:');
      
      for (const sa of finalSuperAdmins) {
        console.log(`Email: ${sa.email}`);
        console.log('Password: Use the same password as the admin user');
        console.log(`Access URL: http://localhost:3000?tenant=admin`);
      }
    } else {
      console.log('❌ Some SuperAdmin records still missing userId');
    }
    
    mongoose.connection.close();
    console.log('\n✅ Super Admin fix completed!');
    
  } catch (error) {
    console.error('❌ Error fixing SuperAdmin records:', error);
    process.exit(1);
  }
};

fixSuperAdmin();