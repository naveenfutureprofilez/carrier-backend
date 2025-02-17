const mongoose = require('mongoose');
const schema = new mongoose.Schema({
   name: { type:String },
   mime: {
        type:String,
   },
   size: { type:String },
   filename: { type:String },
   url: { type:String },
   order: { type: mongoose.Schema.Types.ObjectId, ref: 'orders' },
   createdAt: {
      type: Date,
      default: Date.now()     
   },
   deletedAt: {
      type: Date,
      default: null   
   },
});



const Files = mongoose.model('files', schema);
module.exports = Files;

 