require('dotenv').config();
const mongoose = require('mongoose');
const readline = require('readline');

// Import migration functions
const setupMultiTenant = require('../migrations/001-setup-multitenant');
const migrateExistingData = require('../migrations/002-migrate-existing-data');

// Import models for rollback
const Tenant = require('../db/Tenant');
const SuperAdmin = require('../db/SuperAdmin');
const SubscriptionPlan = require('../db/SubscriptionPlan');
const User = require('../db/Users');
const Customer = require('../db/Customer');
const Carrier = require('../db/Carrier');
const Order = require('../db/Order');
const Equipment = require('../db/Equipment');
const Charges = require('../db/Charges');
const Commodities = require('../db/Commudity');
const Files = require('../db/Files');
const Notifications = require('../db/Notification');
const PaymentLogs = require('../db/PaymentLogs');
const EmployeeDoc = require('../db/EmployeeDoc');
const Company = require('../db/Company');

const connectDB = require('../db/config');

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const askQuestion = (question) => {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
};

const runMigrations = async () => {
  try {
    console.log('🚀 Starting migration process...');
    console.log('This will set up multi-tenant architecture and migrate your data.\n');
    
    // Check for rollback flag
    const isRollback = process.argv.includes('--rollback');
    
    if (isRollback) {
      await rollbackMigrations();
      return;
    }
    
    // Connect to database
    await connectDB();
    
    // Check if migrations have already been run
    const existingTenant = await Tenant.findOne({});
    if (existingTenant) {
      console.log('⚠️  Multi-tenant system appears to be already set up.');
      console.log('Found tenant:', existingTenant.name);
      
      const answer = await askQuestion('Do you want to continue anyway? This might create duplicate data. (y/N): ');
      if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
        console.log('Migration cancelled.');
        rl.close();
        mongoose.connection.close();
        return;
      }
    }
    
    // Confirm before proceeding
    console.log('⚠️  IMPORTANT: This migration will modify your database structure.');
    console.log('Please ensure you have backed up your database before proceeding.\n');
    
    const confirm = await askQuestion('Do you want to continue with the migration? (y/N): ');
    if (confirm.toLowerCase() !== 'y' && confirm.toLowerCase() !== 'yes') {
      console.log('Migration cancelled.');
      rl.close();
      mongoose.connection.close();
      return;
    }
    
    console.log('\n🔧 Step 1: Setting up multi-tenant infrastructure...');
    await setupMultiTenant();
    console.log('✅ Multi-tenant setup completed!\n');
    
    console.log('🔄 Step 2: Migrating existing data...');
    await migrateExistingData();
    console.log('✅ Data migration completed!\n');
    
    console.log('🎉 All migrations completed successfully!');
    console.log('\n📋 Next Steps:');
    console.log('1. Test the multi-tenant login endpoints');
    console.log('2. Verify data isolation between tenants');
    console.log('3. Set up frontend routing for subdomains');
    console.log('4. Configure environment variables for production');
    
    rl.close();
    mongoose.connection.close();
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    rl.close();
    if (mongoose.connection.readyState === 1) {
      mongoose.connection.close();
    }
    process.exit(1);
  }
};

