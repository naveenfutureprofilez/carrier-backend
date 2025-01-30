const { default: mongoose } = require("mongoose");

let isConnected; // Global variable

async function connectDB() {
    if (isConnected) {
        console.log("Using existing database connection");
        return;
    }
    try {
        const db = await mongoose.connect(process.env.DB_URL_OFFICE, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            bufferCommands: false,
            autoIndex: false,
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 30000,
            socketTimeoutMS: 60000
        });
        isConnected = db.connections[0].readyState;
        console.log("Database connected successfully !! =>>>");
    } catch (error) {
        console.error("Database connection failed:", error);
    }
}

module.exports = connectDB;