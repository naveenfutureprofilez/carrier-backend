require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./db/config');

async function testFinalImplementation() {
  try {
    await connectDB();
    console.log('Database connected successfully');
    
    console.log('\n=== Testing Final Raw Collection Implementation ===');
    
    // Simulate the updated employeesLisiting function
    async function simulateEmployeesLisiting(tenantId) {
      if (!tenantId) {
        return {
          status: false,
          message: "Tenant context is required",
          lists: [],
          totalDocuments: 0
        };
      }
      
      // Use raw collection query to bypass middleware and include ALL users
      const db = mongoose.connection.db;
      const usersCollection = db.collection('users');
      
      const rawUsers = await usersCollection.find({ tenantId }).toArray();
      const totalDocuments = rawUsers.length;
      
      // Convert raw documents to match expected format
      const lists = rawUsers.map(user => ({
        _id: user._id,
        name: user.name,
        email: user.email,
        status: user.status,
        role: user.role,
        tenantId: user.tenantId,
        createdAt: user.createdAt
      }));
      
      return {
        status: true,
        lists: lists,
        totalDocuments: totalDocuments
      };
    }
    
    // Test blue-dart tenant
    console.log('\n1. Blue-dart tenant:');
    const blueDartResponse = await simulateEmployeesLisiting('blue-dart');
    console.log(`Status: ${blueDartResponse.status}`);
    console.log(`Total Documents: ${blueDartResponse.totalDocuments}`);
    
    // Test cross-miles tenant
    console.log('\n2. Cross-miles-carrier-inc tenant:');
    const crossMilesResponse = await simulateEmployeesLisiting('cross-miles-carrier-inc');
    console.log(`Status: ${crossMilesResponse.status}`);
    console.log(`Total Documents: ${crossMilesResponse.totalDocuments}`);
    
    // Show breakdown
    const activeCount = crossMilesResponse.lists.filter(u => u.status === 'active').length;
    const inactiveCount = crossMilesResponse.lists.filter(u => u.status === 'inactive').length;
    console.log(`\nBreakdown:`);
    console.log(`- Active: ${activeCount}`);
    console.log(`- Inactive: ${inactiveCount}`);
    console.log(`- Total: ${crossMilesResponse.totalDocuments}`);
    
    console.log('\n✅ FINAL SIDEBAR COUNTS:');
    console.log(`- Blue-dart: ${blueDartResponse.totalDocuments}`);
    console.log(`- Cross-miles: ${crossMilesResponse.totalDocuments}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testFinalImplementation();