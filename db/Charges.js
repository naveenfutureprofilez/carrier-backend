const mongoose = require('mongoose');
const schema = new mongoose.Schema({
   name: { 
      type:String,
      required:[true, 'Charges name can not be empty.']
    },   
    createdAt: {
      type: Date,
      default: Date.now()     
   },
});
const Charges = mongoose.model('charges', schema);
module.exports = Charges;

 