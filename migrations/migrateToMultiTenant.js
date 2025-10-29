const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// Import models
const Company = require('../db/Company');
const User = require('../db/Users');
const Order = require('../db/Order');
const Customer = require('../db/Customer');
const Carrier = require('../db/Carrier');
const Equipment = require('../db/Equipment');
const Charges = require('../db/Charges');
const Commudity = require('../db/Commudity');
const Files = require('../db/Files');
const Notification = require('../db/Notification');
const PaymentLogs = require('../db/PaymentLogs');
const EmployeeDoc = require('../db/EmployeeDoc');

// Import new models
const Tenant = require('../db/Tenant');
const SuperAdmin = require('../db/SuperAdmin');
const SubscriptionPlan = require('../db/SubscriptionPlan');

// Configuration
const DEFAULT_TENANT_ID = 'legacy_tenant_001';
const DOMAIN = process.env.DOMAIN || 'yourapp.com';

async function createDefaultSubscriptionPlans() {
  console.log('📋 Creating default subscription plans...');
  
  const plans = [
    {
      name: 'Basic',
      slug: 'basic',
      description: 'Perfect for small logistics companies getting started',
      price: 29,
      currency: 'USD',
      billingCycle: 'monthly',

      features: [
        'Order Management',
        'Customer Management',
        'Carrier Management',
        'Basic Reporting',
        'Email Support'
      ],
      limits: {
        maxUsers: 5,
        maxOrders: 500,
        maxCustomers: 100,
        maxCarriers: 50
      }
    },
    {
      name: 'Professional',
      slug: 'professional',
      description: 'For growing companies with advanced needs',
      price: 79,
      currency: 'USD',
      billingCycle: 'monthly',

      features: [
        'Everything in Basic',
        'Advanced Reporting',
        'Payment Management',
        'Employee Management',
        'Document Management',
        'Priority Support'
      ],
      limits: {
        maxUsers: 20,
        maxOrders: 2000,
        maxCustomers: 500,
        maxCarriers: 200
      },
      isPopular: true
    },
    {
      name: 'Enterprise',
      slug: 'enterprise',
      description: 'For large operations with unlimited needs',
      price: 199,
      currency: 'USD',
      billingCycle: 'monthly',

      features: [
        'Everything in Professional',
        'Unlimited Users',
        'Unlimited Orders',
        'Custom Integrations',
        'White-label Options',
        'Dedicated Support',
        'Custom Training'
      ],
      limits: {
        maxUsers: 999999, // Unlimited
        maxOrders: 999999, // Unlimited
        maxCustomers: 999999, // Unlimited
        maxCarriers: 999999 // Unlimited
      }
    }
  ];

  for (const planData of plans) {
    const existingPlan = await SubscriptionPlan.findOne({ slug: planData.slug });
    if (!existingPlan) {
      await SubscriptionPlan.create(planData);
      console.log(`✅ Created subscription plan: ${planData.name}`);
    } else {
      console.log(`⏭️  Subscription plan already exists: ${planData.name}`);
    }
  }
}

async function createDefaultTenant() {
  console.log('🏢 Creating default tenant from existing company...');
  
  // Get existing company data
  const existingCompany = await Company.findOne().lean();
  if (!existingCompany) {
    throw new Error('No existing company found! Please ensure you have company data before migration.');
  }
  
  console.log(`Found existing company: ${existingCompany.name}`);
  
  // Check if tenant already exists
  const existingTenant = await Tenant.findOne({ tenantId: DEFAULT_TENANT_ID });
  if (existingTenant) {
    console.log('⏭️  Default tenant already exists, skipping creation.');
    return existingTenant;
  }
  
  // Generate subdomain from company name
  const subdomain = existingCompany.name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 20) || 'legacy';
    
  // Create tenant
  const tenantData = {
    tenantId: DEFAULT_TENANT_ID,
    name: existingCompany.name,
    domain: DOMAIN,
    subdomain: subdomain,
    status: 'active',
    subscription: {
      plan: 'enterprise',
      status: 'active',
      startDate: existingCompany.createdAt || new Date(),
      billingCycle: 'yearly'
    },
    settings: {
      maxUsers: 999999, // Unlimited for legacy tenant
      maxOrders: 999999,
      maxCustomers: 999999,
      maxCarriers: 999999,
      maxStorage: '1000GB',
      features: [
        'orders', 'customers', 'carriers', 'employees',
        'payments', 'advanced_reporting', 'document_management'
      ]
    },
    contactInfo: {
      adminName: 'Legacy Admin',
      adminEmail: existingCompany.email || 'admin@example.com',
      phone: existingCompany.phone || '',
      address: existingCompany.address || ''
    }
  };
  
  const tenant = await Tenant.create(tenantData);
  console.log(`✅ Created default tenant: ${tenant.name} (${tenant.subdomain}.${tenant.domain})`);
  
  return tenant;
}

