const mongoose = require("mongoose");

// Remove global isConnected flag; Mongoose manages connection state internally

async function connectDB() {
    try {
        await mongoose.connect(process.env.DB_URL_OFFICE, {
            useNewUrlParser: true,
            useUnifiedTopology: true, 
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 60000,    // 60s to select server
            socketTimeoutMS: 120000,            // 120s before closing sockets
            connectTimeoutMS: 120000,           // 120s to establish connection
            bufferCommands: true,               // Enable buffering
            autoIndex: false,
            keepAlive: true, 
            keepAliveInitialDelay: 300000,
        }); 

        console.log("✅ Database connected successfully");
    } catch (error) {
        console.error("❌ Database connection failed:", error);
        throw error; // Rethrow to handle in the catch block
    }
}

// Handle connection events
mongoose.connection.on("connected", () => {
    console.log("Mongoose connected to DB");
});

mongoose.connection.on("error", (err) => {
    console.error("Mongoose connection error:", err);
});

mongoose.connection.on("disconnected", () => {
    console.log("Mongoose disconnected");
});

// Connect to DB and handle errors
connectDB().then(async () => {
    await mongoose.model('users').findOne();
}).catch(err => console.error("Initial DB connection failed:", err));

module.exports = mongoose;