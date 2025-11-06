const mongoose = require('mongoose');
const Tenant = require('../db/Tenant');
const Order = require('../db/Order');
const Customer = require('../db/Customer');
const Carrier = require('../db/Carrier');
const Company = require('../db/Company');
const User = require('../db/Users');
require('dotenv').config();

// Helper function to create URL-friendly tenant ID from name
const createTenantId = (name) => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
    .substring(0, 50); // Limit length
};

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

const fixTenantSubdomains = async () => {
  try {
    console.log('🚀 Starting tenant ID/subdomain consolidation...');
    
    // Get all tenants
    const tenants = await Tenant.find({});
    console.log(`Found ${tenants.length} tenants to process`);
    
    const updates = [];
    
    for (const tenant of tenants) {
      console.log(`\n📋 Processing: ${tenant.name}`);
      console.log(`   Current ID: ${tenant.tenantId}`);
      console.log(`   Current Subdomain: ${tenant.subdomain}`);
      
      // Create new tenant ID from name
      const newTenantId = createTenantId(tenant.name);
      console.log(`   New ID (from name): ${newTenantId}`);
      
      // Check if this tenant ID already exists
      const existingTenant = await Tenant.findOne({ 
        tenantId: newTenantId,
        _id: { $ne: tenant._id } 
      });
      
      let finalTenantId = newTenantId;
      
      if (existingTenant) {
        // If collision, add a number
        let counter = 1;
        let testId = `${newTenantId}-${counter}`;
        
        while (await Tenant.findOne({ tenantId: testId, _id: { $ne: tenant._id } })) {
          counter++;
          testId = `${newTenantId}-${counter}`;
        }
        
        finalTenantId = testId;
        console.log(`   ⚠️  Collision detected, using: ${finalTenantId}`);
      }
      
      updates.push({
        tenant,
        oldTenantId: tenant.tenantId,
        newTenantId: finalTenantId
      });
    }
    
    // Confirm the updates
    console.log('\n📊 Planned updates:');
    updates.forEach(update => {
      console.log(`  ${update.tenant.name}: ${update.oldTenantId} → ${update.newTenantId}`);
    });
    
    console.log('\n🔄 Applying updates...');
    
    for (const update of updates) {
      const { tenant, oldTenantId, newTenantId } = update;
      
      if (oldTenantId === newTenantId) {
        console.log(`✅ ${tenant.name}: No change needed`);
        continue;
      }
      
      console.log(`🔄 Updating ${tenant.name}: ${oldTenantId} → ${newTenantId}`);
      
      // Update tenant record
      await Tenant.findByIdAndUpdate(tenant._id, {
        tenantId: newTenantId,
        subdomain: newTenantId, // Keep subdomain same as tenantId
        updatedAt: new Date()
      });
      
      // Update all related records
      const [orderUpdate, customerUpdate, carrierUpdate, companyUpdate, userUpdate] = await Promise.all([
        Order.updateMany(
          { tenantId: oldTenantId },
          { $set: { tenantId: newTenantId } }
        ),
        Customer.updateMany(
          { tenantId: oldTenantId },
          { $set: { tenantId: newTenantId } }
        ),
        Carrier.updateMany(
          { tenantId: oldTenantId },
          { $set: { tenantId: newTenantId } }
        ),
        Company.updateMany(
          { tenantId: oldTenantId },
          { $set: { tenantId: newTenantId } }
        ),
        User.updateMany(
          { tenantId: oldTenantId },
          { $set: { tenantId: newTenantId } }
        )
      ]);
      
      console.log(`   ✅ Updated: ${orderUpdate.modifiedCount} orders, ${customerUpdate.modifiedCount} customers, ${carrierUpdate.modifiedCount} carriers, ${companyUpdate.modifiedCount} companies, ${userUpdate.modifiedCount} users`);
    }
    
    console.log('\n🔍 Verification...');
    
    // Verify the changes
    const updatedTenants = await Tenant.find({});
    console.log('\nFinal tenant list:');
    for (const tenant of updatedTenants) {
      const [orders, customers, carriers] = await Promise.all([
        Order.countDocuments({ tenantId: tenant.tenantId }),
        Customer.countDocuments({ tenantId: tenant.tenantId }),
        Carrier.countDocuments({ tenantId: tenant.tenantId })
      ]);
      
      console.log(`  📋 ${tenant.name}`);
      console.log(`     ID: ${tenant.tenantId}`);
      console.log(`     Subdomain: ${tenant.subdomain}`);
      console.log(`     Data: ${orders} orders, ${customers} customers, ${carriers} carriers`);
    }
    
    console.log('\n🎉 Tenant ID/subdomain consolidation completed!');
    console.log('Now tenantId and subdomain are the same, and they\'re URL-friendly!');
    
  } catch (error) {
    console.error('❌ Error during consolidation:', error);
    throw error;
  }
};

// Run the script
const main = async () => {
  try {
    await connectDB();
    await fixTenantSubdomains();
    process.exit(0);
  } catch (error) {
    console.error('Script failed:', error);
    process.exit(1);
  }
};

// Only run if this file is executed directly
if (require.main === module) {
  main();
}

module.exports = { fixTenantSubdomains, createTenantId };