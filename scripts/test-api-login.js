const mongoose = require('mongoose');
const SuperAdmin = require('../db/SuperAdmin');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../db/Users');

// Connect to database
const connectDB = async () => {
  const connection = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/carrier';
  await mongoose.connect(connection);
  console.log('📊 Connected to MongoDB');
};

// Sign JWT token
const signToken = (id) => {
  return jwt.sign({ id }, process.env.SECRET_ACCESS || 'MYSECRET', {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

const testSuperAdminLogin = async () => {
  try {
    console.log('🚀 Testing Super Admin Login API logic...');
    
    // Connect to database
    await connectDB();
    
    const email = 'admin@yourcompany.com';
    const password = 'password123';
    const isSuperAdmin = true;
    
    console.log('📝 Input parameters:');
    console.log('- email:', email);
    console.log('- password:', password); 
    console.log('- isSuperAdmin:', isSuperAdmin);
    
    // Email and password validation
    if (!email || !password) {
      console.log('❌ FAIL: Email and password are required');
      return;
    }
    console.log('✅ Email and password validation passed');
    
    // Handle super admin login
    if (isSuperAdmin) {
      console.log('🔐 Processing super admin login...');
      
      const superAdmin = await SuperAdmin.findOne({ email }).select('+password');
      console.log('👤 SuperAdmin lookup result:', !!superAdmin);
      
      if (!superAdmin) {
        console.log('❌ FAIL: SuperAdmin not found');
        return;
      }
      
      console.log('📊 SuperAdmin details:');
      console.log('- Name:', superAdmin.name);
      console.log('- Status:', superAdmin.status);
      console.log('- UserID:', superAdmin.userId);
      
      // Test password comparison
      const passwordMatch = await bcrypt.compare(password, superAdmin.password);
      console.log('🔑 Password comparison result:', passwordMatch);
      
      if (!passwordMatch) {
        console.log('❌ FAIL: Password does not match');
        return;
      }
      
      // Test the exact condition from the controller
      const failCondition = !superAdmin || !(await bcrypt.compare(password, superAdmin.password));
      console.log('🧪 Fail condition (!superAdmin || !passwordMatch):', failCondition);
      
      if (failCondition) {
        console.log('❌ FAIL: Invalid super admin credentials (controller logic)');
        return;
      }
      
      // Check status
      if (superAdmin.status !== 'active') {
        console.log('❌ FAIL: Super admin account is inactive');
        return;
      }
      console.log('✅ Status check passed');
      
      // Create JWT token
      const token = signToken(superAdmin.userId);
      console.log('🎫 JWT token created:', !!token);
      
      // Get user record
      const user = await User.findById(superAdmin.userId).populate('company');
      console.log('👤 User record found:', !!user);
      
      if (user) {
        console.log('📊 User details:');
        console.log('- Name:', user.name);
        console.log('- Email:', user.email);
        console.log('- Role:', user.role);
      }
      
      console.log('🎉 SUCCESS: Super admin login would succeed!');
      console.log('📤 Response would be:');
      console.log({
        status: true,
        message: "Super admin login successful!",
        user: user ? {
          name: user.name,
          email: user.email,
          role: user.role
        } : null,
        isSuperAdmin: true,
        hasToken: !!token
      });
    }
    
    mongoose.connection.close();
    
  } catch (error) {
    console.error('❌ Error during test:', error);
    process.exit(1);
  }
};

testSuperAdminLogin();