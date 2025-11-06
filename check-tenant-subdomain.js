require('dotenv').config();
const Tenant = require('./db/Tenant');
const connectDB = require('./db/config');

async function checkTenantSubdomain() {
  try {
    await connectDB();
    console.log('Database connected successfully');
    
    console.log('\n=== Checking Tenant Subdomain vs TenantId ===');
    
    const tenants = await Tenant.find().select('name tenantId subdomain').lean();
    
    console.log('All tenants:');
    tenants.forEach((tenant, index) => {
      console.log(`${index + 1}. ${tenant.name}`);
      console.log(`   tenantId: ${tenant.tenantId}`);
      console.log(`   subdomain: ${tenant.subdomain}`);
      console.log(`   Expected URL: https://${tenant.tenantId}.logistikore.com`);
      console.log('');
    });
    
    // Check the specific cross-miles tenant
    const crossMiles = await Tenant.findOne({ tenantId: 'cross-miles-carrier-inc' }).lean();
    if (crossMiles) {
      console.log('Cross-Miles Carrier Inc:');
      console.log(`  tenantId: ${crossMiles.tenantId}`);
      console.log(`  subdomain: ${crossMiles.subdomain}`);
      console.log(`  Current generateTenantUrl would return: https://${crossMiles.subdomain}.logistikore.com`);
      console.log(`  Expected URL should be: https://${crossMiles.tenantId}.logistikore.com`);
      
      if (crossMiles.subdomain !== crossMiles.tenantId) {
        console.log('  ⚠️  MISMATCH: subdomain and tenantId are different!');
      } else {
        console.log('  ✅ subdomain matches tenantId');
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkTenantSubdomain();