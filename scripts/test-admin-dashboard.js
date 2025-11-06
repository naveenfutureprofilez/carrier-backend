#!/usr/bin/env node
const axios = require('axios');
require('dotenv').config();

// Test the tenant admin dashboard API calls
async function testTenantAdminDashboard() {
  try {
    console.log('🚀 Starting tenant admin dashboard test...');
    console.log('🧪 TESTING TENANT ADMIN DASHBOARD API CALLS\n');

    const API_BASE = 'http://localhost:8080';
    
    // Step 1: Login as super admin
    console.log('1. 🔐 Logging in as super admin...');
    const loginResponse = await axios.post(`${API_BASE}/user/multitenant-login`, {
      email: 'admin@gmail.com',
      password: '12345678',
      isSuperAdmin: true
    });
    
    if (!loginResponse.data.status || !loginResponse.data.token) {
      console.log('❌ Login failed:', loginResponse.data.message);
      return;
    }
    
    const superAdminToken = loginResponse.data.token;
    console.log('✅ Super admin login successful');
    console.log('   Token:', superAdminToken.substring(0, 30) + '...\n');

    // Step 2: Start emulation
    console.log('2. 🎭 Starting emulation...');
    const emulateResponse = await axios.post(`${API_BASE}/api/super-admin/emulate-tenant`, {
      tenantId: 'cross-miles-carrier-inc'
    }, {
      headers: { Authorization: `Bearer ${superAdminToken}` }
    });
    
    console.log('✅ Emulation started successfully');
    const emulatedToken = emulateResponse.data.token;
    console.log('   Emulated token:', emulatedToken.substring(0, 30) + '...\n');

    // Step 3: Test tenant admin API calls
    const headers = { Authorization: `Bearer ${emulatedToken}` };
    
    console.log('3. 📊 Testing tenant admin API calls...');
    
    // Test /api/tenant-admin/info
    console.log('   Testing /api/tenant-admin/info...');
    const infoResponse = await axios.get(`${API_BASE}/api/tenant-admin/info`, { headers });
    console.log('   ✅ Info API successful');
    console.log('   Tenant Name:', infoResponse.data?.data?.tenant?.name);
    console.log('   Users Count:', infoResponse.data?.data?.tenant?.usage?.users || 0);
    
    // Test /api/tenant-admin/analytics
    console.log('\n   Testing /api/tenant-admin/analytics...');
    const analyticsResponse = await axios.get(`${API_BASE}/api/tenant-admin/analytics?period=30d`, { headers });
    console.log('   ✅ Analytics API successful');
    console.log('   Total Revenue:', analyticsResponse.data?.data?.summary?.totalRevenue || 0);
    console.log('   New Customers:', analyticsResponse.data?.data?.summary?.newCustomers || 0);
    
    // Test /api/tenant-admin/usage
    console.log('\n   Testing /api/tenant-admin/usage...');
    const usageResponse = await axios.get(`${API_BASE}/api/tenant-admin/usage`, { headers });
    console.log('   ✅ Usage API successful');
    console.log('   Current Users:', usageResponse.data?.data?.usage?.users || 0);
    console.log('   Current Orders:', usageResponse.data?.data?.usage?.orders || 0);
    console.log('   Current Customers:', usageResponse.data?.data?.usage?.customers || 0);
    console.log('   Current Carriers:', usageResponse.data?.data?.usage?.carriers || 0);
    
    console.log('\n🎉 SUCCESS: All tenant admin dashboard APIs are working!');
    
    // Summary
    console.log('\n📋 SUMMARY:');
    console.log(`   Company: ${infoResponse.data?.data?.tenant?.name || 'N/A'}`);
    console.log(`   Revenue: $${analyticsResponse.data?.data?.summary?.totalRevenue || 0}`);
    console.log(`   New Customers: ${analyticsResponse.data?.data?.summary?.newCustomers || 0}`);
    console.log(`   Team Size: ${usageResponse.data?.data?.usage?.users || 0}`);
    console.log(`   Total Orders: ${usageResponse.data?.data?.usage?.orders || 0}`);
    console.log(`   Total Customers: ${usageResponse.data?.data?.usage?.customers || 0}`);
    console.log(`   Total Carriers: ${usageResponse.data?.data?.usage?.carriers || 0}`);
    
  } catch (error) {
    console.error('❌ ERROR during tenant admin dashboard test:');
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
testTenantAdminDashboard().catch(console.error);