const express = require('express');
const router = express.Router();
const { 
  superAdminLogin,
  emulateTenant,
  stopEmulation,
  getProfile,
  logout
} = require('../controllers/multiTenantAuthController');
const { 
  requireSuperAdmin,
  validateToken 
} = require('../middleware/tenantResolver');

// Import controllers
const superAdminTenantController = require('../controllers/superAdminTenantController');
const superAdminAnalyticsController = require('../controllers/superAdminAnalyticsController');
const superAdminBillingController = require('../controllers/superAdminBillingController');

// Authentication routes
router.post('/login', requireSuperAdmin, superAdminLogin);
router.get('/profile', validateToken, getProfile);
router.post('/logout', logout);

// Tenant emulation routes
router.post('/emulate-tenant', validateToken, emulateTenant);
router.post('/stop-emulation', validateToken, stopEmulation);

// Tenant management routes
router.get('/tenants', validateToken, superAdminTenantController.getTenants);
router.post('/tenants', validateToken, superAdminTenantController.createTenant);
router.get('/tenants/:id', validateToken, superAdminTenantController.getTenantDetails);
router.patch('/tenants/:id', validateToken, superAdminTenantController.updateTenant);
router.delete('/tenants/:id', validateToken, superAdminTenantController.deleteTenant);
router.patch('/tenants/:id/status', validateToken, superAdminTenantController.updateTenantStatus);
router.post('/tenants/:id/invite-admin', validateToken, superAdminTenantController.inviteTenantAdmin);
// Subscription plan management
router.get('/subscription-plans', validateToken, superAdminTenantController.getSubscriptionPlans);
router.post('/subscription-plans', validateToken, superAdminTenantController.createSubscriptionPlan);
router.patch('/subscription-plans/:id', validateToken, superAdminTenantController.updateSubscriptionPlan);
router.delete('/subscription-plans/:id', validateToken, superAdminTenantController.deleteSubscriptionPlan);

// Platform analytics routes
router.get('/analytics/overview', validateToken, superAdminAnalyticsController.getPlatformOverview);
router.get('/analytics/tenants', validateToken, superAdminAnalyticsController.getTenantsAnalytics);
router.get('/analytics/revenue', validateToken, superAdminAnalyticsController.getRevenueAnalytics);
router.get('/analytics/usage', validateToken, superAdminAnalyticsController.getUsageAnalytics);
router.get('/analytics/growth', validateToken, superAdminAnalyticsController.getGrowthAnalytics);

// Billing management routes
router.get('/billing/overview', validateToken, superAdminBillingController.getBillingOverview);
router.get('/billing/invoices', validateToken, superAdminBillingController.getInvoices);
router.get('/billing/subscriptions', validateToken, superAdminBillingController.getSubscriptions);
router.patch('/billing/subscriptions/:id', validateToken, superAdminBillingController.updateSubscription);
router.post('/billing/invoices/:id/send', validateToken, superAdminBillingController.sendInvoice);

// System management routes
router.get('/system/health', validateToken, superAdminTenantController.getSystemHealth);
router.get('/system/logs', validateToken, superAdminTenantController.getSystemLogs);
router.post('/system/maintenance', validateToken, superAdminTenantController.toggleMaintenance);

// User management routes (super admin users)
router.get('/super-admins', validateToken, superAdminTenantController.getSuperAdmins);
router.post('/super-admins', validateToken, superAdminTenantController.createSuperAdmin);
router.patch('/super-admins/:id', validateToken, superAdminTenantController.updateSuperAdmin);
router.delete('/super-admins/:id', validateToken, superAdminTenantController.deleteSuperAdmin);

module.exports = router;