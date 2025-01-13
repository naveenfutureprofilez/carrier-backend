const mongoose = require('mongoose');

const schema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please enter your name.'],
    },
    phone: {
        type: String,
        required: [true, 'Please enter driver phone number.'],
    },
    email: {
        type: String,
    },
    driverID: {
        type: String,
        required: [true, 'Please enter Driver ID.'],
        unique: true
    },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'users' },
    createdAt: {
        type: Date,
        default: Date.now()
    },
    deletedAt: {
        type: Date
    },
},{
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

const Driver = mongoose.model('drivers', schema);
module.exports = Driver;
