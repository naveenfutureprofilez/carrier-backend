require('dotenv').config();
const User = require('./db/Users');
const connectDB = require('./db/config');

async function testAllEmployees() {
  try {
    await connectDB();
    console.log('Database connected successfully');
    
    console.log('\n=== Testing All Employees (Including Admins) Logic ===');
    
    // Test the updated logic that includes all employees (including admins)
    console.log('\n1. Blue-dart tenant (should show ALL employees including admin):');
    const tenantId = 'blue-dart';
    
    const baseFilter = User.activeFilter(tenantId);
    console.log('Base filter:', JSON.stringify(baseFilter, null, 2));
    
    // Updated filter - only exclude super admins, include all tenant users
    const filterQuery = {isSuper: {$ne:'1'}, ...baseFilter};
    console.log('Filter query:', JSON.stringify(filterQuery, null, 2));
    
    const lists = await User.find(filterQuery);
    const totalDocuments = lists.length;
    
    console.log('Results:');
    console.log('  - Total employees (including admins):', totalDocuments);
    console.log('  - Users:');
    lists.forEach((user, index) => {
      console.log(`    ${index + 1}. ${user.name} (${user.email}) - Role: ${user.role}, is_admin: ${user.is_admin}, isSuper: ${user.isSuper}`);
    });
    
    // Test cross-miles for comparison
    console.log('\n2. Cross-miles-carrier-inc tenant (should show ALL their employees):');
    const crossMilesTenantId = 'cross-miles-carrier-inc';
    const crossMilesBaseFilter = User.activeFilter(crossMilesTenantId);
    const crossMilesFilterQuery = {isSuper: {$ne:'1'}, ...crossMilesBaseFilter};
    
    const crossMilesLists = await User.find(crossMilesFilterQuery);
    const crossMilesTotalDocuments = crossMilesLists.length;
    
    console.log('Results:');
    console.log('  - Total employees (including admins):', crossMilesTotalDocuments);
    console.log('  - Users (showing first 5):');
    crossMilesLists.slice(0, 5).forEach((user, index) => {
      console.log(`    ${index + 1}. ${user.name} (${user.email}) - Role: ${user.role}, is_admin: ${user.is_admin}, isSuper: ${user.isSuper}`);
    });
    
    // Verify tenant isolation - check that blue-dart employees don't appear in cross-miles results
    console.log('\n3. Verifying tenant isolation:');
    const blueDartEmails = lists.map(u => u.email);
    const crossMilesEmails = crossMilesLists.map(u => u.email);
    
    const overlap = blueDartEmails.filter(email => crossMilesEmails.includes(email));
    console.log('  - Blue-dart emails:', blueDartEmails);
    console.log('  - Any overlap between tenants:', overlap.length === 0 ? 'NO (Good!)' : `YES (${overlap.length} users)`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testAllEmployees();