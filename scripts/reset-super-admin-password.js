const mongoose = require('mongoose');
const SuperAdmin = require('../db/SuperAdmin');
const bcrypt = require('bcrypt');

// Connect to database
const connectDB = async () => {
  const connection = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/carrier';
  await mongoose.connect(connection);
  console.log('📊 Connected to MongoDB');
};

const resetSuperAdminPassword = async () => {
  try {
    console.log('🔐 Resetting Super Admin password...');
    
    // Connect to database
    await connectDB();
    
    // Find super admin
    const superAdmin = await SuperAdmin.findOne({ email: 'admin@yourcompany.com' });
    
    if (!superAdmin) {
      console.log('❌ No super admin found with email: admin@yourcompany.com');
      mongoose.connection.close();
      return;
    }
    
    console.log('✅ Found super admin:', superAdmin.name);
    
    // Set new password
    const newPassword = 'password123';
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    // Update the password
    await SuperAdmin.findByIdAndUpdate(superAdmin._id, {
      password: hashedPassword
    });
    
    console.log('✅ Password updated successfully!');
    console.log('🔐 New Super Admin Credentials:');
    console.log(`Email: admin@yourcompany.com`);
    console.log(`Password: ${newPassword}`);
    console.log('🌐 Access URL: http://localhost:3000?tenant=admin');
    
    mongoose.connection.close();
    
  } catch (error) {
    console.error('❌ Error resetting password:', error);
    process.exit(1);
  }
};

resetSuperAdminPassword();