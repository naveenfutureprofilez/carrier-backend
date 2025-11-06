const mongoose = require('mongoose');
require('dotenv').config();

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

async function fixMissingTenantIds() {
  try {
    const targetTenantId = 'cross-miles-carrier-inc';
    console.log(`🔧 Adding tenant ID '${targetTenantId}' to records that don't have one...\n`);
    
    // Collections that should have tenant IDs but might be missing them
    const collectionsToFix = [
      'files',
      'paymentlogs', 
      'employee_docs'
    ];
    
    let totalFixed = 0;
    
    for (const collectionName of collectionsToFix) {
      console.log(`📝 Processing ${collectionName}...`);
      
      try {
        // Find records without tenantId or with null/empty tenantId
        const recordsWithoutTenant = await mongoose.connection.db.collection(collectionName).countDocuments({
          $or: [
            { tenantId: { $exists: false } },
            { tenantId: null },
            { tenantId: '' }
          ]
        });
        
        console.log(`  Found ${recordsWithoutTenant} records without tenant ID`);
        
        if (recordsWithoutTenant > 0) {
          // Update records to have the target tenant ID
          const updateResult = await mongoose.connection.db.collection(collectionName).updateMany(
            {
              $or: [
                { tenantId: { $exists: false } },
                { tenantId: null },
                { tenantId: '' }
              ]
            },
            {
              $set: { tenantId: targetTenantId }
            }
          );
          
          console.log(`  ✅ Updated ${updateResult.modifiedCount} records`);
          totalFixed += updateResult.modifiedCount;
        } else {
          console.log(`  ⚪ No records to update`);
        }
      } catch (error) {
        console.log(`  ❌ Error processing ${collectionName}: ${error.message}`);
      }
      
      console.log('');
    }
    
    console.log(`🎉 Total records fixed: ${totalFixed}\n`);
    
    // Verify the results
    console.log('🔍 Verification:');
    for (const collectionName of collectionsToFix) {
      try {
        const withTenantId = await mongoose.connection.db.collection(collectionName).countDocuments({ tenantId: targetTenantId });
        const withoutTenantId = await mongoose.connection.db.collection(collectionName).countDocuments({
          $or: [
            { tenantId: { $exists: false } },
            { tenantId: null },
            { tenantId: '' },
            { tenantId: { $ne: targetTenantId } }
          ]
        });
        const totalCount = await mongoose.connection.db.collection(collectionName).countDocuments({});
        
        console.log(`  ${collectionName}: ${withTenantId} with correct tenant ID, ${withoutTenantId} without, ${totalCount} total`);
      } catch (error) {
        console.log(`  ${collectionName}: Error verifying - ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error during fix:', error);
    throw error;
  }
}

async function main() {
  try {
    await connectDB();
    
    if (process.argv.includes('--confirm')) {
      await fixMissingTenantIds();
    } else {
      console.log('⚠️  This will add tenant IDs to records that are missing them.');
      console.log('Run with --confirm to proceed:');
      console.log('node scripts/fix-missing-tenant-ids.js --confirm');
    }
    
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

main();