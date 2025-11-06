require('dotenv').config();
const Tenant = require('./db/Tenant');
const { generateTenantUrl, generateSuperAdminUrl } = require('./middleware/tenantResolver');
const connectDB = require('./db/config');

async function testLoginRedirect() {
  try {
    await connectDB();
    console.log('Database connected successfully');
    
    console.log('\n=== Testing Login Redirect URLs ===');
    
    console.log('Environment variables:');
    console.log(`  DOMAIN: ${process.env.DOMAIN || 'NOT SET'}`);
    console.log(`  NODE_ENV: ${process.env.NODE_ENV || 'NOT SET'}`);
    
    // Test Cross-Miles tenant
    const crossMiles = await Tenant.findOne({ tenantId: 'cross-miles-carrier-inc' });
    if (crossMiles) {
      console.log('\nCross-Miles Carrier Inc:');
      console.log(`  tenantId: ${crossMiles.tenantId}`);
      console.log(`  subdomain: ${crossMiles.subdomain}`);
      
      const redirectUrl = generateTenantUrl(crossMiles.subdomain || crossMiles.tenantId);
      console.log(`  Generated redirect URL: ${redirectUrl}`);
      console.log(`  Expected URL: https://cross-miles-carrier-inc.logistikore.com/home`);
    }
    
    // Test Blue-dart tenant
    const blueDart = await Tenant.findOne({ tenantId: 'blue-dart' });
    if (blueDart) {
      console.log('\nBlue-dart:');
      console.log(`  tenantId: ${blueDart.tenantId}`);
      console.log(`  subdomain: ${blueDart.subdomain}`);
      
      const redirectUrl = generateTenantUrl(blueDart.subdomain || blueDart.tenantId);
      console.log(`  Generated redirect URL: ${redirectUrl}`);
      console.log(`  Expected URL: https://blue-dart.logistikore.com/home`);
    }
    
    // Test super admin URL
    console.log('\nSuper Admin:');
    const superAdminUrl = generateSuperAdminUrl();
    console.log(`  Generated super admin URL: ${superAdminUrl}`);
    
    console.log('\n=== Recommendations ===');
    if (!process.env.DOMAIN) {
      console.log('❌ DOMAIN environment variable is not set!');
      console.log('   Set DOMAIN=logistikore.com in your .env file');
    } else if (process.env.DOMAIN.includes('localhost')) {
      console.log('⚠️  DOMAIN is set to localhost - this is for development only');
    } else {
      console.log('✅ DOMAIN is properly configured for production');
    }
    
    if (blueDart && !blueDart.subdomain) {
      console.log('⚠️  Blue-dart tenant is missing subdomain field');
      console.log('   Consider updating it to match tenantId');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testLoginRedirect();