const rollbackMigrations = async () => {
  try {
    console.log('🔄 Starting migration rollback...');
    console.log('⚠️  WARNING: This will remove all multi-tenant data and structure!\n');
    
    // Connect to database
    await connectDB();
    
    const confirm = await askQuestion('Are you sure you want to rollback all migrations? This cannot be undone! (y/N): ');
    if (confirm.toLowerCase() !== 'y' && confirm.toLowerCase() !== 'yes') {
      console.log('Rollback cancelled.');
      rl.close();
      mongoose.connection.close();
      return;
    }
    
    const doubleConfirm = await askQuestion('Type "ROLLBACK" to confirm: ');
    if (doubleConfirm !== 'ROLLBACK') {
      console.log('Rollback cancelled - confirmation text did not match.');
      rl.close();
      mongoose.connection.close();
      return;
    }
    
    console.log('🗑️  Removing tenant-specific data...');
    
    // Remove multi-tenant specific collections
    await Tenant.deleteMany({});
    console.log('✅ Removed all tenants');
    
    await SuperAdmin.deleteMany({});
    console.log('✅ Removed all super admins');
    
    await SubscriptionPlan.deleteMany({});
    console.log('✅ Removed all subscription plans');
    
    console.log('🔄 Removing tenantId from existing collections...');
    
    // Remove tenantId field from all collections
    const collections = [
      { model: Company, name: 'companies' },
      { model: User, name: 'users' },
      { model: Customer, name: 'customers' },
      { model: Carrier, name: 'carriers' },
      { model: Order, name: 'orders' },
      { model: Equipment, name: 'equipment' },
      { model: Charges, name: 'charges' },
      { model: Commodities, name: 'commodities' },
      { model: Files, name: 'files' },
      { model: Notifications, name: 'notifications' },
      { model: PaymentLogs, name: 'paymentlogs' },
      { model: EmployeeDoc, name: 'employeedocs' }
    ];
    
    for (const { model, name } of collections) {
      try {
        const result = await model.updateMany(
          { tenantId: { $exists: true } },
          { $unset: { tenantId: 1, isTenantAdmin: 1 } }
        );
        console.log(`✅ Removed tenantId from ${result.modifiedCount} ${name} records`);
      } catch (error) {
        console.log(`⚠️  Error updating ${name}:`, error.message);
      }
    }
    
    console.log('🔧 Dropping multi-tenant indexes...');
    
    // Drop multi-tenant indexes
    const indexCollections = ['tenants', 'users', 'orders', 'customers', 'carriers', 'companies'];
    
    for (const collectionName of indexCollections) {
      try {
        const collection = mongoose.connection.db.collection(collectionName);
        await collection.dropIndex({ tenantId: 1 });
        console.log(`✅ Dropped tenantId index for ${collectionName}`);
      } catch (error) {
        // Index might not exist, ignore error
      }
      
      try {
        if (collectionName === 'users') {
          await collection.dropIndex({ tenantId: 1, email: 1 });
          await collection.dropIndex({ tenantId: 1, role: 1 });
        }
        if (collectionName === 'orders') {
          await collection.dropIndex({ tenantId: 1, order_status: 1 });
          await collection.dropIndex({ tenantId: 1, createdAt: -1 });
        }
        if (collectionName === 'tenants') {
          await collection.dropIndex({ subdomain: 1 });
          await collection.dropIndex({ status: 1 });
        }
      } catch (error) {
        // Indexes might not exist, ignore error
      }
    }
    
    console.log('✅ Rollback completed successfully!');
    console.log('\n📋 Your database has been restored to single-tenant mode.');
    console.log('All multi-tenant structures have been removed.');
    
    rl.close();
    mongoose.connection.close();
    
  } catch (error) {
    console.error('❌ Rollback failed:', error);
    rl.close();
    if (mongoose.connection.readyState === 1) {
      mongoose.connection.close();
    }
    process.exit(1);
  }
};

// Check command line arguments
const showHelp = () => {
  console.log('🚀 Multi-Tenant Migration Runner');
  console.log('\nUsage:');
  console.log('  node scripts/runMigration.js           # Run migrations');
  console.log('  node scripts/runMigration.js --rollback # Rollback all migrations');
  console.log('  node scripts/runMigration.js --help     # Show this help');
  console.log('\nDescription:');
  console.log('  This script sets up multi-tenant architecture for your carrier management system.');
  console.log('  It creates tenant structure, subscription plans, and migrates existing data.');
  console.log('\nIMPORTANT:');
  console.log('  Always backup your database before running migrations!');
};

if (process.argv.includes('--help')) {
  showHelp();
  process.exit(0);
}

// Run the migration
runMigrations();