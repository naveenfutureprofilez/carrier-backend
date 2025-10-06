const express = require('express');
const router = express.Router();
const { 
  tenantLogin,
  getProfile,
  logout
} = require('../controllers/multiTenantAuthController');
const { 
  requireTenant,
  validateToken 
} = require('../middleware/tenantResolver');

// Tenant data filtering middleware - automatically filters all queries by tenantId
const tenantDataFilter = (req, res, next) => {
  if (req.tenantId && !req.isSuperAdminUser) {
    // Add tenant filter to all database operations
    req.dbFilter = req.dbFilter || {};
    req.dbFilter.tenantId = req.tenantId;
  }
  next();
};

// Apply tenant filtering to all routes
router.use(tenantDataFilter);

// Authentication routes
router.post('/login', requireTenant, tenantLogin);
router.get('/profile', validateToken, getProfile);
router.post('/logout', logout);

// Import existing controllers and add tenant filtering
const authController = require('../controllers/authController');
const userController = require('../controllers/userController');
const orderController = require('../controllers/orderController');
const customerController = require('../controllers/customerController');
const carrierController = require('../controllers/carrierController');

// Import new tenant admin controller
const tenantAdminController = require('../controllers/tenantAdminController');

// Enhanced user routes with tenant filtering
router.post('/user/create_user', validateToken, authController.signup);
router.post('/user/edit_user/:id', validateToken, authController.editUser);
router.get('/user/suspanduser/:id', validateToken, authController.suspandUser);
router.post('/user/forgotpassword', authController.forgotPassword);
router.patch('/user/resetpassword/:token', authController.resetpassword);
router.get('/user/employeesLisiting', validateToken, authController.employeesLisiting);
router.get('/user/employee/detail/:id', validateToken, authController.employeeDetail);
router.get('/user/employee/docs/:id', validateToken, authController.employeesDocs);
router.post('/user/add-company-information', validateToken, authController.addCompanyInfo);
router.post('/user/change-password', validateToken, authController.changePassword);
router.patch('/user/update', validateToken, userController.updateCurrentUserData);
router.delete('/user/delete', validateToken, userController.deleteCurrentUser);
router.get('/user/staff-listing', validateToken, userController.staffListing);

// Order routes with tenant filtering
router.post('/order/add', validateToken, orderController.create_order);
router.put('/order/update/:id', validateToken, orderController.update_order);
router.get('/order/listings', validateToken, orderController.order_listing);
router.get('/order/detail/:id', validateToken, orderController.order_detail);
router.get('/order_docs/:id', validateToken, orderController.order_docs);
router.get('/lock-order/:id', validateToken, orderController.lockOrder);
router.get('/delete-order/:id', validateToken, orderController.deleteOrder);
router.get('/account/order/listings', validateToken, orderController.order_listing_account);
router.post('/account/order/update/payment/:id/:type', validateToken, orderController.updateOrderPaymentStatus);
router.post('/account/order-status/:id', validateToken, orderController.updateOrderStatus);
router.post('/account/order/addnote/:id', validateToken, orderController.addnote);
router.get('/overview', validateToken, orderController.overview);
router.get('/cummodityLists', validateToken, orderController.cummodityLists);
router.post('/removeCummodity', validateToken, orderController.removeCummodity);
router.post('/addCummodity', validateToken, orderController.addCummodity);
router.get('/equipmentLists', validateToken, orderController.equipmentLists);
router.post('/removeEquipment', validateToken, orderController.removeEquipment);
router.post('/addEquipment', validateToken, orderController.addEquipment);
router.get('/chargesLists', validateToken, orderController.chargesLists);
router.post('/removeCharge', validateToken, orderController.removeCharge);
router.post('/addCharge', validateToken, orderController.addCharges);
router.get('/payments/listings', validateToken, orderController.orderPayments);
router.get('/all_payments_status', validateToken, orderController.all_payments_status);

// Customer routes with tenant filtering
router.get('/customer/listings', validateToken, customerController.customers_listing);
router.post('/customer/add', validateToken, customerController.addCustomer);
router.post('/customer/update/:id', validateToken, customerController.updateCustomer);
router.get('/customer/detail/:id', validateToken, customerController.customerDetails);
router.get('/customer/remove/:id', validateToken, customerController.deleteCustomer);

// Carrier routes with tenant filtering
router.get('/carriers/listings', validateToken, carrierController.carriers_listing);
router.post('/carriers/add', validateToken, carrierController.addCarrier);
router.get('/carriers/remove/:id', validateToken, carrierController.deleteCarrier);
router.post('/carriers/update/:id', validateToken, carrierController.updateCarrier);
router.get('/carrier/detail/:id', validateToken, carrierController.carrierDetail);
router.post('/getdistance', carrierController.getDistance);

// New tenant admin routes
router.get('/tenant/info', validateToken, tenantAdminController.getTenantInfo);
router.patch('/tenant/settings', validateToken, tenantAdminController.updateTenantSettings);
router.get('/tenant/usage', validateToken, tenantAdminController.getTenantUsage);
router.get('/tenant/analytics', validateToken, tenantAdminController.getTenantAnalytics);
router.get('/tenant/billing', validateToken, tenantAdminController.getBillingInfo);
router.post('/tenant/upgrade-plan', validateToken, tenantAdminController.upgradePlan);

// Tenant user management (for tenant admins)
router.get('/tenant/users', validateToken, tenantAdminController.getTenantUsers);
router.post('/tenant/users/invite', validateToken, tenantAdminController.inviteUser);
router.patch('/tenant/users/:id/role', validateToken, tenantAdminController.updateUserRole);
router.delete('/tenant/users/:id', validateToken, tenantAdminController.removeUser);

// Tenant integrations management
router.get('/tenant/integrations', validateToken, tenantAdminController.getIntegrations);
router.post('/tenant/integrations/:type/configure', validateToken, tenantAdminController.configureIntegration);
router.delete('/tenant/integrations/:type', validateToken, tenantAdminController.removeIntegration);

// Tenant reports and exports
router.get('/tenant/reports/orders', validateToken, tenantAdminController.getOrdersReport);
router.get('/tenant/reports/customers', validateToken, tenantAdminController.getCustomersReport);
router.get('/tenant/reports/carriers', validateToken, tenantAdminController.getCarriersReport);
router.get('/tenant/reports/financial', validateToken, tenantAdminController.getFinancialReport);
router.post('/tenant/reports/export', validateToken, tenantAdminController.exportData);

module.exports = router;