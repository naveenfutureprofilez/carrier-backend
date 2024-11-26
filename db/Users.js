const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const schema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please enter your name.'],
    },
    email: {
        type: String,
        required: [true, 'Please enter your email address.'],
        lowercase: true,
        validate: [validator.isEmail, 'Please provide a valid email address.'],
        unique: true
    },
    avatar: {type: String},
    status: {
        type: String,
        default: "active",
    },
    corporateID: {
        type: String,
        required: [true, 'Corporate ID can not be empty.'],
        unique: true
    },
    role: {
        type: String,
        default:'1'
    },
    // 0-admin, 1-staff, 2-customer
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'users' },
    password: {
        type: String,
        required: [true, 'Please enter your password.'],
        select: false
    },
    confirmPassword: {
        type: String,
        required: true,
        required: [true, 'Please re-enter your password.'],
        select: false,
        validate: {
            validator: function (val) { return val === this.password },
            message: "Passwords did't matched."
        }
    },
    createdAt: {
        type: Date,
        default: Date.now()
    },
    changedPasswordAt: Date,
    passwordResetToken: String,
    resetTokenExpire: Date,
    deletedAt: {
        type: Date
    },
},{
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

 

schema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 12);
    this.confirmPassword = undefined;
});

schema.pre(/^find/, function (next) {
    this.find({ active: { $ne: false } });
    next();
});

schema.methods.checkPassword = async function (pass, hash) {
    return await bcrypt.compare(pass, hash);
}

schema.methods.createPasswordResetToken = async function () {
    const token = crypto.randomBytes(32).toString('hex');
    this.passwordResetToken = crypto.createHash('sha256').update(token).digest('hex');
    this.resetTokenExpire = Date.now() + 10 * 60 * 1000;
    return token;
}

const User = mongoose.model('users', schema);
module.exports = User;
