const express = require('express');
const router = express.Router();
const { validateToken } = require('../controllers/multiTenantAuthController');
const { resolveTenant } = require('../middleware/tenant');
const driverController = require('../controllers/driverController');

router.route('/driver/add').post(validateToken, resolveTenant, driverController.addDriver);
router.route('/driver/listings').get(validateToken, resolveTenant, driverController.driversLists);
router.route('/driver/remove/:id').get(validateToken, resolveTenant, driverController.removeDriver);

module.exports = router;
