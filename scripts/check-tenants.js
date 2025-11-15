const mongoose = require('mongoose');
require('dotenv').config();

const Tenant = require('../db/Tenant');

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

async function checkTenants() {
  try {
    console.log('🏢 Listing all tenants...\n');
    
    const tenants = await Tenant.find({}).lean();
    
    console.log(`Found ${tenants.length} tenants:\n`);
    
    tenants.forEach((tenant, index) => {
      console.log(`${index + 1}. ${tenant.name}`);
      console.log(`   _id: ${tenant._id}`);
      console.log(`   Tenant ID: ${tenant.tenantId}`);
      console.log(`   Subdomain: ${tenant.subdomain}`);
      console.log(`   Domain: ${tenant.domain}`);
      console.log(`   Status: ${tenant.status}`);
      console.log(`   Subscription Status: ${tenant.subscription?.status}`);
      console.log(`   Admin Email: ${tenant.contactInfo?.adminEmail || 'N/A'}`);
      console.log('');
    });
    
    // Check for specific tenant ID
    const crossMilesTenant = await Tenant.findOne({ tenantId: 'cross-miles-carrier-inc' });
    console.log('\n🔍 Looking for cross-miles-carrier-inc tenant:');
    if (crossMilesTenant) {
      console.log('✅ Found cross-miles-carrier-inc tenant:', {
        name: crossMilesTenant.name,
        tenantId: crossMilesTenant.tenantId,
        status: crossMilesTenant.status,
        subscriptionStatus: crossMilesTenant.subscription?.status
      });
    } else {
      console.log('❌ cross-miles-carrier-inc tenant not found!');
      console.log('This might be why login is failing. Creating tenant record...');
      
      // Create the missing tenant
      const newTenant = new Tenant({
        tenantId: 'cross-miles-carrier-inc',
        name: 'Cross Miles Carrier Inc',
        domain: 'logistikore.com',
        subdomain: 'cross-miles-carrier-inc',
        status: 'active',
        subscription: {
          status: 'active',
          startDate: new Date(),
          planSlug: 'enterprise'
        },
        contactInfo: {
          adminName: 'Admin',
          adminEmail: 'admin@crossmilescarrier.com'
        }
      });
      
      const savedTenant = await newTenant.save();
      console.log('✅ Created new tenant:', savedTenant.name);
    }
    
  } catch (error) {
    console.error('❌ Error checking tenants:', error);
    throw error;
  }
}

async function main() {
  try {
    await connectDB();
    await checkTenants();
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

main();