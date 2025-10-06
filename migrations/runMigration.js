const mongoose = require('mongoose');
require('dotenv').config();

const { migrateToMultiTenant, rollbackMigration } = require('./migrateToMultiTenant');

// Database connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/carrier', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Database connection failed:', error.message);
    process.exit(1);
  }
};

// Main execution function
const main = async () => {
  const command = process.argv[2];
  
  console.log('🚀 Starting migration process...');
  console.log('Command:', command || 'migrate');
  
  try {
    // Connect to database
    await connectDB();
    
    if (command === 'rollback') {
      console.log('\n⚠️  WARNING: This will rollback the multi-tenant migration!');
      console.log('This will remove tenantId from all records and delete tenant-related collections.');
      
      // Add a 5-second delay for safety
      console.log('\n⏳ Starting rollback in 5 seconds... Press Ctrl+C to cancel');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      await rollbackMigration();
    } else {
      // Default: run migration
      await migrateToMultiTenant();
    }
    
    console.log('\n✅ Process completed successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Process failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error);
  process.exit(1);
});

// Run the migration
main();