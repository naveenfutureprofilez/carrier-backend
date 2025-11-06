require('dotenv').config();
const User = require('./db/Users');
const connectDB = require('./db/config');

async function testFinalEmployees() {
  try {
    await connectDB();
    console.log('Database connected successfully');
    
    console.log('\n=== Testing Final employeesLisiting Logic (All Users) ===');
    
    // Test blue-dart tenant
    console.log('\n1. Blue-dart tenant:');
    const blueDartTenantId = 'blue-dart';
    const blueDartBaseFilter = User.activeFilter(blueDartTenantId);
    const blueDartLists = await User.find(blueDartBaseFilter).select('name email isSuper is_admin role').lean();
    console.log(`Count: ${blueDartLists.length}`);
    blueDartLists.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.name} (${user.email}) - Role: ${user.role}, is_admin: ${user.is_admin}, isSuper: ${user.isSuper}`);
    });
    
    // Test cross-miles tenant
    console.log('\n2. Cross-miles-carrier-inc tenant:');
    const crossMilesTenantId = 'cross-miles-carrier-inc';
    const crossMilesBaseFilter = User.activeFilter(crossMilesTenantId);
    const crossMilesLists = await User.find(crossMilesBaseFilter).select('name email isSuper is_admin role').lean();
    console.log(`Count: ${crossMilesLists.length}`);
    
    console.log('All users:');
    crossMilesLists.forEach((user, index) => {
      const userType = user.isSuper === '1' ? 'SUPER ADMIN' : 
                       user.is_admin === 1 ? 'ADMIN' : 
                       user.role === 3 ? 'ADMIN' : 
                       user.role === 2 ? 'ACCOUNTANT' : 
                       user.role === 1 ? 'STAFF' : 'OTHER';
      console.log(`  ${index + 1}. ${user.name} (${user.email}) - ${userType} (Role: ${user.role})`);
    });
    
    // Verify this matches the expected response format
    console.log('\n3. Response format test:');
    const totalDocuments = crossMilesLists.length;
    const response = {
      status: true,
      lists: crossMilesLists,
      totalDocuments: totalDocuments
    };
    
    console.log('Response structure:');
    console.log(`- status: ${response.status}`);
    console.log(`- lists.length: ${response.lists.length}`);
    console.log(`- totalDocuments: ${response.totalDocuments}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testFinalEmployees();