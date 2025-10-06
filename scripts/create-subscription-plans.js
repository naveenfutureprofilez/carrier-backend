require('dotenv').config();
const mongoose = require('mongoose');
const SubscriptionPlan = require('../db/SubscriptionPlan');

const createDefaultPlans = async () => {
  try {
    console.log('🏗️ Creating default subscription plans...');
    
    // Connect to remote database
    const dbUrl = process.env.DB_URL_OFFICE || 'mongodb+srv://naveenfp:naveenfp@cluster0.5c8ne.mongodb.net/carrier';
    await mongoose.connect(dbUrl);
    console.log('📊 Connected to remote MongoDB:', mongoose.connection.name);
    
    // Check if plans already exist
    const existingPlansCount = await SubscriptionPlan.countDocuments();
    console.log('📋 Existing subscription plans:', existingPlansCount);
    
    if (existingPlansCount > 0) {
      console.log('✅ Subscription plans already exist, skipping creation');
      const plans = await SubscriptionPlan.find({}).select('name slug isActive');
      console.log('Plans:', plans.map(p => `${p.name} (${p.slug})`).join(', '));
      mongoose.connection.close();
      return;
    }
    
    // Create default subscription plans
    const defaultPlans = [
      {
        name: 'Starter',
        slug: 'starter',
        price: 29.99,
        yearlyPrice: 299.99,
        limits: {
          maxUsers: 5,
          maxOrders: 100,
          maxCustomers: 50,
          maxCarriers: 25
        },
        features: [
          'basic_orders',
          'customer_management',
          'carrier_management',
          'basic_reporting'
        ],
        isActive: true,
        description: 'Perfect for small logistics operations'
      },
      {
        name: 'Professional',
        slug: 'professional',
        price: 59.99,
        yearlyPrice: 599.99,
        limits: {
          maxUsers: 15,
          maxOrders: 500,
          maxCustomers: 200,
          maxCarriers: 100
        },
        features: [
          'advanced_orders',
          'customer_management',
          'carrier_management',
          'advanced_reporting',
          'analytics',
          'integrations'
        ],
        isActive: true,
        description: 'Best for growing logistics companies'
      },
      {
        name: 'Standard',
        slug: 'standard',
        price: 99.99,
        yearlyPrice: 999.99,
        limits: {
          maxUsers: 50,
          maxOrders: 2000,
          maxCustomers: 1000,
          maxCarriers: 500
        },
        features: [
          'premium_orders',
          'customer_management',
          'carrier_management',
          'advanced_reporting',
          'analytics',
          'integrations',
          'api_access',
          'priority_support'
        ],
        isActive: true,
        description: 'For established logistics enterprises'
      },
      {
        name: 'Enterprise',
        slug: 'enterprise',
        price: 199.99,
        yearlyPrice: 1999.99,
        limits: {
          maxUsers: 999999,
          maxOrders: 999999,
          maxCustomers: 999999,
          maxCarriers: 999999
        },
        features: [
          'unlimited_orders',
          'customer_management',
          'carrier_management',
          'advanced_reporting',
          'analytics',
          'integrations',
          'api_access',
          'priority_support',
          'dedicated_support',
          'custom_integrations'
        ],
        isActive: true,
        description: 'Unlimited access for large enterprises'
      }
    ];
    
    // Create the plans
    for (const planData of defaultPlans) {
      const plan = await SubscriptionPlan.create(planData);
      console.log(`✅ Created plan: ${plan.name} (${plan.slug})`);
    }
    
    console.log('🎉 All subscription plans created successfully!');
    
    mongoose.connection.close();
    
  } catch (error) {
    console.error('❌ Error creating subscription plans:', error);
    process.exit(1);
  }
};

createDefaultPlans();