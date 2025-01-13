const express = require('express');
const router = express.Router();
const { validateToken } = require('../controllers/authController');
const orderController = require('../controllers/orderController');

router.route('/order/add').post(validateToken, orderController.create_order);
router.route('/order/listings').get(validateToken, orderController.order_listing);

module.exports = router;
