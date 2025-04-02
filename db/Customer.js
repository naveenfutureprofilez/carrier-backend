const mongoose = require('mongoose');
const schema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please enter customer name.'],
    },
    mc_code: {
        type: String,
        required: [true, 'Please enter mc code.'],
    },
    secondary_phone: {
        type: String,
    },
    phone: {
        type: String,
        required: [true, 'Please enter customer contact number.'],
    },
    email: {
        type: String,
    },
    secondary_email: {
        type: String,
    },
    address: {
        type: String,
    },
    country: {
        type: String,
    },
    state: {
        type: String,
    },
    city: {
        type: String,
    },
    zipcode: {
        type: String,
    },
    createdAt: {
       type: Date,
       default: Date.now()
   },
   deletedAt: {type: Date},
   created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'users' },
   assigned_to: { type: mongoose.Schema.Types.ObjectId, ref: 'users' },
},{
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

const Customer = mongoose.model('customers', schema);
module.exports = Customer;
