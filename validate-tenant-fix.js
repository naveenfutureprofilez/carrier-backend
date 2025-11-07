require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./db/Users');
const connectDB = require('./db/config');

async function validateTenantFix() {
  try {
    await connectDB();
    console.log('Database connected successfully');
    
    console.log('\n=== Validation: Tenant ID Fix ===');
    
    // Check if there are any remaining mismatches
    console.log('\n1. Checking for remaining legacy_tenant_001 employees:');
    const legacyEmployees = await User.find({
      tenantId: 'legacy_tenant_001',
      is_admin: { $ne: 1 }
    }).select('name email tenantId role created_by');
    
    if (legacyEmployees.length === 0) {
      console.log('✅ No employees found with legacy_tenant_001 ID');
    } else {
      console.log(`❌ Found ${legacyEmployees.length} employees still with legacy_tenant_001:`);
      legacyEmployees.forEach((emp, index) => {
        console.log(`  ${index + 1}. ${emp.name} (${emp.email})`);
      });
    }
    
    // Check employee counts by tenant
    console.log('\n2. Employee count by tenant (excluding admins):');
    const employeesByTenant = await User.aggregate([
      { $match: { is_admin: { $ne: 1 } } },
      { $group: { _id: '$tenantId', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    employeesByTenant.forEach((group, index) => {
      console.log(`  ${index + 1}. tenantId: "${group._id}" - ${group.count} employees`);
    });
    
    // Check specific admin's employees
    console.log('\n3. Cross Miles admin\'s employees:');
    const adminId = mongoose.Types.ObjectId('6784abdeec01b5b3d11f774a');
    const adminEmployees = await User.find({
      created_by: adminId,
      is_admin: { $ne: 1 }
    }).select('name email tenantId');
    
    console.log(`Found ${adminEmployees.length} employees created by Cross Miles admin:`);
    const crossMilesCount = adminEmployees.filter(emp => emp.tenantId === 'cross-miles-carrier-inc').length;
    const otherTenants = adminEmployees.filter(emp => emp.tenantId !== 'cross-miles-carrier-inc');
    
    console.log(`✅ ${crossMilesCount} employees have correct tenant ID (cross-miles-carrier-inc)`);
    if (otherTenants.length > 0) {
      console.log(`❌ ${otherTenants.length} employees have incorrect tenant ID:`);
      otherTenants.forEach(emp => {
        console.log(`   - ${emp.name} (${emp.email}) - tenantId: "${emp.tenantId}"`);
      });
    }
    
    console.log('\n=== Summary ===');
    if (legacyEmployees.length === 0 && otherTenants.length === 0) {
      console.log('✅ All tenant ID mismatches have been resolved!');
      console.log('✅ All employees now have the correct tenant ID.');
    } else {
      console.log('❌ Some tenant ID mismatches remain - need further investigation.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error during validation:', error);
    process.exit(1);
  }
}

validateTenantFix();