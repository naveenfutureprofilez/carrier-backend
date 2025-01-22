const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { validateToken } = require('../controllers/authController');

router.route('/create_user').post(validateToken, authController.signup);
router.route('/login').post(authController.login); 
router.route('/forgotpassword').post(authController.forgotPassword); 
router.route('/resetpassword/:token').patch(authController.resetpassword); 
router.route('/profile').get(validateToken, authController.profile);
router.route('/employeesLisiting').get(validateToken, authController.employeesLisiting);

module.exports = router;