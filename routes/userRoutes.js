const express = require('express');
const router = express.Router();
const { validateToken } = require('../controllers/authController');
const userController = require('../controllers/userController');

router.route('/update').patch(validateToken, userController.updateCurrentUserData);
router.route('/delete').delete(validateToken, userController.deleteCurrentUser);
router.route('/staff-listing').get(validateToken, userController.staffListing);

module.exports = router;