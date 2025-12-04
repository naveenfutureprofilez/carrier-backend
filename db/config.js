// db.js
const mongoose = require("mongoose");
mongoose.set("strictQuery", true);

let cachedConnection = null;

async function connectDB() {
  if (cachedConnection) {
    return cachedConnection;
  }
  try {
    const db = await mongoose.connect(process.env.DB_URL_OFFICE, {
      maxPoolSize: 20,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000,
      autoIndex: true,
    });

    console.log("✅ Database connected successfully");
    cachedConnection = db;
    return db;
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    throw error;
  }
}

module.exports = connectDB;
