const mongoose = require('mongoose');
require('dotenv').config();

const Tenant = require('../db/Tenant');
const User = require('../db/Users');
const Order = require('../db/Order');
const Customer = require('../db/Customer');
const Carrier = require('../db/Carrier');
const Company = require('../db/Company');

// Helper function to create URL-friendly slug from name
function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')        // Replace spaces with -
    .replace(/[^\w\-]+/g, '')     // Remove all non-word chars
    .replace(/\-\-+/g, '-')       // Replace multiple - with single -
    .replace(/^-+/, '')           // Trim - from start of text
    .replace(/-+$/, '');          // Trim - from end of text
}

// Ensure uniqueness by adding numbers if needed
async function ensureUniqueSlug(baseSlug, excludeId = null) {
  let slug = baseSlug;
  let counter = 1;
  
  while (true) {
    const existing = await Tenant.findOne({ 
      tenantId: slug,
      ...(excludeId && { _id: { $ne: excludeId } })
    });
    
    if (!existing) {
      return slug;
    }
    
    counter++;
    slug = `${baseSlug}-${counter}`;
  }
}

async function normalizeTenantIds() {
  try {
    console.log('🔄 Connecting to database...');
    await mongoose.connect(process.env.DB_URL_OFFICE);
    console.log('✅ Connected to database');

    console.log('\n🔍 Finding tenants to normalize...');
    const tenants = await Tenant.find({});
    console.log(`Found ${tenants.length} tenants`);

    for (let i = 0; i < tenants.length; i++) {
      const tenant = tenants[i];
      console.log(`\n📋 Processing tenant ${i + 1}/${tenants.length}: ${tenant.name}`);
      
      // Store the old tenantId for reference updates
      const oldTenantId = tenant.tenantId;
      
      // Generate new slug from name
      const baseSlug = slugify(tenant.name);
      const newTenantId = await ensureUniqueSlug(baseSlug, tenant._id);
      
      console.log(`   Old tenantId: ${oldTenantId}`);
      console.log(`   New tenantId: ${newTenantId}`);
      
      // Skip if already normalized
      if (oldTenantId === newTenantId) {
        console.log(`   ✅ Already normalized, skipping`);
        continue;
      }
      
      // Update tenant record
      await Tenant.findByIdAndUpdate(tenant._id, {
        tenantId: newTenantId,
        subdomain: newTenantId, // Ensure subdomain matches tenantId
        updatedAt: new Date()
      });
      
      console.log(`   📝 Updated tenant record`);
      
      // Update all related records with the new tenantId
      const updatePromises = [
        User.updateMany({ tenantId: oldTenantId }, { tenantId: newTenantId }),
        Order.updateMany({ tenantId: oldTenantId }, { tenantId: newTenantId }),
        Customer.updateMany({ tenantId: oldTenantId }, { tenantId: newTenantId }),
        Carrier.updateMany({ tenantId: oldTenantId }, { tenantId: newTenantId }),
        Company.updateMany({ tenantId: oldTenantId }, { tenantId: newTenantId })
      ];
      
      const results = await Promise.all(updatePromises);
      const [userCount, orderCount, customerCount, carrierCount, companyCount] = results.map(r => r.modifiedCount);
      
      console.log(`   📊 Updated related records:`);
      console.log(`      Users: ${userCount}`);
      console.log(`      Orders: ${orderCount}`);
      console.log(`      Customers: ${customerCount}`);
      console.log(`      Carriers: ${carrierCount}`);
      console.log(`      Companies: ${companyCount}`);
    }

    console.log('\n✅ All tenant IDs normalized successfully!');
    
    // Verify results
    console.log('\n📊 Final verification:');
    const finalTenants = await Tenant.find({}).select('name tenantId subdomain');
    finalTenants.forEach(t => {
      const isConsistent = t.tenantId === t.subdomain;
      console.log(`   ${isConsistent ? '✅' : '❌'} ${t.name}: ${t.tenantId} (subdomain: ${t.subdomain})`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error normalizing tenant IDs:', error);
    process.exit(1);
  }
}

// Add this script to package.json
console.log('🚀 Starting tenant ID normalization...');
console.log('This will make all tenantId values URL-friendly and consistent with subdomain');
normalizeTenantIds();