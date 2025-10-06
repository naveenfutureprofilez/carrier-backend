const mongoose = require('mongoose');

const tenantSchema = new mongoose.Schema({
  tenantId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true,
    lowercase: true
  },
  name: {
    type: String,
    required: [true, 'Tenant name is required'],
    trim: true
  },
  domain: {
    type: String,
    required: [true, 'Domain is required'],
    unique: true,
    trim: true,
    lowercase: true
  },
  subdomain: {
    type: String,
    required: [true, 'Subdomain is required'],
    unique: true,
    trim: true,
    lowercase: true,
    validate: {
      validator: function(v) {
        // Validate subdomain format (alphanumeric and hyphens only)
        return /^[a-z0-9-]+$/.test(v);
      },
      message: 'Subdomain can only contain lowercase letters, numbers, and hyphens'
    }
  },
  status: {
    type: String,
    enum: ['active', 'suspended', 'pending', 'cancelled'],
    default: 'pending',
    index: true
  },
  subscription: {
    plan: {
      type: String,
      enum: ['basic', 'standard', 'premium', 'enterprise'],
      default: 'basic'
    },
    status: {
      type: String,
      enum: ['active', 'cancelled', 'past_due', 'trial'],
      default: 'trial'
    },
    startDate: {
      type: Date,
      default: Date.now
    },
    endDate: Date,
    billingCycle: {
      type: String,
      enum: ['monthly', 'yearly'],
      default: 'monthly'
    },
    stripeCustomerId: String,
    stripeSubscriptionId: String
  },
  settings: {
    maxUsers: {
      type: Number,
      default: 10
    },
    maxOrders: {
      type: Number,
      default: 1000
    },
    maxStorage: {
      type: String,
      default: '1GB'
    },
    features: {
      type: [String],
      default: ['orders', 'customers', 'carriers', 'basic_reporting']
    },
    customizations: {
      theme: {
        primaryColor: {
          type: String,
          default: '#3B82F6'
        },
        logo: String
      },
      branding: {
        companyName: String,
        showPoweredBy: {
          type: Boolean,
          default: true
        }
      }
    }
  },
  contactInfo: {
    adminName: {
      type: String,
      required: [true, 'Admin name is required']
    },
    adminEmail: {
      type: String,
      required: [true, 'Admin email is required'],
      lowercase: true,
      validate: {
        validator: function(v) {
          return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(v);
        },
        message: 'Please provide a valid email address'
      }
    },
    phone: String,
    address: String,
    city: String,
    state: String,
    country: String,
    zipcode: String
  },
  usage: {
    currentUsers: {
      type: Number,
      default: 0
    },
    currentOrders: {
      type: Number,
      default: 0
    },
    storageUsed: {
      type: String,
      default: '0MB'
    },
    lastActivity: {
      type: Date,
      default: Date.now
    }
  },
  billing: {
    balance: {
      type: Number,
      default: 0
    },
    currency: {
      type: String,
      default: 'USD'
    },
    nextBillingDate: Date,
    paymentMethod: {
      type: String,
      enum: ['card', 'bank_transfer', 'check'],
      default: 'card'
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
tenantSchema.index({ tenantId: 1 });
tenantSchema.index({ subdomain: 1 });
tenantSchema.index({ status: 1 });
tenantSchema.index({ 'subscription.status': 1 });
tenantSchema.index({ createdAt: -1 });

// Virtual for full domain
tenantSchema.virtual('fullDomain').get(function() {
  return `${this.subdomain}.${this.domain}`;
});

// Virtual for subscription active status
tenantSchema.virtual('isSubscriptionActive').get(function() {
  return ['active', 'trial'].includes(this.subscription.status);
});

// Pre-save middleware to update updatedAt
tenantSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Tenant = mongoose.model('tenants', tenantSchema);
module.exports = Tenant;