const mongoose = require('mongoose');
const Tenant = require('../db/Tenant');
const Order = require('../db/Order');
const Customer = require('../db/Customer');
const Carrier = require('../db/Carrier');
const Company = require('../db/Company');
const User = require('../db/Users');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    mongoose.set('strictQuery', false);
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/carrier', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
};

const migrateData = async () => {
  try {
    console.log('🚀 Starting data migration...');
    
    const sourceTenantId = 'legacy_tenant_001';
    const targetTenantId = 'cross-miles-carrier-inc';
    
    // First, check what data exists
    console.log('\n📊 Checking current data distribution...');
    const [
      sourceOrders,
      sourceCustomers, 
      sourceCarriers,
      sourceUsers,
      sourceCompanies,
      targetOrders,
      targetCustomers,
      targetCarriers,
      targetUsers,
      targetCompanies
    ] = await Promise.all([
      Order.countDocuments({ tenantId: sourceTenantId }),
      Customer.countDocuments({ tenantId: sourceTenantId }),
      Carrier.countDocuments({ tenantId: sourceTenantId }),
      User.countDocuments({ tenantId: sourceTenantId }),
      Company.countDocuments({ tenantId: sourceTenantId }),
      Order.countDocuments({ tenantId: targetTenantId }),
      Customer.countDocuments({ tenantId: targetTenantId }),
      Carrier.countDocuments({ tenantId: targetTenantId }),
      User.countDocuments({ tenantId: targetTenantId }),
      Company.countDocuments({ tenantId: targetTenantId })
    ]);
    
    console.log(`Source tenant (${sourceTenantId}):`);
    console.log(`  - Orders: ${sourceOrders}`);
    console.log(`  - Customers: ${sourceCustomers}`);
    console.log(`  - Carriers: ${sourceCarriers}`);
    console.log(`  - Users: ${sourceUsers}`);
    console.log(`  - Companies: ${sourceCompanies}`);
    
    console.log(`Target tenant (${targetTenantId}):`);
    console.log(`  - Orders: ${targetOrders}`);
    console.log(`  - Customers: ${targetCustomers}`);
    console.log(`  - Carriers: ${targetCarriers}`);
    console.log(`  - Users: ${targetUsers}`);
    console.log(`  - Companies: ${targetCompanies}`);
    
    if (sourceOrders === 0 && sourceCustomers === 0 && sourceCarriers === 0) {
      console.log('❌ No data found in source tenant to migrate!');
      return;
    }
    
    // Confirm migration
    console.log(`\n⚠️  This will move ALL data from "${sourceTenantId}" to "${targetTenantId}"`);
    console.log('⚠️  This operation cannot be undone!');
    
    // Since this is a script, we'll proceed (in production you'd want confirmation)
    console.log('\n🔄 Starting migration...');
    
    // Step 1: Update all orders
    if (sourceOrders > 0) {
      const orderResult = await Order.updateMany(
        { tenantId: sourceTenantId },
        { $set: { tenantId: targetTenantId } }
      );
      console.log(`✅ Migrated ${orderResult.modifiedCount} orders`);
    }
    
    // Step 2: Update all customers
    if (sourceCustomers > 0) {
      const customerResult = await Customer.updateMany(
        { tenantId: sourceTenantId },
        { $set: { tenantId: targetTenantId } }
      );
      console.log(`✅ Migrated ${customerResult.modifiedCount} customers`);
    }
    
    // Step 3: Update all carriers
    if (sourceCarriers > 0) {
      const carrierResult = await Carrier.updateMany(
        { tenantId: sourceTenantId },
        { $set: { tenantId: targetTenantId } }
      );
      console.log(`✅ Migrated ${carrierResult.modifiedCount} carriers`);
    }
    
    // Step 4: Update all users
    if (sourceUsers > 0) {
      const userResult = await User.updateMany(
        { tenantId: sourceTenantId },
        { $set: { tenantId: targetTenantId } }
      );
      console.log(`✅ Migrated ${userResult.modifiedCount} users`);
    }
    
    // Step 5: Update all companies
    if (sourceCompanies > 0) {
      const companyResult = await Company.updateMany(
        { tenantId: sourceTenantId },
        { $set: { tenantId: targetTenantId } }
      );
      console.log(`✅ Migrated ${companyResult.modifiedCount} companies`);
    }
    
    // Step 6: Remove the legacy tenant
    console.log('\n🗑️  Removing legacy tenant...');
    const deletedTenant = await Tenant.findOneAndDelete({ tenantId: sourceTenantId });
    if (deletedTenant) {
      console.log(`✅ Removed tenant: ${deletedTenant.name}`);
    } else {
      console.log('⚠️  Legacy tenant not found (may have been removed already)');
    }
    
    // Step 7: Verify migration
    console.log('\n🔍 Verifying migration...');
    const [
      finalOrders,
      finalCustomers,
      finalCarriers,
      finalUsers,
      finalCompanies
    ] = await Promise.all([
      Order.countDocuments({ tenantId: targetTenantId }),
      Customer.countDocuments({ tenantId: targetTenantId }),
      Carrier.countDocuments({ tenantId: targetTenantId }),
      User.countDocuments({ tenantId: targetTenantId }),
      Company.countDocuments({ tenantId: targetTenantId })
    ]);
    
    console.log(`Final data in ${targetTenantId}:`);
    console.log(`  - Orders: ${finalOrders}`);
    console.log(`  - Customers: ${finalCustomers}`);
    console.log(`  - Carriers: ${finalCarriers}`);
    console.log(`  - Users: ${finalUsers}`);
    console.log(`  - Companies: ${finalCompanies}`);
    
    // Check for any remaining legacy data
    const [
      remainingOrders,
      remainingCustomers,
      remainingCarriers,
      remainingUsers,
      remainingCompanies
    ] = await Promise.all([
      Order.countDocuments({ tenantId: sourceTenantId }),
      Customer.countDocuments({ tenantId: sourceTenantId }),
      Carrier.countDocuments({ tenantId: sourceTenantId }),
      User.countDocuments({ tenantId: sourceTenantId }),
      Company.countDocuments({ tenantId: sourceTenantId })
    ]);
    
    const totalRemaining = remainingOrders + remainingCustomers + remainingCarriers + remainingUsers + remainingCompanies;
    
    if (totalRemaining === 0) {
      console.log('✅ Migration completed successfully! No data remaining in legacy tenant.');
    } else {
      console.log(`⚠️  Warning: ${totalRemaining} records still remain in legacy tenant:`);
      console.log(`    - Orders: ${remainingOrders}`);
      console.log(`    - Customers: ${remainingCustomers}`);
      console.log(`    - Carriers: ${remainingCarriers}`);
      console.log(`    - Users: ${remainingUsers}`);
      console.log(`    - Companies: ${remainingCompanies}`);
    }
    
    console.log('\n🎉 Migration process completed!');
    console.log(`Now when you emulate "Cross Miles Carrier Inc", you should see all the migrated data.`);
    
  } catch (error) {
    console.error('❌ Error during migration:', error);
    throw error;
  }
};

// Run the script
const main = async () => {
  try {
    await connectDB();
    await migrateData();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

// Only run if this file is executed directly
if (require.main === module) {
  main();
}

module.exports = { migrateData };