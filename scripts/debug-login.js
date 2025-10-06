const mongoose = require('mongoose');
const SuperAdmin = require('../db/SuperAdmin');
const bcrypt = require('bcrypt');

async function debugLogin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/carrier');
    
    console.log('🔍 Testing super admin login flow...');
    console.log('Email: admin@yourcompany.com');
    console.log('Password: password123');
    
    // Step 1: Find super admin by email
    const superAdmin = await SuperAdmin.findOne({ email: 'admin@yourcompany.com' }).select('+password');
    console.log('SuperAdmin found:', !!superAdmin);
    
    if (superAdmin) {
      console.log('\nSuperAdmin details:');
      console.log('- ID:', superAdmin._id);
      console.log('- Name:', superAdmin.name);  
      console.log('- Email:', superAdmin.email);
      console.log('- Status:', superAdmin.status);
      console.log('- UserID:', superAdmin.userId);
      console.log('- Has password:', !!superAdmin.password);
      console.log('- Password length:', superAdmin.password ? superAdmin.password.length : 0);
      
      // Test password comparison
      if (superAdmin.password) {
        const isMatch = await bcrypt.compare('password123', superAdmin.password);
        console.log('- Password matches "password123":', isMatch);
      }
    }
    mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
  }
}

debugLogin();