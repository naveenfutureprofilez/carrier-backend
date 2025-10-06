require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// Import models
const Company = require('../db/Company');
const User = require('../db/Users');
const Customer = require('../db/Customer');
const Carrier = require('../db/Carrier');
const Order = require('../db/Order');
const Equipment = require('../db/Equipment');
const Charges = require('../db/Charges');
const Commodities = require('../db/Commudity');

const connectDB = require('../db/config');

const generateSampleData = async () => {
  try {
    console.log('🚀 Starting sample data generation...');
    
    // Connect to database
    await connectDB();
    
    // Check if data already exists
    const existingCompany = await Company.findOne({});
    if (existingCompany) {
      console.log('⚠️  Sample data already exists. Skipping generation.');
      console.log('Existing company:', existingCompany.name);
      console.log('\n🔐 Login Credentials (if using existing data):');
      console.log('Try: admin@spennypiggy.co / password123');
      mongoose.connection.close();
      return;
    }
    
    // Clear existing data (optional - uncomment if needed)
    // console.log('🗑️  Clearing existing data...');
    // await Promise.all([
    //   Company.deleteMany({}),
    //   User.deleteMany({}),
    //   Customer.deleteMany({}),
    //   Carrier.deleteMany({}),
    //   Order.deleteMany({}),
    //   Equipment.deleteMany({}),
    //   Charges.deleteMany({}),
    //   Commodities.deleteMany({})
    // ]);

    console.log('🏢 Creating sample company...');
    
    // Create a sample company
    const company = await Company.create({
      name: 'SpenyPiggy Logistics',
      mc_code: 'MC123456',
      dot_number: 'DOT789012',
      address: '123 Transport Ave',
      city: 'Houston',
      state: 'TX',
      zip: '77001',
      phone: '+1-713-555-0123',
      email: 'info@spennypiggy.co',
      website: 'https://spennypiggy.co',
      bank_name: 'Chase Bank',
      account_name: 'SpenyPiggy Logistics LLC',
      account_number: '1234567890',
      routing_number: '021000021',
      remittance_primary_email: 'billing@spennypiggy.co',
      remittance_secondary_email: 'accounting@spennypiggy.co',
      rate_confirmation_terms: 'Payment terms: Net 30 days from delivery confirmation.',
      status: 'active'
    });

    console.log('✅ Company created:', company.name);

    console.log('👥 Creating sample users...');
    
    // Create sample users with different roles
    const users = [];
    const userDataList = [
      {
        name: 'John Admin',
        email: 'admin@spennypiggy.co',
        role: 3, // Admin
        position: 'CEO',
        phone: '+1-713-555-0101'
      },
      {
        name: 'Sarah Manager',
        email: 'manager@spennypiggy.co', 
        role: 2, // Manager
        position: 'Operations Manager',
        phone: '+1-713-555-0102'
      },
      {
        name: 'Mike Staff',
        email: 'mike@spennypiggy.co',
        role: 1, // Staff
        position: 'Dispatcher',
        phone: '+1-713-555-0103',
        staff_commision: 5.0
      },
      {
        name: 'Lisa Staff',
        email: 'lisa@spennypiggy.co',
        role: 1, // Staff
        position: 'Customer Service',
        phone: '+1-713-555-0104',
        staff_commision: 3.0
      },
      {
        name: 'David Driver',
        email: 'david@spennypiggy.co',
        role: 0, // Driver
        position: 'Driver',
        phone: '+1-713-555-0105'
      }
    ];

    for (const userData of userDataList) {
      const hashedPassword = await bcrypt.hash('password123', 12);
      const corporateID = `CCID${Math.floor(100000 + Math.random() * 900000)}`;
      
      const user = await User.create({
        ...userData,
        company: company._id,
        password: hashedPassword,
        confirmPassword: hashedPassword,
        country: 'USA',
        address: '123 Employee St, Houston, TX 77002',
        corporateID,
        status: 'active',
        isTenantAdmin: userData.role === 3 // Set tenant admin for admin users
      });
      
      users.push(user);
    }

    console.log('✅ Users created:', users.length);

    console.log('👔 Creating sample customers...');
    
    // Create sample customers
    const customers = [];
    const customerNames = [
      'ABC Manufacturing Corp',
      'XYZ Distribution LLC', 
      'Global Trade Solutions',
      'Premium Goods Inc',
      'Midwest Supply Chain',
      'Pacific Logistics Group',
      'Atlantic Freight Co',
      'Central Transport Hub',
      'Northern Shipping LLC',
      'Southern Express Corp'
    ];

    for (let i = 0; i < customerNames.length; i++) {
      const customer = await Customer.create({
        company: company._id,
        name: customerNames[i],
        contact_name: `Contact ${i + 1}`,
        email: `contact${i + 1}@${customerNames[i].toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
        phone: `+1-800-555-${String(i + 1).padStart(4, '0')}`,
        address: `${100 + i * 10} Customer Blvd`,
        city: ['New York', 'Los Angeles', 'Chicago', 'Miami', 'Dallas', 'Seattle', 'Denver', 'Atlanta', 'Boston', 'Phoenix'][i],
        state: ['NY', 'CA', 'IL', 'FL', 'TX', 'WA', 'CO', 'GA', 'MA', 'AZ'][i],
        country: 'USA',
        zipcode: `${10000 + i * 1000}`,
        notes: `Established customer since ${2020 + i}. Reliable payment history.`,
        status: 'active',
        created_by: users[0]._id
      });
      
      customers.push(customer);
    }

    console.log('✅ Customers created:', customers.length);

    console.log('🚛 Creating sample carriers...');
    
    // Create sample carriers
    const carriers = [];
    const carrierNames = [
      'Swift Transportation',
      'J.B. Hunt Transport',
      'Knight-Swift Transport',
      'Landstar System',
      'Old Dominion Freight'
    ];

    for (let i = 0; i < carrierNames.length; i++) {
      const carrier = await Carrier.create({
        company: company._id,
        name: carrierNames[i],
        mc_code: `MC${String(100000 + i * 1000).padStart(6, '0')}`,
        dot_number: `DOT${String(200000 + i * 1000).padStart(6, '0')}`,
        contact_name: `Carrier Contact ${i + 1}`,
        email: `contact@${carrierNames[i].toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
        phone: `+1-888-555-${String(i + 1).padStart(4, '0')}`,
        address: `${200 + i * 20} Carrier Way`,
        location: `${200 + i * 20} Carrier Way`,
        city: ['Memphis', 'Little Rock', 'Phoenix', 'Jacksonville', 'Thomasville'][i],
        state: ['TN', 'AR', 'AZ', 'FL', 'GA'][i],
        country: 'USA',
        zipcode: `${38000 + i * 1000}`,
        notes: `Preferred carrier with excellent safety record. ${i + 1} years partnership.`,
        status: 'active',
        created_by: users[1]._id
      });
      
      carriers.push(carrier);
    }

    console.log('✅ Carriers created:', carriers.length);

    console.log('📦 Creating sample equipment...');
    
    // Create sample equipment
    const equipmentTypes = ['Dry Van', 'Refrigerated', 'Flatbed', 'Step Deck', 'Double Drop'];
    const equipment = [];
    
    for (let i = 0; i < equipmentTypes.length; i++) {
      const equip = await Equipment.create({
        company: company._id,
        type: equipmentTypes[i],
        description: `${equipmentTypes[i]} trailer - ${53} ft`,
        length: 53,
        width: 8.5,
        height: equipmentTypes[i] === 'Refrigerated' ? 13 : 13.6,
        weight_capacity: equipmentTypes[i] === 'Flatbed' ? 48000 : 45000,
        notes: `Standard ${equipmentTypes[i]} equipment available`,
        status: 'active',
        created_by: users[0]._id
      });
      
      equipment.push(equip);
    }

    console.log('✅ Equipment created:', equipment.length);

    console.log('💰 Creating sample charges...');
    
    // Create sample charges
    const chargeTypes = [
      { name: 'Fuel Surcharge', type: 'percentage', default_amount: 15 },
      { name: 'Detention Fee', type: 'flat', default_amount: 25 },
      { name: 'Loading Fee', type: 'flat', default_amount: 50 },
      { name: 'Unloading Fee', type: 'flat', default_amount: 50 },
      { name: 'Lumper Fee', type: 'flat', default_amount: 75 }
    ];

    const charges = [];
    for (const chargeType of chargeTypes) {
      const charge = await Charges.create({
        company: company._id,
        name: chargeType.name,
        charge_type: chargeType.type,
        default_amount: chargeType.default_amount,
        description: `Standard ${chargeType.name.toLowerCase()} applied to orders`,
        status: 'active',
        created_by: users[0]._id
      });
      
      charges.push(charge);
    }

    console.log('✅ Charges created:', charges.length);

    console.log('📋 Creating sample commodities...');
    
    // Create sample commodities
    const commodityTypes = [
      'General Freight',
      'Electronics', 
      'Food & Beverages',
      'Automotive Parts',
      'Construction Materials',
      'Textiles & Apparel',
      'Chemicals',
      'Paper Products'
    ];

    const commodities = [];
    for (const commodityType of commodityTypes) {
      const commodity = await Commodities.create({
        company: company._id,
        name: commodityType,
        description: `${commodityType} - Various items and products`,
        hazmat: commodityType === 'Chemicals',
        notes: commodityType === 'Chemicals' ? 'Requires hazmat certification' : 'Standard commodity handling',
        status: 'active',
        created_by: users[0]._id
      });
      
      commodities.push(commodity);
    }

    console.log('✅ Commodities created:', commodities.length);

    console.log('🚚 Creating sample orders...');
    
    // Create sample orders
    const orders = [];
    const orderStatuses = ['pending', 'confirmed', 'dispatched', 'in_transit', 'delivered'];
    
    for (let i = 0; i < 20; i++) {
      const pickupDate = new Date();
      pickupDate.setDate(pickupDate.getDate() + Math.floor(Math.random() * 30) - 15);
      
      const deliveryDate = new Date(pickupDate);
      deliveryDate.setDate(deliveryDate.getDate() + Math.floor(Math.random() * 5) + 1);
      
      const customerIndex = Math.floor(Math.random() * customers.length);
      const carrierIndex = Math.floor(Math.random() * carriers.length);
      const equipmentIndex = Math.floor(Math.random() * equipment.length);
      const commodityIndex = Math.floor(Math.random() * commodities.length);
      
      const baseAmount = 1000 + Math.floor(Math.random() * 4000);
      const carrierAmount = baseAmount * 0.85; // 85% to carrier
      const totalAmount = baseAmount + Math.floor(Math.random() * 200); // Add some charges
      
      const order = await Order.create({
        company: company._id,
        order_number: `ORD-${String(10000 + i).padStart(6, '0')}`,
        customer: customers[customerIndex]._id,
        carrier: carriers[carrierIndex]._id,
        equipment_type: equipment[equipmentIndex]._id,
        commodity: commodities[commodityIndex]._id,
        
        pickup_address: `${Math.floor(Math.random() * 9999)} Pickup St`,
        pickup_city: 'Houston',
        pickup_state: 'TX',
        pickup_zip: '77001',
        pickup_date: pickupDate,
        pickup_contact: 'John Shipper',
        pickup_phone: '+1-713-555-1000',
        
        delivery_address: `${Math.floor(Math.random() * 9999)} Delivery Ave`,
        delivery_city: customers[customerIndex].city,
        delivery_state: customers[customerIndex].state,
        delivery_zip: customers[customerIndex].zip,
        delivery_date: deliveryDate,
        delivery_contact: customers[customerIndex].contact_name,
        delivery_phone: customers[customerIndex].phone,
        
        distance: Math.floor(Math.random() * 2000) + 100,
        weight: Math.floor(Math.random() * 40000) + 5000,
        pieces: Math.floor(Math.random() * 20) + 1,
        
        rate_per_mile: (baseAmount / (Math.floor(Math.random() * 2000) + 100)).toFixed(2),
        total_amount: totalAmount,
        carrier_amount: carrierAmount,
        
        order_status: orderStatuses[Math.floor(Math.random() * orderStatuses.length)],
        payment_status: Math.random() > 0.3 ? 'paid' : 'pending',
        
        notes: `Sample order #${i + 1} generated for testing purposes`,
        
        created_by: users[Math.floor(Math.random() * 3)]._id
      });
      
      orders.push(order);
    }

    console.log('✅ Orders created:', orders.length);

    console.log('🎉 Sample data generation completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`- Company: ${company.name}`);
    console.log(`- Users: ${users.length}`);
    console.log(`- Customers: ${customers.length}`);
    console.log(`- Carriers: ${carriers.length}`);
    console.log(`- Equipment Types: ${equipment.length}`);
    console.log(`- Charge Types: ${charges.length}`);
    console.log(`- Commodity Types: ${commodities.length}`);
    console.log(`- Orders: ${orders.length}`);
    
    console.log('\n🔐 Login Credentials:');
    console.log('Admin: admin@spennypiggy.co / password123');
    console.log('Manager: manager@spennypiggy.co / password123');
    console.log('Staff: mike@spennypiggy.co / password123');

    mongoose.connection.close();
    
  } catch (error) {
    console.error('❌ Error generating sample data:', error);
    process.exit(1);
  }
};

generateSampleData();