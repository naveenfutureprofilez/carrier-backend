require('dotenv').config();
const mongoose = require('mongoose');
const SuperAdmin = require('../db/SuperAdmin');
const bcrypt = require('bcrypt');

const resetSuperAdminPassword = async () => {
  try {
    console.log('🔐 Resetting SuperAdmin password in REMOTE database...');
    
    // Connect to remote database using environment variable
    const dbUrl = process.env.DB_URL_OFFICE || 'mongodb+srv://naveenfp:naveenfp@cluster0.5c8ne.mongodb.net/carrier';
    await mongoose.connect(dbUrl);
    console.log('📊 Connected to remote MongoDB:', mongoose.connection.name);
    
    // Find SuperAdmin
    const superAdmin = await SuperAdmin.findOne({ email: 'admin@gmail.com' });
    
    if (!superAdmin) {
      console.log('❌ No super admin found with email: admin@gmail.com');
      mongoose.connection.close();
      return;
    }
    
    console.log('✅ Found super admin:', superAdmin.name);
    
    // Set new password
    const newPassword = 'password123';
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    // Update the password directly
    await SuperAdmin.updateOne(
      { _id: superAdmin._id },
      { $set: { password: hashedPassword } }
    );
    
    console.log('✅ Password updated successfully!');
    console.log('');
    console.log('🔐 SUPER ADMIN LOGIN CREDENTIALS:');
    console.log('📧 Email: admin@gmail.com');
    console.log('🔑 Password: password123');
    console.log('🌐 Access URL: http://localhost:3000?tenant=admin');
    console.log('');
    
    mongoose.connection.close();
    
  } catch (error) {
    console.error('❌ Error resetting password:', error);
    process.exit(1);
  }
};

resetSuperAdminPassword();