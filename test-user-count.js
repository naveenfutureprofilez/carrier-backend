require('dotenv').config();
const User = require('./db/Users');
const connectDB = require('./db/config');

async function testUserCount() {
  try {
    await connectDB();
    console.log('Database connected successfully');
    
    console.log('\n=== Testing User Count Fix ===');
    
    // Test blue-dart tenant
    console.log('\n1. Blue-dart tenant:');
    const blueDartFilter = User.activeFilter('blue-dart');
    console.log('Active filter:', JSON.stringify(blueDartFilter, null, 2));
    
    const blueDartCount = await User.countDocuments(blueDartFilter);
    console.log('Active user count:', blueDartCount);
    
    // Compare with total count (including inactive)
    const blueDartTotal = await User.countDocuments({ tenantId: 'blue-dart' }, { includeInactive: true });
    console.log('Total user count (all statuses):', blueDartTotal);
    
    console.log('\n2. Cross-miles-carrier-inc tenant:');
    const crossMilesFilter = User.activeFilter('cross-miles-carrier-inc');
    const crossMilesCount = await User.countDocuments(crossMilesFilter);
    console.log('Active user count:', crossMilesCount);
    
    const crossMilesTotal = await User.countDocuments({ tenantId: 'cross-miles-carrier-inc' }, { includeInactive: true });
    console.log('Total user count (all statuses):', crossMilesTotal);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testUserCount();