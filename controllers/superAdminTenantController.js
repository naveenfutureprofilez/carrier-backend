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
const { generateTenantUrl } = require('../middleware/tenantResolver');
const bcrypt = require('bcrypt');

/**
 * Get all tenants with pagination and filtering
 */
const getTenants = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 10, search, status, plan } = req.query;
  
  // Build filter query
  const filter = {};
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { subdomain: { $regex: search, $options: 'i' } },
      { 'contactInfo.adminEmail': { $regex: search, $options: 'i' } }
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
    .skip((page - 1) * limit)
    .lean();

  const total = await Tenant.countDocuments(filter);

  // Enhance tenants with additional data
  const enhancedTenants = await Promise.all(
    tenants.map(async (tenant) => {
      const userCount = await User.countDocuments({ tenantId: tenant.tenantId });
      const orderCount = await Order.countDocuments({ tenantId: tenant.tenantId });
      const customerCount = await Customer.countDocuments({ tenantId: tenant.tenantId });
      const carrierCount = await Carrier.countDocuments({ tenantId: tenant.tenantId });

      return {
        ...tenant,
        stats: {
          users: userCount,
          orders: orderCount,
          customers: customerCount,
          carriers: carrierCount
        },
        url: generateTenantUrl(tenant.subdomain)
      };
    })
  );

  res.json({
    status: true,
    data: {
      tenants: enhancedTenants,
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
 * Get tenant details
 */
const getTenantDetails = catchAsync(async (req, res, next) => {
  const tenant = await Tenant.findById(req.params.id);
  
  if (!tenant) {
    return next(new AppError('Tenant not found', 404));
  }

  // Get detailed stats
  const stats = {
    users: await User.countDocuments({ tenantId: tenant.tenantId }),
    orders: await Order.countDocuments({ tenantId: tenant.tenantId }),
    customers: await Customer.countDocuments({ tenantId: tenant.tenantId }),
    carriers: await Carrier.countDocuments({ tenantId: tenant.tenantId })
  };

  // Get recent activity
  const recentOrders = await Order.find({ tenantId: tenant.tenantId })
    .sort({ createdAt: -1 })
    .limit(5)
    .populate('customer', 'name')
    .populate('carrier', 'name')
    .lean();

  const recentUsers = await User.find({ tenantId: tenant.tenantId })
    .sort({ createdAt: -1 })
    .limit(5)
    .select('name email role createdAt')
    .lean();

  res.json({
    status: true,
    data: {
      tenant: {
        ...tenant.toObject(),
        stats,
        url: generateTenantUrl(tenant.subdomain)
      },
      recentActivity: {
        orders: recentOrders,
        users: recentUsers
      }
    }
  });
});

/**
 * Create new tenant
 */
const createTenant = catchAsync(async (req, res, next) => {
  const {
    name,
    subdomain,
    contactInfo,
    subscription,
    settings
  } = req.body;

  // Validation
  if (!name || !subdomain || !contactInfo?.adminEmail) {
    return next(new AppError('Name, subdomain, and admin email are required', 400));
  }

  // Check if subdomain is available
  const existingTenant = await Tenant.findOne({ subdomain });
  if (existingTenant) {
    return next(new AppError('Subdomain already exists', 400));
  }

  // Generate unique tenant ID
  const tenantId = `tenant_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

  // Create tenant
  const tenant = await Tenant.create({
    tenantId,
    name,
    domain: process.env.DOMAIN || 'yourapp.com',
    subdomain,
    status: 'active',
    contactInfo,
    subscription: {
      plan: subscription?.plan || 'basic',
      status: 'active',
      startDate: new Date(),
      billingCycle: subscription?.billingCycle || 'monthly'
    },
    settings: {
      maxUsers: settings?.maxUsers || 10,
      maxOrders: settings?.maxOrders || 500,
      features: settings?.features || ['orders', 'customers', 'carriers'],
      ...settings
    },
    createdBy: req.user._id
  });

  // Create company record for the tenant
  const company = await Company.create({
    tenantId,
    name,
    email: contactInfo.adminEmail,
    phone: contactInfo.phone || '',
    address: contactInfo.address || ''
  });

  // Send invitation email to tenant admin (implement email service)
  // await sendTenantInvitationEmail(tenant, company);

  res.status(201).json({
    status: true,
    data: {
      tenant: {
        ...tenant.toObject(),
        url: generateTenantUrl(tenant.subdomain)
      },
      company
    },
    message: 'Tenant created successfully. Invitation email will be sent to admin.'
  });
});

/**
 * Update tenant
 */
const updateTenant = catchAsync(async (req, res, next) => {
  const updates = req.body;
  
  // Remove fields that shouldn't be updated directly
  delete updates.tenantId;
  delete updates.createdAt;
  delete updates.createdBy;

  const tenant = await Tenant.findByIdAndUpdate(
    req.params.id,
    updates,
    { new: true, runValidators: true }
  );

  if (!tenant) {
    return next(new AppError('Tenant not found', 404));
  }

  res.json({
    status: true,
    data: { tenant },
    message: 'Tenant updated successfully'
  });
});

/**
 * Update tenant status
 */
const updateTenantStatus = catchAsync(async (req, res, next) => {
  const { status } = req.body;
  
  if (!['active', 'suspended', 'pending', 'cancelled'].includes(status)) {
    return next(new AppError('Invalid status', 400));
  }

  const tenant = await Tenant.findByIdAndUpdate(
    req.params.id,
    { status, updatedAt: new Date() },
    { new: true }
  );

  if (!tenant) {
    return next(new AppError('Tenant not found', 404));
  }

  res.json({
    status: true,
    data: { tenant },
    message: `Tenant ${status} successfully`
  });
});

/**
 * Delete tenant (soft delete)
 */
const deleteTenant = catchAsync(async (req, res, next) => {
  const tenant = await Tenant.findById(req.params.id);
  
  if (!tenant) {
    return next(new AppError('Tenant not found', 404));
  }

  // Soft delete by setting status to cancelled
  tenant.status = 'cancelled';
  tenant.subscription.status = 'cancelled';
  tenant.updatedAt = new Date();
  await tenant.save();

  res.json({
    status: true,
    message: 'Tenant deleted successfully'
  });
});

/**
 * Invite tenant admin
 */
const inviteTenantAdmin = catchAsync(async (req, res, next) => {
  const { email, name } = req.body;
  const tenant = await Tenant.findById(req.params.id);
  
  if (!tenant) {
    return next(new AppError('Tenant not found', 404));
  }

  // Generate temporary password
  const tempPassword = Math.random().toString(36).substring(2, 15);
  const hashedPassword = await bcrypt.hash(tempPassword, 12);

  // Create tenant admin user
  const adminUser = await User.create({
    tenantId: tenant.tenantId,
    company: await Company.findOne({ tenantId: tenant.tenantId }).then(c => c._id),
    name,
    email,
    password: hashedPassword,
    phone: 'N/A',
    country: 'N/A',
    address: 'N/A',
    role: 3,
    is_admin: 1,
    isTenantAdmin: true,
    corporateID: `ADMIN_${Date.now()}`,
    position: 'Tenant Administrator',
    tenantPermissions: [
      'users.manage',
      'company.configure',
      'reports.generate',
      'integrations.manage'
    ],
    created_by: req.user._id
  });

  // Update tenant status to active if it was pending
  if (tenant.status === 'pending') {
    tenant.status = 'active';
    await tenant.save();
  }

  // Send invitation email (implement email service)
  // await sendAdminInvitationEmail(adminUser, tenant, tempPassword);

  res.json({
    status: true,
    data: { 
      user: {
        id: adminUser._id,
        name: adminUser.name,
        email: adminUser.email,
        role: adminUser.role
      }
    },
    message: 'Admin user created and invitation sent'
  });
});

/**
 * Get subscription plans
 */
const getSubscriptionPlans = catchAsync(async (req, res, next) => {
  const plans = await SubscriptionPlan.find({ isActive: true })
    .sort({ priority: -1, price: 1 });

  res.json({
    status: true,
    data: { plans }
  });
});

/**
 * Create subscription plan
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
  const plan = await SubscriptionPlan.findByIdAndUpdate(
    req.params.id,
    req.body,
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
  const plan = await SubscriptionPlan.findByIdAndUpdate(
    req.params.id,
    { isActive: false },
    { new: true }
  );

  if (!plan) {
    return next(new AppError('Subscription plan not found', 404));
  }

  res.json({
    status: true,
    message: 'Subscription plan deleted successfully'
  });
});

/**
 * Get system health
 */
const getSystemHealth = catchAsync(async (req, res, next) => {
  const stats = {
    tenants: {
      total: await Tenant.countDocuments(),
      active: await Tenant.countDocuments({ status: 'active' }),
      suspended: await Tenant.countDocuments({ status: 'suspended' }),
      trial: await Tenant.countDocuments({ 'subscription.status': 'trial' })
    },
    users: await User.countDocuments(),
    orders: await Order.countDocuments(),
    customers: await Customer.countDocuments(),
    carriers: await Carrier.countDocuments(),
    database: {
      connected: true,
      uptime: process.uptime()
    }
  };

  res.json({
    status: true,
    data: { health: stats }
  });
});

/**
 * Get system logs (placeholder)
 */
const getSystemLogs = catchAsync(async (req, res, next) => {
  // Implement actual log retrieval logic
  res.json({
    status: true,
    data: { 
      logs: [],
      message: 'Log retrieval functionality to be implemented'
    }
  });
});

/**
 * Toggle maintenance mode (placeholder)
 */
const toggleMaintenance = catchAsync(async (req, res, next) => {
  // Implement maintenance mode toggle
  res.json({
    status: true,
    message: 'Maintenance mode functionality to be implemented'
  });
});

/**
 * Get super admins
 */
const getSuperAdmins = catchAsync(async (req, res, next) => {
  const superAdmins = await SuperAdmin.find({ status: 'active' })
    .select('-password')
    .sort({ createdAt: -1 });

  res.json({
    status: true,
    data: { superAdmins }
  });
});

/**
 * Create super admin
 */
const createSuperAdmin = catchAsync(async (req, res, next) => {
  const { name, email, password, role, permissions } = req.body;

  const superAdmin = await SuperAdmin.create({
    name,
    email,
    password,
    role: role || 'platform_admin',
    permissions,
    createdBy: req.user._id
  });

  // Remove password from response
  superAdmin.password = undefined;

  res.status(201).json({
    status: true,
    data: { superAdmin },
    message: 'Super admin created successfully'
  });
});

const updateSuperAdmin = catchAsync(async (req, res, next) => {
  const updates = req.body;
  delete updates.password; // Don't allow password updates through this endpoint

  const superAdmin = await SuperAdmin.findByIdAndUpdate(
    req.params.id,
    updates,
    { new: true, runValidators: true }
  ).select('-password');

  if (!superAdmin) {
    return next(new AppError('Super admin not found', 404));
  }

  res.json({
    status: true,
    data: { superAdmin },
    message: 'Super admin updated successfully'
  });
});

const deleteSuperAdmin = catchAsync(async (req, res, next) => {
  const superAdmin = await SuperAdmin.findByIdAndUpdate(
    req.params.id,
    { status: 'inactive' },
    { new: true }
  );
  if (!superAdmin) {
    return next(new AppError('Super admin not found', 404));
  }
  res.json({
    status: true,
    message: 'Super admin deleted successfully'
  });
});

module.exports = {
  getTenants,
  getTenantDetails,
  createTenant,
  updateTenant,
  updateTenantStatus,
  deleteTenant,
  inviteTenantAdmin,
  getSubscriptionPlans,
  createSubscriptionPlan,
  updateSubscriptionPlan,
  deleteSubscriptionPlan,
  getSystemHealth,
  getSystemLogs,
  toggleMaintenance,
  getSuperAdmins,
  createSuperAdmin,
  updateSuperAdmin,
  deleteSuperAdmin
};