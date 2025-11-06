require('dotenv').config();
const User = require('./db/Users');
const connectDB = require('./db/config');

async function debugCrossMilesCount() {
  try {
    await connectDB();
    console.log('Database connected successfully');
    
    console.log('\n=== Debugging Cross-Miles User Count ===');
    
    const tenantId = 'cross-miles-carrier-inc';
    
    // 1. Total users (all statuses)
    console.log('\n1. Total users (all statuses):');
    const totalUsers = await User.find({ tenantId }).select('name email status deletedAt isSuper is_admin role').lean();
    console.log(`Count: ${totalUsers.length}`);
    totalUsers.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.name} (${user.email}) - Status: ${user.status}, Role: ${user.role}, isSuper: ${user.isSuper}, is_admin: ${user.is_admin}, deletedAt: ${user.deletedAt}`);
    });
    
    // 2. Active users only
    console.log('\n2. Active users only:');
    const activeFilter = User.activeFilter(tenantId);
    const activeUsers = await User.find(activeFilter).select('name email status deletedAt isSuper is_admin role').lean();
    console.log(`Count: ${activeUsers.length}`);
    console.log('Active filter used:', JSON.stringify(activeFilter, null, 2));
    
    // 3. Current employeesLisiting logic (active + exclude isSuper='1')
    console.log('\n3. Current employeesLisiting logic (active + exclude isSuper="1"):');
    const employeeFilter = {isSuper: {$ne:'1'}, ...activeFilter};
    const employees = await User.find(employeeFilter).select('name email status deletedAt isSuper is_admin role').lean();
    console.log(`Count: ${employees.length}`);
    console.log('Employee filter used:', JSON.stringify(employeeFilter, null, 2));
    
    // 4. Check what isSuper values exist
    console.log('\n4. isSuper value analysis:');
    const superAnalysis = await User.aggregate([
      { $match: { tenantId } },
      { $group: { _id: '$isSuper', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    console.log('isSuper values and counts:', superAnalysis);
    
    // 5. Check if there are users with isSuper='1' (string)
    console.log('\n5. Users with isSuper="1" (string):');
    const superUsers = await User.find({ tenantId, isSuper: '1' }).select('name email isSuper').lean();
    console.log(`Count: ${superUsers.length}`);
    if (superUsers.length > 0) {
      superUsers.forEach((user, index) => {
        console.log(`  ${index + 1}. ${user.name} (${user.email}) - isSuper: ${user.isSuper}`);
      });
    }
    
    // 6. What if we want to show ALL active users (including any super users)?
    console.log('\n6. If we show ALL active users (no isSuper exclusion):');
    const allActiveUsers = await User.find(activeFilter).select('name email status deletedAt isSuper is_admin role').lean();
    console.log(`Count: ${allActiveUsers.length}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

debugCrossMilesCount();