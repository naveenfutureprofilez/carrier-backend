const axios = require('axios');

const API_BASE = 'http://localhost:8080';

async function testEmulationOverview() {
  console.log('🧪 TESTING EMULATION OVERVIEW API CALL\n');
  
  try {
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
    console.log('✅ Login successful');
    console.log('   Token:', superAdminToken.substring(0, 30) + '...');
    
    // Step 2: Test overview call with emulation headers
    console.log('\n2. 📊 Testing overview endpoint with emulation...');
    
    // Test with X-Tenant-ID header (should work with super admin)
    const overviewResponse = await axios.get(`${API_BASE}/overview`, {
      headers: {
        'Authorization': `Bearer ${superAdminToken}`,
        'X-Tenant-ID': 'cross-miles-carrier-inc',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Overview request successful');
    console.log('   Status:', overviewResponse.status);
    
    if (overviewResponse.data.status && overviewResponse.data.lists) {
      console.log('\n📊 Dashboard Data:');
      overviewResponse.data.lists.forEach(item => {
        console.log(`   ${item.title}: ${item.data}`);
      });
      
      const totalLoads = overviewResponse.data.lists.find(item => item.title === 'Total Loads');
      if (totalLoads && totalLoads.data > 0) {
        console.log('\n✅ SUCCESS: Data is showing correctly!');
        console.log('   Total loads:', totalLoads.data);
      } else {
        console.log('\n⚠️  ISSUE: Overview shows 0 loads but database has 55');
      }
    } else {
      console.log('\n❌ No data returned from overview endpoint');
    }
    
    // Step 3: Test with query parameter
    console.log('\n3. 🔗 Testing overview with tenant query parameter...');
    
    const queryResponse = await axios.get(`${API_BASE}/overview?tenant=cross-miles-carrier-inc`, {
      headers: {
        'Authorization': `Bearer ${superAdminToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Query parameter request successful');
    if (queryResponse.data.lists) {
      const totalLoads = queryResponse.data.lists.find(item => item.title === 'Total Loads');
      console.log(`   Total loads with query param: ${totalLoads?.data || 0}`);
    }
    
    // Step 4: Test proper emulation flow
    console.log('\n4. 🎭 Testing full emulation flow...');
    
    const emulateResponse = await axios.post(`${API_BASE}/api/super-admin/emulate-tenant`, {
      tenantId: 'cross-miles-carrier-inc'
    }, {
      headers: {
        'Authorization': `Bearer ${superAdminToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (emulateResponse.data.status) {
      console.log('✅ Emulation started successfully');
      const emulationToken = emulateResponse.data.token;
      console.log('   New token:', emulationToken.substring(0, 30) + '...');
      
      // Now test overview with emulation token
      const emulatedOverviewResponse = await axios.get(`${API_BASE}/overview`, {
        headers: {
          'Authorization': `Bearer ${emulationToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Emulated overview request successful');
      if (emulatedOverviewResponse.data.lists) {
        const totalLoads = emulatedOverviewResponse.data.lists.find(item => item.title === 'Total Loads');
        console.log(`   Total loads with emulation token: ${totalLoads?.data || 0}`);
        
        if (totalLoads && totalLoads.data > 0) {
          console.log('\n🎉 SUCCESS: Emulation is working correctly!');
        } else {
          console.log('\n❌ ISSUE: Emulation token still shows 0 loads');
        }
      }
    } else {
      console.log('❌ Emulation failed:', emulateResponse.data.message);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('\n💡 Authentication issue - check token validity');
    } else if (error.response?.status === 404) {
      console.log('\n💡 Endpoint not found - check API routes');
    }
  }
}

console.log('🚀 Starting emulation overview test...');
testEmulationOverview();