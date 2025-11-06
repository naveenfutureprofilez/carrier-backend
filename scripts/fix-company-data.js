const mongoose = require('mongoose');
require('dotenv').config();

const Company = require('../db/Company');

async function connectDB() {
  try {
    const dbUrl = process.env.DB_URL_OFFICE || process.env.MONGO_URI || process.env.DATABASE_URL;
    await mongoose.connect(dbUrl);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

async function fixCompanyData() {
  try {
    console.log('🔧 Fixing company data...\n');
    
    const targetTenantId = 'cross-miles-carrier-inc';
    
    // Find the company with real data (without tenant ID)
    const realDataCompany = await Company.findOne({ 
      name: 'Cross Miles Carrier',
      tenantId: { $exists: false }
    });
    
    // Find the placeholder company (with tenant ID)
    const placeholderCompany = await Company.findOne({ 
      tenantId: targetTenantId,
      name: 'Cross Miles Carrier Inc'
    });
    
    console.log('📋 Current situation:');
    console.log('Real data company:', realDataCompany ? 'Found' : 'Not found');
    console.log('Placeholder company:', placeholderCompany ? 'Found' : 'Not found');
    console.log('');
    
    if (realDataCompany && placeholderCompany) {
      if (process.argv.includes('--confirm')) {
        console.log('🔄 Option 1: Update the real data company to have the correct tenant ID');
        
        // Update the company with real data to have the tenant ID
        const updateResult = await Company.findByIdAndUpdate(
          realDataCompany._id,
          { 
            tenantId: targetTenantId,
            name: 'Cross Miles Carrier Inc' // Also update the name to match
          },
          { new: true }
        );
        
        console.log('✅ Updated company with real data to include tenant ID');
        
        // Remove the placeholder company
        await Company.findByIdAndDelete(placeholderCompany._id);
        console.log('✅ Removed placeholder company record');
        
        console.log('\n🎉 Company data fixed! The company now has:');
        console.log('   Name:', updateResult.name);
        console.log('   Tenant ID:', updateResult.tenantId);
        console.log('   Email:', updateResult.email);
        console.log('   Address:', updateResult.address);
        console.log('   Phone:', updateResult.phone);
        console.log('   Bank Name:', updateResult.bank_name);
        console.log('   Account Name:', updateResult.account_name);
        
      } else {
        console.log('⚠️  Found both records. This script will:');
        console.log('   1. Add tenant ID to the company with real data');
        console.log('   2. Remove the placeholder company record');
        console.log('');
        console.log('Real data company details:');
        console.log('   Name:', realDataCompany.name);
        console.log('   Email:', realDataCompany.email);
        console.log('   Address:', realDataCompany.address);
        console.log('   Phone:', realDataCompany.phone);
        console.log('   Bank Name:', realDataCompany.bank_name);
        console.log('');
        console.log('Run with --confirm to proceed:');
        console.log('node scripts/fix-company-data.js --confirm');
      }
    } else {
      console.log('❌ Unable to find both company records needed for the fix');
    }
    
  } catch (error) {
    console.error('❌ Error fixing company data:', error);
    throw error;
  }
}

async function main() {
  try {
    await connectDB();
    await fixCompanyData();
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

main();