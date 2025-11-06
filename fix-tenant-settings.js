require('dotenv').config();
const Tenant = require('./db/Tenant');
const SubscriptionPlan = require('./db/SubscriptionPlan');
const connectDB = require('./db/config');

async function fixTenantSettings() {
  try {
    await connectDB();
    console.log('Database connected successfully');
    
    console.log('\n=== Fixing Tenant Settings ===');
    
    const tenantId = 'cross-miles-carrier-inc';
    
    // Get tenant and subscription plan
    const tenant = await Tenant.findOne({ tenantId });
    if (!tenant) {
      console.log('❌ Tenant not found');
      return;
    }
    
    const subscriptionPlan = await SubscriptionPlan.findOne({
      $or: [
        { slug: tenant.subscription.plan },
        { name: { $regex: tenant.subscription.plan, $options: 'i' } }
      ]
    });
    
    if (!subscriptionPlan) {
      console.log('❌ Subscription plan not found');
      return;
    }
    
    console.log('Current tenant settings:', tenant.settings);
    console.log('Subscription plan limits:', subscriptionPlan.limits);
    
    // Update tenant settings to match subscription plan limits
    const updatedSettings = {
      ...tenant.settings,
      maxUsers: subscriptionPlan.limits.maxUsers,
      maxOrders: subscriptionPlan.limits.maxOrders,
      maxCustomers: subscriptionPlan.limits.maxCustomers,
      maxCarriers: subscriptionPlan.limits.maxCarriers
    };
    
    console.log('Updated settings:', updatedSettings);
    
    // Ask for confirmation
    console.log('\n🔄 This will update tenant settings to match subscription plan limits.');
    console.log('Continue? (This script just shows what would be updated - uncomment to actually update)');
    
    // Uncomment the lines below to actually perform the update
    /*
    await Tenant.findOneAndUpdate(
      { tenantId }, 
      { settings: updatedSettings },
      { new: true }
    );
    console.log('✅ Tenant settings updated successfully!');
    */
    
    console.log('\n📝 To apply the fix, uncomment the update lines in the script.');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixTenantSettings();