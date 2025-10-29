const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const SuperAdmin = require('../db/SuperAdmin');

(async () => {
  try {
    const dbUrl = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/carrier';
    await mongoose.connect(dbUrl);
    console.log('📊 Connected to MongoDB:', mongoose.connection.name);

    const currentEmail = 'admin@yourcompany.com';
    const targetEmail = 'admin@gmail.com';
    const targetPassword = '12345678';

    console.log(`🔍 Looking up SuperAdmin by email: ${currentEmail}`);
    let superAdmin = await SuperAdmin.findOne({ email: currentEmail }).select('+password');

    if (!superAdmin) {
      console.log(`⚠️ Not found: ${currentEmail}. Searching any SuperAdmin record...`);
      superAdmin = await SuperAdmin.findOne({}).select('+password');
      if (!superAdmin) {
        console.log('❌ No SuperAdmin records exist. Aborting.');
        await mongoose.connection.close();
        process.exit(1);
      }
      console.log(`✅ Found SuperAdmin: ${superAdmin.email} (will update this record)`);
    } else {
      console.log(`✅ Found SuperAdmin: ${superAdmin.email}`);
    }

    console.log(`✏️ Updating email to: ${targetEmail}`);
    const hashedPassword = await bcrypt.hash(targetPassword, 12);
    await SuperAdmin.updateOne(
      { _id: superAdmin._id },
      { $set: { email: targetEmail, password: hashedPassword } }
    );

    console.log('✅ Credentials updated successfully!');
    console.log('🔐 New Super Admin Credentials:');
    console.log(`   Email: ${targetEmail}`);
    console.log(`   Password: ${targetPassword}`);
    console.log('🌐 Access URL: http://localhost:3000?tenant=admin');

    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error updating credentials:', err);
    try { await mongoose.connection.close(); } catch (_) {}
    process.exit(1);
  }
})();