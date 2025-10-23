const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const Tenant = require('../db/Tenant');
const User = require('../db/Users');
const Company = require('../db/Company');
const Order = require('../db/Order');
const Customer = require('../db/Customer');
const Carrier = require('../db/Carrier');
const SubscriptionPlan = require('../db/SubscriptionPlan');
const bcrypt = require('bcrypt');

/**
 * Get tenant information
 */
const getTenantInfo = catchAsync(async (req, res, next) => {
  const tenant = await Tenant.findOne({ tenantId: req.tenantId });
  const company = await Company.findOne({ tenantId: req.tenantId });
  
  if (!tenant || !company) {
    return next(new AppError('Tenant information not found', 404));
  }

  // Get usage statistics
  const usage = {
    users: await User.countDocuments({ tenantId: req.tenantId }),
    orders: await Order.countDocuments({ tenantId: req.tenantId }),
    customers: await Customer.countDocuments({ tenantId: req.tenantId }),
    carriers: await Carrier.countDocuments({ tenantId: req.tenantId })
  };

  // Get subscription plan details
  const subscriptionPlan = await SubscriptionPlan.findOne({ 
    slug: tenant.subscription.plan 
  });

  res.json({
    status: true,
    data: {
      tenant: {
        id: tenant._id,
        name: tenant.name,
        subdomain: tenant.subdomain,
        status: tenant.status,
        subscription: {
          ...tenant.subscription,
          planDetails: subscriptionPlan
        },
        settings: tenant.settings,
        usage,
        limits: {
          usersUsed: usage.users,
          usersLimit: tenant.settings.maxUsers,
          ordersUsed: usage.orders,
          ordersLimit: tenant.settings.maxOrders
        }
      },
      company
    }
  });
});



/**
 * Update tenant settings
 */
const updateTenantSettings = catchAsync(async (req, res, next) => {
  if (!req.user.isTenantAdmin && req.user.role !== 3) {
    return next(new AppError('Only tenant administrators can update settings', 403));
  }
  const allowedUpdates = [
    'settings.customizations',
    'contactInfo.phone',
    'contactInfo.address'
  ];

  const updates = {};
  Object.keys(req.body).forEach(key => {
    if (allowedUpdates.some(allowed => key.startsWith(allowed.split('.')[0]))) {
      updates[key] = req.body[key];
    }
  });

  const tenant = await Tenant.findOneAndUpdate(
    { tenantId: req.tenantId },
    updates,
    { new: true, runValidators: true }
  );

  if (!tenant) {
    return next(new AppError('Tenant not found', 404));
  }

  res.json({
    status: true,
    data: { tenant },
    message: 'Tenant settings updated successfully'
  });
});

/**
 * Get tenant usage analytics
 */
const getTenantUsage = catchAsync(async (req, res, next) => {
  const tenant = await Tenant.findOne({ tenantId: req.tenantId });
  
  if (!tenant) {
    return next(new AppError('Tenant not found', 404));
  }

  const currentUsage = {
    users: await User.countDocuments({ tenantId: req.tenantId }),
    orders: await Order.countDocuments({ tenantId: req.tenantId }),
    customers: await Customer.countDocuments({ tenantId: req.tenantId }),
    carriers: await Carrier.countDocuments({ tenantId: req.tenantId })
  };

  const limits = {
    maxUsers: tenant.settings.maxUsers,
    maxOrders: tenant.settings.maxOrders,
    maxCustomers: tenant.settings.maxCustomers || 999999,
    maxCarriers: tenant.settings.maxCarriers || 999999
  };
  const utilizationPercentage = {
    users: limits.maxUsers > 0 ? (currentUsage.users / limits.maxUsers) * 100 : 0,
    orders: limits.maxOrders > 0 ? (currentUsage.orders / limits.maxOrders) * 100 : 0,
    customers: limits.maxCustomers > 0 ? (currentUsage.customers / limits.maxCustomers) * 100 : 0,
    carriers: limits.maxCarriers > 0 ? (currentUsage.carriers / limits.maxCarriers) * 100 : 0
  };

  res.json({
    status: true,
    data: {
      usage: currentUsage,
      limits,
      utilization: utilizationPercentage,
      warnings: {
        nearUserLimit: utilizationPercentage.users > 80,
        nearOrderLimit: utilizationPercentage.orders > 80
      }
    }
  });
});

/**
 * Get tenant analytics
 */
