require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const SuperAdmin = require('../db/SuperAdmin');

(async () => {
  try {
    const dbUrl = process.env.DB_URL_OFFICE || 'mongodb+srv://naveenfp:naveenfp@cluster0.5c8ne.mongodb.net/carrier';
    await mongoose.connect(dbUrl);
    console.log('📊 Connected to REMOTE MongoDB:', mongoose.connection.name);

    const targetEmail = 'admin@gmail.com';
    const targetPassword = '12345678';
    const fallbackEmail = 'admin@yourcompany.com';

    let superAdmin = await SuperAdmin.findOne({ email: targetEmail }).select('+password');

    if (!superAdmin) {
      console.log(`⚠️ Not found: ${targetEmail}. Trying fallback: ${fallbackEmail}`);
      superAdmin = await SuperAdmin.findOne({ email: fallbackEmail }).select('+password');
    }

    if (!superAdmin) {
      console.log('❌ No SuperAdmin found by known emails. Listing existing SuperAdmins...');
      const all = await SuperAdmin.find({}).select('email status userId');
      console.log('👤 Existing SuperAdmins:', all);
      await mongoose.connection.close();
      process.exit(2);
    }

    console.log(`✅ Found SuperAdmin: ${superAdmin.email} (status: ${superAdmin.status})`);

    const hashedPassword = await bcrypt.hash(targetPassword, 12);
    await SuperAdmin.updateOne(
      { _id: superAdmin._id },
      { $set: { email: targetEmail, password: hashedPassword, status: 'active' } }
    );

    console.log('✅ Remote credentials updated successfully!');
    console.log('🔐 New Super Admin Credentials:');
    console.log(`   Email: ${targetEmail}`);
    console.log(`   Password: ${targetPassword}`);
    console.log('🌐 Access URL: http://localhost:3000/super-admin/login');

    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error updating remote credentials:', err);
    try { await mongoose.connection.close(); } catch (_) {}
    process.exit(1);
  }
})();