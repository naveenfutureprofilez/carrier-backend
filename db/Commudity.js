const mongoose = require('mongoose');
const schema = new mongoose.Schema({
   name: { 
      type:String,
      required:[true, 'Community name can not be empty.']
    },   
    createdAt: {
      type: Date,
      default: Date.now()     
   },
});

const Commudity = mongoose.model('commudity', schema);
module.exports = Commudity;

 