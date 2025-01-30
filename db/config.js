const mongoose = require("mongoose");

let cachedConnection = global.mongoose;

if (!cachedConnection) {
    cachedConnection = global.mongoose = { conn: null, promise: null };
}

// Immediately connect to MongoDB
(async function connectDB() {
    if (cachedConnection.conn) {
        console.log("✅ Using existing database connection");
        return;
    }

    if (!cachedConnection.promise) {
        console.log("🌐 Connecting to MongoDB...");
        cachedConnection.promise = mongoose.connect(process.env.DB_URL_OFFICE, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            bufferCommands: false,
            autoIndex: false,
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 30000,
            socketTimeoutMS: 60000,
            keepAlive: true,
            keepAliveInitialDelay: 300000, // 5 minutes
        }).then((mongoose) => {
            console.log("✅ Database connected successfully");
            return mongoose;
        }).catch((error) => {
            console.error("❌ Database connection failed:", error);
            cachedConnection.promise = null;
            throw error;
        });
    }

    cachedConnection.conn = await cachedConnection.promise;
})();