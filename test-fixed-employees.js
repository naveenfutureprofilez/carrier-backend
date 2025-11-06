require('dotenv').config();
const User = require('./db/Users');
const connectDB = require('./db/config');

async function testFixedEmployees() {
  try {
    await connectDB();
    console.log('Database connected successfully');
    
    console.log('\n=== Testing Fixed employeesLisiting Logic ===');
    
    // Simulate what the fixed employeesLisiting function will do
    console.log('\n1. Blue-dart tenant:');
    const tenantId = 'blue-dart';
    
    // Test the logic from the fixed function
    const baseFilter = User.activeFilter(tenantId);
    console.log('Base filter:', JSON.stringify(baseFilter, null, 2));
    
    // Test non-super user filter (normal case)
    const filterQuery = {is_admin: {$ne:1}, ...baseFilter};
    console.log('Filter query:', JSON.stringify(filterQuery, null, 2));
    
    const lists = await User.find(filterQuery);
    const totalDocuments = lists.length;
    
    console.log('Results:');
    console.log('  - Lists found:', totalDocuments);
    console.log('  - Users:');
    lists.forEach((user, index) => {
      console.log(`    ${index + 1}. ${user.name} (${user.email}) - Role: ${user.role}, is_admin: ${user.is_admin}`);
    });
    
    // Test cross-miles for comparison
    console.log('\n2. Cross-miles-carrier-inc tenant:');
    const crossMilesTenantId = 'cross-miles-carrier-inc';
    const crossMilesBaseFilter = User.activeFilter(crossMilesTenantId);
    const crossMilesFilterQuery = {is_admin: {$ne:1}, ...crossMilesBaseFilter};
    
    const crossMilesLists = await User.find(crossMilesFilterQuery);
    const crossMilesTotalDocuments = crossMilesLists.length;
    
    console.log('Results:');
    console.log('  - Lists found:', crossMilesTotalDocuments);
    console.log('  - Users (showing first 3):');
    crossMilesLists.slice(0, 3).forEach((user, index) => {
      console.log(`    ${index + 1}. ${user.name} (${user.email}) - Role: ${user.role}, is_admin: ${user.is_admin}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testFixedEmployees();