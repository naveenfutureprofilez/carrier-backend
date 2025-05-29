const mongoose = require('mongoose');
const schema = new mongoose.Schema({
   name: { 
      type:String,
      required:[true, 'Equipment name can not be empty.']
    },   
    createdAt: {
      type: Date,
      default: Date.now()     
   },
});

const Equipment = mongoose.model('equipment', schema);
module.exports = Equipment;

 