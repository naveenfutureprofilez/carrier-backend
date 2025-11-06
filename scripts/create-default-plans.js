const mongoose = require('mongoose');
const SubscriptionPlan = require('../db/SubscriptionPlan');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
  try {
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

const defaultPlans = [
  {
    name: 'Starter',
    slug: 'basic',
    description: 'Perfect for small logistics companies just getting started',
    limits: {
      maxUsers: 5,
      maxOrders: 500,
      maxCustomers: 100,
      maxCarriers: 50
    },
    features: [
      'orders',
      'customers',
      'carriers',
      'basic_reporting',
      'email_support'
    ],
    isActive: true,
    isPublic: true
  },
  {
    name: 'Professional',
    slug: 'standard',
    description: 'Ideal for growing logistics businesses',
    limits: {
      maxUsers: 15,
      maxOrders: 2000,
      maxCustomers: 500,
      maxCarriers: 200
    },
    features: [
      'orders',
      'customers',
      'carriers',
      'basic_reporting',
      'advanced_reporting',
      'email_support',
      'priority_support',
      'api_access',
      'custom_fields'
    ],
    isActive: true,
    isPublic: true
  },
  {
    name: 'Business',
    slug: 'premium',
    description: 'Comprehensive solution for established logistics companies',
    limits: {
      maxUsers: 50,
      maxOrders: 10000,
      maxCustomers: 2000,
      maxCarriers: 1000
    },
    features: [
      'orders',
      'customers',
      'carriers',
      'basic_reporting',
      'advanced_reporting',
      'analytics_dashboard',
      'email_support',
      'priority_support',
      'phone_support',
      'api_access',
      'custom_fields',
      'integrations',
      'white_labeling',
      'bulk_operations'
    ],
    isActive: true,
    isPublic: true
  },
  {
    name: 'Enterprise',
    slug: 'enterprise',
    description: 'Full-featured solution for large logistics enterprises',
    limits: {
      maxUsers: 0, // Unlimited
      maxOrders: 0, // Unlimited
      maxCustomers: 0, // Unlimited
      maxCarriers: 0 // Unlimited
    },
    features: [
      'orders',
      'customers',
      'carriers',
      'basic_reporting',
      'advanced_reporting',
      'analytics_dashboard',
      'real_time_tracking',
      'email_support',
      'priority_support',
      'phone_support',
      'dedicated_support',
      'api_access',
      'custom_fields',
      'integrations',
      'white_labeling',
      'bulk_operations',
      'custom_workflows',
      'audit_logs',
      'sso_integration',
      'advanced_security'
    ],
    isActive: true,
    isPublic: true
  }
];

const createDefaultPlans = async () => {
  try {
    console.log('🚀 Creating default subscription plans...');
    
    // Check if plans already exist
    const existingPlans = await SubscriptionPlan.find({});
    if (existingPlans.length > 0) {
      console.log('📋 Subscription plans already exist. Skipping creation.');
      console.log(`Found ${existingPlans.length} existing plans:`, existingPlans.map(p => p.name));
      return;
    }

    // Create default plans
    const createdPlans = await SubscriptionPlan.insertMany(defaultPlans);
    
    console.log('✅ Successfully created default subscription plans:');
    createdPlans.forEach(plan => {
      console.log(`  - ${plan.name} (${plan.slug}): ${plan.limits.maxUsers} users, ${plan.limits.maxOrders} orders`);
    });
    
    console.log('\n🎉 Default subscription plans setup completed!');
    
  } catch (error) {
    console.error('❌ Error creating default plans:', error);
    throw error;
  }
};

// Run the script
const main = async () => {
  try {
    await connectDB();
    await createDefaultPlans();
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

module.exports = { createDefaultPlans, defaultPlans };