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
            bufferCommands: false,
            autoIndex: false,
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 60000, // Increase to 60 sec
            socketTimeoutMS: 120000, // Increase to 120 sec
            connectTimeoutMS: 120000, // Increase to 120 sec
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

connectDB().catch((err) => console.error("DB Init Error:", err));

module.exports = mongoose;