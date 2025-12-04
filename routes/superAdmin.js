const express = require('express');
const router = express.Router();
const {
  getSystemOverview,
  getAllTenants,
  getTenantDetails,
  updateTenantStatus,
  updateTenantPlan,
  updateTenantSettings,
  updateTenantInfo,
  getSubscriptionPlans,
  createSubscriptionPlan,
  updateSubscriptionPlan,
  deleteSubscriptionPlan,
  createTenant,
  getSystemAnalytics,
  getTenantActivityLogs,
  exportSystemData
} = require('../controllers/superAdminController');

// Also import invite tenant admin from extended controller
const { inviteTenantAdmin } = require('../controllers/superAdminTenantController');
const { hardDeleteTenant } = require('../controllers/superAdminTenantController');

// Import emulation functions
const { 
  emulateTenant,
  stopEmulation,
  getProfile,
  logout
} = require('../controllers/multiTenantAuthController');

const { authenticateJWT, requireSuperAdmin } = require('../middleware/auth');

// Apply middleware to all super admin routes
router.use(authenticateJWT);
router.use(requireSuperAdmin);

// Authentication routes
router.get('/profile', getProfile);
router.post('/logout', logout);

// Tenant emulation routes
router.post('/emulate-tenant', emulateTenant);
router.post('/stop-emulation', stopEmulation);

// Debug endpoint
router.get('/debug-auth', (req, res) => {
  res.json({
    user: req.user ? {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role
    } : null,
    superAdmin: req.superAdmin ? {
      id: req.superAdmin._id,
      name: req.superAdmin.name,
      email: req.superAdmin.email,
      status: req.superAdmin.status
    } : null,
    isSuperAdminUser: req.isSuperAdminUser || false,
    timestamp: new Date()
  });
});

// System Overview & Analytics
router.get('/overview', getSystemOverview);
router.get('/analytics', getSystemAnalytics);

// Tenant Management
router.get('/tenants', getAllTenants);
router.post('/tenants', createTenant);
router.get('/tenants/:tenantId', getTenantDetails);
router.put('/tenants/:tenantId/status', updateTenantStatus);
router.put('/tenants/:tenantId/plan', updateTenantPlan);
router.put('/tenants/:tenantId/settings', updateTenantSettings);
router.put('/tenants/:tenantId/info', updateTenantInfo);
router.get('/tenants/:tenantId/logs', getTenantActivityLogs);
// Invite tenant admin and approve
router.post('/tenants/:id/invite-admin', inviteTenantAdmin);
// Permanent deletion of tenant and related data
router.delete('/tenants/:tenantId/hard-delete', hardDeleteTenant);

// Subscription Plan Management
router.get('/subscription-plans', getSubscriptionPlans);
router.post('/subscription-plans', createSubscriptionPlan);
router.put('/subscription-plans/:id', updateSubscriptionPlan);
router.delete('/subscription-plans/:id', deleteSubscriptionPlan);

// Data Export
router.post('/export', exportSystemData);

module.exports = router;
