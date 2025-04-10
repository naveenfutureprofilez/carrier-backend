// const mongoose = require("mongoose");
// mongoose.set('strictQuery', true);

// async function connectDB() {
//     try {
//         await mongoose.connect(process.env.DB_URL_OFFICE, {
//             useNewUrlParser: true,
//             useUnifiedTopology: true, 
//             maxPoolSize: 30,
//             serverSelectionTimeoutMS: 60000, 
//             socketTimeoutMS: 120000, 
//             connectTimeoutMS: 120000,  
//             bufferCommands: true,  
//             autoIndex: true,
//             keepAlive: true, 
//             keepAliveInitialDelay: 300000,
//         }); 
//         console.log("✅ Database connected successfully");
//     } catch (error) {
//         console.error("❌ Database connection failed:", error);
//         throw error; 
//     }
// }

// mongoose.connection.on("connected", () => {
//     console.log("Mongoose connected to DB");
// });

// mongoose.connection.on("error", (err) => {
//     console.error("Mongoose connection error:", err);
// });

// mongoose.connection.on("disconnected", () => {
//     console.log("Mongoose disconnected");
// });

// connectDB().then(async () => {
//     await mongoose.model('users').findOne();
// }).catch(err => console.error("Initial DB connection failed:", err));

// module.exports = mongoose;



const mongoose = require('mongoose');
const User = require('./Users');

// Ensure you have the DB_URL_OFFICE environment variable set
const uri = process.env.DB_URL_OFFICE;

const clientOptions = {
  serverApi: {
    version: '1',
    strict: true,
    deprecationErrors: true,
  },
};

async function run() {
  try {
    if (!uri) {
      console.error("❌ DB_URL_OFFICE environment variable is not set.");
      return;
    }

    mongoose.connection.on('connecting', () => {
      console.log('⏳ Connecting to MongoDB...');
    });

    mongoose.connection.on('connected', () => {
      console.log('✅ MongoDB connected successfully!');
    });

    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('❌ MongoDB disconnected.');
    });
    await mongoose.connect(uri, clientOptions);
    await mongoose.connection.db.admin().command({ ping: 1 });
    console.log("✅ Pinged your deployment. You successfully connected to MongoDB!");
    const newUser = await User.findOne({});
    console.log("✅ Found users:", newUser);
  } catch (error) {
    console.error("❌ Error during database operation or connection:", error);
  } finally {
    // Ensures that the client will close when you finish/error
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log("❌ Mongoose disconnected.");
    } else {
      console.log("⚠️ Mongoose was not connected, no need to disconnect.");
    }
  }
}

run().catch(console.dir);