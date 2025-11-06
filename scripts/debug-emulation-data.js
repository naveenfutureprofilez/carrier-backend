const mongoose = require('mongoose');
require('dotenv').config();

const Tenant = require('../db/Tenant');
const User = require('../db/Users');
const Order = require('../db/Order');
const Customer = require('../db/Customer');
const Carrier = require('../db/Carrier');
const Company = require('../db/Company');

async function debugEmulationData() {
  try {
    console.log('🔄 Connecting to database...');
    await mongoose.connect(process.env.DB_URL_OFFICE);
    console.log('✅ Connected to database');

    const tenantId = 'cross-miles-carrier-inc';
    console.log(`\n🔍 Debugging data for tenant: ${tenantId}`);
    
    // 1. Check tenant exists
    const tenant = await Tenant.findOne({ tenantId });
    if (!tenant) {
      console.log('❌ Tenant not found!');
      process.exit(1);
    }
    
    console.log('✅ Tenant found:');
    console.log(`   Name: ${tenant.name}`);
    console.log(`   TenantId: ${tenant.tenantId}`);
    console.log(`   Subdomain: ${tenant.subdomain}`);
    console.log(`   Status: ${tenant.status}`);
    
    // 2. Check company
    const company = await Company.findOne({ tenantId });
    console.log(`\n🏢 Company: ${company ? `${company.name} (${company._id})` : 'Not found'}`);
    
    // 3. Count data by tenant
    const [userCount, orderCount, customerCount, carrierCount] = await Promise.all([
      User.countDocuments({ tenantId }),
      Order.countDocuments({ tenantId }),
      Customer.countDocuments({ tenantId }),
      Carrier.countDocuments({ tenantId })
    ]);
    
    console.log('\n📊 Data counts for tenant:');
    console.log(`   Users: ${userCount}`);
    console.log(`   Orders: ${orderCount}`);
    console.log(`   Customers: ${customerCount}`);
    console.log(`   Carriers: ${carrierCount}`);
    
    // 4. Show sample orders if any exist
    if (orderCount > 0) {
      const sampleOrders = await Order.find({ tenantId }).limit(3).select('serial_no customer_name total_amount createdAt');
      console.log('\n📝 Sample orders:');
      sampleOrders.forEach(order => {
        console.log(`   ${order.serial_no}: ${order.customer_name} - $${order.total_amount} (${new Date(order.createdAt).toLocaleDateString()})`);
      });
    }
    
    // 5. Test what the overview endpoint should return
    console.log('\n🧪 Testing overview query logic...');
    
    const overviewData = await Promise.all([
      Order.countDocuments({ tenantId }),
      Order.countDocuments({ tenantId, orderStatus: 'completed' }),
      Order.countDocuments({ tenantId, payment: { $ne: 'pending' } }),
      Order.countDocuments({ tenantId, carrier_payment: { $ne: 'pending' } }),
      User.countDocuments({ tenantId }),
      Customer.countDocuments({ tenantId }),
      Carrier.countDocuments({ tenantId }),
      Order.aggregate([
        { $match: { tenantId } },
        { $group: { _id: null, total: { $sum: '$total_amount' } } }
      ])
    ]);
    
    const [totalOrders, completedOrders, paidOrders, carrierPaidOrders, totalUsers, totalCustomers, totalCarriers, revenueAgg] = overviewData;
    const totalRevenue = revenueAgg.length > 0 ? revenueAgg[0].total : 0;
    
    console.log('📈 Expected dashboard data:');
    console.log(`   Total Loads: ${totalOrders}`);
    console.log(`   Completed Loads: ${completedOrders}`);
    console.log(`   Total Users: ${totalUsers}`);
    console.log(`   Total Customers: ${totalCustomers}`);
    console.log(`   Total Carriers: ${totalCarriers}`);
    console.log(`   Total Revenue: $${totalRevenue}`);
    
    // 6. Check for data in other tenants (to verify isolation)
    console.log('\n🔍 Checking data in other tenants...');
    const allTenantData = await Promise.all([
      Order.aggregate([{ $group: { _id: '$tenantId', count: { $sum: 1 } } }]),
      Customer.aggregate([{ $group: { _id: '$tenantId', count: { $sum: 1 } } }])
    ]);
    
    console.log('📊 Data distribution by tenant:');
    console.log('Orders by tenant:');
    allTenantData[0].forEach(item => {
      console.log(`   ${item._id}: ${item.count} orders`);
    });
    console.log('Customers by tenant:');
    allTenantData[1].forEach(item => {
      console.log(`   ${item._id}: ${item.count} customers`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

console.log('🚀 Starting emulation data debug...');
debugEmulationData();