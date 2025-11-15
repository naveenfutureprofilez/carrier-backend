const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../db/Users');
const Tenant = require('../db/Tenant');
const Company = require('../db/Company');
const SubscriptionPlan = require('../db/SubscriptionPlan');

async function testTenantLogin() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/carrier';
    await mongoose.connect(mongoUri);
    console.log('🔌 Connected to MongoDB');

    // Test data
    const testData = {
      name: 'Test Tenant Company',
      adminName: 'Test Admin',
      adminEmail: 'testadmin@example.com',
      adminPhone: '555-1234',
      subscriptionPlan: 'basic',
      adminPassword: 'testpassword123'
    };

    console.log('\n🧪 Starting Tenant Creation and Login Test');
    console.log('📋 Test Data:', testData);

    // Step 1: Clean up any existing test data
    console.log('\n🧹 Cleaning up existing test data...');
    await User.deleteOne({ email: testData.adminEmail });
    await Tenant.deleteOne({ $or: [{ tenantId: 'test-tenant-company' }, { subdomain: 'test-tenant-company' }] });
    await Company.deleteOne({ name: testData.name });

    // Step 2: Ensure we have a subscription plan
    let plan = await SubscriptionPlan.findOne({ slug: testData.subscriptionPlan });
    if (!plan) {
      console.log('📦 Creating basic subscription plan...');
      plan = await SubscriptionPlan.create({
        name: 'Basic Plan',
        slug: 'basic',
        price: 29.99,
        billingCycle: 'monthly',
        limits: {
          maxUsers: 10,
          maxOrders: 500,
          maxCustomers: 200,
          maxCarriers: 100
        },
        features: ['basic_support', 'order_management']
      });
    }

    // Step 3: Create tenant (simulating superAdminController.createTenant)
    console.log('\n🏢 Creating tenant...');
    
    // Helper function to create URL-friendly tenant ID from name
    const createTenantId = (name) => {
      return name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 50);
    };

    const tenantId = createTenantId(testData.name);
    console.log('🆔 Generated tenantId:', tenantId);

    // Create tenant
    const tenant = await Tenant.create({
      tenantId,
      subdomain: tenantId, // Set subdomain to avoid null constraint
      name: testData.name,
      domain: 'localhost',
      status: 'active',
      contactInfo: {
        adminName: testData.adminName,
        adminEmail: testData.adminEmail,
        phone: testData.adminPhone
      },
      subscription: {
        plan: testData.subscriptionPlan,
        status: 'active',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        billingCycle: 'monthly'
      },
      settings: {
        maxUsers: plan.limits.maxUsers,
        maxOrders: plan.limits.maxOrders,
        features: plan.features,
      }
    });

    console.log('✅ Tenant created:', {
      tenantId: tenant.tenantId,
      name: tenant.name,
      status: tenant.status
    });

    // Create company
    const company = await Company.create({
      tenantId,
      name: testData.name,
      mc_code: `MC${Date.now()}`,
      dot_number: `DOT${Date.now()}`,
      address: 'Test Address',
      city: 'Test City',
      state: 'Test State',
      zip: '12345',
      email: testData.adminEmail,
      phone: testData.adminPhone
    });

    console.log('✅ Company created:', {
      id: company._id,
      name: company.name,
      tenantId: company.tenantId
    });

    // Create admin user (simulating the createTenant process)
    // Note: User model has pre-save hook that will hash the password automatically
    const adminUser = await User.create({
      tenantId,
      company: company._id,
      name: testData.adminName,
      email: testData.adminEmail,
      password: testData.adminPassword, // Plain password - will be hashed by pre-save hook
      phone: testData.adminPhone,
      country: 'USA',
      address: 'Test Address',
      role: 3, // Admin role
      position: 'Administrator',
      corporateID: `ADMIN_${Date.now()}`,
      isTenantAdmin: true
    });

    console.log('✅ Admin user created:', {
      id: adminUser._id,
      name: adminUser.name,
      email: adminUser.email,
      tenantId: adminUser.tenantId,
      role: adminUser.role
    });

    // Step 4: Test login authentication
    console.log('\n🔐 Testing login authentication...');
    
    // Find user as login function does
    const loginUser = await User.findOne({ 
      email: testData.adminEmail, 
      tenantId 
    }).select('+password').lean();

    console.log('🔍 User lookup result:', {
      found: !!loginUser,
      email: loginUser?.email,
      tenantId: loginUser?.tenantId,
      status: loginUser?.status,
      hasPassword: !!loginUser?.password
    });

    if (!loginUser) {
      throw new Error('❌ User not found during login lookup');
    }

    if (loginUser.status === 'inactive') {
      throw new Error('❌ User account is suspended');
    }

    // Test password comparison
    const passwordMatch = await bcrypt.compare(testData.adminPassword, loginUser.password);
    console.log('🔑 Password comparison result:', passwordMatch);

    // Test the exact condition from the login function
    const loginCondition = !loginUser || !(await bcrypt.compare(testData.adminPassword, loginUser.password));
    console.log('🎯 Login validation condition result:', loginCondition);

    if (loginCondition) {
      throw new Error('❌ Login validation would fail');
    } else {
      console.log('✅ Login validation would succeed!');
    }

    // Step 5: Test the actual login flow simulation
    console.log('\n🧪 Simulating full login flow...');
    
    const loginResult = {
      user: loginUser,
      tenantId: tenantId,
      success: !loginCondition
    };

    if (loginResult.success) {
      console.log('🎉 FULL LOGIN TEST PASSED!');
      console.log('📄 Login would return:', {
        status: true,
        message: 'Login Successfully !!',
        userId: loginResult.user._id,
        userEmail: loginResult.user.email,
        tenantId: loginResult.tenantId
      });
    } else {
      throw new Error('❌ Full login test failed');
    }

    console.log('\n✅ All tests completed successfully!');
    console.log('\n📝 Summary:');
    console.log('- Tenant created with ID:', tenantId);
    console.log('- Admin user created:', testData.adminEmail);
    console.log('- Login authentication works correctly');
    console.log('\n🎯 You can now test login with:');
    console.log('- Email:', testData.adminEmail);
    console.log('- Password:', testData.adminPassword);
    console.log('- TenantId:', tenantId);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

// Run if called directly
if (require.main === module) {
  testTenantLogin();
}

module.exports = testTenantLogin;