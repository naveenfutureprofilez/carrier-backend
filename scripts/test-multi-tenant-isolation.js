#!/usr/bin/env node
const axios = require('axios');
require('dotenv').config();

async function testTenantIsolation() {
  try {
    console.log('🧪 Testing Multi-Tenant Data Isolation\n');

    const API_BASE = 'http://localhost:8080';
    
    // Step 1: Login as super admin
    console.log('1. 🔐 Logging in as super admin...');
    const loginResponse = await axios.post(`${API_BASE}/user/multitenant-login`, {
      email: 'admin@gmail.com',
      password: '12345678',
      isSuperAdmin: true
    });
    
    const superAdminToken = loginResponse.data.token;
    console.log('✅ Super admin login successful\n');

    // Step 2: Test both tenants
    const tenants = ['cross-miles-carrier-inc', 'blue-dart'];
    
    for (const tenantId of tenants) {
      console.log(`🏢 Testing tenant: ${tenantId}`);
      console.log('─'.repeat(50));
      
      // Start emulation
      const emulateResponse = await axios.post(`${API_BASE}/api/super-admin/emulate-tenant`, {
        tenantId
      }, {
        headers: { Authorization: `Bearer ${superAdminToken}` }
      });
      
      const emulatedToken = emulateResponse.data.token;
      console.log(`✅ Emulation started for ${tenantId}`);
      
      // Test various APIs
      console.log(`\n📊 API Results for ${tenantId}:`);
      
      try {
        // Test tenant info
        const infoResponse = await axios.get(`${API_BASE}/api/tenant-admin/info`, {
          headers: { Authorization: `Bearer ${emulatedToken}` }
        });
        console.log(`   Tenant Name: ${infoResponse.data?.data?.tenant?.name || 'N/A'}`);
        console.log(`   Users: ${infoResponse.data?.data?.tenant?.usage?.users || 0}`);
        
        // Test customer count
        const customersResponse = await axios.get(`${API_BASE}/customer/listings?limit=1`, {
          headers: { Authorization: `Bearer ${emulatedToken}` }
        });
        console.log(`   Customers: ${customersResponse.data?.totalDocuments || 0}`);
        
        // Test company info
        const companyResponse = await axios.get(`${API_BASE}/user/profile`, {
          headers: { Authorization: `Bearer ${emulatedToken}` }
        });
        console.log(`   Company: ${companyResponse.data?.company?.name || 'N/A'} (tenantId: ${companyResponse.data?.company?.tenantId || 'N/A'})`);
        
      } catch (error) {
        console.log(`   Error: ${error.response?.status} - ${error.response?.data?.message || error.message}`);
      }
      
      console.log('\n');
    }
    
    // Step 3: Test concurrent emulation (simulate different browser sessions)
    console.log('🔄 Testing concurrent emulation...');
    console.log('─'.repeat(50));
    
    const [emulation1, emulation2] = await Promise.all([
      axios.post(`${API_BASE}/api/super-admin/emulate-tenant`, {
        tenantId: 'cross-miles-carrier-inc'
      }, {
        headers: { Authorization: `Bearer ${superAdminToken}` }
      }),
      axios.post(`${API_BASE}/api/super-admin/emulate-tenant`, {
        tenantId: 'blue-dart'
      }, {
        headers: { Authorization: `Bearer ${superAdminToken}` }
      })
    ]);
    
    const token1 = emulation1.data.token;
    const token2 = emulation2.data.token;
    
    console.log('✅ Both emulations started concurrently');
    
    // Test both tokens at the same time
    const [result1, result2] = await Promise.all([
      axios.get(`${API_BASE}/api/tenant-admin/info`, {
        headers: { Authorization: `Bearer ${token1}` }
      }),
      axios.get(`${API_BASE}/api/tenant-admin/info`, {
        headers: { Authorization: `Bearer ${token2}` }
      })
    ]);
    
    console.log(`\nConcurrent Results:`);
    console.log(`   Token 1 (cross-miles): ${result1.data?.data?.tenant?.name || 'N/A'}`);
    console.log(`   Token 2 (blue-dart): ${result2.data?.data?.tenant?.name || 'N/A'}`);
    
    if (result1.data?.data?.tenant?.name === result2.data?.data?.tenant?.name) {
      console.log('❌ PROBLEM: Both tokens returning same tenant data!');
    } else {
      console.log('✅ SUCCESS: Tokens returning different tenant data correctly');
    }
    
  } catch (error) {
    console.error('❌ ERROR during multi-tenant isolation test:');
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Response:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('   Message:', error.message);
    }
    process.exit(1);
  }
}

// Run the test
testTenantIsolation().catch(console.error);