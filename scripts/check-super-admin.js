const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const SuperAdmin = require('../db/SuperAdmin');

(async () => {
  try {
    const dbUrl = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/carrier';
    await mongoose.connect(dbUrl);
    console.log('📊 Connected to MongoDB:', mongoose.connection.name);

    const targetEmail = 'admin@gmail.com';
    const candidatePassword = '12345678';

    const admins = await SuperAdmin.find({}).select('+password');
    console.log('👤 SuperAdmin records:', admins.map(a => ({ email: a.email, status: a.status, hasUserId: !!a.userId })));

    const superAdmin = await SuperAdmin.findOne({ email: targetEmail }).select('+password');

    if (!superAdmin) {
      console.log(`❌ SuperAdmin not found for email: ${targetEmail}`);
      process.exit(2);
    }

    console.log('✅ Found SuperAdmin:', { email: superAdmin.email, status: superAdmin.status, hasPassword: !!superAdmin.password });

    const match = await bcrypt.compare(candidatePassword, superAdmin.password);
    console.log('🔐 Password match:', match);

    process.exit(match && superAdmin.status === 'active' ? 0 : 3);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  } finally {
    try { await mongoose.connection.close(); } catch (_) {}
  }
})();