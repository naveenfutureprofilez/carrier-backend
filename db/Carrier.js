const mongoose = require('mongoose');
const schema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please enter Carrier Name.'],
    },
    phone: {
        type: String,
        required: [true, 'Please enter carrier contact number.'],
    },
    email: {
        type: String,
        unique: true
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
    location: {
        type: String,
    },
    carrierID: {
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

const Carrier = mongoose.model('carriers', schema);
module.exports = Carrier;
