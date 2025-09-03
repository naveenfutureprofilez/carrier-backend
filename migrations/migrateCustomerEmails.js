const mongoose = require('mongoose');
const Customer = require('../db/Customer');

// Migration script to convert existing customer email fields to the new emails array format
async function migrateCustomerEmails() {
  try {
    console.log('Starting customer email migration...');
    
    // Connect to MongoDB (make sure your connection string is correct)
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/your-database-name');
    }

    // Find all customers that don't have the emails array or have empty emails array
    const customers = await Customer.find({
      $or: [
        { emails: { $exists: false } },
        { emails: { $size: 0 } }
      ]
    });

    console.log(`Found ${customers.length} customers to migrate.`);

    let migratedCount = 0;
    let skippedCount = 0;

    for (const customer of customers) {
      const emailsArray = [];

      // Add primary email if exists
      if (customer.email) {
        emailsArray.push({
          email: customer.email.toLowerCase().trim(),
          is_primary: true,
          created_at: new Date()
        });
      }

      // Add secondary email if exists and is different from primary
      if (customer.secondary_email && 
          customer.secondary_email.toLowerCase().trim() !== customer.email?.toLowerCase().trim()) {
        emailsArray.push({
          email: customer.secondary_email.toLowerCase().trim(),
          is_primary: false,
          created_at: new Date()
        });
      }

      // Only update if we have emails to add
      if (emailsArray.length > 0) {
        try {
          await Customer.findByIdAndUpdate(
            customer._id,
            { emails: emailsArray },
            { new: true }
          );
          migratedCount++;
          console.log(`✓ Migrated customer ${customer.name} (${customer.customerCode}) - ${emailsArray.length} emails`);
        } catch (error) {
          console.error(`✗ Failed to migrate customer ${customer.name} (${customer.customerCode}):`, error.message);
        }
      } else {
        skippedCount++;
        console.log(`- Skipped customer ${customer.name} (${customer.customerCode}) - no valid emails found`);
      }
    }

    console.log('\n--- Migration Summary ---');
    console.log(`Total customers found: ${customers.length}`);
    console.log(`Successfully migrated: ${migratedCount}`);
    console.log(`Skipped (no emails): ${skippedCount}`);
    console.log('Migration completed successfully!');

  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

// Function to rollback migration (optional - for testing purposes)
async function rollbackMigration() {
  try {
    console.log('Starting rollback of customer email migration...');
    
    const customers = await Customer.find({ emails: { $exists: true, $not: { $size: 0 } } });
    console.log(`Found ${customers.length} customers to rollback.`);

    for (const customer of customers) {
      await Customer.findByIdAndUpdate(
        customer._id,
        { $unset: { emails: 1 } },
        { new: true }
      );
      console.log(`✓ Rolled back customer ${customer.name} (${customer.customerCode})`);
    }

    console.log('Rollback completed successfully!');
  } catch (error) {
    console.error('Rollback failed:', error);
    throw error;
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  const action = process.argv[2];
  
  if (action === 'rollback') {
    rollbackMigration()
      .then(() => process.exit(0))
      .catch((error) => {
        console.error(error);
        process.exit(1);
      });
  } else {
    migrateCustomerEmails()
      .then(() => process.exit(0))
      .catch((error) => {
        console.error(error);
        process.exit(1);
      });
  }
}

module.exports = {
  migrateCustomerEmails,
  rollbackMigration
};
