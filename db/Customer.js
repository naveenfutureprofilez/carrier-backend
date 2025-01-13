const mongoose = require('mongoose');
const schema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please enter customer name.'],
    },
    phone: {
        type: String,
        required: [true, 'Please enter customer contact number.'],
    },
    email: {
        type: String,
        required: [true, 'Please enter customer email address.'],
    },
    customerID: {
        type: String,
        unique: true
    },
    createdAt: {
       type: Date,
       default: Date.now()
   },
   deletedAt: {type: Date},
   created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'users' },
},{
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

const Customer = mongoose.model('customers', schema);
module.exports = Customer;
