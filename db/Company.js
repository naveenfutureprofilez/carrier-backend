const mongoose = require('mongoose');
const schema = new mongoose.Schema({
   name: { 
      type:String,
      required:[true, 'Please enter company name.']
    },
   email: { 
      type:String,
      required:[true, 'Please enter company email address.'],
    },
   phone: { 
      type:String,
      required:[true, 'Please enter company contact number.'],
    },
   address: { 
      type:String,
      required:[true, 'Please enter company address.'],
    }
});

const Company = mongoose.model('companies', schema);
module.exports = Company;

 