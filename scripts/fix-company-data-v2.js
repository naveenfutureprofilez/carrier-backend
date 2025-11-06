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
    console.log('🔧 Fixing company data (v2)...\n');
    
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
        console.log('🔄 Copying real data to the company record with tenant ID');
        
        // Update the placeholder company with real data
        const updateResult = await Company.findByIdAndUpdate(
          placeholderCompany._id,
          { 
            email: realDataCompany.email,
            address: realDataCompany.address,
            phone: realDataCompany.phone,
            bank_name: realDataCompany.bank_name,
            account_name: realDataCompany.account_name,
            account_number: realDataCompany.account_number,
            routing_number: realDataCompany.routing_number,
            remittance_primary_email: realDataCompany.remittance_primary_email || realDataCompany.email,
            remittance_secondary_email: realDataCompany.remittance_secondary_email || null,
            rate_confirmation_terms: realDataCompany.rate_confirmation_terms || 'Standard terms and conditions'
          },
          { new: true }
        );
        
        console.log('✅ Updated placeholder company with real data');
        
        // Remove the old company record (without tenant ID)
        await Company.findByIdAndDelete(realDataCompany._id);
        console.log('✅ Removed old company record without tenant ID');
        
        console.log('\n🎉 Company data fixed! The company now has:');
        console.log('   Name:', updateResult.name);
        console.log('   Tenant ID:', updateResult.tenantId);
        console.log('   Email:', updateResult.email);
        console.log('   Address:', updateResult.address);
        console.log('   Phone:', updateResult.phone);
        console.log('   Bank Name:', updateResult.bank_name);
        console.log('   Account Name:', updateResult.account_name);
        console.log('   Account Number:', updateResult.account_number);
        console.log('   Routing Number:', updateResult.routing_number);
        
      } else {
        console.log('⚠️  Found both records. This script will:');
        console.log('   1. Copy real data from old record to the record with tenant ID');
        console.log('   2. Remove the old record without tenant ID');
        console.log('');
        console.log('Real data to be copied:');
        console.log('   Email:', realDataCompany.email);
        console.log('   Address:', realDataCompany.address);
        console.log('   Phone:', realDataCompany.phone);
        console.log('   Bank Name:', realDataCompany.bank_name);
        console.log('   Account Name:', realDataCompany.account_name);
        console.log('   Account Number:', realDataCompany.account_number);
        console.log('   Routing Number:', realDataCompany.routing_number);
        console.log('');
        console.log('Run with --confirm to proceed:');
        console.log('node scripts/fix-company-data-v2.js --confirm');
      }
    } else {
      console.log('❌ Unable to find both company records needed for the fix');
      
      if (realDataCompany) {
        console.log('Found real data company:', realDataCompany.name);
      }
      if (placeholderCompany) {
        console.log('Found placeholder company:', placeholderCompany.name);
      }
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