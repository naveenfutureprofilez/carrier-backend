require('dotenv').config();
const Tenant = require('./db/Tenant');
const connectDB = require('./db/config');

async function fixBlueDartSubdomain() {
  try {
    await connectDB();
    console.log('Database connected successfully');
    
    console.log('\n=== Fixing Blue-dart Subdomain ===');
    
    const blueDart = await Tenant.findOne({ tenantId: 'blue-dart' });
    if (blueDart) {
      console.log('Before fix:');
      console.log(`  tenantId: ${blueDart.tenantId}`);
      console.log(`  subdomain: ${blueDart.subdomain}`);
      
      // Update subdomain to match tenantId
      await Tenant.findOneAndUpdate(
        { tenantId: 'blue-dart' },
        { subdomain: 'blue-dart' },
        { new: true }
      );
      
      console.log('\nAfter fix:');
      const updatedBlueDart = await Tenant.findOne({ tenantId: 'blue-dart' });
      console.log(`  tenantId: ${updatedBlueDart.tenantId}`);
      console.log(`  subdomain: ${updatedBlueDart.subdomain}`);
      
      console.log('\n✅ Blue-dart tenant subdomain updated successfully!');
    } else {
      console.log('❌ Blue-dart tenant not found');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixBlueDartSubdomain();