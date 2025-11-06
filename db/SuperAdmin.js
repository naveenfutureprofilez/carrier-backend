const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const superAdminSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please enter your name.'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Please enter your email address.'],
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid email address.'],
    unique: true,
    index: true
  },
  avatar: {
    type: String
  },
  password: {
    type: String,
    required: [true, 'Please enter your password.'],
    minlength: [8, 'Password must be at least 8 characters long.'],
    select: false
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users',
    required: true,
    unique: true,
    index: true
  },
  role: {
    type: String,
    default: 'super_admin',
    immutable: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active',
    index: true
  },
  lastLogin: {
    type: Date
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date
  },
  twoFactorAuth: {
    enabled: {
      type: Boolean,
      default: false
    },
    secret: String,
    backupCodes: [String]
  },
  preferences: {
    theme: {
      type: String,
      enum: ['light', 'dark'],
      default: 'dark'
    },
    timezone: {
      type: String,
      default: 'UTC'
    },
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      browser: {
        type: Boolean,
        default: true
      }
    }
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  changedPasswordAt: Date,
  passwordResetToken: String,
  resetTokenExpire: Date,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'superadmins'
  }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  timestamps: { updatedAt: 'updatedAt' }
});

// Indexes for performance
superAdminSchema.index({ email: 1 });
superAdminSchema.index({ status: 1 });
superAdminSchema.index({ role: 1 });
superAdminSchema.index({ createdAt: -1 });

// Virtual for checking if account is locked
superAdminSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Hash password before saving
superAdminSchema.pre('save', async function(next) {
  // Skip password hashing if flag is set (for migration)
  if (this._skipPasswordHash) {
    this._skipPasswordHash = undefined; // Remove flag after use
    return next();
  }
  
  if (!this.isModified('password')) return next();
  
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Update password changed timestamp
superAdminSchema.pre('save', function(next) {
  if (!this.isModified('password') || this.isNew) return next();
  
  this.changedPasswordAt = Date.now() - 1000;
  next();
});

// Pre-save middleware to update updatedAt
superAdminSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Method to check password
superAdminSchema.methods.checkPassword = async function(candidatePassword, userPassword) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

// Method to check if password was changed after JWT was issued
superAdminSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
  if (this.changedPasswordAt) {
    const changedTimestamp = parseInt(
      this.changedPasswordAt.getTime() / 1000,
      10
    );
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

// Method to create password reset token
superAdminSchema.methods.createPasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');
  
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
    
  this.resetTokenExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
  
  return resetToken;
};

// Method to handle login attempts
superAdminSchema.methods.incLoginAttempts = function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: {
        lockUntil: 1
      },
      $set: {
        loginAttempts: 1
      }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  // Lock account after 5 failed attempts for 2 hours
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = {
      lockUntil: Date.now() + 2 * 60 * 60 * 1000 // 2 hours
    };
  }
  
  return this.updateOne(updates);
};

// Method to reset login attempts
superAdminSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: {
      loginAttempts: 1,
      lockUntil: 1
    }
  });
};

// Query middleware to exclude inactive users by default
superAdminSchema.pre(/^find/, function(next) {
  this.find({ status: { $ne: 'inactive' } });
  next();
});

const SuperAdmin = mongoose.model('superadmins', superAdminSchema);
module.exports = SuperAdmin;