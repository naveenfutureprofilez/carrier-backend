require('dotenv').config();
const User = require('./db/Users');
const connectDB = require('./db/config');

async function checkUserRoles() {
  try {
    await connectDB();
    console.log('Database connected successfully');
    
    console.log('\n=== Checking User Roles by Tenant ===');
    
    // Check blue-dart tenant users
    console.log('\n1. Blue-dart tenant users:');
    const blueDartUsers = await User.find(User.activeFilter('blue-dart'))
      .select('name email role tenantId status')
      .lean();
    
    console.log(`Found ${blueDartUsers.length} active users:`);
    blueDartUsers.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.name} (${user.email}) - Role: ${user.role}`);
    });
    
    // Check cross-miles tenant users
    console.log('\n2. Cross-miles-carrier-inc tenant users:');
    const crossMilesUsers = await User.find(User.activeFilter('cross-miles-carrier-inc'))
      .select('name email role tenantId status')
      .limit(5) // Just show first 5
      .lean();
    
    console.log(`Found active users (showing first 5):`);
    crossMilesUsers.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.name} (${user.email}) - Role: ${user.role}`);
    });
    
    // Count role distribution
    console.log('\n3. Role Distribution:');
    const blueDartRoles = await User.aggregate([
      { $match: User.activeFilter('blue-dart') },
      { $group: { _id: '$role', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    console.log('Blue-dart roles:', blueDartRoles);
    
    const crossMilesRoles = await User.aggregate([
      { $match: User.activeFilter('cross-miles-carrier-inc') },
      { $group: { _id: '$role', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    console.log('Cross-miles roles:', crossMilesRoles);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkUserRoles();