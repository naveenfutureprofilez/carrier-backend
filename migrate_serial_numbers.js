require('dotenv').config();
const connectDB = require('./db/config');

async function migrateSerialNumbers() {
    try {
        await connectDB();
        console.log('✅ Connected to database');
        
        const db = require('mongoose').connection.db;
        const ordersCollection = db.collection('orders');
        
        console.log('\n=== Serial Number Migration ===');
        
        // Find all orders where serial_no is a string
        const stringSerialOrders = await ordersCollection.find({
            serial_no: { $type: "string" }
        }).toArray();
        
        console.log(`Found ${stringSerialOrders.length} orders with string serial_no`);
        
        if (stringSerialOrders.length === 0) {
            console.log('✅ No migration needed - all serial numbers are already numbers');
        } else {
            // Convert string serial numbers to integers
            let migrated = 0;
            let failed = 0;
            
            for (const order of stringSerialOrders) {
                try {
                    const numericSerialNo = parseInt(order.serial_no);
                    if (!isNaN(numericSerialNo)) {
                        await ordersCollection.updateOne(
                            { _id: order._id },
                            { $set: { serial_no: numericSerialNo } }
                        );
                        migrated++;
                        console.log(`✓ Migrated order ${order._id}: "${order.serial_no}" → ${numericSerialNo}`);
                    } else {
                        console.log(`✗ Failed to convert order ${order._id}: "${order.serial_no}" is not a valid number`);
                        failed++;
                    }
                } catch (error) {
                    console.log(`✗ Error migrating order ${order._id}: ${error.message}`);
                    failed++;
                }
            }
            
            console.log(`\\n=== Migration Results ===`);
            console.log(`Successfully migrated: ${migrated}`);
            console.log(`Failed: ${failed}`);
        }
        
        // Verify final state
        console.log('\\n=== Verification ===');
        const allOrders = await ordersCollection.find({}).sort({ serial_no: -1 }).limit(10).toArray();
        
        console.log('Top 10 orders (by serial_no descending):');
        console.log('Serial No | Type   | Status');
        console.log('----------|--------|----------');
        
        let allNumeric = true;
        allOrders.forEach(order => {
            const serialType = typeof order.serial_no;
            if (serialType !== 'number') allNumeric = false;
            console.log(`${String(order.serial_no).padEnd(9)} | ${serialType.padEnd(6)} | ${order.order_status || 'N/A'}`);
        });
        
        if (allNumeric) {
            console.log('\\n✅ All serial numbers are now stored as numbers');
        } else {
            console.log('\\n⚠️  Some serial numbers are still not numbers');
        }
        
        // Check sorting
        let sortingCorrect = true;
        for (let i = 1; i < allOrders.length; i++) {
            if (allOrders[i].serial_no > allOrders[i-1].serial_no) {
                sortingCorrect = false;
                break;
            }
        }
        
        if (sortingCorrect) {
            console.log('✅ Sorting verification passed - orders are in correct descending order');
        } else {
            console.log('❌ Sorting verification failed - orders are not in correct descending order');
        }
        
    } catch (error) {
        console.error('❌ Migration error:', error.message);
    } finally {
        process.exit(0);
    }
}

migrateSerialNumbers();
