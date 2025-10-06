const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const Tenant = require('../db/Tenant');
const SuperAdmin = require('../db/SuperAdmin');
const SubscriptionPlan = require('../db/SubscriptionPlan');
const User = require('../db/Users');
const Company = require('../db/Company');
const Order = require('../db/Order');
const Customer = require('../db/Customer');
const Carrier = require('../db/Carrier');
const bcrypt = require('bcrypt');

/**
 * Get system overview
 */
const getSystemOverview = catchAsync(async (req, res, next) => {
  const [
    totalTenants,
    activeTenants,
    totalUsers,
    totalOrders,
    totalRevenue,
    recentTenants
  ] = await Promise.all([
    Tenant.countDocuments(),
    Tenant.countDocuments({ status: 'active' }),
    User.countDocuments(),
    Order.countDocuments(),
    Order.aggregate([
      { $group: { _id: null, total: { $sum: '$total_amount' } } }
    ]),
    Tenant.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('tenantId name subdomain status subscription createdAt')
      .lean()
  ]);

  const revenue = totalRevenue.length > 0 ? totalRevenue[0].total : 0;

  // Get subscription plan distribution
  const planDistribution = await Tenant.aggregate([
    {
      $group: {
        _id: '$subscription.plan',
        count: { $sum: 1 }
      }
    }
  ]);

  res.json({
    status: true,
    data: {
      overview: {
        totalTenants,
        activeTenants,
        inactiveTenants: totalTenants - activeTenants,
        totalUsers,
        totalOrders,
        totalRevenue: revenue
      },
      planDistribution,
      recentTenants
    }
  });
});

/**
 * Get all tenants with filtering and pagination
 */
const getAllTenants = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 10, search, status, plan } = req.query;
  
  const filter = {};
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { subdomain: { $regex: search, $options: 'i' } }
    ];
  }
  if (status && status !== 'all') {
    filter.status = status;
  }
  if (plan && plan !== 'all') {
    filter['subscription.plan'] = plan;
  }

  const tenants = await Tenant.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await Tenant.countDocuments(filter);

  // Get usage stats and subscription plan details for each tenant
  const tenantsWithUsage = await Promise.all(
    tenants.map(async (tenant) => {
      const [usage, subscriptionPlan] = await Promise.all([
        Promise.all([
          User.countDocuments({ tenantId: tenant.tenantId }),
          Order.countDocuments({ tenantId: tenant.tenantId }),
          Customer.countDocuments({ tenantId: tenant.tenantId }),
          Carrier.countDocuments({ tenantId: tenant.tenantId })
        ]),
        SubscriptionPlan.findOne({ slug: tenant.subscription.plan })
      ]);
      
      const [users, orders, customers, carriers] = usage;
      
      return {
        ...tenant.toObject(),
        usage: { users, orders, customers, carriers },
        subscriptionPlan: subscriptionPlan || null
      };
    })
  );

  res.json({
    status: true,
    data: {
      tenants: tenantsWithUsage,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    }
  });
});

/**
 * Get specific tenant details
 */
const getTenantDetails = catchAsync(async (req, res, next) => {
  const { tenantId } = req.params;
  
  const tenant = await Tenant.findOne({ tenantId });
  if (!tenant) {
    return next(new AppError('Tenant not found', 404));
  }

  const [company, usage, subscriptionPlan] = await Promise.all([
    Company.findOne({ tenantId }),
    Promise.all([
      User.countDocuments({ tenantId }),
      Order.countDocuments({ tenantId }),
      Customer.countDocuments({ tenantId }),
      Carrier.countDocuments({ tenantId })
    ]),
    SubscriptionPlan.findOne({ slug: tenant.subscription.plan })
  ]);

  const [users, orders, customers, carriers] = usage;

  res.json({
    status: true,
    data: {
      tenant,
      company,
      subscriptionPlan,
      usage: { users, orders, customers, carriers }
    }
  });
});

/**
 * Update tenant status
 */
const updateTenantStatus = catchAsync(async (req, res, next) => {
  const { tenantId } = req.params;
  const { status, reason } = req.body;
  
  const tenant = await Tenant.findOneAndUpdate(
    { tenantId },
    { 
      status,
      'billing.statusChangeReason': reason,
      'billing.statusChangedAt': new Date(),
      'billing.statusChangedBy': req.user._id
    },
    { new: true }
  );

  if (!tenant) {
    return next(new AppError('Tenant not found', 404));
  }

  res.json({
    status: true,
    data: { tenant },
    message: `Tenant status updated to ${status}`
  });
});

