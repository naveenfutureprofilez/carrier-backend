const mongoose = require('mongoose');

const subscriptionPlanSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Plan name is required'],
    unique: true,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Plan description is required']
  },
  price: {
    type: Number,
    required: [true, 'Plan price is required'],
    min: [0, 'Price cannot be negative']
  },
  currency: {
    type: String,
    required: true,
    default: 'USD',
    uppercase: true,
    enum: ['USD', 'EUR', 'GBP', 'CAD', 'AUD']
  },
  billingCycle: {
    type: String,
    required: true,
    enum: ['monthly', 'yearly', 'one-time'],
    default: 'monthly'
  },
  trialDays: {
    type: Number,
    default: 14,
    min: [0, 'Trial days cannot be negative']
  },
  features: {
    type: [String],
    required: true,
    default: []
  },
  limits: {
    maxUsers: {
      type: Number,
      required: true,
      default: 10,
      min: [1, 'Must allow at least 1 user']
    },
    maxOrders: {
      type: Number,
      required: true,
      default: 100,
      min: [1, 'Must allow at least 1 order']
    },
    maxCustomers: {
      type: Number,
      required: true,
      default: 50,
      min: [1, 'Must allow at least 1 customer']
    },
    maxCarriers: {
      type: Number,
      required: true,
      default: 50,
      min: [1, 'Must allow at least 1 carrier']
    },
    storageLimit: {
      type: String,
      required: true,
      default: '1GB',
      validate: {
        validator: function(v) {
          return /^\d+(\.\d+)?(MB|GB|TB)$/i.test(v);
        },
        message: 'Storage limit must be in format like 1GB, 500MB, 2TB'
      }
    },
    apiCallsPerMonth: {
      type: Number,
      default: 10000,
      min: [0, 'API calls cannot be negative']
    }
  },
  permissions: {
    type: [String],
    default: [
      'orders.create',
      'orders.read',
      'orders.update',
      'customers.create',
      'customers.read',
      'customers.update',
      'carriers.create',
      'carriers.read',
      'carriers.update',
      'reports.basic'
    ]
  },
  integrations: {
    paymentGateways: {
      type: [String],
      default: ['stripe']
    },
    thirdPartyApis: {
      type: [String],
      default: ['google_maps']
    },
    webhooks: {
      type: Boolean,
      default: false
    }
  },
  priority: {
    type: Number,
    default: 0,
    index: true
  },
  isPopular: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  stripeProductId: {
    type: String,
    sparse: true,
    unique: true
  },
  stripePriceId: {
    type: String,
    sparse: true,
    unique: true
  },
  metadata: {
    type: Map,
    of: String
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
subscriptionPlanSchema.index({ slug: 1 });
subscriptionPlanSchema.index({ isActive: 1, isPublic: 1 });
subscriptionPlanSchema.index({ price: 1 });
subscriptionPlanSchema.index({ billingCycle: 1 });
subscriptionPlanSchema.index({ priority: -1 });

// Virtual for formatted price
subscriptionPlanSchema.virtual('formattedPrice').get(function() {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: this.currency
  }).format(this.price);
});

// Virtual for monthly equivalent price
subscriptionPlanSchema.virtual('monthlyEquivalentPrice').get(function() {
  if (this.billingCycle === 'yearly') {
    return this.price / 12;
  }
  return this.price;
});

// Virtual for storage limit in bytes
subscriptionPlanSchema.virtual('storageLimitBytes').get(function() {
  const match = this.limits.storageLimit.match(/^(\d+(?:\.\d+)?)(MB|GB|TB)$/i);
  if (!match) return 0;
  
  const value = parseFloat(match[1]);
  const unit = match[2].toUpperCase();
  
  const multipliers = {
    MB: 1024 * 1024,
    GB: 1024 * 1024 * 1024,
    TB: 1024 * 1024 * 1024 * 1024
  };
  
  return value * (multipliers[unit] || 0);
});

// Pre-save middleware to generate slug
subscriptionPlanSchema.pre('save', function(next) {
  if (!this.slug && this.name) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
  this.updatedAt = Date.now();
  next();
});

// Static method to find active public plans
subscriptionPlanSchema.statics.findActivePublicPlans = function() {
  return this.find({
    isActive: true,
    isPublic: true
  }).sort({ priority: -1, price: 1 });
};

// Static method to find plan by slug
subscriptionPlanSchema.statics.findBySlug = function(slug) {
  return this.findOne({ slug, isActive: true });
};

// Method to check if plan has feature
subscriptionPlanSchema.methods.hasFeature = function(feature) {
  return this.features.includes(feature);
};

// Method to check if plan has permission
subscriptionPlanSchema.methods.hasPermission = function(permission) {
  return this.permissions.includes(permission);
};

// Query middleware to only return active plans by default
subscriptionPlanSchema.pre(/^find/, function(next) {
  if (!this.getQuery().isActive) {
    this.find({ isActive: { $ne: false } });
  }
  next();
});

const SubscriptionPlan = mongoose.model('subscription_plans', subscriptionPlanSchema);
module.exports = SubscriptionPlan;