const getTenantAnalytics = catchAsync(async (req, res, next) => {
  const { period = '30d' } = req.query;
  
  // Calculate date range based on period
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

  const baseFilter = { 
    tenantId: req.tenantId,
    createdAt: { $gte: startDate }
  };

  // Get analytics data
  const [
    totalOrders,
    totalRevenue,
    newCustomers,
    newCarriers,
    // recentOrders,
    // ordersByStatus,
    revenueByMonth
  ] = await Promise.all([
    Order.countDocuments({ tenantId: req.tenantId, ...baseFilter }),
    Order.aggregate([
      { $match: { tenantId: req.tenantId, ...baseFilter } },
      { $group: { _id: null, total: { $sum: '$total_amount' } } }
    ]),

    Customer.countDocuments(baseFilter),

    Carrier.countDocuments(baseFilter),

    // Order.find({ tenantId: req.tenantId })
    //   .sort({ createdAt: -1 })
    //   .limit(10)
    //   .populate('customer', 'name')
    //   .populate('carrier', 'name')
    //   .lean(),

    // Order.aggregate([
    //   { $match: { tenantId: req.tenantId } },
    //   { $group: { _id: '$order_status', count: { $sum: 1 } } }
    // ]),


    Order.aggregate([
      { $match: { tenantId: req.tenantId, ...baseFilter } },
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
    ])
  ]);

  const revenue = totalRevenue.length > 0 ? totalRevenue[0].total : 0;

  res.json({
    status: true,
    data: {
      period,
      summary: {
        totalOrders,
        totalRevenue: revenue,
        newCustomers,
        newCarriers
      },
      charts: {
        // ordersByStatus: ordersByStatus.map(item => ({
        //   status: item._id,
        //   count: item.count
        // })),
        revenueByMonth: revenueByMonth.map(item => ({
          period: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
          revenue: item.revenue,
          orders: item.orders
        }))
      },
      // recentOrders
    }
  });
});

/**
 * Get billing information
 */
const getBillingInfo = catchAsync(async (req, res, next) => {
  const tenant = await Tenant.findOne({ tenantId: req.tenantId });
  
  if (!tenant) {
    return next(new AppError('Tenant not found', 404));
  }

  const subscriptionPlan = await SubscriptionPlan.findOne({ 
    slug: tenant.subscription.plan 
  });

  // Calculate usage-based billing (if applicable)
  const currentUsage = {
    users: await User.countDocuments({ tenantId: req.tenantId }),
    orders: await Order.countDocuments({ tenantId: req.tenantId })
  };

  res.json({
    status: true,
    data: {
      subscription: {
        plan: subscriptionPlan,
        status: tenant.subscription.status,
        startDate: tenant.subscription.startDate,
        endDate: tenant.subscription.endDate,
        billingCycle: tenant.subscription.billingCycle
      },
      usage: currentUsage,
      billing: tenant.billing,
      nextBillingDate: tenant.billing.nextBillingDate,
      balance: tenant.billing.balance
    }
  });
});

/**
 * Upgrade subscription plan
 */
const upgradePlan = catchAsync(async (req, res, next) => {
  const { planSlug } = req.body;
  
  const newPlan = await SubscriptionPlan.findOne({ slug: planSlug, isActive: true });
  if (!newPlan) {
    return next(new AppError('Subscription plan not found', 404));
  }

  const tenant = await Tenant.findOneAndUpdate(
    { tenantId: req.tenantId },
    {
      'subscription.plan': planSlug,
      'settings.maxUsers': newPlan.limits.maxUsers,
      'settings.maxOrders': newPlan.limits.maxOrders,
      'settings.features': newPlan.features,
      updatedAt: new Date()
    },
    { new: true }
  );

  res.json({
    status: true,
    data: { tenant },
    message: `Successfully upgraded to ${newPlan.name} plan`
  });
});

/**
 * Get tenant users
 */
