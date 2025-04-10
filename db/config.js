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
const uri = "mongodb+srv://imaanvirk1:TFNrwarPpYrJw7yZ@cluster0.8l1eszr.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

const clientOptions = { serverApi: { version: '1', strict: true, deprecationErrors: true } };

async function run() {
  try {
    // Create a Mongoose client with a MongoClientOptions object to set the Stable API version
    await mongoose.connect(uri, clientOptions);
    await mongoose.connection.db.admin().command({ ping: 1 });
    console.log("✅ Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    await mongoose.disconnect();
    // console.error("❌ DISCONNECTED");
  }
}
run().catch(console.dir);
