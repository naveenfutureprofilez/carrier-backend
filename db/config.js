const dotenv = require('dotenv');
dotenv.config({path:'config.env'});

const mongoose = require('mongoose');
mongoose.set('strictQuery', true);
  


mongoose.connect( `mongodb+srv://naveentehrpariya:naveentehrpariya21081998@cluster0.rnebihn.mongodb.net/carrier`, {
// mongoose.connect(process.env.DB_URL_OFFICE, {
    useNewUrlParser: true,   
    autoIndex: false, // Don't build indexes 
    maxPoolSize: 10, // Maintain up to 10 socket connections
    family: 4,
    serverSelectionTimeoutMS: 15000, // Increase to 15 seconds
    socketTimeoutMS: 60000 // Increase to 15 seconds
 }).then(() => {
   console.log('MongoDB connected successfully');
 }).catch((err) => {
   console.error('MongoDB connection error: ', err);
 }); 
  