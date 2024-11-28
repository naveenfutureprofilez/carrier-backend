const express = require('express');
const router = express.Router();
const { validateToken } = require('../controllers/authController');
const orderController = require('../controllers/orderController');

router.route('/create/order').post(validateToken, orderController.create_order);

module.exports = router;