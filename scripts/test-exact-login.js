const mongoose = require('mongoose');
const SuperAdmin = require('../db/SuperAdmin');
const bcrypt = require('bcrypt');

async function testExactLogin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/carrier');
    
    const email = 'admin@yourcompany.com';
    const password = 'password123';
    
    console.log('🔍 Testing exact login conditions...');
    console.log('Email:', email);
    console.log('Password:', password);
    
    // Step 1: Find super admin (same as in controller)
    const superAdmin = await SuperAdmin.findOne({ email }).select('+password');
    console.log('\n1. SuperAdmin lookup:');
    console.log('   - Found:', !!superAdmin);
    
    if (superAdmin) {
      console.log('   - Name:', superAdmin.name);
      console.log('   - Status:', superAdmin.status);
      
      // Step 2: Test the exact condition from line 637
      console.log('\n2. Testing exact condition from authController.js line 637:');
      
      const passwordMatch = await bcrypt.compare(password, superAdmin.password);
      console.log('   - bcrypt.compare result:', passwordMatch);
      console.log('   - !bcrypt.compare result:', !passwordMatch);
      
      const condition = !superAdmin || !(await bcrypt.compare(password, superAdmin.password));
      console.log('   - Full condition (!superAdmin || !bcryptMatch):', condition);
      
      if (condition) {
        console.log('   ❌ CONDITION TRUE: Login would FAIL with "Invalid super admin credentials"');
      } else {
        console.log('   ✅ CONDITION FALSE: Login would proceed to status check');
        
        // Step 3: Test status condition
        console.log('\n3. Testing status condition:');
        console.log('   - superAdmin.status:', superAdmin.status);
        console.log('   - superAdmin.status !== "active":', superAdmin.status !== 'active');
        
        if (superAdmin.status !== 'active') {
          console.log('   ❌ STATUS CHECK FAILS: Login would fail with "Super admin account is inactive"');
        } else {
          console.log('   ✅ STATUS CHECK PASSES: Login should succeed!');
        }
      }
    }
    
    mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
  }
}

testExactLogin();