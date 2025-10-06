require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// Import models
const Tenant = require('../db/Tenant');
const SuperAdmin = require('../db/SuperAdmin');
const SubscriptionPlan = require('../db/SubscriptionPlan');
const Company = require('../db/Company');
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

const connectDB = require('../db/config');

const migrateExistingData = async () => {
  try {
    console.log('🚀 Starting data migration to multi-tenant...');
    
    // Connect to database
    await connectDB();
    
    // Check if migration has already been run
    const existingTenant = await Tenant.findOne({});
    if (existingTenant) {
      console.log('⚠️  Migration appears to have already been run. Tenant found:', existingTenant.name);
      console.log('If you want to re-run migration, please delete existing tenants first.');
      mongoose.connection.close();
      return;
    }
    
    console.log('🏢 Finding existing company data...');
    
    // Find the existing company (assumes single company setup)
    const existingCompany = await Company.findOne({}).lean();
    if (!existingCompany) {
      console.log('❌ No existing company found. Please run sample data generation first.');
      mongoose.connection.close();
      return;
    }
    
    console.log('✅ Found existing company:', existingCompany.name);
    
    // Generate unique tenant ID
    const tenantId = `tenant_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    console.log('🔑 Generated tenant ID:', tenantId);
    
    // Get the professional plan as default
    const defaultPlan = await SubscriptionPlan.findOne({ slug: 'professional' });
    if (!defaultPlan) {
      console.log('❌ Default subscription plan not found. Please run setup migration first.');
      mongoose.connection.close();
      return;
    }
    
    console.log('🎯 Creating tenant from existing company...');
    
    // Find an admin user for tenant creation
    const adminUser = await User.findOne({ role: 3 }).sort({ createdAt: 1 });
    const adminName = adminUser ? adminUser.name : 'System Admin';
    const adminEmail = adminUser ? adminUser.email : existingCompany.email;
    
    // Create tenant from existing company
    const tenant = await Tenant.create({
      tenantId,
      name: existingCompany.name,
      domain: 'spennypiggy.co', // Default domain
      subdomain: existingCompany.name.toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') || 'default-tenant',
      status: 'active',
      subscription: {
        plan: 'standard', // Use valid enum value instead of defaultPlan.slug
        status: 'active',
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        billingCycle: 'monthly'
      },
      settings: {
        maxUsers: 20,
        maxOrders: 500,
        features: ['orders', 'customers', 'carriers', 'advanced_reporting'],
        customizations: {}
      },
      contactInfo: {
        adminName: adminName,
        adminEmail: adminEmail,
        phone: existingCompany.phone,
        address: existingCompany.address,
        city: existingCompany.city,
        state: existingCompany.state,
        country: 'USA',
        zipcode: existingCompany.zip
      },
      billing: {
        balance: 0,
        nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        paymentMethod: 'card' // Use valid enum value
      }
    });
    
    console.log('✅ Tenant created:', tenant.name);
    
    console.log('🔄 Updating existing records with tenant ID...');
    
    // Update all existing records with the tenant ID
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
    
    const updateResults = {};
    
    for (const { model, name } of collections) {
      try {
        const result = await model.updateMany(
          { tenantId: { $exists: false } }, // Only update records without tenantId
          { $set: { tenantId: tenantId } }
        );
        updateResults[name] = result.modifiedCount;
        console.log(`✅ Updated ${result.modifiedCount} ${name} records`);
      } catch (error) {
        console.log(`⚠️  Error updating ${name}:`, error.message);
        updateResults[name] = 0;
      }
    }
    
    console.log('👤 Creating super admin account...');
    
    // Find the admin user to promote to super admin
    const tenantAdmin = await User.findOne({ 
      role: 3, // Admin role
      tenantId: tenantId 
    }).select('+password').sort({ createdAt: 1 }); // Get the first admin
    
    if (!tenantAdmin) {
      console.log('⚠️  No admin user found to promote to super admin');
    } else {
      // Create super admin account
      const superAdmin = new SuperAdmin({
        userId: tenantAdmin._id, // Link to the user record
        name: tenantAdmin.name,
        email: tenantAdmin.email,
        password: tenantAdmin.password, // Use existing password
        permissions: [
          'tenants.create',
          'tenants.read', 
          'tenants.update',
          'tenants.delete',
          'billing.manage',
          'analytics.view',
          'system.configure'
        ],
        status: 'active',
        createdBy: tenantAdmin._id,
        lastLogin: null
      });
      
      // Skip password hashing since we're using the already hashed password from user
      superAdmin._skipPasswordHash = true;
      await superAdmin.save();
      
      console.log('✅ Super admin created for user:', tenantAdmin.email);
      
      // Update the user to mark as tenant admin
      await User.findByIdAndUpdate(tenantAdmin._id, { 
        isTenantAdmin: true 
      });
    }
    
    console.log('🔍 Validating migration...');
    
    // Validate the migration
    const validation = {
      tenant: await Tenant.countDocuments({ tenantId }),
      users: await User.countDocuments({ tenantId }),
      customers: await Customer.countDocuments({ tenantId }),
      carriers: await Carrier.countDocuments({ tenantId }),
      orders: await Order.countDocuments({ tenantId }),
      equipment: await Equipment.countDocuments({ tenantId }),
      charges: await Charges.countDocuments({ tenantId }),
      commodities: await Commodities.countDocuments({ tenantId })
    };
    
    console.log('🎉 Migration completed successfully!');
    console.log('\n📊 Migration Summary:');
    console.log(`- Tenant ID: ${tenantId}`);
    console.log(`- Tenant Name: ${tenant.name}`);
    console.log(`- Subdomain: ${tenant.subdomain}`);
    console.log(`- Subscription Plan: ${tenant.subscription.plan}`);
    console.log('\n📈 Records Updated:');
    
    Object.entries(updateResults).forEach(([collection, count]) => {
      console.log(`- ${collection}: ${count} records`);
    });
    
    console.log('\n✅ Validation Counts:');
    Object.entries(validation).forEach(([collection, count]) => {
      console.log(`- ${collection}: ${count} records`);
    });
    
    if (tenantAdmin) {
      console.log('\n🔐 Super Admin Account:');
      console.log(`- Email: ${tenantAdmin.email}`);
      console.log(`- Name: ${tenantAdmin.name}`);
      console.log('- Use existing password to login as super admin');
    }
    
    console.log('\n🌐 Access URLs:');
    console.log(`- Tenant Dashboard: http://localhost:3000?tenant=${tenant.subdomain}`);
    console.log(`- Super Admin Panel: http://localhost:3000?tenant=admin`);
    
    mongoose.connection.close();
    
  } catch (error) {
    console.error('❌ Error during migration:', error);
    process.exit(1);
  }
};

module.exports = migrateExistingData;

// Run directly if called from command line
if (require.main === module) {
  migrateExistingData();
}