async function migrateSingleTenantData() {
  console.log('📦 Starting data migration to multi-tenant structure...');
  
  const collections = [
    { name: 'companies', model: Company },
    { name: 'users', model: User },
    { name: 'orders', model: Order },
    { name: 'customers', model: Customer },
    { name: 'carriers', model: Carrier },
    { name: 'equipment', model: Equipment },
    { name: 'charges', model: Charges },
    { name: 'commudity', model: Commudity },
    { name: 'files', model: Files },
    { name: 'notifications', model: Notification },
    { name: 'paymentlogs', model: PaymentLogs },
    { name: 'employee_docs', model: EmployeeDoc }
  ];
  
  for (const collection of collections) {
    try {
      console.log(`\n🔄 Migrating ${collection.name}...`);
      
      // Count existing records
      const totalRecords = await collection.model.countDocuments();
      console.log(`Found ${totalRecords} records in ${collection.name}`);
      
      if (totalRecords === 0) {
        console.log(`⏭️  No records to migrate in ${collection.name}`);
        continue;
      }
      
      // Count records without tenantId
      const recordsWithoutTenantId = await collection.model.countDocuments({
        $or: [
          { tenantId: { $exists: false } },
          { tenantId: null },
          { tenantId: '' }
        ]
      });
      
      if (recordsWithoutTenantId === 0) {
        console.log(`✅ All records in ${collection.name} already have tenantId`);
        continue;
      }
      
      // Update records without tenantId
      const updateResult = await collection.model.updateMany(
        {
          $or: [
            { tenantId: { $exists: false } },
            { tenantId: null },
            { tenantId: '' }
          ]
        },
        {
          $set: { tenantId: DEFAULT_TENANT_ID }
        }
      );
      
      console.log(`✅ Updated ${updateResult.modifiedCount} records in ${collection.name} with tenantId`);
      
    } catch (error) {
      console.error(`❌ Error migrating ${collection.name}:`, error.message);
      throw error;
    }
  }
}

async function createSuperAdminFromExistingAdmin() {
  console.log('\n👤 Creating super admin from existing admin user...');
  
  // Find existing super admin user
  const existingAdmin = await User.findOne({
    $or: [
      { isSuper: "1" },
      { isSuper: 1 },
      { role: 3, is_admin: 1 }
    ]
  }).lean();
  
  if (!existingAdmin) {
    console.log('⚠️  No existing admin found, creating default super admin...');
    
    // Create default super admin
    const defaultPassword = 'SuperAdmin123!'; // Change this in production
    const superAdmin = await SuperAdmin.create({
      name: 'Super Administrator',
      email: 'superadmin@' + DOMAIN,
      password: defaultPassword,
      role: 'super_admin',
      status: 'active'
    });
    
    console.log(`✅ Created default super admin with email: ${superAdmin.email}`);
    console.log(`⚠️  Default password: ${defaultPassword} - CHANGE THIS IMMEDIATELY!`);
    
    return superAdmin;
  }
  
  // Check if super admin already exists
  const existingSuperAdmin = await SuperAdmin.findOne({ email: existingAdmin.email });
  if (existingSuperAdmin) {
    console.log('⏭️  Super admin already exists with email:', existingAdmin.email);
    return existingSuperAdmin;
  }
  
  // Create super admin from existing admin using direct database insertion
  const superAdminData = {
    name: existingAdmin.name,
    email: existingAdmin.email,
    password: existingAdmin.password, // Already hashed
    avatar: existingAdmin.avatar,
    role: 'super_admin',
    status: 'active',
    createdAt: existingAdmin.createdAt,
    updatedAt: new Date(),
    permissions: [
      'tenants.create',
      'tenants.read',
      'tenants.update',
      'tenants.delete',
      'tenants.suspend',
      'billing.manage',
      'analytics.view',
      'system.configure',
      'users.manage',
      'reports.generate'
    ]
  };
  
  // Insert directly to bypass middleware
  const result = await SuperAdmin.collection.insertOne(superAdminData);
  const superAdmin = await SuperAdmin.findById(result.insertedId);
  
  console.log(`✅ Created super admin from existing admin: ${superAdmin.email}`);
  
  // Update the existing user to be tenant admin
  await User.findByIdAndUpdate(existingAdmin._id, {
    isTenantAdmin: true,
    tenantPermissions: [
      'users.manage',
      'company.configure',
      'reports.generate',
      'integrations.manage'
    ]
  });
  
  console.log(`✅ Updated existing admin user to be tenant admin`);
  
  return superAdmin;
}

