const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const JSONerror = require('../utils/jsonErrorHandler');

// Use the same JWT secret as the existing auth system
const SECRET_ACCESS = process.env.SECRET_ACCESS || 'MYSECRET';

// Import models
const User = require('../db/Users');
const SuperAdmin = require('../db/SuperAdmin');
const Tenant = require('../db/Tenant');
const Company = require('../db/Company');

// Import utilities
const { generateTenantUrl, generateSuperAdminUrl } = require('../middleware/tenantResolver');

/**
 * Generate JWT token
 */
const signToken = (payload) => {
  return jwt.sign(payload, SECRET_ACCESS, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

/**
 * Send token response
 */
const createSendToken = (user, statusCode, res, additionalData = {}) => {
  const token = signToken({
    id: user._id || user.id,
    ...additionalData
  });

  const cookieOptions = {
    expires: new Date(
      Date.now() + (process.env.JWT_COOKIE_EXPIRES_IN || 7) * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    sameSite: 'lax'
  };

  if (process.env.NODE_ENV === 'production') {
    cookieOptions.secure = true;
  }

  res.cookie('jwt', token, cookieOptions);

  // Remove password from output
  if (user.password) user.password = undefined;

  res.status(statusCode).json({
    status: true,
    token,
    user,
    ...additionalData
  });
};

/**
 * Landing page login - determines where to redirect based on user type
 */
const landingLogin = catchAsync(async (req, res, next) => {
  if (!req.isLandingPage) {
    return next(new AppError('This endpoint is only available on the landing page', 400));
  }

  const { email, password } = req.body;

  // Validation
  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }

  try {
    // First, check if it's a super admin
    const superAdmin = await SuperAdmin.findOne({ email }).select('+password');
    
    if (superAdmin) {
      const isPasswordValid = await superAdmin.checkPassword(password, superAdmin.password);
      
      if (isPasswordValid) {
        // Update last login
        superAdmin.lastLogin = new Date();
        superAdmin.resetLoginAttempts();
        await superAdmin.save({ validateBeforeSave: false });

        // Create token and send proper response for super admin
        const token = signToken({
          id: superAdmin._id,
          role: 'super_admin',
          isSuperAdmin: true
        });

        const cookieOptions = {
          expires: new Date(
            Date.now() + (process.env.JWT_COOKIE_EXPIRES_IN || 7) * 24 * 60 * 60 * 1000
          ),
          httpOnly: true,
          sameSite: 'lax'
        };

        if (process.env.NODE_ENV === 'production') {
          cookieOptions.secure = true;
        }

        res.cookie('jwt', token, cookieOptions);

        return res.json({
          status: true,
          token,
          userType: 'super_admin',
          message: 'Super admin login successful',
          redirectUrl: generateSuperAdminUrl(),
          user: {
            id: superAdmin._id,
            name: superAdmin.name,
            email: superAdmin.email,
            role: 'super_admin',
            isSuperAdmin: true
          }
        });
      } else {
        // Handle failed login attempts
        await superAdmin.incLoginAttempts();
        return next(new AppError('Invalid email or password', 401));
      }
    }

    // Check for regular tenant user
    const user = await User.findOne({ email })
      .select('+password')
      .populate('company');

    if (!user) {
      return next(new AppError('Invalid email or password', 401));
    }

    const isPasswordValid = await user.checkPassword(password, user.password);
    if (!isPasswordValid) {
      return next(new AppError('Invalid email or password', 401));
    }

    // Get tenant information
    const tenant = await Tenant.findOne({ tenantId: user.tenantId });
    if (!tenant) {
      return next(new AppError('Company not found or inactive', 404));
    }

    // Check tenant status
    if (tenant.status !== 'active') {
      return next(new AppError('Company account is suspended', 403));
    }

    // Create token and send proper response for tenant user
    const token = signToken({
      id: user._id,
      tenantId: user.tenantId,
      role: user.role,
      is_admin: user.is_admin,
      isTenantAdmin: user.is_admin === 1 || user.isTenantAdmin
    });

    const cookieOptions = {
      expires: new Date(
        Date.now() + (process.env.JWT_COOKIE_EXPIRES_IN || 7) * 24 * 60 * 60 * 1000
      ),
      httpOnly: true,
      sameSite: 'lax'
    };

    if (process.env.NODE_ENV === 'production') {
      cookieOptions.secure = true;
    }

    res.cookie('jwt', token, cookieOptions);

    console.log('✅ Login successful, sending response:', {
      token: token ? 'EXISTS' : 'NULL',
      userType: 'tenant_user',
      userId: user._id,
      userName: user.name,
      tenantId: user.tenantId
    });

    return res.json({
      status: true,
      token,
      userType: 'tenant_user',
      message: 'Login successful',
      redirectUrl: generateTenantUrl(tenant.subdomain || tenant.tenantId),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        is_admin: user.is_admin,
        isTenantAdmin: user.is_admin === 1 || user.isTenantAdmin,
        company: user.company
      },
      tenant: {
        name: tenant.name,
        subdomain: tenant.subdomain,
        tenantId: tenant.tenantId
      }
    });

  } catch (error) {
    console.error('Landing login error:', error);
    return next(new AppError('Login failed', 500));
  }
});

/**
 * Tenant login - for users accessing their company subdomain
 */
const tenantLogin = catchAsync(async (req, res, next) => {
  if (!req.tenantId) {
    return next(new AppError('Tenant context required', 400));
  }

  const { email, password } = req.body;

  // Validation
  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }

  // Find user within tenant context
  const user = await User.findOne({ 
    email, 
    tenantId: req.tenantId 
  })
  .select('+password')
  .populate('company');

  if (!user) {
    return next(new AppError('Invalid email or password', 401));
  }

  // Check password
  const isPasswordValid = await user.checkPassword(password, user.password);
  if (!isPasswordValid) {
    return next(new AppError('Invalid email or password', 401));
  }

  // Create token with tenant context
  createSendToken(user, 200, res, {
    tenantId: user.tenantId,
    role: user.role,
    is_admin: user.is_admin,
    isTenantAdmin: user.isTenantAdmin,
    company: user.company,
    tenant: req.tenant
  });
});

