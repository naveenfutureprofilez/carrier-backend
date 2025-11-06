require('dotenv').config();
const User = require('./db/Users');
const connectDB = require('./db/config');

async function simpleFinalTest() {
  try {
    await connectDB();
    console.log('Database connected successfully');
    
    console.log('\n=== Simple Final Test - All Users Including Inactive ===');
    
    // Test blue-dart tenant
    console.log('\n1. Blue-dart tenant:');
    const blueDartLists = await User.find({ tenantId: 'blue-dart' }, { includeInactive: true });
    console.log(`Count: ${blueDartLists.length}`);
    
    // Test cross-miles tenant
    console.log('\n2. Cross-miles-carrier-inc tenant:');
    const crossMilesLists = await User.find({ tenantId: 'cross-miles-carrier-inc' }, { includeInactive: true });
    console.log(`Count: ${crossMilesLists.length}`);
    
    console.log('\nBreakdown:');
    const activeCount = crossMilesLists.filter(u => u.status === 'active').length;
    const inactiveCount = crossMilesLists.filter(u => u.status === 'inactive').length;
    console.log(`- Active: ${activeCount}`);
    console.log(`- Inactive: ${inactiveCount}`);
    console.log(`- Total: ${crossMilesLists.length}`);
    
    // Verify response format
    const response = {
      status: true,
      lists: crossMilesLists,
      totalDocuments: crossMilesLists.length
    };
    
    console.log('\n3. Final sidebar counts:');
    console.log(`- Blue-dart: ${blueDartLists.length}`);
    console.log(`- Cross-miles: ${response.totalDocuments}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

simpleFinalTest();