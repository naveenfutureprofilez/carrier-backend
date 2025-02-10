const express = require('express');
const router = express.Router();
const { validateToken } = require('../controllers/authController');
const orderController = require('../controllers/orderController');

router.route('/order/add').post(validateToken, orderController.create_order);
router.route('/order/listings').get(validateToken, orderController.order_listing);
router.route('/order/detail/:id').get(validateToken, orderController.order_detail);
router.route('/account/order/listings').get(validateToken, orderController.order_listing_account);
router.route('/account/order/update/:id/:type').post(validateToken, orderController.updateOrderPaymentStatus);

router.route('/account/order-status/:id').post(validateToken, orderController.updateOrderStatus);
router.route('/account/order/addnote/:id').post(validateToken, orderController.addnote);

router.route('/overview').get(validateToken, orderController.overview);

module.exports = router;
