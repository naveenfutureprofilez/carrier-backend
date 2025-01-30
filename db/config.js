const mongoose = require("mongoose");

let isConnected = false; // Track connection state globally

async function connectDB() {
    if (isConnected) {
        console.log("✅ Using existing database connection");
        return;
    }

    try {
        const db = await mongoose.connect(process.env.DB_URL_OFFICE, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            bufferCommands: false, // Ensure no queries run before connection
            autoIndex: false,
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 30000,
            socketTimeoutMS: 60000,
            keepAlive: true,
            keepAliveInitialDelay: 300000, // 5 minutes
        });

        isConnected = db.connections[0].readyState; // 1 means connected
        console.log("✅ Database connected successfully");
    } catch (error) {
        console.error("❌ Database connection failed:", error);
        throw new Error(error);
    }
}

// Immediately invoke connection at startup
connectDB().catch((err) => console.error("DB Init Error:", err));

module.exports = mongoose; // Export Mongoose instance