/**
 * Super admin login
 */
const superAdminLogin = catchAsync(async (req, res, next) => {
  if (!req.isSuperAdmin) {
    return next(new AppError('Super admin access required', 403));
  }

  const { email, password } = req.body;

  // Validation
  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }

  // Find super admin
  const superAdmin = await SuperAdmin.findOne({ email }).select('+password');

  if (!superAdmin) {
    return next(new AppError('Invalid email or password', 401));
  }

  // Check if account is locked
  if (superAdmin.isLocked) {
    return next(new AppError('Account is temporarily locked due to too many failed login attempts', 423));
  }

  // Check password
  const isPasswordValid = await superAdmin.checkPassword(password, superAdmin.password);
  if (!isPasswordValid) {
    await superAdmin.incLoginAttempts();
    return next(new AppError('Invalid email or password', 401));
  }

  // Reset login attempts and update last login
  superAdmin.lastLogin = new Date();
  await superAdmin.resetLoginAttempts();
  await superAdmin.save({ validateBeforeSave: false });

  // Create token with super admin context
  createSendToken(superAdmin, 200, res, {
    role: superAdmin.role,
    isSuperAdmin: true
  });
});

/**
 * Enhanced token validation middleware
 */
const validateToken = catchAsync(async (req, res, next) => {
  // Get token
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(new AppError('You are not logged in. Please log in to get access.', 401));
  }

  try {
    // Verify token
    const decoded = await promisify(jwt.verify)(token, SECRET_ACCESS);

    // Check if this is a super admin token
    if (decoded.isSuperAdmin || decoded.role === 'super_admin') {
      // For emulation tokens, we need to find the SuperAdmin record differently
      // because emulation tokens store the linked User's ID, not SuperAdmin ID
      let currentSuperAdmin;
      
      if (decoded.isEmulating) {
        // Find SuperAdmin by email or linked userId - first try by User ID
        const linkedUser = await User.findById(decoded.id);
        if (linkedUser) {
          currentSuperAdmin = await SuperAdmin.findOne({ userId: linkedUser._id });
        }
        
        // If not found, try direct SuperAdmin lookup
        if (!currentSuperAdmin) {
          currentSuperAdmin = await SuperAdmin.findById(decoded.id);
        }
      } else {
        // For regular super admin tokens, find by ID directly
        currentSuperAdmin = await SuperAdmin.findById(decoded.id);
      }
      
      if (!currentSuperAdmin) {
        return next(new AppError('Super admin no longer exists', 401));
      }

      if (currentSuperAdmin.changedPasswordAfter(decoded.iat)) {
        return next(new AppError('Password was changed recently. Please log in again.', 401));
      }

      // Get the linked user record for proper role/admin properties
      const linkedUser = await User.findById(currentSuperAdmin.userId).populate('company');
      if (!linkedUser) {
        return next(new AppError('Super admin user record not found', 401));
      }

      req.user = linkedUser;
      req.superAdmin = currentSuperAdmin;
      req.isSuperAdminUser = true;
      // When emulating a tenant, scope requests to the emulated tenantId
      if (decoded.isEmulating && decoded.emulatedTenantId) {
        req.isEmulating = true;
        req.tenantId = decoded.emulatedTenantId;
        
        // Load tenant details for emulation context
        try {
          const tenant = await Tenant.findOne({ tenantId: decoded.emulatedTenantId });
          if (tenant) {
            req.tenant = tenant;
          }
        } catch (err) {
          console.error('Failed to load tenant during emulation:', err);
        }
      }
      // Allow super admin to scope by tenant via query/header without generating a new token
      const tParamRaw = (req.query && req.query.tenant) ? req.query.tenant : (req.headers['x-tenant-id'] || '');
      const tParam = (tParamRaw || '').toString().trim().toLowerCase();
      if (!decoded.isEmulating && tParam) {
        const tenant = await Tenant.findOne({ $or: [{ tenantId: tParam }, { subdomain: tParam }] });
        if (tenant) {
          req.isEmulating = true;
          req.tenantId = tenant.tenantId;
        }
      }
      return next();
    }

    // Handle tenant user token
    const currentUser = await User.findById(decoded.id).populate('company');
    
    if (!currentUser) {
      return next(new AppError('User no longer exists', 401));
    }

    // Check if this user is actually a super admin (for backward compatibility with multitenant login)
    const superAdmin = await SuperAdmin.findOne({ userId: currentUser._id, status: 'active' });
    if (superAdmin) {
      req.user = currentUser;
      req.isSuperAdminUser = true;
      return next();
    }

    // For tenant users, verify tenant context matches
    if (req.tenantId && currentUser.tenantId !== req.tenantId) {
      return next(new AppError('Invalid tenant access', 403));
    }

    // Check if password was changed after token was issued
    if (currentUser.changedPasswordAfter && currentUser.changedPasswordAfter(decoded.iat)) {
      return next(new AppError('Password was changed recently. Please log in again.', 401));
    }

    req.user = currentUser;
    // Ensure tenant context is available for downstream controllers
    if (!req.tenantId && currentUser.tenantId) {
      req.tenantId = currentUser.tenantId;
    }
    next();

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(new AppError('Invalid token. Please log in again.', 401));
    } else if (error.name === 'TokenExpiredError') {
      return next(new AppError('Token has expired. Please log in again.', 401));
    }
    return next(new AppError('Token validation failed', 401));
  }
});

