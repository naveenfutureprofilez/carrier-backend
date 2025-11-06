const mongoose = require('mongoose');
require('dotenv').config();

// Import the User model
const User = require('../db/Users');

async function connectDB() {
  try {
    const dbUrl = process.env.DB_URL_OFFICE || process.env.MONGO_URI || process.env.DATABASE_URL;
    if (!dbUrl) {
      throw new Error('No database URL found in environment variables');
    }
    await mongoose.connect(dbUrl);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

async function updateTenantIds() {
  try {
    console.log('🔍 Starting tenant ID update process...');
    
    const targetTenantId = 'cross-miles-carrier-inc';
    const excludeEmail = 'naveen22@internetbusinesssolutionsindia.com';
    
    // First, let's see what we're working with
    console.log('\n📊 Current database state:');
    const allUsers = await User.find({});
    console.log(`Total users in database: ${allUsers.length}`);
    
    // Show breakdown by current tenantId
    const tenantBreakdown = {};
    allUsers.forEach(user => {
      const tenantId = user.tenantId || 'null';
      tenantBreakdown[tenantId] = (tenantBreakdown[tenantId] || 0) + 1;
    });
    
    console.log('\nCurrent tenant distribution:');
    Object.entries(tenantBreakdown).forEach(([tenantId, count]) => {
      console.log(`  ${tenantId}: ${count} users`);
    });
    
    // Find users that need to be updated (all except the excluded email)
    const usersToUpdate = await User.find({
      email: { $ne: excludeEmail }
    });
    
    console.log(`\n🎯 Users to update: ${usersToUpdate.length}`);
    console.log(`📋 Users that will be excluded: ${allUsers.length - usersToUpdate.length}`);
    
    // Show the excluded user details
    const excludedUser = await User.findOne({ email: excludeEmail });
    if (excludedUser) {
      console.log(`\n🚫 Excluded user details:`);
      console.log(`   Email: ${excludedUser.email}`);
      console.log(`   Name: ${excludedUser.name}`);
      console.log(`   Current tenantId: ${excludedUser.tenantId}`);
      console.log(`   CorporateID: ${excludedUser.corporateID}`);
    } else {
      console.log(`\n⚠️  Excluded user '${excludeEmail}' not found in database`);
    }
    
    // Ask for confirmation before proceeding
    console.log(`\n⚠️  WARNING: This will update ${usersToUpdate.length} users to have tenantId: '${targetTenantId}'`);
    console.log('This operation cannot be easily undone. Please verify this is correct.');
    
    // In a production environment, you might want to add a confirmation prompt here
    // For now, we'll add a safety check
    if (process.argv.includes('--confirm')) {
      console.log('\n🔄 Proceeding with update...');
      
      // Perform the update
      const updateResult = await User.updateMany(
        { 
          email: { $ne: excludeEmail } 
        },
        { 
          $set: { 
            tenantId: targetTenantId 
          } 
        }
      );
      
      console.log(`\n✅ Update completed!`);
      console.log(`   Matched: ${updateResult.matchedCount} users`);
      console.log(`   Modified: ${updateResult.modifiedCount} users`);
      
      // Verify the results
      console.log('\n🔍 Verifying results...');
      const updatedUsers = await User.find({ tenantId: targetTenantId });
      const excludedUserAfter = await User.findOne({ email: excludeEmail });
      
      console.log(`Users with target tenant ID '${targetTenantId}': ${updatedUsers.length}`);
      
      if (excludedUserAfter) {
        console.log(`Excluded user tenant ID: ${excludedUserAfter.tenantId} (should be unchanged)`);
      }
      
      // Final breakdown
      console.log('\n📊 Final tenant distribution:');
      const finalUsers = await User.find({});
      const finalBreakdown = {};
      finalUsers.forEach(user => {
        const tenantId = user.tenantId || 'null';
        finalBreakdown[tenantId] = (finalBreakdown[tenantId] || 0) + 1;
      });
      
      Object.entries(finalBreakdown).forEach(([tenantId, count]) => {
        console.log(`  ${tenantId}: ${count} users`);
      });
      
    } else {
      console.log('\n⏸️  DRY RUN COMPLETED - No changes made');
      console.log('To actually perform the update, run the script with --confirm flag:');
      console.log('node scripts/update-tenant-ids.js --confirm');
      
      // Show what would be updated
      console.log('\n📋 Users that would be updated:');
      usersToUpdate.slice(0, 10).forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.email} (${user.name}) - Current: ${user.tenantId}`);
      });
      
      if (usersToUpdate.length > 10) {
        console.log(`   ... and ${usersToUpdate.length - 10} more users`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error updating tenant IDs:', error);
    throw error;
  }
}

async function main() {
  try {
    await connectDB();
    await updateTenantIds();
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { updateTenantIds };