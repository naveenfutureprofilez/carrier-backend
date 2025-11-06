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

async function testCompanyRetrieval() {
  try {
    const targetTenantId = 'cross-miles-carrier-inc';
    
    console.log('🧪 Testing company data retrieval...\n');
    
    // Simulate the same query that the profile endpoint uses
    const filter = { tenantId: targetTenantId };
    const company = await Company.findOne(filter);
    
    if (company) {
      console.log('✅ Company found! Full data:');
      console.log('');
      console.log('Company Name:', company.name);
      console.log('Email:', company.email);
      console.log('Address:', company.address);
      console.log('Phone:', company.phone);
      console.log('Bank Name:', company.bank_name);
      console.log('Account Name:', company.account_name);
      console.log('Account Number:', company.account_number);
      console.log('Routing Number:', company.routing_number);
      console.log('Primary Email:', company.remittance_primary_email);
      console.log('Secondary Email:', company.remittance_secondary_email);
      console.log('');
      console.log('📋 Fields that should NOT be "[To be updated]":');
      const fields = {
        'Address': company.address,
        'Bank Name': company.bank_name,
        'Account Name': company.account_name,
        'Account Number': company.account_number,
        'Routing Number': company.routing_number
      };
      
      Object.entries(fields).forEach(([fieldName, value]) => {
        const status = (value && value !== '[To be updated]') ? '✅' : '❌';
        console.log(`${status} ${fieldName}: ${value}`);
      });
      
    } else {
      console.log('❌ No company found for tenantId:', targetTenantId);
    }
    
    // Also check if there are any issues with the query
    console.log('\n🔍 All companies in database:');
    const allCompanies = await Company.find({});
    allCompanies.forEach((comp, index) => {
      console.log(`${index + 1}. ${comp.name} (tenantId: ${comp.tenantId})`);
    });
    
  } catch (error) {
    console.error('❌ Error testing company retrieval:', error);
    throw error;
  }
}

async function main() {
  try {
    await connectDB();
    await testCompanyRetrieval();
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

main();