const express = require('express');
const router = express.Router();
const { 
  landingLogin,
  getProfile,
  logout
} = require('../controllers/multiTenantAuthController');
const { 
  requireLandingPage,
  validateToken 
} = require('../middleware/tenantResolver');

// Landing page routes (company.com)
router.post('/login', requireLandingPage, landingLogin);
router.get('/profile', validateToken, getProfile);
router.post('/logout', logout);

// Company registration route for new signups
router.post('/signup', requireLandingPage, async (req, res, next) => {
  // This will be implemented in tenant creation workflow
  res.status(501).json({
    status: false,
    message: 'Company registration will be available soon. Please contact support.'
  });
});

module.exports = router;