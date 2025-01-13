const express = require('express');
const router = express.Router();
const { validateToken } = require('../controllers/authController');
const customerController = require('../controllers/customerController');

router.route('/customer/listings').get(validateToken, customerController.customers_listing);
router.route('/customer/add').post(validateToken, customerController.addCustomer);

module.exports = router;