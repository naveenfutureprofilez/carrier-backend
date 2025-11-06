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

async function checkCompanyData() {
  try {
    console.log('🏢 Checking company data...\n');
    
    // Find all companies
    const allCompanies = await Company.find({});
    console.log(`📊 Total companies in database: ${allCompanies.length}\n`);
    
    allCompanies.forEach((company, index) => {
      console.log(`${index + 1}. Company Name: ${company.name || '[Missing]'}`);
      console.log(`   Tenant ID: ${company.tenantId || '[Missing]'}`);
      console.log(`   Email: ${company.email || '[Missing]'}`);
      console.log(`   Address: ${company.address || '[Missing]'}`);
      console.log(`   Phone: ${company.phone || '[Missing]'}`);
      console.log(`   Bank Name: ${company.bank_name || '[Missing]'}`);
      console.log(`   Account Name: ${company.account_name || '[Missing]'}`);
      console.log(`   Account Number: ${company.account_number || '[Missing]'}`);
      console.log(`   Routing Number: ${company.routing_number || '[Missing]'}`);
      console.log('');
    });
    
    // Check specifically for cross-miles-carrier-inc
    const targetTenantId = 'cross-miles-carrier-inc';
    console.log(`🎯 Looking for company with tenant ID: ${targetTenantId}`);
    
    const tenantCompany = await Company.findOne({ tenantId: targetTenantId });
    
    if (tenantCompany) {
      console.log('✅ Found company for target tenant:');
      console.log('   Company Details:', {
        name: tenantCompany.name,
        email: tenantCompany.email,
        address: tenantCompany.address,
        phone: tenantCompany.phone,
        bank_name: tenantCompany.bank_name,
        account_name: tenantCompany.account_name,
        account_number: tenantCompany.account_number,
        routing_number: tenantCompany.routing_number,
        remittance_primary_email: tenantCompany.remittance_primary_email,
        remittance_secondary_email: tenantCompany.remittance_secondary_email,
      });
    } else {
      console.log('❌ No company found for target tenant');
      console.log('This explains why the company details page shows "[To be updated]"');
      
      if (process.argv.includes('--create')) {
        console.log('\n🔧 Creating company record for target tenant...');
        
        const newCompany = await Company.create({
          name: 'Cross Miles Carrier Inc',
          email: 'admin@crossmilescarrier.com',
          address: 'To be updated',
          phone: 'To be updated',
          bank_name: 'To be updated',
          account_name: 'To be updated',
          account_number: 'To be updated',
          routing_number: 'To be updated',
          remittance_primary_email: 'admin@crossmilescarrier.com',
          remittance_secondary_email: '',
          rate_confirmation_terms: 'Standard terms and conditions',
          tenantId: targetTenantId
        });
        
        console.log('✅ Created company record:', newCompany.name);
      } else {
        console.log('\nTo create a company record, run with --create flag:');
        console.log('node scripts/check-company-data.js --create');
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking company data:', error);
    throw error;
  }
}

async function main() {
  try {
    await connectDB();
    await checkCompanyData();
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

main();