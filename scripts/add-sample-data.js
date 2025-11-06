const mongoose = require('mongoose');
const Order = require('../db/Order');
const Customer = require('../db/Customer');
const Carrier = require('../db/Carrier');
const Company = require('../db/Company');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    mongoose.set('strictQuery', false);
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/carrier', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
};

const addSampleData = async (tenantId = 'cross-miles-carrier-inc') => {
  try {
    console.log(`🚀 Adding sample data for tenant: ${tenantId}`);
    
    // First, get or create a company for this tenant
    let company = await Company.findOne({ tenantId });
    if (!company) {
      company = await Company.create({
        tenantId,
        name: 'Cross Miles Carrier Inc',
        mc_code: `MC${Date.now()}`,
        dot_number: `DOT${Date.now()}`,
        address: '123 Logistics Ave',
        city: 'Freight City',
        state: 'TX',
        zip: '75001',
        email: 'info@crossmiles.com',
        phone: '555-0123'
      });
      console.log('✅ Created company for tenant');
    }

    // Add sample customers
    const customers = [];
    for (let i = 1; i <= 3; i++) {
      const customer = await Customer.create({
        tenantId,
        name: `Test Customer ${i}`,
        email: `customer${i}@test.com`,
        phone: `555-010${i}`,
        address: `${i}00 Customer St`,
        city: 'Customer City',
        state: 'CA',
        zipcode: '9000' + i,
        country: 'USA',
        customerCode: 2000 + i,
        company: company._id,
        emails: [{ email: `customer${i}@test.com`, is_primary: true, created_at: new Date() }]
      });
      customers.push(customer);
      console.log(`✅ Created customer: ${customer.name}`);
    }

    // Add sample carriers
    const carriers = [];
    for (let i = 1; i <= 3; i++) {
      const carrier = await Carrier.create({
        tenantId,
        name: `Test Carrier ${i}`,
        email: `carrier${i}@test.com`,
        phone: `555-020${i}`,
        location: `${i}00 Carrier Rd`,
        city: 'Carrier City',
        state: 'FL',
        zipcode: '3000' + i,
        country: 'USA',
        mc_code: `MC100${i}`,
        carrierID: `CR_ID${100000 + i}`,
        company: company._id,
        emails: [{ email: `carrier${i}@test.com`, is_primary: true, created_at: new Date() }]
      });
      carriers.push(carrier);
      console.log(`✅ Created carrier: ${carrier.name}`);
    }

    // Generate unique serial numbers for orders
    const Counter = mongoose.model('counters', new mongoose.Schema({
      _id: { type: String, required: true },
      sequence_value: { type: Number, default: 1000 }
    }));

    // Add sample orders
    for (let i = 1; i <= 5; i++) {
      // Get next serial number
      const counter = await Counter.findOneAndUpdate(
        { _id: 'serial_no' },
        { $inc: { sequence_value: 1 } },
        { new: true, upsert: true }
      );

      const customer = customers[i % customers.length];
      const carrier = carriers[i % carriers.length];

      const order = await Order.create({
        tenantId,
        company: company._id,
        serial_no: counter.sequence_value,
        company_name: company.name,
        customer: customer._id,
        carrier: carrier._id,
        total_amount: 1000 + (i * 200),
        carrier_amount: 800 + (i * 150),
        shipping_details: {
          pickup_location: `Pickup Location ${i}`,
          delivery_location: `Delivery Location ${i}`,
          pickup_date: new Date(Date.now() + i * 24 * 60 * 60 * 1000),
          delivery_date: new Date(Date.now() + (i + 3) * 24 * 60 * 60 * 1000)
        },
        order_status: ['added', 'intransit', 'completed'][i % 3],
        customer_payment_status: 'pending',
        carrier_payment_status: 'pending',
        revenue_items: [
          { description: `Revenue Item ${i}`, amount: 1000 + (i * 200) }
        ],
        carrier_revenue_items: [
          { description: `Carrier Cost ${i}`, amount: 800 + (i * 150) }
        ],
        revenue_currency: 'USD',
        created_by: null // No user ID for sample data
      });
      
      console.log(`✅ Created order #${order.serial_no}: $${order.total_amount}`);
    }

    console.log('\n🎉 Sample data added successfully!');
    console.log(`📊 Data summary for ${tenantId}:`);
    
    const [orderCount, customerCount, carrierCount] = await Promise.all([
      Order.countDocuments({ tenantId }),
      Customer.countDocuments({ tenantId }),
      Carrier.countDocuments({ tenantId })
    ]);
    
    console.log(`   - Orders: ${orderCount}`);
    console.log(`   - Customers: ${customerCount}`);
    console.log(`   - Carriers: ${carrierCount}`);
    
  } catch (error) {
    console.error('❌ Error adding sample data:', error);
    throw error;
  }
};

// Run the script
const main = async () => {
  try {
    await connectDB();
    
    // Get tenant ID from command line argument or use default
    const tenantId = process.argv[2] || 'cross-miles-carrier-inc';
    console.log(`Target tenant: ${tenantId}`);
    
    await addSampleData(tenantId);
    process.exit(0);
  } catch (error) {
    console.error('Script failed:', error);
    process.exit(1);
  }
};

// Only run if this file is executed directly
if (require.main === module) {
  main();
}

module.exports = { addSampleData };