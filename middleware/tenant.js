const Tenant = require('../db/Tenant');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

/**
 * Resolve tenant from user context or query parameter
 * For API routes that need tenant context
 */
const resolveTenant = catchAsync(async (req, res, next) => {
  let tenantId = null;
  
  // Try to get tenant ID from user context first
  if (req.user && req.user.tenantId) {
    tenantId = req.user.tenantId;
  }
  
  // Try to extract from subdomain (for production)
  if (!tenantId && req.headers.host) {
    const hostname = req.headers.host.split(':')[0]; // Remove port if present
    const subdomainMatch = hostname.match(/^([^.]+)\./); // Extract subdomain
    
    if (subdomainMatch && subdomainMatch[1] !== 'www' && subdomainMatch[1] !== 'admin') {
      tenantId = subdomainMatch[1];
    }
  }
  
  // Fallback to query parameter for testing/debugging
  if (!tenantId && req.query.tenantId) {
    tenantId = req.query.tenantId;
  }
  
  // Fallback to header
  if (!tenantId && req.headers['x-tenant-id']) {
    tenantId = req.headers['x-tenant-id'];
  }
  
  if (!tenantId) {
    return next(new AppError('Tenant context required', 400));
  }
  
  // Verify tenant exists and is active
  const tenant = await Tenant.findOne({ 
    tenantId: tenantId,
    status: { $in: ['active'] }
  });
  
  if (!tenant) {
    return next(new AppError('Tenant not found or inactive', 404));
  }
  
  // Check subscription status
  if (!tenant.subscription || tenant.subscription.status !== 'active') {
    return next(new AppError('Tenant subscription is inactive', 403));
  }
  
  req.tenant = tenant;
  req.tenantId = tenantId;
  
  next();
});

/**
 * Optional tenant resolution
 * Sets tenant context if available but doesn't require it
 */
const optionalTenant = catchAsync(async (req, res, next) => {
  let tenantId = null;
  
  if (req.user && req.user.tenantId) {
    tenantId = req.user.tenantId;
  }
  
  // Try to extract from subdomain (for production)
  if (!tenantId && req.headers.host) {
    const hostname = req.headers.host.split(':')[0]; // Remove port if present
    const subdomainMatch = hostname.match(/^([^.]+)\./); // Extract subdomain
    
    if (subdomainMatch && subdomainMatch[1] !== 'www' && subdomainMatch[1] !== 'admin') {
      tenantId = subdomainMatch[1];
    }
  }
  
  if (!tenantId && req.query.tenantId) {
    tenantId = req.query.tenantId;
  }
  
  if (!tenantId && req.headers['x-tenant-id']) {
    tenantId = req.headers['x-tenant-id'];
  }
  
  if (tenantId) {
    try {
      const tenant = await Tenant.findOne({ 
        tenantId: tenantId,
        status: { $in: ['active'] }
      });
      
      if (tenant) {
        req.tenant = tenant;
        req.tenantId = tenantId;
      }
    } catch (error) {
      // Ignore tenant resolution errors in optional mode
    }
  }
  
  next();
});

/**
 * Check if request is from super admin subdomain
 */
const isSuperAdminRequest = (req) => {
  if (req.headers.host) {
    const hostname = req.headers.host.split(':')[0];
    const subdomainMatch = hostname.match(/^([^.]+)\./); 
    return subdomainMatch && subdomainMatch[1] === 'admin';
  }
  
  // Check query parameter for development
  return req.query.tenant === 'admin';
};

module.exports = {
  resolveTenant,
  optionalTenant,
  isSuperAdminRequest
};
