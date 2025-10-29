const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const SuperAdmin = require('../db/SuperAdmin');

(async () => {
  try {
    const dbUrl = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/carrier';
    await mongoose.connect(dbUrl);
    console.log('📊 Connected to MongoDB:', mongoose.connection.name);

    const email = 'admin@gmail.com';
    const newPassword = '12345678';
    console.log(`🔐 Resetting Super Admin password for: ${email}`);

    const superAdmin = await SuperAdmin.findOne({ email }).select('+password');
    if (!superAdmin) {
      console.log(`❌ No SuperAdmin found with email: ${email}`);
      console.log('ℹ️ Create or update the SuperAdmin record first (e.g., using fix-super-admin.js), then re-run this script.');
      await mongoose.connection.close();
      process.exit(1);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await SuperAdmin.updateOne({ _id: superAdmin._id }, { $set: { password: hashedPassword } });

    console.log('✅ Password updated successfully!');
    console.log('🔐 New Credentials:');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${newPassword}`);
    console.log('🌐 Access URL: http://localhost:3000?tenant=admin');

    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error resetting password:', err);
    try { await mongoose.connection.close(); } catch (_) {}
    process.exit(1);
  }
})();