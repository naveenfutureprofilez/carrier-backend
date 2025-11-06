require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./db/config');

async function testRawCollection() {
  try {
    await connectDB();
    console.log('Database connected successfully');
    
    console.log('\n=== Raw Collection Query Test ===');
    
    // Get the raw collection to bypass all middleware
    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');
    
    // Test blue-dart tenant
    console.log('\n1. Blue-dart tenant (raw query):');
    const blueDartUsers = await usersCollection.find({ tenantId: 'blue-dart' }).toArray();
    console.log(`Count: ${blueDartUsers.length}`);
    
    // Test cross-miles tenant
    console.log('\n2. Cross-miles-carrier-inc tenant (raw query):');
    const crossMilesUsers = await usersCollection.find({ tenantId: 'cross-miles-carrier-inc' }).toArray();
    console.log(`Count: ${crossMilesUsers.length}`);
    
    console.log('\nStatus breakdown:');
    const activeCount = crossMilesUsers.filter(u => u.status === 'active').length;
    const inactiveCount = crossMilesUsers.filter(u => u.status === 'inactive').length;
    console.log(`- Active: ${activeCount}`);
    console.log(`- Inactive: ${inactiveCount}`);
    console.log(`- Total: ${crossMilesUsers.length}`);
    
    // Show inactive users
    const inactiveUsers = crossMilesUsers.filter(u => u.status === 'inactive');
    if (inactiveUsers.length > 0) {
      console.log('\nInactive users:');
      inactiveUsers.forEach((user, index) => {
        console.log(`  ${index + 1}. ${user.name} (${user.email}) - Status: ${user.status}`);
      });
    }
    
    console.log('\n3. This is what the sidebar should show:');
    console.log(`- Blue-dart: ${blueDartUsers.length}`);
    console.log(`- Cross-miles: ${crossMilesUsers.length}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testRawCollection();