require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../db/config');
const Commodities = require('../db/Commudity');
const Equipment = require('../db/Equipment');

const updateTenantIds = async () => {
  try {
    console.log('🚀 Starting tenantId update for commodities and equipment...');
    
    await connectDB();
    
    const targetTenant = 'cross-miles-carrier-inc';
    const criteria = {
      $or: [
        { tenantId: { $exists: false } },
        { tenantId: null },
        { tenantId: '' },
        { tenantId: 'legacy_tenant_001' }
      ]
    };

    console.log(`📦 Updating records to tenantId: ${targetTenant}`);
    
    // Update commodities
    const cRes = await Commodities.updateMany(criteria, { $set: { tenantId: targetTenant } });
    console.log(`✅ Updated commodities: ${cRes.modifiedCount}`);

    // Update equipment
    const eRes = await Equipment.updateMany(criteria, { $set: { tenantId: targetTenant } });
    console.log(`✅ Updated equipment: ${eRes.modifiedCount}`);

    // Verify counts
    const counts = {
      commodities: await Commodities.countDocuments({ tenantId: targetTenant }),
      equipment: await Equipment.countDocuments({ tenantId: targetTenant })
    };
    
    console.log('\n📊 Post-migration counts:');
    console.log(`- Commodities with ${targetTenant}: ${counts.commodities}`);
    console.log(`- Equipment with ${targetTenant}: ${counts.equipment}`);

    await mongoose.connection.close();
    console.log('\n🎉 Migration completed successfully!');
    process.exit(0);
    
  } catch (err) {
    console.error('❌ Migration error:', err);
    process.exit(1);
  }
};

if (require.main === module) {
  updateTenantIds();
}

module.exports = updateTenantIds;