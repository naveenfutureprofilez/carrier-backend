const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const User = require('../db/Users');
const SuperAdmin = require('../db/SuperAdmin');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

const SECRET_ACCESS = process.env.SECRET_ACCESS || 'MYSECRET';

/**
 * JWT Authentication middleware
 * Validates JWT token and attaches user to request
 */
const authenticateJWT = catchAsync(async (req, res, next) => {
  // First check for JWT in cookies (preferred for security)
  let token = req.cookies?.jwt;
  
  // Fallback to Authorization header for backward compatibility
  if (!token) {
    let authHeader = req.headers.Authorization || req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer')) {
      token = authHeader.split(' ')[1];
    }
  }
  
  if (!token) {
    return next(new AppError('Authentication required. Please log in.', 401));
  }
  
  try {
    // Verify the token
    const decoded = await promisify(jwt.verify)(token, SECRET_ACCESS);
    
    // Check if user still exists
    const currentUser = await User.findById(decoded.id).populate('company');
    if (!currentUser) {
      return next(new AppError('The user belonging to this token no longer exists.', 401));
    }
    
    // Check if user account is active
    if (currentUser.status === 'inactive') {
      return next(new AppError('Your account has been suspended. Please contact support.', 401));
    }
    
    // Check if user changed password after the token was issued
    if (currentUser.changedPasswordAt) {
      const changedTimestamp = parseInt(
        currentUser.changedPasswordAt.getTime() / 1000,
        10
      );
      if (decoded.iat < changedTimestamp) {
        return next(new AppError('User recently changed password. Please log in again.', 401));
      }
    }
    
    // Grant access to protected route
    req.user = currentUser;
    next();
  } catch (error) {
    return next(new AppError('Invalid or expired token. Please log in again.', 401));
  }
});

/**
 * Super Admin Authorization middleware
 * Requires user to be a super admin
 */
const requireSuperAdmin = catchAsync(async (req, res, next) => {
  if (!req.user) {
    return next(new AppError('Authentication required', 401));
  }
  
  // Check if user is a super admin
  const superAdmin = await SuperAdmin.findOne({ userId: req.user._id });
  if (!superAdmin || superAdmin.status !== 'active') {
    return next(new AppError('Super admin access required', 403));
  }
  
  req.superAdmin = superAdmin;
  next();
});

/**
 * Tenant Admin Authorization middleware
 * Requires user to be a tenant admin for their tenant
 */
const requireTenantAdmin = catchAsync(async (req, res, next) => {
  if (!req.user) {
    return next(new AppError('Authentication required', 401));
  }
  
  // Check if user is a tenant admin or has admin role (role 3)
  if (!req.user.isTenantAdmin && req.user.role !== 3) {
    return next(new AppError('Tenant administrator access required', 403));
  }
  
  next();
});

/**
 * Role-based authorization middleware factory
 * @param {Array} roles - Array of allowed role numbers
 */
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }
    
    if (!roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action', 403));
    }
    
    next();
  };
};

/**
 * Multi-tenant authorization middleware
 * Ensures user can only access resources within their tenant
 */
const requireTenantAccess = catchAsync(async (req, res, next) => {
  if (!req.user) {
    return next(new AppError('Authentication required', 401));
  }
  
  if (!req.tenantId) {
    return next(new AppError('Tenant context required', 400));
  }
  
  // Super admins can access any tenant
  const superAdmin = await SuperAdmin.findOne({ 
    userId: req.user._id, 
    status: 'active' 
  });
  if (superAdmin) {
    return next();
  }
  
  // Regular users can only access their own tenant
  if (req.user.tenantId !== req.tenantId) {
    return next(new AppError('Access denied. Invalid tenant context.', 403));
  }
  
  next();
});

/**
 * Optional authentication middleware
 * Attaches user to request if token is valid, but doesn't require authentication
 */
const optionalAuth = catchAsync(async (req, res, next) => {
  let token = req.cookies?.jwt;
  
  if (!token) {
    let authHeader = req.headers.Authorization || req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer')) {
      token = authHeader.split(' ')[1];
    }
  }
  
  if (!token) {
    return next(); // Continue without authentication
  }
  
  try {
    const decoded = await promisify(jwt.verify)(token, SECRET_ACCESS);
    const currentUser = await User.findById(decoded.id).populate('company');
    
    if (currentUser && currentUser.status === 'active') {
      req.user = currentUser;
    }
  } catch (error) {
    // Ignore token errors in optional auth
  }
  
  next();
});

module.exports = {
  authenticateJWT,
  requireSuperAdmin,
  requireTenantAdmin,
  restrictTo,
  requireTenantAccess,
  optionalAuth
};