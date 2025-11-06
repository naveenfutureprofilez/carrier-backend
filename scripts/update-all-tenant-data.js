const mongoose = require('mongoose');
require('dotenv').config();

// Import all the models that have tenantId fields
const Order = require('../db/Order');
const Customer = require('../db/Customer');
const Carrier = require('../db/Carrier');
const Company = require('../db/Company');
const EmployeeDoc = require('../db/EmployeeDoc');
const Files = require('../db/Files');
const PaymentLogs = require('../db/PaymentLogs');

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

async function updateAllTenantData() {
  try {
    console.log('🔍 Starting comprehensive tenant ID update process...');
    
    const oldTenantId = 'legacy_tenant_001';
    const newTenantId = 'cross-miles-carrier-inc';
    
    console.log(`\n📊 Updating all data from '${oldTenantId}' to '${newTenantId}'`);
    
    // Define all collections to update
    const collections = [
      { name: 'Orders', model: Order },
      { name: 'Customers', model: Customer },
      { name: 'Carriers', model: Carrier },
      { name: 'Companies', model: Company },
      { name: 'Employee Documents', model: EmployeeDoc },
      { name: 'Files', model: Files },
      { name: 'Payment Logs', model: PaymentLogs }
    ];
    
    // First, let's see the current state
    console.log('\n📋 Current data distribution:');
    for (const collection of collections) {
      try {
        const oldCount = await collection.model.countDocuments({ tenantId: oldTenantId });
        const newCount = await collection.model.countDocuments({ tenantId: newTenantId });
        const totalCount = await collection.model.countDocuments({});
        console.log(`  ${collection.name}: ${oldCount} (old) + ${newCount} (new) = ${totalCount} total`);
      } catch (error) {
        console.log(`  ${collection.name}: Unable to query (model may not have tenantId field)`);
      }
    }
    
    if (process.argv.includes('--confirm')) {
      console.log('\n🔄 Proceeding with updates...');
      
      const results = {};
      
      // Update each collection
      for (const collection of collections) {
        try {
          console.log(`\n📝 Updating ${collection.name}...`);
          
          const updateResult = await collection.model.updateMany(
            { tenantId: oldTenantId },
            { $set: { tenantId: newTenantId } }
          );
          
          results[collection.name] = updateResult;
          console.log(`  ✅ ${collection.name}: ${updateResult.matchedCount} matched, ${updateResult.modifiedCount} modified`);
          
        } catch (error) {
          console.log(`  ❌ ${collection.name}: Error - ${error.message}`);
          results[collection.name] = { error: error.message };
        }
      }
      
      // Verify results
      console.log('\n🔍 Verifying updates...');
      for (const collection of collections) {
        try {
          const newCount = await collection.model.countDocuments({ tenantId: newTenantId });
          const oldCount = await collection.model.countDocuments({ tenantId: oldTenantId });
          console.log(`  ${collection.name}: ${newCount} records with new tenant ID, ${oldCount} with old tenant ID`);
        } catch (error) {
          console.log(`  ${collection.name}: Unable to verify - ${error.message}`);
        }
      }
      
      console.log('\n✅ All updates completed!');
      console.log('\n📊 Summary:');
      Object.entries(results).forEach(([name, result]) => {
        if (result.error) {
          console.log(`  ❌ ${name}: ${result.error}`);
        } else {
          console.log(`  ✅ ${name}: ${result.modifiedCount} records updated`);
        }
      });
      
    } else {
      console.log('\n⏸️  DRY RUN COMPLETED - No changes made');
      console.log('To actually perform the update, run the script with --confirm flag:');
      console.log('node scripts/update-all-tenant-data.js --confirm');
      
      // Show what would be updated
      console.log('\n📋 Data that would be updated:');
      for (const collection of collections) {
        try {
          const recordsToUpdate = await collection.model.countDocuments({ tenantId: oldTenantId });
          if (recordsToUpdate > 0) {
            console.log(`  ${collection.name}: ${recordsToUpdate} records would be updated`);
          }
        } catch (error) {
          // Skip collections that don't have tenantId field
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error updating tenant data:', error);
    throw error;
  }
}

async function main() {
  try {
    await connectDB();
    await updateAllTenantData();
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

module.exports = { updateAllTenantData };