/**
 * Force upgrade/downgrade tenant plan
 */
const updateTenantPlan = catchAsync(async (req, res, next) => {
  const { tenantId } = req.params;
  const { planSlug, reason } = req.body;
  
  const newPlan = await SubscriptionPlan.findOne({ slug: planSlug, isActive: true });
  if (!newPlan) {
    return next(new AppError('Subscription plan not found', 404));
  }

  const tenant = await Tenant.findOneAndUpdate(
    { tenantId },
    {
      'subscription.plan': planSlug,
      'settings.maxUsers': newPlan.limits.maxUsers,
      'settings.maxOrders': newPlan.limits.maxOrders,
      'settings.features': newPlan.features,
      'billing.planChangeReason': reason,
      'billing.planChangedAt': new Date(),
      'billing.planChangedBy': req.user._id,
      updatedAt: new Date()
    },
    { new: true }
  );

  if (!tenant) {
    return next(new AppError('Tenant not found', 404));
  }

  res.json({
    status: true,
    data: { tenant },
    message: `Tenant plan updated to ${newPlan.name}`
  });
});

/**
 * Get all subscription plans
 */
const getSubscriptionPlans = catchAsync(async (req, res, next) => {
  const plans = await SubscriptionPlan.find().sort({ price: 1 });
  
  res.json({
    status: true,
    data: { plans }
  });
});

/**
 * Create new subscription plan
 */
const createSubscriptionPlan = catchAsync(async (req, res, next) => {
  const plan = await SubscriptionPlan.create({
    ...req.body,
    createdBy: req.user._id
  });

  res.status(201).json({
    status: true,
    data: { plan },
    message: 'Subscription plan created successfully'
  });
});

/**
 * Update subscription plan
 */
const updateSubscriptionPlan = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  
  const plan = await SubscriptionPlan.findByIdAndUpdate(
    id,
    { ...req.body, updatedAt: new Date() },
    { new: true, runValidators: true }
  );

  if (!plan) {
    return next(new AppError('Subscription plan not found', 404));
  }

  res.json({
    status: true,
    data: { plan },
    message: 'Subscription plan updated successfully'
  });
});

/**
 * Delete subscription plan
 */
const deleteSubscriptionPlan = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  
  // Check if any tenant is using this plan
  const tenantsUsingPlan = await Tenant.countDocuments({ 'subscription.plan': id });
  if (tenantsUsingPlan > 0) {
    return next(new AppError('Cannot delete plan that is in use by tenants', 400));
  }

  const plan = await SubscriptionPlan.findByIdAndDelete(id);
  if (!plan) {
    return next(new AppError('Subscription plan not found', 404));
  }

  res.json({
    status: true,
    message: 'Subscription plan deleted successfully'
  });
});

/**
 * Create new tenant
 */
const createTenant = catchAsync(async (req, res, next) => {
  const {
    name,
    subdomain,
    adminName,
    adminEmail,
    adminPhone,
    subscriptionPlan,
    companyInfo
  } = req.body;

  // Check if subdomain is available
  const existingTenant = await Tenant.findOne({ subdomain });
  if (existingTenant) {
    return next(new AppError('Subdomain already exists', 400));
  }

  // Check if admin email already exists
  const existingUser = await User.findOne({ email: adminEmail });
  if (existingUser) {
    return next(new AppError('Admin email already exists', 400));
  }

  // Get subscription plan details
  const plan = await SubscriptionPlan.findOne({ slug: subscriptionPlan });
  if (!plan) {
    return next(new AppError('Subscription plan not found', 404));
  }

  // Generate unique tenant ID
  const tenantId = `tenant_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

  // Create tenant
  const tenant = await Tenant.create({
    tenantId,
    name,
    subdomain,
    status: 'active',
    subscription: {
      plan: subscriptionPlan,
      status: 'active',
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      billingCycle: 'monthly'
    },
    settings: {
      maxUsers: plan.limits.maxUsers,
      maxOrders: plan.limits.maxOrders,
      features: plan.features
    },
    billing: {
      balance: 0,
      nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    },
    createdBy: req.user._id
  });

  // Create company
  const company = await Company.create({
    tenantId,
    name: companyInfo.name || name,
    mc_code: companyInfo.mc_code || `MC${Date.now()}`,
    dot_number: companyInfo.dot_number || `DOT${Date.now()}`,
    address: companyInfo.address || 'N/A',
    city: companyInfo.city || 'N/A',
    state: companyInfo.state || 'N/A',
    zip: companyInfo.zip || 'N/A',
    phone: companyInfo.phone || adminPhone,
    email: companyInfo.email || adminEmail,
    website: companyInfo.website || `https://${subdomain}.spennypiggy.co`,
    status: 'active'
  });

  // Create admin user
  const tempPassword = Math.random().toString(36).substring(2, 15);
  const hashedPassword = await bcrypt.hash(tempPassword, 12);

  const adminUser = await User.create({
    tenantId,
    company: company._id,
    name: adminName,
    email: adminEmail,
    password: hashedPassword,
    phone: adminPhone,
    country: 'USA',
    address: companyInfo.address || 'N/A',
    role: 3, // Admin role
    position: 'Administrator',
    corporateID: `ADMIN_${Date.now()}`,
    isTenantAdmin: true
  });

  // Remove password from response
  adminUser.password = undefined;

  res.status(201).json({
    status: true,
    data: {
      tenant,
      company,
      adminUser,
      tempPassword // In production, send this via email
    },
    message: 'Tenant created successfully'
  });
});