async function createDatabaseIndexes() {
  console.log('\n📊 Creating database indexes for performance...');
  
  try {
    // Create indexes for multi-tenant queries
    const db = mongoose.connection.db;
    
    const indexOperations = [
      // Users indexes
      { collection: 'users', index: { tenantId: 1, email: 1 }, options: { unique: true, background: true } },
      { collection: 'users', index: { tenantId: 1, corporateID: 1 }, options: { unique: true, background: true } },
      { collection: 'users', index: { tenantId: 1, role: 1 }, options: { background: true } },
      
      // Orders indexes
      { collection: 'orders', index: { tenantId: 1, serial_no: 1 }, options: { unique: true, background: true } },
      { collection: 'orders', index: { tenantId: 1, createdAt: -1 }, options: { background: true } },
      { collection: 'orders', index: { tenantId: 1, customer: 1 }, options: { background: true } },
      { collection: 'orders', index: { tenantId: 1, carrier: 1 }, options: { background: true } },
      
      // Customers indexes
      { collection: 'customers', index: { tenantId: 1, email: 1 }, options: { unique: true, background: true } },
      { collection: 'customers', index: { tenantId: 1, customerCode: 1 }, options: { background: true } },
      
      // Carriers indexes
      { collection: 'carriers', index: { tenantId: 1, email: 1 }, options: { unique: true, background: true } },
      { collection: 'carriers', index: { tenantId: 1, carrierID: 1 }, options: { unique: true, background: true } },
      
      // Companies indexes
      { collection: 'companies', index: { tenantId: 1 }, options: { unique: true, background: true } }
    ];
    
    for (const { collection, index, options } of indexOperations) {
      try {
        await db.collection(collection).createIndex(index, options);
        console.log(`✅ Created index for ${collection}:`, Object.keys(index).join(', '));
      } catch (error) {
        if (error.code === 11000 || error.codeName === 'IndexOptionsConflict') {
          console.log(`⏭️  Index already exists for ${collection}:`, Object.keys(index).join(', '));
        } else {
          console.error(`❌ Failed to create index for ${collection}:`, error.message);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error creating indexes:', error.message);
    throw error;
  }
}

async function validateMigration() {
  console.log('\n✅ Validating migration...');
  
  try {
    // Validate tenant creation
    const tenant = await Tenant.findOne({ tenantId: DEFAULT_TENANT_ID });
    if (!tenant) {
      throw new Error('Default tenant not found after migration');
    }
    console.log(`✅ Tenant validation passed: ${tenant.name}`);
    
    // Validate super admin creation
    const superAdminCount = await SuperAdmin.countDocuments();
    if (superAdminCount === 0) {
      throw new Error('No super admin found after migration');
    }
    console.log(`✅ Super admin validation passed: ${superAdminCount} admin(s) created`);
    
    // Validate data migration
    const collections = [
      { name: 'companies', model: Company },
      { name: 'users', model: User },
      { name: 'orders', model: Order },
      { name: 'customers', model: Customer },
      { name: 'carriers', model: Carrier }
    ];
    
    for (const collection of collections) {
      const totalRecords = await collection.model.countDocuments();
      const recordsWithTenantId = await collection.model.countDocuments({ tenantId: DEFAULT_TENANT_ID });
      
      console.log(`📊 ${collection.name}: ${recordsWithTenantId}/${totalRecords} records have tenantId`);
      
      if (totalRecords > 0 && recordsWithTenantId === 0) {
        throw new Error(`No records in ${collection.name} have tenantId after migration`);
      }
    }
    
    console.log('✅ Migration validation completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration validation failed:', error.message);
    throw error;
  }
}

async function printMigrationSummary() {
  console.log('\n📈 Migration Summary:');
  console.log('='.repeat(50));
  
  const tenant = await Tenant.findOne({ tenantId: DEFAULT_TENANT_ID });
  const superAdminCount = await SuperAdmin.countDocuments();
  const userCount = await User.countDocuments({ tenantId: DEFAULT_TENANT_ID });
  const orderCount = await Order.countDocuments({ tenantId: DEFAULT_TENANT_ID });
  const customerCount = await Customer.countDocuments({ tenantId: DEFAULT_TENANT_ID });
  const carrierCount = await Carrier.countDocuments({ tenantId: DEFAULT_TENANT_ID });
  
  console.log(`🏢 Tenant: ${tenant.name}`);
  console.log(`🌐 Domain: ${tenant.subdomain}.${tenant.domain}`);
  console.log(`👥 Super Admins: ${superAdminCount}`);
  console.log(`👤 Users: ${userCount}`);
  console.log(`📦 Orders: ${orderCount}`);
  console.log(`🏪 Customers: ${customerCount}`);
  console.log(`🚛 Carriers: ${carrierCount}`);
  console.log('='.repeat(50));
  
  console.log('\n🎉 Migration completed successfully!');
  console.log('\n📝 Next Steps:');
  console.log('1. Test your existing application functionality');
  console.log('2. Access super admin portal at: admin.' + DOMAIN);
  console.log('3. Access your company portal at: ' + tenant.subdomain + '.' + DOMAIN);
  console.log('4. Create additional tenants through super admin portal');
  console.log('5. Update your authentication system to use tenant context');
}

// Main migration function
async function migrateToMultiTenant() {
  try {
    console.log('🚀 Starting multi-tenant migration...');
    console.log('Domain:', DOMAIN);
    console.log('Default Tenant ID:', DEFAULT_TENANT_ID);
    
    // Step 1: Create default subscription plans
    await createDefaultSubscriptionPlans();
    
    // Step 2: Create default tenant from existing company
    await createDefaultTenant();
    
    // Step 3: Migrate existing data to multi-tenant structure
    await migrateSingleTenantData();
    
    // Step 4: Create super admin from existing admin user
    await createSuperAdminFromExistingAdmin();
    
    // Step 5: Create database indexes for performance
    await createDatabaseIndexes();
    
    // Step 6: Validate migration
    await validateMigration();
    
    // Step 7: Print summary
    await printMigrationSummary();
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.log('\n🔄 Rolling back migration...');
    
    // Add rollback logic here if needed
    throw error;
  }
}

// Rollback function
async function rollbackMigration() {
  console.log('🔄 Starting migration rollback...');
  
  try {
    const collections = [
      'companies', 'users', 'orders', 'customers', 'carriers',
      'equipment', 'charges', 'commudity', 'files', 'notifications',
      'paymentlogs', 'employee_docs'
    ];
    
    // Remove tenantId from all collections
    for (const collectionName of collections) {
      const result = await mongoose.connection.db.collection(collectionName).updateMany(
        {},
        { $unset: { tenantId: "" } }
      );
      console.log(`✅ Removed tenantId from ${result.modifiedCount} records in ${collectionName}`);
    }
    
    // Remove multi-tenant specific collections
    await mongoose.connection.db.collection('tenants').drop().catch(() => {});
    await mongoose.connection.db.collection('superadmins').drop().catch(() => {});
    await mongoose.connection.db.collection('subscription_plans').drop().catch(() => {});
    
    console.log('✅ Migration rollback completed');
    
  } catch (error) {
    console.error('❌ Rollback failed:', error);
    throw error;
  }
}

module.exports = {
  migrateToMultiTenant,
  rollbackMigration,
  DEFAULT_TENANT_ID
};