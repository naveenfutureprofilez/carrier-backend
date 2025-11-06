require('dotenv').config();
const User = require('./db/Users');
const connectDB = require('./db/config');

async function testStaffListing() {
  try {
    await connectDB();
    console.log('Database connected successfully');
    
    console.log('\n=== Testing Staff Listing Filter ===');
    
    // Test blue-dart tenant - should only return role:1 active users from blue-dart
    console.log('\n1. Blue-dart tenant staff (role: 1):');
    const blueDartStaffFilter = { ...User.activeFilter('blue-dart'), role: 1 };
    console.log('Staff filter:', JSON.stringify(blueDartStaffFilter, null, 2));
    
    const blueDartStaff = await User.countDocuments(blueDartStaffFilter);
    console.log('Staff count (role: 1):', blueDartStaff);
    
    // Compare with total active users (all roles)
    const blueDartAllActive = await User.countDocuments(User.activeFilter('blue-dart'));
    console.log('All active users:', blueDartAllActive);
    
    console.log('\n2. Cross-miles-carrier-inc tenant staff (role: 1):');
    const crossMilesStaffFilter = { ...User.activeFilter('cross-miles-carrier-inc'), role: 1 };
    const crossMilesStaff = await User.countDocuments(crossMilesStaffFilter);
    console.log('Staff count (role: 1):', crossMilesStaff);
    
    const crossMilesAllActive = await User.countDocuments(User.activeFilter('cross-miles-carrier-inc'));
    console.log('All active users:', crossMilesAllActive);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testStaffListing();