/**
 * Get system analytics
 */
const getSystemAnalytics = catchAsync(async (req, res, next) => {
  const { period = '30d' } = req.query;
  
  // Calculate date range
  const now = new Date();
  const startDate = new Date();
  
  switch (period) {
    case '7d':
      startDate.setDate(now.getDate() - 7);
      break;
    case '30d':
      startDate.setDate(now.getDate() - 30);
      break;
    case '90d':
      startDate.setDate(now.getDate() - 90);
      break;
    case '1y':
      startDate.setFullYear(now.getFullYear() - 1);
      break;
    default:
      startDate.setDate(now.getDate() - 30);
  }

  const baseFilter = { createdAt: { $gte: startDate } };

  const [
    newTenants,
    newUsers,
    totalOrders,
    totalRevenue,
    tenantGrowth,
    revenueByMonth,
    planDistribution
  ] = await Promise.all([
    Tenant.countDocuments(baseFilter),
    User.countDocuments(baseFilter),
    Order.countDocuments(baseFilter),
    Order.aggregate([
      { $match: baseFilter },
      { $group: { _id: null, total: { $sum: '$total_amount' } } }
    ]),
    Tenant.aggregate([
      { $match: baseFilter },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]),
    Order.aggregate([
      { $match: baseFilter },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          revenue: { $sum: '$total_amount' },
          orders: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]),
    Tenant.aggregate([
      {
        $group: {
          _id: '$subscription.plan',
          count: { $sum: 1 }
        }
      }
    ])
  ]);

  const revenue = totalRevenue.length > 0 ? totalRevenue[0].total : 0;

  res.json({
    status: true,
    data: {
      period,
      summary: {
        newTenants,
        newUsers,
        totalOrders,
        totalRevenue: revenue
      },
      charts: {
        tenantGrowth: tenantGrowth.map(item => ({
          date: `${item._id.year}-${String(item._id.month).padStart(2, '0')}-${String(item._id.day).padStart(2, '0')}`,
          count: item.count
        })),
        revenueByMonth: revenueByMonth.map(item => ({
          period: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
          revenue: item.revenue,
          orders: item.orders
        })),
        planDistribution: planDistribution.map(item => ({
          plan: item._id,
          count: item.count
        }))
      }
    }
  });
});

/**
 * Get tenant activity logs (placeholder)
 */
const getTenantActivityLogs = catchAsync(async (req, res, next) => {
  const { tenantId } = req.params;
  
  res.json({
    status: true,
    data: {
      logs: [],
      message: 'Activity logging to be implemented'
    }
  });
});

/**
 * Export system data (placeholder)
 */
const exportSystemData = catchAsync(async (req, res, next) => {
  res.json({
    status: true,
    message: 'System data export to be implemented'
  });
});

module.exports = {
  getSystemOverview,
  getAllTenants,
  getTenantDetails,
  updateTenantStatus,
  updateTenantPlan,
  getSubscriptionPlans,
  createSubscriptionPlan,
  updateSubscriptionPlan,
  deleteSubscriptionPlan,
  createTenant,
  getSystemAnalytics,
  getTenantActivityLogs,
  exportSystemData
};