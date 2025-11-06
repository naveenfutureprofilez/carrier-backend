const axios = require('axios');

async function testUserProfile() {
  try {
    const API_BASE = 'http://localhost:8080';
    
    console.log('Testing user profile data structure...\n');
    
    // Get super admin token
    const loginResponse = await axios.post(`${API_BASE}/user/multitenant-login`, {
      email: 'admin@gmail.com',
      password: '12345678',
      isSuperAdmin: true
    });
    
    const superAdminToken = loginResponse.data.token;
    
    // Test both tenants
    for (const tenantId of ['cross-miles-carrier-inc', 'blue-dart']) {
      console.log(`\n=== Testing ${tenantId} ===`);
      
      // Emulate tenant
      const emulateResponse = await axios.post(`${API_BASE}/api/super-admin/emulate-tenant`, {
        tenantId
      }, {
        headers: { Authorization: `Bearer ${superAdminToken}` }
      });
      
      const emulatedToken = emulateResponse.data.token;
      
      // Test profile endpoint
      const profileResponse = await axios.get(`${API_BASE}/user/profile`, {
        headers: { Authorization: `Bearer ${emulatedToken}` }
      });
      
      console.log('Profile Response:');
      console.log('- Status:', profileResponse.data.status);
      console.log('- User exists:', !!profileResponse.data.user);
      console.log('- User name:', profileResponse.data.user?.name || 'N/A');
      console.log('- User tenantId:', profileResponse.data.user?.tenantId || 'N/A');
      console.log('- User.company exists:', !!profileResponse.data.user?.company);
      console.log('- User.company.name:', profileResponse.data.user?.company?.name || 'N/A');
      console.log('- Company (separate field):', profileResponse.data.company?.name || 'N/A');
      console.log('- Company tenantId:', profileResponse.data.company?.tenantId || 'N/A');
    }
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testUserProfile();