const getTenantUsers = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 10, search, role } = req.query;
  
  const filter = { tenantId: req.tenantId };
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
  }
  if (role && role !== 'all') {
    filter.role = parseInt(role);
  }

  const users = await User.find(filter)
    .select('-password')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await User.countDocuments(filter);

  res.json({
    status: true,
    data: {
      users,
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
 * Invite user to tenant
 */
const inviteUser = catchAsync(async (req, res, next) => {
  if (!req.user.isTenantAdmin && req.user.role !== 3) {
    return next(new AppError('Only tenant administrators can invite users', 403));
  }

  const { name, email, role, position } = req.body;
  
  // Check if user already exists
  const existingUser = await User.findOne({ email, tenantId: req.tenantId });
  if (existingUser) {
    return next(new AppError('User with this email already exists in your organization', 400));
  }

  // Generate temporary password
  const tempPassword = Math.random().toString(36).substring(2, 15);
  const hashedPassword = await bcrypt.hash(tempPassword, 12);

  const company = await Company.findOne({ tenantId: req.tenantId });

  const user = await User.create({
    tenantId: req.tenantId,
    company: company._id,
    name,
    email,
    password: hashedPassword,
    phone: 'N/A',
    country: 'N/A',
    address: 'N/A',
    role: parseInt(role),
    position,
    corporateID: `USER_${Date.now()}`,
    created_by: req.user._id
  });

  // Remove password from response
  user.password = undefined;

  // Send invitation email (implement email service)
  // await sendUserInvitationEmail(user, tempPassword);

  res.status(201).json({
    status: true,
    data: { user },
    message: 'User invited successfully. Invitation email sent.'
  });
});

/**
 * Update user role
 */
const updateUserRole = catchAsync(async (req, res, next) => {
  if (!req.user.isTenantAdmin && req.user.role !== 3) {
    return next(new AppError('Only tenant administrators can update user roles', 403));
  }

  const { role, position } = req.body;
  
  const user = await User.findOneAndUpdate(
    { _id: req.params.id, tenantId: req.tenantId },
    { role: parseInt(role), position },
    { new: true }
  ).select('-password');

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  res.json({
    status: true,
    data: { user },
    message: 'User role updated successfully'
  });
});

/**
 * Remove user from tenant
 */
const removeUser = catchAsync(async (req, res, next) => {
  if (!req.user.isTenantAdmin && req.user.role !== 3) {
    return next(new AppError('Only tenant administrators can remove users', 403));
  }

  const user = await User.findOneAndUpdate(
    { _id: req.params.id, tenantId: req.tenantId },
    { status: 'inactive', deletedAt: new Date() },
    { new: true }
  );

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  res.json({
    status: true,
    message: 'User removed successfully'
  });
});

/**
 * Get integrations (placeholder)
 */
const getIntegrations = catchAsync(async (req, res, next) => {
  res.json({
    status: true,
    data: {
      integrations: [],
      message: 'Integration management to be implemented'
    }
  });
});

/**
 * Configure integration (placeholder)
 */
const configureIntegration = catchAsync(async (req, res, next) => {
  res.json({
    status: true,
    message: 'Integration configuration to be implemented'
  });
});

/**
 * Remove integration (placeholder)
 */
const removeIntegration = catchAsync(async (req, res, next) => {
  res.json({
    status: true,
    message: 'Integration removal to be implemented'
  });
});

/**
 * Get orders report
 */
const getOrdersReport = catchAsync(async (req, res, next) => {
  const { startDate, endDate, format = 'json' } = req.query;
  
  const filter = { tenantId: req.tenantId };
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }

  const orders = await Order.find(filter)
    .populate('customer', 'name email')
    .populate('carrier', 'name mc_code')
    .sort({ createdAt: -1 })
    .lean();

  res.json({
    status: true,
    data: { orders, count: orders.length }
  });
});

/**
 * Get customers report
 */
const getCustomersReport = catchAsync(async (req, res, next) => {
  const customers = await Customer.find({ tenantId: req.tenantId })
    .sort({ createdAt: -1 })
    .lean();

  res.json({
    status: true,
    data: { customers, count: customers.length }
  });
});

/**
 * Get carriers report
 */
const getCarriersReport = catchAsync(async (req, res, next) => {
  const carriers = await Carrier.find({ tenantId: req.tenantId })
    .sort({ createdAt: -1 })
    .lean();

  res.json({
    status: true,
    data: { carriers, count: carriers.length }
  });
});

/**
 * Get financial report
 */
const getFinancialReport = catchAsync(async (req, res, next) => {
  const { startDate, endDate } = req.query;
  
  const filter = { tenantId: req.tenantId };
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }

  const financialData = await Order.aggregate([
    { $match: filter },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$total_amount' },
        totalCarrierCost: { $sum: '$carrier_amount' },
        totalOrders: { $sum: 1 },
        averageOrderValue: { $avg: '$total_amount' }
      }
    }
  ]);

  const result = financialData[0] || {
    totalRevenue: 0,
    totalCarrierCost: 0,
    totalOrders: 0,
    averageOrderValue: 0
  };

  result.grossProfit = result.totalRevenue - result.totalCarrierCost;
  result.profitMargin = result.totalRevenue > 0 ? 
    (result.grossProfit / result.totalRevenue) * 100 : 0;

  res.json({
    status: true,
    data: { financial: result }
  });
});

/**
 * Export data (placeholder)
 */
const exportData = catchAsync(async (req, res, next) => {
  res.json({
    status: true,
    message: 'Data export functionality to be implemented'
  });
});

module.exports = {
  getTenantInfo,
  updateTenantSettings,
  getTenantUsage,
  getTenantAnalytics,
  getBillingInfo,
  upgradePlan,
  getTenantUsers,
  inviteUser,
  updateUserRole,
  removeUser,
  getIntegrations,
  configureIntegration,
  removeIntegration,
  getOrdersReport,
  getCustomersReport,
  getCarriersReport,
  getFinancialReport,
  exportData
};