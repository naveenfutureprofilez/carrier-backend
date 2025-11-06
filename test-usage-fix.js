require('dotenv').config();
const Tenant = require('./db/Tenant');
const SubscriptionPlan = require('./db/SubscriptionPlan');
const User = require('./db/Users');
const Order = require('./db/Order');
const Customer = require('./db/Customer');
const Carrier = require('./db/Carrier');
const connectDB = require('./db/config');

async function testUsageFix() {
  try {
    await connectDB();
    console.log('Database connected successfully');
    
    console.log('\n=== Testing Fixed getTenantUsage Logic ===');
    
    // Simulate the updated getTenantUsage function
    async function simulateGetTenantUsage(tenantId) {
      const tenant = await Tenant.findOne({ tenantId });
      
      if (!tenant) {
        return { error: 'Tenant not found' };
      }
    
      // Get subscription plan limits - same logic as other functions for consistency
      let subscriptionPlan = null;
      if (tenant.subscription.plan) {
        if (typeof tenant.subscription.plan === 'string') {
          subscriptionPlan = await SubscriptionPlan.findOne({
            $or: [
              { slug: tenant.subscription.plan },
              { name: { $regex: tenant.subscription.plan, $options: 'i' } }
            ]
          });
        } else {
          subscriptionPlan = await SubscriptionPlan.findById(tenant.subscription.plan);
        }
      }
    
      const currentUsage = {
        users: await User.countDocuments(User.activeFilter(tenantId)),
        orders: await Order.countDocuments({ tenantId }),
        customers: await Customer.countDocuments({ tenantId }),
        carriers: await Carrier.countDocuments({ tenantId })
      };
    
      // Use subscription plan limits first, then fallback to tenant settings
      const limits = {
        maxUsers: subscriptionPlan?.limits?.maxUsers || tenant.subscription?.planLimits?.maxUsers || tenant.settings?.maxUsers || 10,
        maxOrders: subscriptionPlan?.limits?.maxOrders || tenant.subscription?.planLimits?.maxOrders || tenant.settings?.maxOrders || 1000,
        maxCustomers: subscriptionPlan?.limits?.maxCustomers || tenant.subscription?.planLimits?.maxCustomers || tenant.settings?.maxCustomers || 999999,
        maxCarriers: subscriptionPlan?.limits?.maxCarriers || tenant.subscription?.planLimits?.maxCarriers || tenant.settings?.maxCarriers || 999999
      };
      
      const utilizationPercentage = {
        users: limits.maxUsers > 0 ? (currentUsage.users / limits.maxUsers) * 100 : 0,
        orders: limits.maxOrders > 0 ? (currentUsage.orders / limits.maxOrders) * 100 : 0,
        customers: limits.maxCustomers > 0 ? (currentUsage.customers / limits.maxCustomers) * 100 : 0,
        carriers: limits.maxCarriers > 0 ? (currentUsage.carriers / limits.maxCarriers) * 100 : 0
      };
    
      return {
        status: true,
        data: {
          usage: currentUsage,
          limits,
          utilization: utilizationPercentage,
          warnings: {
            nearUserLimit: utilizationPercentage.users > 80,
            nearOrderLimit: utilizationPercentage.orders > 80
          }
        }
      };
    }
    
    // Test cross-miles tenant
    const result = await simulateGetTenantUsage('cross-miles-carrier-inc');
    
    if (result.error) {
      console.log('❌ Error:', result.error);
      return;
    }
    
    console.log('\n📊 Usage Data:');
    console.log('Current Usage:', result.data.usage);
    console.log('Limits:', result.data.limits);
    console.log('Utilization %:', result.data.utilization);
    console.log('Warnings:', result.data.warnings);
    
    console.log('\n✅ Expected Usage Warning Display:');
    const { users, orders } = result.data.usage;
    const { maxUsers, maxOrders } = result.data.limits;
    
    if (result.data.warnings.nearUserLimit) {
      console.log(`⚠️  You're approaching your user limit (${users}/${maxUsers})`);
    } else {
      console.log(`✅ Users: ${users}/${maxUsers} (within limit)`);
    }
    
    if (result.data.warnings.nearOrderLimit) {
      console.log(`⚠️  You're approaching your order limit (${orders}/${maxOrders})`);
    } else {
      console.log(`✅ Orders: ${orders}/${maxOrders} (within limit)`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testUsageFix();