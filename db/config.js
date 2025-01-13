const dotenv = require('dotenv');
dotenv.config({path:'config.env'});

const mongoose = require('mongoose');
mongoose.set('strictQuery', true);
  


mongoose.connect( `mongodb+srv://naveenfp:naveenfp@cluster0.5c8ne.mongodb.net/carrier`, {
// mongoose.connect(process.env.DB_URL_OFFICE, {
    useNewUrlParser: true,   
    autoIndex: false, // Don't build indexes 
    maxPoolSize: 10, // Maintain up to 10 socket connections
    serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
    socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    family: 4
 }).then(() => {
   console.log('MongoDB connected successfully');
 }).catch((err) => {
   console.error('MongoDB connection error: ', err);
 }); 
  