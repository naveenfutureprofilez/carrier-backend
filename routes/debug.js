const express = require('express');
const router = express.Router();
const SuperAdmin = require('../db/SuperAdmin');
const User = require('../db/Users');
const SubscriptionPlan = require('../db/SubscriptionPlan');
const mongoose = require('mongoose');

// Debug endpoint to check database status
router.get('/db-status', async (req, res) => {
  try {
    console.log('🔍 DEBUG: Checking database status...');
    
    const dbStatus = {
      connected: mongoose.connection.readyState === 1,
      dbName: mongoose.connection.name,
      host: mongoose.connection.host,
      port: mongoose.connection.port
    };
    
    console.log('📊 Database status:', dbStatus);
    
    // Check SuperAdmin collection
    const superAdminCount = await SuperAdmin.countDocuments();
    console.log('👤 SuperAdmin count:', superAdminCount);
    
    // Find all SuperAdmins
    const superAdmins = await SuperAdmin.find({}).select('name email status userId');
    console.log('📋 SuperAdmin records:', superAdmins.length);
    
    // Check Users collection
    const userCount = await User.countDocuments();
    const adminUsers = await User.find({ role: 3 }).select('name email role');
    
    // Check SubscriptionPlan collection
    const subscriptionPlanCount = await SubscriptionPlan.countDocuments();
    const subscriptionPlans = await SubscriptionPlan.find({}).select('name slug isActive');
    
    console.log('👥 Total users:', userCount);
    console.log('👑 Admin users:', adminUsers.length);
    console.log('📋 Subscription plans:', subscriptionPlanCount);
    
    res.json({
      status: true,
      database: dbStatus,
      collections: {
        superAdmins: {
          count: superAdminCount,
          records: superAdmins
        },
        users: {
          total: userCount,
          admins: adminUsers
        },
        subscriptionPlans: {
          count: subscriptionPlanCount,
          plans: subscriptionPlans
        }
      },
      debug: true
    });
    
  } catch (error) {
    console.error('❌ Debug error:', error);
    res.status(500).json({
      status: false,
      error: error.message,
      debug: true
    });
  }
});

// Test SuperAdmin lookup by email
router.post('/test-lookup', async (req, res) => {
  try {
    const { email } = req.body;
    console.log('🔍 Testing SuperAdmin lookup for:', email);
    
    // Try different ways to find the SuperAdmin
    const methods = [
      { name: 'findOne with email', query: SuperAdmin.findOne({ email }) },
      { name: 'findOne with email (select password)', query: SuperAdmin.findOne({ email }).select('+password') },
      { name: 'find with email', query: SuperAdmin.find({ email }) },
      { name: 'findOne with email lowercase', query: SuperAdmin.findOne({ email: email?.toLowerCase() }) }
    ];
    
    const results = {};
    
    for (const method of methods) {
      try {
        const result = await method.query;
        results[method.name] = {
          found: !!result,
          count: Array.isArray(result) ? result.length : (result ? 1 : 0),
          data: result ? (Array.isArray(result) ? result[0] : result) : null
        };
        console.log(`${method.name}:`, !!result);
      } catch (err) {
        results[method.name] = { error: err.message };
        console.error(`${method.name} error:`, err.message);
      }
    }
    
    res.json({
      status: true,
      email,
      results,
      debug: true
    });
    
  } catch (error) {
    console.error('❌ Lookup test error:', error);
    res.status(500).json({
      status: false,
      error: error.message,
      debug: true
    });
  }
});

module.exports = router;