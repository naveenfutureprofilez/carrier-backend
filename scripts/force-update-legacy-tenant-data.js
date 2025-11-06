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

async function updateAllCollections() {
  try {
    const oldTenantId = 'legacy_tenant_001';
    const newTenantId = 'cross-miles-carrier-inc';
    
    console.log(`🔄 Updating ALL collections from '${oldTenantId}' to '${newTenantId}'...\n`);
    
    // Get all collections in the database
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`📋 Found ${collections.length} collections in database\n`);
    
    let totalUpdated = 0;
    
    for (const collection of collections) {
      const collectionName = collection.name;
      console.log(`📝 Processing collection: ${collectionName}`);
      
      try {
        // Try to update any documents that have tenantId field with legacy value
        const updateResult = await mongoose.connection.db.collection(collectionName).updateMany(
          { tenantId: oldTenantId },
          { $set: { tenantId: newTenantId } }
        );
        
        if (updateResult.matchedCount > 0) {
          console.log(`  ✅ ${collectionName}: ${updateResult.matchedCount} matched, ${updateResult.modifiedCount} modified`);
          totalUpdated += updateResult.modifiedCount;
        } else {
          console.log(`  ⚪ ${collectionName}: No records to update`);
        }
      } catch (error) {
        console.log(`  ⚠️  ${collectionName}: ${error.message}`);
      }
    }
    
    console.log(`\n🎉 Total records updated: ${totalUpdated}`);
    
    // Now let's verify by checking specific collections
    console.log('\n🔍 Verification - checking key collections:');
    const keyCollections = ['orders', 'customers', 'carriers', 'companies', 'users', 'files', 'paymentlogs', 'employee_docs'];
    
    for (const collectionName of keyCollections) {
      try {
        const newCount = await mongoose.connection.db.collection(collectionName).countDocuments({ tenantId: newTenantId });
        const oldCount = await mongoose.connection.db.collection(collectionName).countDocuments({ tenantId: oldTenantId });
        const totalCount = await mongoose.connection.db.collection(collectionName).countDocuments({});
        
        console.log(`  ${collectionName}: ${newCount} (new) + ${oldCount} (old) = ${totalCount} total`);
      } catch (error) {
        console.log(`  ${collectionName}: Error checking - ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error during update:', error);
    throw error;
  }
}

async function main() {
  try {
    await connectDB();
    
    if (process.argv.includes('--confirm')) {
      await updateAllCollections();
    } else {
      console.log('⚠️  This will update ALL collections in the database.');
      console.log('Run with --confirm to proceed:');
      console.log('node scripts/force-update-legacy-tenant-data.js --confirm');
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