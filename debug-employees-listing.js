require('dotenv').config();
const User = require('./db/Users');
const connectDB = require('./db/config');

async function debugEmployeesListing() {
  try {
    await connectDB();
    console.log('Database connected successfully');
    
    console.log('\n=== Debugging employeesListing Logic ===');
    
    // Test what the employeesLisiting function is actually doing
    
    // 1. Test blue-dart tenant
    console.log('\n1. Blue-dart tenant:');
    const tenantId = 'blue-dart';
    
    const baseFilter = User.activeFilter(tenantId);
    console.log('Base active filter:', JSON.stringify(baseFilter, null, 2));
    
    // Test the admin exclusion filter (this is what employeesLisiting uses)
    const adminExclusionFilter = {is_admin: {$ne:1}, ...baseFilter};
    console.log('Admin exclusion filter:', JSON.stringify(adminExclusionFilter, null, 2));
    
    const employeesWithExclusion = await User.find(adminExclusionFilter);
    console.log('Found employees with admin exclusion:', employeesWithExclusion.length);
    
    if (employeesWithExclusion.length > 0) {
      employeesWithExclusion.forEach((user, index) => {
        console.log(`  ${index + 1}. ${user.name} (${user.email}) - Role: ${user.role}, is_admin: ${user.is_admin}, tenantId: ${user.tenantId}`);
      });
    }
    
    // Test without admin exclusion for comparison
    const withoutExclusion = await User.find(baseFilter);
    console.log('Found employees without admin exclusion:', withoutExclusion.length);
    
    // 2. Test what happens with fallback tenantId 'default'
    console.log('\n2. Testing fallback tenantId "default":');
    const defaultBaseFilter = User.activeFilter('default');
    console.log('Default base filter:', JSON.stringify(defaultBaseFilter, null, 2));
    
    const defaultEmployees = await User.find({is_admin: {$ne:1}, ...defaultBaseFilter});
    console.log('Found employees with default tenantId:', defaultEmployees.length);
    
    if (defaultEmployees.length > 0 && defaultEmployees.length <= 5) {
      defaultEmployees.forEach((user, index) => {
        console.log(`  ${index + 1}. ${user.name} (${user.email}) - Role: ${user.role}, tenantId: ${user.tenantId}`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

debugEmployeesListing();