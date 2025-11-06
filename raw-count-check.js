require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./db/config');

async function rawCountCheck() {
  try {
    await connectDB();
    console.log('Database connected successfully');
    
    console.log('\n=== Raw MongoDB Count Verification ===');
    
    // Get the raw collection
    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');
    
    // 1. Raw count of all documents
    const totalCount = await usersCollection.countDocuments({});
    console.log(`\n1. Raw total count: ${totalCount}`);
    
    // 2. Raw count by tenantId
    const tenantCounts = await usersCollection.aggregate([
      { $group: { _id: '$tenantId', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]).toArray();
    
    console.log('\n2. Count by tenantId:');
    tenantCounts.forEach(tenant => {
      console.log(`   ${tenant._id || 'NULL'}: ${tenant.count} users`);
    });
    
    // 3. Check for documents with different statuses
    const statusCounts = await usersCollection.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]).toArray();
    
    console.log('\n3. Count by status:');
    statusCounts.forEach(status => {
      console.log(`   ${status._id || 'NULL'}: ${status.count} users`);
    });
    
    // 4. Check for deleted users
    const deletedCount = await usersCollection.countDocuments({ deletedAt: { $ne: null } });
    console.log(`\n4. Deleted users count: ${deletedCount}`);
    
    // 5. Specific check for cross-miles
    const crossMilesCount = await usersCollection.countDocuments({ tenantId: 'cross-miles-carrier-inc' });
    console.log(`\n5. Cross-miles-carrier-inc count: ${crossMilesCount}`);
    
    // 6. List all cross-miles users with _id for verification
    const crossMilesUsers = await usersCollection.find(
      { tenantId: 'cross-miles-carrier-inc' },
      { projection: { name: 1, email: 1, status: 1, deletedAt: 1, _id: 1 } }
    ).toArray();
    
    console.log('\n6. All cross-miles users with ObjectId:');
    crossMilesUsers.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.name} (${user.email}) - ID: ${user._id}, Status: ${user.status}, Deleted: ${user.deletedAt ? 'YES' : 'NO'}`);
    });
    
    // 7. Double-check: are there any users we might be missing?
    console.log('\n7. Verification - All users in database:');
    const allUsers = await usersCollection.find({}, { projection: { name: 1, email: 1, tenantId: 1, status: 1 } }).toArray();
    console.log(`   Total found: ${allUsers.length}`);
    
    const tenantGroups = {};
    allUsers.forEach(user => {
      const tenant = user.tenantId || 'NO_TENANT_ID';
      if (!tenantGroups[tenant]) {
        tenantGroups[tenant] = 0;
      }
      tenantGroups[tenant]++;
    });
    
    console.log('\n   By tenant:');
    Object.keys(tenantGroups).forEach(tenant => {
      console.log(`     ${tenant}: ${tenantGroups[tenant]} users`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

rawCountCheck();