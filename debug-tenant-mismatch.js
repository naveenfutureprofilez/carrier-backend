require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./db/Users');
const Tenant = require('./db/Tenant');
const connectDB = require('./db/config');

async function debugTenantMismatch() {
  try {
    await connectDB();
    console.log('Database connected successfully');
    
    console.log('\n=== Tenant Mismatch Investigation ===');
    
    // 1. List all tenants
    console.log('\n1. All tenants in system:');
    const tenants = await Tenant.find({}, { tenantId: 1, name: 1, status: 1 }).lean();
    tenants.forEach((tenant, index) => {
      console.log(`  ${index + 1}. ${tenant.name} - ID: "${tenant.tenantId}" (status: ${tenant.status})`);
    });
    
    // 2. List recent employees with legacy_tenant_001
    console.log('\n2. Employees with legacy_tenant_001 (recent 10):');
    const legacyEmployees = await User.find(
      { tenantId: 'legacy_tenant_001' },
      { name: 1, email: 1, tenantId: 1, role: 1, createdAt: 1, created_by: 1 }
    ).sort({ createdAt: -1 }).limit(10).lean();
    
    console.log(`Found ${legacyEmployees.length} employees with legacy tenant ID:`);
    legacyEmployees.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.name} (${user.email}) - Role: ${user.role}, Created: ${user.createdAt}, CreatedBy: ${user.created_by}`);
    });
    
    // 3. List all users grouped by tenantId
    console.log('\n3. User count by tenantId:');
    const usersByTenant = await User.aggregate([
      { $group: { _id: '$tenantId', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    usersByTenant.forEach((group, index) => {
      console.log(`  ${index + 1}. tenantId: "${group._id}" - ${group.count} users`);
    });
    
    // 4. Find admins and their tenantIds
    console.log('\n4. Admin users and their tenantIds:');
    const admins = await User.find(
      { is_admin: 1 },
      { name: 1, email: 1, tenantId: 1, role: 1, is_admin: 1 }
    ).lean();
    
    console.log(`Found ${admins.length} admin users:`);
    admins.forEach((admin, index) => {
      console.log(`  ${index + 1}. ${admin.name} (${admin.email}) - tenantId: "${admin.tenantId}"`);
    });
    
    // 5. Check for recent employees created by specific admins
    if (admins.length > 0) {
      console.log('\n5. Employees created by admin users (checking for mismatch):');
      
      for (let admin of admins) {
        const employeesCreatedByAdmin = await User.find(
          { created_by: admin._id, is_admin: { $ne: 1 } },
          { name: 1, email: 1, tenantId: 1, role: 1, createdAt: 1 }
        ).sort({ createdAt: -1 }).limit(5).lean();
        
        if (employeesCreatedByAdmin.length > 0) {
          console.log(`\n  Admin: ${admin.name} (tenantId: "${admin.tenantId}")`);
          console.log(`  Created ${employeesCreatedByAdmin.length} employees:`);
          
          employeesCreatedByAdmin.forEach((emp, idx) => {
            const mismatch = emp.tenantId !== admin.tenantId ? '❌ MISMATCH' : '✅ Match';
            console.log(`    ${idx + 1}. ${emp.name} (${emp.email}) - tenantId: "${emp.tenantId}" ${mismatch}`);
          });
        }
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

debugTenantMismatch();