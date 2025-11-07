require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./db/Users');
const connectDB = require('./db/config');

async function backfillEmployeeTenant() {
  try {
    await connectDB();
    console.log('Database connected successfully');
    
    console.log('\n=== Backfilling Employee Tenant ID ===');
    
    // From our debug output, we know:
    // - Admin ID: 6784abdeec01b5b3d11f774a (admin@gmail.com with tenantId: cross-miles-carrier-inc)
    // - Employee with wrong tenantId: 11John Deosdas (naveensdfdsaf@internetbusinesssolutionsindia.com)
    
    const adminId = mongoose.Types.ObjectId('6784abdeec01b5b3d11f774a');
    const correctTenantId = 'cross-miles-carrier-inc';
    
    console.log('Looking for employees created by admin:', adminId);
    console.log('Target tenant ID:', correctTenantId);
    
    // First, preview what will be updated
    const employeesToUpdate = await User.find({
      tenantId: 'legacy_tenant_001',
      created_by: adminId,
      is_admin: { $ne: 1 } // Only update non-admin users
    });
    
    console.log(`\nFound ${employeesToUpdate.length} employees to update:`);
    employeesToUpdate.forEach((emp, index) => {
      console.log(`  ${index + 1}. ${emp.name} (${emp.email})`);
      console.log(`     Current tenantId: "${emp.tenantId}"`);
      console.log(`     Will change to: "${correctTenantId}"`);
    });
    
    if (employeesToUpdate.length === 0) {
      console.log('No employees found to update.');
      process.exit(0);
    }
    
    // Confirm update
    console.log('\nProceeding with update...');
    
    const updateResult = await User.updateMany(
      {
        tenantId: 'legacy_tenant_001',
        created_by: adminId,
        is_admin: { $ne: 1 }
      },
      {
        $set: { tenantId: correctTenantId }
      }
    );
    
    console.log('\n✅ Update completed:');
    console.log(`   Matched documents: ${updateResult.matchedCount}`);
    console.log(`   Modified documents: ${updateResult.modifiedCount}`);
    
    // Verify the update
    console.log('\n=== Verification ===');
    const verifyEmployees = await User.find({
      created_by: adminId,
      is_admin: { $ne: 1 }
    }).select('name email tenantId');
    
    console.log('All employees created by this admin after update:');
    verifyEmployees.forEach((emp, index) => {
      const status = emp.tenantId === correctTenantId ? '✅' : '❌';
      console.log(`  ${index + 1}. ${emp.name} (${emp.email}) - tenantId: "${emp.tenantId}" ${status}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error during backfill:', error);
    process.exit(1);
  }
}

backfillEmployeeTenant();