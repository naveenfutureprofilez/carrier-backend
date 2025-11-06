require('dotenv').config();
const User = require('./db/Users');
const connectDB = require('./db/config');

async function testAllUsersFinal() {
  try {
    await connectDB();
    console.log('Database connected successfully');
    
    console.log('\n=== Testing Final employeesLisiting Logic (All Users Including Inactive) ===');
    
    // Test the final logic that includes ALL users (active + inactive)
    console.log('\n1. Blue-dart tenant (should show all users):');
    const blueDartTenantId = 'blue-dart';
    const blueDartLists = await User.find({ tenantId: blueDartTenantId }, { includeInactive: true })
      .select('name email status isSuper is_admin role').lean();
    console.log(`Count: ${blueDartLists.length}`);
    blueDartLists.forEach((user, index) => {
      const statusIcon = user.status === 'active' ? '🟢' : '🔴';
      console.log(`  ${index + 1}. ${statusIcon} ${user.name} (${user.email}) - Status: ${user.status}, Role: ${user.role}`);
    });
    
    // Test cross-miles tenant
    console.log('\n2. Cross-miles-carrier-inc tenant (should show all 16 users):');
    const crossMilesTenantId = 'cross-miles-carrier-inc';
    const crossMilesLists = await User.find({ tenantId: crossMilesTenantId }, { includeInactive: true })
      .select('name email status isSuper is_admin role').lean();
    console.log(`Count: ${crossMilesLists.length}`);
    
    // Group by status for clarity
    const activeUsers = crossMilesLists.filter(u => u.status === 'active');
    const inactiveUsers = crossMilesLists.filter(u => u.status === 'inactive');
    
    console.log(`  Active users (${activeUsers.length}):`);\n    activeUsers.forEach((user, index) => {\n      const userType = user.isSuper === '1' ? 'SUPER ADMIN' : \n                       user.is_admin === 1 ? 'ADMIN' : \n                       user.role === 3 ? 'ADMIN' : \n                       user.role === 2 ? 'ACCOUNTANT' : \n                       user.role === 1 ? 'STAFF' : 'OTHER';\n      console.log(`    ${index + 1}. 🟢 ${user.name} (${user.email}) - ${userType}`);\n    });\n    \n    console.log(`\n  Inactive users (${inactiveUsers.length}):`);\n    inactiveUsers.forEach((user, index) => {\n      const userType = user.isSuper === '1' ? 'SUPER ADMIN' : \n                       user.is_admin === 1 ? 'ADMIN' : \n                       user.role === 3 ? 'ADMIN' : \n                       user.role === 2 ? 'ACCOUNTANT' : \n                       user.role === 1 ? 'STAFF' : 'OTHER';\n      console.log(`    ${index + 1}. 🔴 ${user.name} (${user.email}) - ${userType}`);\n    });\n    \n    // Final response format test\n    console.log('\n3. Final Response Format:');\n    const response = {\n      status: true,\n      lists: crossMilesLists,\n      totalDocuments: crossMilesLists.length\n    };\n    \n    console.log(`- Blue-dart totalDocuments: ${blueDartLists.length}`);\n    console.log(`- Cross-miles totalDocuments: ${response.totalDocuments}`);\n    console.log('- Status: Success ✅');\n    \n    process.exit(0);\n  } catch (error) {\n    console.error('Error:', error);\n    process.exit(1);\n  }\n}\n\ntestAllUsersFinal();
