require('dotenv').config();
const Tenant = require('./db/Tenant');
const SubscriptionPlan = require('./db/SubscriptionPlan');
const User = require('./db/Users');
const Order = require('./db/Order');
const connectDB = require('./db/config');

async function debugTenantLimits() {
  try {
    await connectDB();
    console.log('Database connected successfully');
    
    console.log('\n=== Debugging Tenant Limits Issue ===');
    
    // Get cross-miles tenant (the one showing in the screenshot)
    const tenantId = 'cross-miles-carrier-inc';
    
    console.log('\n1. Tenant Data:');
    const tenant = await Tenant.findOne({ tenantId }).lean();
    if (tenant) {
      console.log('Tenant found:', tenant.name);
      console.log('Subscription:', JSON.stringify(tenant.subscription, null, 2));
      console.log('Settings:', JSON.stringify(tenant.settings, null, 2));
    } else {
      console.log('❌ Tenant not found');
      return;
    }
    
    console.log('\n2. Subscription Plan Data:');
    let subscriptionPlan = null;
    
    if (tenant.subscription.plan) {
      if (typeof tenant.subscription.plan === 'string') {
        subscriptionPlan = await SubscriptionPlan.findOne({
          $or: [
            { slug: tenant.subscription.plan },
            { name: { $regex: tenant.subscription.plan, $options: 'i' } }
          ]
        }).lean();
      } else {
        subscriptionPlan = await SubscriptionPlan.findById(tenant.subscription.plan).lean();
      }
    }
    
    if (subscriptionPlan) {
      console.log('Subscription Plan found:', subscriptionPlan.name);
      console.log('Plan limits:', JSON.stringify(subscriptionPlan.limits, null, 2));
    } else {
      console.log('❌ No subscription plan found');
    }
    
    console.log('\n3. Current Usage:');
    const activeUserCount = await User.countDocuments(User.activeFilter(tenantId));
    const allUserCount = await User.find({ tenantId }, { includeInactive: true }).countDocuments();
    const orderCount = await Order.countDocuments({ tenantId });
    
    console.log(`Active users: ${activeUserCount}`);
    console.log(`All users: ${allUserCount}`);
    console.log(`Orders: ${orderCount}`);
    
    console.log('\n4. Limit Resolution Analysis:');
    
    // planLimitsMiddleware logic
    const middlewareLimits = subscriptionPlan?.limits || {
      maxUsers: tenant.settings?.maxUsers || 10,
      maxOrders: tenant.settings?.maxOrders || 1000,
      maxCustomers: tenant.settings?.maxCustomers || 1000,
      maxCarriers: tenant.settings?.maxCarriers || 500
    };
    console.log('Middleware limits (planLimitsMiddleware.js):', middlewareLimits);
    
    // tenantAdminController logic  
    const controllerLimits = subscriptionPlan?.limits || tenant.subscription.planLimits || {
      maxUsers: tenant.settings?.maxUsers || 10,
      maxOrders: tenant.settings?.maxOrders || 1000,
      maxCustomers: tenant.settings?.maxCustomers || 1000,
      maxCarriers: tenant.settings?.maxCarriers || 500
    };
    console.log('Controller limits (tenantAdminController.js):', controllerLimits);
    
    console.log('\n5. Warning Calculation (middleware logic):');
    const userWarning = middlewareLimits.maxUsers > 0 && allUserCount / middlewareLimits.maxUsers > 0.8;
    const orderWarning = middlewareLimits.maxOrders > 0 && orderCount / middlewareLimits.maxOrders > 0.8;
    
    console.log(`User warning (${allUserCount}/${middlewareLimits.maxUsers}): ${userWarning}`);
    console.log(`Order warning (${orderCount}/${middlewareLimits.maxOrders}): ${orderWarning}`);
    
    console.log('\n6. Subscription Details (controller logic):');
    console.log(`Users: ${activeUserCount}/${controllerLimits.maxUsers}`);
    console.log(`Orders: ${orderCount}/${controllerLimits.maxOrders}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

debugTenantLimits();