/**
 * Tenant emulation for super admin
 */
const emulateTenant = catchAsync(async (req, res, next) => {
  // Check for super admin access
  const isSuperAdmin = req.isSuperAdminUser || req.superAdmin;
  if (!isSuperAdmin) {
    return next(new AppError('Super admin access required', 403));
  }

  const { tenantId } = req.body;
  
  if (!tenantId) {
    return next(new AppError('Tenant ID is required', 400));
  }

  // Find tenant by tenantId (slug)
  const tenant = await Tenant.findOne({ tenantId });
  if (!tenant) {
    return next(new AppError('Tenant not found', 404));
  }

  // Generate new token with emulation flags
  const emulationToken = signToken({
    id: req.user._id,
    role: 'super_admin',
    isSuperAdmin: true,
    isEmulating: true,
    emulatedTenantId: tenant.tenantId,
    originalUserId: req.user._id
  });

  // Set cookie for browser session
  const cookieOptions = {
    expires: new Date(
      Date.now() + (process.env.JWT_COOKIE_EXPIRES_IN || 7) * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    sameSite: 'lax'
  };
  if (process.env.NODE_ENV === 'production') {
    cookieOptions.secure = true;
  }
  res.cookie('jwt', emulationToken, cookieOptions);

  // Generate appropriate redirect URL
  const domain = process.env.DOMAIN;
  let redirectUrl;
  if (!domain || domain.includes('localhost')) {
    redirectUrl = `http://localhost:3000/home?tenant=${tenant.tenantId}`;
  } else {
    redirectUrl = `https://${tenant.tenantId}.${domain}`;
  }

  res.json({
    status: true,
    message: `Now emulating tenant: ${tenant.name}`,
    token: emulationToken,
    tenant: {
      tenantId: tenant.tenantId,
      name: tenant.name,
      subdomain: tenant.subdomain,
      status: tenant.status
    },
    redirectUrl
  });
});

/**
 * Stop tenant emulation
 */
const stopEmulation = catchAsync(async (req, res, next) => {
  console.log('🛑 stopEmulation called');
  console.log('🔍 req.user:', JSON.stringify(req.user, null, 2));
  console.log('🔍 req.isSuperAdminUser:', req.isSuperAdminUser);
  console.log('🔍 req.superAdmin:', req.superAdmin);
  
  // Validate that user is currently emulating or is a super admin
  const isSuperAdmin = req.isSuperAdminUser || req.superAdmin;
  const isEmulating = req.isEmulating; // This comes from token validation
  
  console.log('✅ isSuperAdmin:', isSuperAdmin);
  console.log('✅ isEmulating (from token):', isEmulating);
  console.log('✅ req.tenantId:', req.tenantId);
  
  if (!isSuperAdmin) {
    console.log('❌ Validation failed: Not a super admin');
    return next(new AppError('Super admin access required', 403));
  }
  
  if (!isEmulating) {
    console.log('❌ Validation failed: Not currently emulating');
    return next(new AppError('Not currently emulating', 400));
  }
  
  console.log('✅ Validation passed, proceeding with stop emulation');

  // Ensure we have superAdmin record for proper token generation
  if (!req.superAdmin && req.isSuperAdminUser) {
    const superAdmin = await SuperAdmin.findOne({ userId: req.user._id });
    if (superAdmin) {
      req.superAdmin = superAdmin;
    }
  }

  // Generate new clean super admin token
  const token = signToken({
    id: req.user._id,
    role: 'super_admin',
    isSuperAdmin: true,
    isEmulating: false
  });

  // Reset cookie to non-emulation token
  const cookieOptions = {
    expires: new Date(
      Date.now() + (process.env.JWT_COOKIE_EXPIRES_IN || 7) * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    sameSite: 'lax'
  };
  if (process.env.NODE_ENV === 'production') {
    cookieOptions.secure = true;
  }
  res.cookie('jwt', token, cookieOptions);

  // Generate appropriate redirect URL
  const domain = process.env.DOMAIN;
  let redirectUrl;
  if (!domain || domain.includes('localhost')) {
    redirectUrl = `http://localhost:3000/super-admin`;
  } else {
    redirectUrl = `https://admin.${domain}`;
  }

  res.json({
    status: true,
    message: 'Stopped emulation',
    token: token,
    redirectUrl
  });
});

/**
 * Get current user profile
 */
const getProfile = catchAsync(async (req, res, next) => {
  const isSuperAdmin = req.isSuperAdminUser || req.superAdmin;
  const isEmulating = req.isEmulating && req.tenantId;
  
  let profile = {
    id: req.user._id,
    name: req.user.name,
    email: req.user.email,
    status: req.user.status || 'active'
  };

  if (isSuperAdmin && isEmulating) {
    // Super admin emulating a tenant - show superadmin's actual details
    profile.name = `${req.user.name} (Emulating)`;
    profile.userType = 'super_admin_emulating';
    profile.role = req.user.role;
    
    // Show superadmin's actual details, not tenant details
    profile.id = req.user._id; // Keep superadmin's real ID
    profile.email = req.user.email; // Keep superadmin's real email
    profile.corporateId = req.user.corporateID || 'N/A';
    profile.status = 'active'; // Superadmin is always active during emulation
    
    // Add emulation context
    profile.isEmulating = true;
    profile.emulatedTenantId = req.tenantId;
    
    // Get tenant information if available
    if (req.tenant) {
      profile.tenant = {
        tenantId: req.tenant.tenantId,
        name: req.tenant.name,
        subdomain: req.tenant.subdomain,
        status: req.tenant.status
      };
      
      // Add context about which tenant is being emulated
      profile.emulatingTenant = {
        tenantId: req.tenant.tenantId,
        name: req.tenant.name
      };
    }
    
  } else if (isSuperAdmin) {
    // Regular super admin (not emulating)
    profile.role = req.user.role;
    profile.userType = 'super_admin';
    profile.corporateId = req.user.corporateID || 'N/A';
    
  } else {
    // Regular tenant user
    profile.role = req.user.role;
    profile.is_admin = req.user.is_admin;
    profile.tenantId = req.user.tenantId;
    profile.corporateId = req.user.corporateID || 'N/A';
    profile.company = req.user.company;
    profile.userType = 'tenant_user';
    
    if (req.tenant) {
      profile.tenant = {
        tenantId: req.tenant.tenantId,
        name: req.tenant.name,
        subdomain: req.tenant.subdomain,
        status: req.tenant.status
      };
    }
  }

  res.json({
    status: true,
    user: profile
  });
});

/**
 * Logout
 */
const logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });
  
  res.json({
    status: true,
    message: 'Logged out successfully'
  });
};

/**
 * Role-based authorization middleware
 */
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (req.isSuperAdminUser) {
      // Super admin can access everything
      return next();
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action', 403));
    }
    next();
  };
};

module.exports = {
  landingLogin,
  tenantLogin,
  superAdminLogin,
  validateToken,
  emulateTenant,
  stopEmulation,
  getProfile,
  logout,
  restrictTo,
  signToken,
  createSendToken
};