const express = require('express');
const router = express.Router();
const { validateToken } = require('../controllers/authController');
const driverController = require('../controllers/driverController');

router.route('/driver/add').post(validateToken, driverController.addDriver);
router.route('/driver/listings').get(validateToken, driverController.driversLists);

module.exports = router;