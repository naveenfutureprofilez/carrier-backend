const mongoose = require('mongoose');
require('dotenv').config();

const SuperAdmin = require('../db/SuperAdmin');

async function removeSuperAdminPermissions() {
  try {
    console.log('🔄 Connecting to database...');
    await mongoose.connect(process.env.DB_URL_OFFICE);
    console.log('✅ Connected to database');

    console.log('\n🗑️ Removing permissions field from SuperAdmin records...');
    
    // Remove permissions field from all super admin records
    const result = await SuperAdmin.updateMany(
      {}, // Match all records
      { 
        $unset: { 
          permissions: "" // Remove permissions field
        }
      }
    );
    
    console.log(`✅ Updated ${result.modifiedCount} super admin records`);
    
    // Verify by checking a few records
    const sampleRecords = await SuperAdmin.find({}).limit(3).select('name email role permissions');
    console.log('\n📊 Sample records after update:');
    sampleRecords.forEach(record => {
      console.log(`   ${record.name} (${record.email}): role=${record.role}, permissions=${record.permissions || 'undefined'}`);
    });
    
    console.log('\n✅ Permission removal completed successfully!');
    console.log('All super admins now have identical functionality without permission restrictions.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error removing super admin permissions:', error);
    process.exit(1);
  }
}

console.log('🚀 Starting Super Admin permission removal...');
console.log('This will remove permission-based restrictions for all super admins');
removeSuperAdminPermissions();