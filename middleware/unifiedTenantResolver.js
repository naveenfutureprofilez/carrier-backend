const Tenant = require('../db/Tenant');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

/**
 * Unified tenant resolution middleware
 * Handles all tenant resolution scenarios including emulation
 */
const unifiedTenantResolver = catchAsync(async (req, res, next) => {
  let tenantId = null;
  let tenant = null;
  const debugMode = process.env.NODE_ENV !== 'production';
  
  // Priority 1: Check for emulation in JWT token
  if (req.user && req.user.isEmulating && req.user.emulatedTenantId) {
    tenantId = req.user.emulatedTenantId;
    if (debugMode) {
      console.log(`🎭 Emulation detected: Super admin emulating tenant ${tenantId}`);
    }
  }
  
  // Priority 2: X-Tenant-ID header (for super admin or explicit tenant selection)
  if (!tenantId && req.headers['x-tenant-id']) {
    tenantId = req.headers['x-tenant-id'];
    if (debugMode) {
      console.log(`🏷️ Using X-Tenant-ID header: ${tenantId}`);
    }
  }
  
  // Priority 3: User's tenant context (for regular tenant users)
  if (!tenantId && req.user && req.user.tenantId && req.user.tenantId !== 'admin') {
    tenantId = req.user.tenantId;
    if (debugMode) {
      console.log(`👤 Using user tenantId: ${tenantId}`);
    }
  }
  
  // Priority 4: Subdomain resolution (production)
  if (!tenantId && req.headers.host) {
    const hostname = req.headers.host.split(':')[0];
    const parts = hostname.split('.');
    
    if (parts.length >= 3) {
      const subdomain = parts[0];
      if (subdomain !== 'www' && subdomain !== 'admin') {
        tenantId = subdomain;
        if (debugMode) {
          console.log(`🌐 Using subdomain: ${tenantId}`);
        }
      }
    }
  }
  
  // Priority 5: URL query parameter (development fallback)
  if (!tenantId && req.query.tenant && req.query.tenant !== 'admin') {
    tenantId = req.query.tenant;
    if (debugMode) {
      console.log(`🔗 Using query param tenant: ${tenantId}`);
    }
  }
  
  // Validate and fetch tenant if we have a tenantId
  if (tenantId) {
    try {
      tenant = await Tenant.findOne({ 
        tenantId: tenantId,
        status: { $in: ['active', 'trial', 'suspended'] } // Allow suspended for super admin access
      }).lean();
      
      if (!tenant) {
        if (debugMode) {
          console.log(`❌ Tenant not found: ${tenantId}`);
        }
        return next(new AppError('Tenant not found or inactive', 404));
      }
      
      // Check if tenant is suspended (only allow super admin access)
      if (tenant.status === 'suspended' && (!req.user || !req.user.isSuperAdmin)) {
        return next(new AppError('Tenant account is suspended', 403));
      }
      
      if (debugMode) {
        console.log(`✅ Tenant resolved: ${tenant.name} (${tenant.tenantId})`);
      }
    } catch (error) {
      console.error('❌ Tenant resolution error:', error);
      return next(new AppError('Failed to resolve tenant', 500));
    }
  }
  
  // Set tenant context on request
  req.tenant = tenant;
  req.tenantId = tenantId;
  
  // Add resolved tenant ID to response headers for debugging (non-production)
  if (debugMode && tenantId) {
    res.setHeader('X-Tenant-ID-Resolved', tenantId);
  }
  
  next();
});

/**
 * Require tenant context (strict mode)
 */
const requireTenant = (req, res, next) => {
  if (!req.tenant || !req.tenantId) {
    return next(new AppError('Tenant context required', 400));
  }
  next();
};

/**
 * Optional tenant context (lenient mode)
 */
const optionalTenant = (req, res, next) => {
  // Tenant is optional - just continue
  next();
};

/**
 * Check if request is from super admin context
 */
const isSuperAdminRequest = (req) => {
  // Check subdomain
  if (req.headers.host) {
    const hostname = req.headers.host.split(':')[0];
    const parts = hostname.split('.');
    if (parts.length >= 3 && parts[0] === 'admin') {
      return true;
    }
  }
  
  // Check query parameter (development)
  if (req.query.tenant === 'admin') {
    return true;
  }
  
  // Check user context
  if (req.user && req.user.isSuperAdmin && !req.user.isEmulating) {
    return true;
  }
  
  return false;
};

/**
 * Helper function to generate tenant URL
 */
const generateTenantUrl = (tenantId, domain = process.env.DOMAIN) => {
  if (!domain || domain.includes('localhost')) {
    return `http://localhost:3000/home?tenant=${tenantId}`;
  }
  return `https://${tenantId}.${domain}`;
};

/**
 * Helper function to generate super admin URL
 */
const generateSuperAdminUrl = (domain = process.env.DOMAIN) => {
  if (!domain || domain.includes('localhost')) {
    return `http://localhost:3000/super-admin`;
  }
  return `https://admin.${domain}`;
};

module.exports = {
  unifiedTenantResolver,
  requireTenant,
  optionalTenant,
  isSuperAdminRequest,
  generateTenantUrl,
  generateSuperAdminUrl
};