const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();

// Import models
const Company = require('../db/Company');
const User = require('../db/Users');
const Customer = require('../db/Customer');
const Carrier = require('../db/Carrier');
const Order = require('../db/Order');
const Equipment = require('../db/Equipment');
const Charges = require('../db/Charges');
const Commudity = require('../db/Commudity');

// Connect to database
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/carrier', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('📡 MongoDB Connected');
  } catch (error) {
    console.error('Database connection failed:', error.message);
    process.exit(1);
  }
};

// Generate unique ID
const generateUniqueId = () => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

async function createSampleData() {
  try {
    console.log('🏗️  Creating sample data for testing migration...');

    // Check if data already exists
    const existingCompany = await Company.findOne();
    if (existingCompany) {
      console.log('⚠️  Sample data already exists. Skipping creation.');
      return;
    }

    // Create Company
    const company = await Company.create({
      name: 'Your Logistics Company',
      email: 'admin@yourcompany.com',
      phone: '+1-555-123-4567',
      address: '123 Business Street, City, State 12345',
      bank_name: 'First National Bank',
      account_name: 'Your Logistics Company',
      account_number: '1234567890',
      routing_number: '987654321',
      remittance_primary_email: 'billing@yourcompany.com',
      company_slug: 'your-logistics-company'
    });
    
    console.log('✅ Created company:', company.name);

    // Create Admin User
    const adminUser = await User.create({
      company: company._id,
      name: 'John Admin',
      email: 'admin@yourcompany.com',
      password: await bcrypt.hash('admin123', 12),
      phone: '+1-555-123-4567',
      country: 'United States',
      address: '123 Admin Street',
      role: 3,
      is_admin: 1,
      isSuper: '1',
      corporateID: 'ADMIN001',
      position: 'System Administrator'
    });

    console.log('✅ Created admin user:', adminUser.email);

    // Create Regular Users
    const users = [
      {
        company: company._id,
        name: 'Jane Manager',
        email: 'manager@yourcompany.com',
        password: await bcrypt.hash('manager123', 12),
        phone: '+1-555-123-4568',
        country: 'United States',
        address: '124 Manager Street',
        role: 2,
        is_admin: 1,
        corporateID: 'MGR001',
        position: 'Operations Manager',
        staff_commision: 5
      },
      {
        company: company._id,
        name: 'Bob Employee',
        email: 'employee@yourcompany.com',
        password: await bcrypt.hash('employee123', 12),
        phone: '+1-555-123-4569',
        country: 'United States',
        address: '125 Employee Street',
        role: 1,
        corporateID: 'EMP001',
        position: 'Logistics Coordinator',
        staff_commision: 3
      }
    ];

    const createdUsers = await User.insertMany(users);
    console.log(`✅ Created ${createdUsers.length} additional users`);

    // Create Equipment Types
    const equipmentTypes = [
      { company: company._id, name: 'Dry Van' },
      { company: company._id, name: 'Refrigerated Trailer' },
      { company: company._id, name: 'Flatbed' },
      { company: company._id, name: 'Step Deck' }
    ];
    await Equipment.insertMany(equipmentTypes);
    console.log('✅ Created equipment types');

    // Create Charges
    const charges = [
      { company: company._id, name: 'Fuel Surcharge' },
      { company: company._id, name: 'Loading Fee' },
      { company: company._id, name: 'Unloading Fee' },
      { company: company._id, name: 'Detention Fee' }
    ];
    await Charges.insertMany(charges);
    console.log('✅ Created charge types');

    // Create Commodities
    const commodities = [
      { company: company._id, name: 'General Freight' },
      { company: company._id, name: 'Food Products' },
      { company: company._id, name: 'Electronics' },
      { company: company._id, name: 'Automotive Parts' }
    ];
    await Commudity.insertMany(commodities);
    console.log('✅ Created commodity types');

    // Create Sample Customers
    const customers = [
      {
        company: company._id,
        name: 'ABC Manufacturing',
        customerCode: 'ABC001',
        phone: '+1-555-200-1000',
        email: 'contact@abcmanufacturing.com',
        address: '456 Industrial Blvd',
        country: 'United States',
        state: 'California',
        city: 'Los Angeles',
        zipcode: '90210',
        created_by: adminUser._id,
        emails: [
          { email: 'contact@abcmanufacturing.com', is_primary: true },
          { email: 'orders@abcmanufacturing.com', is_primary: false }
        ]
      },
      {
        company: company._id,
        name: 'XYZ Distribution',
        customerCode: 'XYZ001',
        phone: '+1-555-200-2000',
        email: 'info@xyzdistribution.com',
        address: '789 Distribution Way',
        country: 'United States',
        state: 'Texas',
        city: 'Dallas',
        zipcode: '75201',
        created_by: adminUser._id,
        emails: [
          { email: 'info@xyzdistribution.com', is_primary: true }
        ]
      }
    ];

    const createdCustomers = await Customer.insertMany(customers);
    console.log(`✅ Created ${createdCustomers.length} customers`);

    // Create Sample Carriers
    const carriers = [
      {
        company: company._id,
        name: 'Fast Freight LLC',
        mc_code: 'MC123456',
        phone: '+1-555-300-1000',
        email: 'dispatch@fastfreight.com',
        country: 'United States',
        state: 'Illinois',
        city: 'Chicago',
        zipcode: '60601',
        location: 'Chicago, IL',
        carrierID: 'FF001',
        created_by: adminUser._id,
        emails: [
          { email: 'dispatch@fastfreight.com', is_primary: true },
          { email: 'billing@fastfreight.com', is_primary: false }
        ]
      },
      {
        company: company._id,
        name: 'Reliable Transport Inc',
        mc_code: 'MC789012',
        phone: '+1-555-300-2000',
        email: 'ops@reliabletransport.com',
        country: 'United States',
        state: 'Georgia',
        city: 'Atlanta',
        zipcode: '30301',
        location: 'Atlanta, GA',
        carrierID: 'RT001',
        created_by: adminUser._id,
        emails: [
          { email: 'ops@reliabletransport.com', is_primary: true }
        ]
      }
    ];

    const createdCarriers = await Carrier.insertMany(carriers);
    console.log(`✅ Created ${createdCarriers.length} carriers`);

    // Create Sample Orders
    const orders = [
      {
        company: company._id,
        company_name: company.name,
        serial_no: 1001,
        customer: createdCustomers[0]._id,
        carrier: createdCarriers[0]._id,
        total_amount: 2500.00,
        carrier_amount: 2000.00,
        shipping_details: [
          {
            pickup_location: 'Los Angeles, CA',
            delivery_location: 'Phoenix, AZ',
            pickup_date: new Date(),
            delivery_date: new Date(Date.now() + 24 * 60 * 60 * 1000)
          }
        ],
        revenue_items: [
          { name: 'Base Rate', value: 2200 },
          { name: 'Fuel Surcharge', value: 250 },
          { name: 'Loading Fee', value: 50 }
        ],
        carrier_revenue_items: [
          { name: 'Base Rate', value: 1800 },
          { name: 'Fuel Surcharge', value: 200 }
        ],
        revenue_currency: 'USD',
        order_status: 'active',
        customer_payment_status: 'pending',
        carrier_payment_status: 'pending',
        totalDistance: 350,
        totalDistanceInKM: 563,
        created_by: adminUser._id,
        notes: 'Standard freight delivery - handle with care'
      },
      {
        company: company._id,
        company_name: company.name,
        serial_no: 1002,
        customer: createdCustomers[1]._id,
        carrier: createdCarriers[1]._id,
        total_amount: 3500.00,
        carrier_amount: 2800.00,
        shipping_details: [
          {
            pickup_location: 'Dallas, TX',
            delivery_location: 'Houston, TX',
            pickup_date: new Date(),
            delivery_date: new Date(Date.now() + 12 * 60 * 60 * 1000)
          }
        ],
        revenue_items: [
          { name: 'Base Rate', value: 3200 },
          { name: 'Fuel Surcharge', value: 200 },
          { name: 'Express Fee', value: 100 }
        ],
        carrier_revenue_items: [
          { name: 'Base Rate', value: 2600 },
          { name: 'Fuel Surcharge', value: 200 }
        ],
        revenue_currency: 'USD',
        order_status: 'in_transit',
        customer_payment_status: 'completed',
        carrier_payment_status: 'pending',
        totalDistance: 240,
        totalDistanceInKM: 386,
        created_by: createdUsers[0]._id,
        notes: 'Priority delivery - time sensitive'
      }
    ];

    const createdOrders = await Order.insertMany(orders);
    console.log(`✅ Created ${createdOrders.length} orders`);

    console.log('\n🎉 Sample data creation completed successfully!');
    console.log('\n📊 Created:');
    console.log(`- 1 Company: ${company.name}`);
    console.log(`- ${createdUsers.length + 1} Users (including admin)`);
    console.log(`- ${createdCustomers.length} Customers`);
    console.log(`- ${createdCarriers.length} Carriers`);
    console.log(`- ${createdOrders.length} Orders`);
    console.log('- 4 Equipment Types');
    console.log('- 4 Charge Types');
    console.log('- 4 Commodity Types');

    console.log('\n👤 Login Credentials:');
    console.log('Admin: admin@yourcompany.com / admin123');
    console.log('Manager: manager@yourcompany.com / manager123');
    console.log('Employee: employee@yourcompany.com / employee123');

  } catch (error) {
    console.error('❌ Error creating sample data:', error.message);
    throw error;
  }
}

// Main execution
const main = async () => {
  try {
    await connectDB();
    await createSampleData();
    console.log('\n✅ Sample data setup completed!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Sample data setup failed:', error.message);
    process.exit(1);
  }
};

if (require.main === module) {
  main();
}

module.exports = { createSampleData };