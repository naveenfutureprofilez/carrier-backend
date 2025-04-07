const mongoose = require('mongoose');
const schema = new mongoose.Schema({
   name: { type:String },
   email: { type:String },
   phone: { type:String },
   address: { type:String }
});

const Company = mongoose.model('companies', schema);
module.exports = Company;

 