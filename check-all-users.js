require('dotenv').config();
const User = require('./db/Users');
const connectDB = require('./db/config');

async function checkAllUsers() {
  try {
    await connectDB();
    console.log('Database connected successfully');
    
    console.log('\n=== Complete Database User Analysis ===');
    
    // 1. Total users in entire database
    console.log('\n1. Total users in entire database:');
    const allUsers = await User.find({}).select('name email tenantId status deletedAt isSuper is_admin role').lean();
    console.log(`Total users in database: ${allUsers.length}`);
    
    // Group by tenant
    const usersByTenant = {};
    allUsers.forEach(user => {
      const tenant = user.tenantId || 'NO_TENANT';
      if (!usersByTenant[tenant]) {
        usersByTenant[tenant] = [];
      }
      usersByTenant[tenant].push(user);
    });
    
    console.log('\nUsers grouped by tenant:');
    Object.keys(usersByTenant).forEach(tenant => {
      console.log(`\n${tenant}: ${usersByTenant[tenant].length} users`);
      usersByTenant[tenant].forEach((user, index) => {
        const statusInfo = user.deletedAt ? `DELETED (${user.deletedAt})` : user.status || 'NO_STATUS';
        const superInfo = user.isSuper === '1' ? ' [SUPER]' : '';
        const adminInfo = user.is_admin === 1 ? ' [ADMIN]' : '';
        console.log(`  ${index + 1}. ${user.name} (${user.email}) - Status: ${statusInfo}, Role: ${user.role}${superInfo}${adminInfo}`);
      });
    });
    
    // 2. Specifically check cross-miles-carrier-inc with all possible filters
    console.log('\n\n2. Cross-miles-carrier-inc detailed analysis:');
    const crossMilesTenantId = 'cross-miles-carrier-inc';
    
    // All users (including deleted/inactive)
    const allCrossMiles = await User.find({ tenantId: crossMilesTenantId }, { includeInactive: true })
      .select('name email status deletedAt isSuper is_admin role createdAt').lean();
    console.log(`\nAll cross-miles users (including deleted/inactive): ${allCrossMiles.length}`);
    
    allCrossMiles.forEach((user, index) => {
      const statusInfo = user.deletedAt ? `DELETED (${new Date(user.deletedAt).toISOString().split('T')[0]})` : 
                         user.status || 'NO_STATUS';
      const superInfo = user.isSuper === '1' ? ' [SUPER]' : '';
      const adminInfo = user.is_admin === 1 ? ' [ADMIN]' : '';
      const createdInfo = user.createdAt ? `Created: ${new Date(user.createdAt).toISOString().split('T')[0]}` : '';
      
      console.log(`  ${index + 1}. ${user.name} (${user.email})`);
      console.log(`      Status: ${statusInfo}, Role: ${user.role}${superInfo}${adminInfo}`);
      console.log(`      ${createdInfo}`);
    });
    
    // Active only
    const activeCrossMiles = await User.find(User.activeFilter(crossMilesTenantId))
      .select('name email status deletedAt isSuper is_admin role').lean();
    console.log(`\nActive cross-miles users: ${activeCrossMiles.length}`);
    
    // Check if there are users without tenantId that should belong to cross-miles
    console.log('\n3. Users without tenantId:');
    const usersWithoutTenant = await User.find({ 
      $or: [
        { tenantId: { $exists: false } },
        { tenantId: null },
        { tenantId: '' }
      ]
    }).select('name email tenantId status deletedAt isSuper is_admin role').lean();
    
    console.log(`Users without tenantId: ${usersWithoutTenant.length}`);
    usersWithoutTenant.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.name} (${user.email}) - tenantId: ${user.tenantId}, Status: ${user.status}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkAllUsers();