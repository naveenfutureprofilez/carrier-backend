require('dotenv').config();
const mongoose = require('mongoose');
const SubscriptionPlan = require('../db/SubscriptionPlan');
const connectDB = require('../db/config');

const setupMultiTenant = async () => {
  try {
    console.log('🚀 Starting multi-tenant setup...');
    
    // Connect to database
    await connectDB();
    
    console.log('📋 Creating default subscription plans...');
    
    // Create default subscription plans
    const defaultPlans = [
      {
        name: 'Starter',
        slug: 'starter',
        description: 'Perfect for small carriers just getting started',
        price: 49,
        yearlyPrice: 490,
        limits: {
          maxUsers: 5,
          maxOrders: 100,
          maxCustomers: 50,
          maxCarriers: 25
        },
        features: [
          'Order Management',
          'Customer Management', 
          'Basic Reporting',
          'Email Support'
        ],
        isActive: true
      },
      {
        name: 'Professional',
        slug: 'professional',
        description: 'Ideal for growing carriers with advanced needs',
        price: 99,
        yearlyPrice: 990,
        limits: {
          maxUsers: 20,
          maxOrders: 500,
          maxCustomers: 200,
          maxCarriers: 100
        },
        features: [
          'Everything in Starter',
          'Advanced Analytics',
          'Carrier Management',
          'Custom Reports',
          'API Access',
          'Priority Support'
        ],
        isActive: true
      },
      {
        name: 'Enterprise',
        slug: 'enterprise',
        description: 'For large carriers requiring unlimited access',
        price: 199,
        yearlyPrice: 1990,
        limits: {
          maxUsers: 100,
          maxOrders: 2000,
          maxCustomers: 1000,
          maxCarriers: 500
        },
        features: [
          'Everything in Professional',
          'Unlimited Orders',
          'Advanced Integrations',
          'Custom Branding',
          'Dedicated Support',
          'SLA Guarantee'
        ],
        isActive: true
      },
      {
        name: 'Free Trial',
        slug: 'trial',
        description: '30-day free trial with full access',
        price: 0,
        yearlyPrice: 0,
        limits: {
          maxUsers: 3,
          maxOrders: 25,
          maxCustomers: 15,
          maxCarriers: 10
        },
        features: [
          'Order Management',
          'Customer Management',
          'Basic Reporting',
          '30-day Trial'
        ],
        isActive: true
      }
    ];

    // Clear existing plans
    await SubscriptionPlan.deleteMany({});
    
    // Create new plans
    const createdPlans = await SubscriptionPlan.insertMany(defaultPlans);
    console.log(`✅ Created ${createdPlans.length} subscription plans`);
    
    console.log('🔧 Setting up database indexes...');
    
    // Create database indexes for performance
    const collections = [
      'tenants',
      'users', 
      'orders',
      'customers',
      'carriers',
      'companies'
    ];

    for (const collectionName of collections) {
      try {
        const collection = mongoose.connection.db.collection(collectionName);
        
        // Create tenantId index for multi-tenant queries
        await collection.createIndex({ tenantId: 1 });
        console.log(`✅ Created tenantId index for ${collectionName}`);
        
        // Create compound indexes for common queries
        if (collectionName === 'users') {
          await collection.createIndex({ tenantId: 1, email: 1 }, { unique: true });
          await collection.createIndex({ tenantId: 1, role: 1 });
        }
        
        if (collectionName === 'orders') {
          await collection.createIndex({ tenantId: 1, order_status: 1 });
          await collection.createIndex({ tenantId: 1, createdAt: -1 });
        }
        
        if (collectionName === 'tenants') {
          await collection.createIndex({ subdomain: 1 }, { unique: true });
          await collection.createIndex({ status: 1 });
        }
        
      } catch (error) {
        console.log(`⚠️  Index creation for ${collectionName}:`, error.message);
      }
    }
    
    console.log('✅ Database indexes created');
    console.log('🎉 Multi-tenant setup completed successfully!');
    
    // Display created plans
    console.log('\n📋 Created Subscription Plans:');
    for (const plan of createdPlans) {
      console.log(`- ${plan.name} (${plan.slug}): $${plan.price}/month`);
      console.log(`  Users: ${plan.limits.maxUsers}, Orders: ${plan.limits.maxOrders}`);
    }
    
    mongoose.connection.close();
    
  } catch (error) {
    console.error('❌ Error setting up multi-tenant:', error);
    process.exit(1);
  }
};

module.exports = setupMultiTenant;

// Run directly if called from command line
if (require.main === module) {
  setupMultiTenant();
}