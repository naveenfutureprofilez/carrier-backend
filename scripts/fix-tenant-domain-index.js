require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
  try {
    const dbUrl = process.env.DB_URL_OFFICE || process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/carrier';
    await mongoose.connect(dbUrl, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('📊 Connected to MongoDB:', mongoose.connection.name);

    const collection = mongoose.connection.db.collection('tenants');
    const indexes = await collection.indexes();
    const hasDomainIndex = indexes.find(ix => ix.name === 'domain_1');

    if (hasDomainIndex) {
      console.log('🔧 Dropping unique index domain_1 from tenants...');
      try {
        await collection.dropIndex('domain_1');
        console.log('✅ Dropped index domain_1');
      } catch (err) {
        console.log('⚠️ Could not drop index domain_1:', err.message);
      }
    } else {
      console.log('ℹ️ Index domain_1 not found; nothing to drop.');
    }

    // Ensure compound unique index on { domain, subdomain }
    console.log('🔧 Ensuring compound unique index on { domain, subdomain }...');
    try {
      await collection.createIndex({ domain: 1, subdomain: 1 }, { unique: true, background: true });
      console.log('✅ Ensured unique compound index { domain: 1, subdomain: 1 }');
    } catch (err) {
      console.log('⚠️ Could not create compound index:', err.message);
    }

    await mongoose.connection.close();
    console.log('✅ Completed tenant index fix');
  } catch (error) {
    console.error('❌ Error fixing tenant indexes:', error);
    try { await mongoose.connection.close(); } catch (_) {}
    process.exit(1);
  }
}

run();