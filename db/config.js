const mongoose = require("mongoose");
mongoose.set('strictQuery', true);

async function connectDB() {
    try {
        await mongoose.connect(process.env.DB_URL_OFFICE, {
            useNewUrlParser: true,
            useUnifiedTopology: true, 
            maxPoolSize: 30,
            serverSelectionTimeoutMS: 60000,    // 60s to select server
            socketTimeoutMS: 120000,            // 120s before closing sockets
            connectTimeoutMS: 120000,           // 120s to establish connection
            bufferCommands: true,  
            autoIndex: true,
            keepAlive: true, 
            keepAliveInitialDelay: 300000,
        }); 
        console.log("✅ Database connected successfully");
    } catch (error) {
        console.error("❌ Database connection failed:", error);
        throw error; 
    }
}

mongoose.connection.on("connected", () => {
    console.log("Mongoose connected to DB");
});

mongoose.connection.on("error", (err) => {
    console.error("Mongoose connection error:", err);
});

mongoose.connection.on("disconnected", () => {
    console.log("Mongoose disconnected");
});

connectDB().then(async () => {
    await mongoose.model('users').findOne();
}).catch(err => console.error("Initial DB connection failed:", err));

module.exports = mongoose;