const express = require('express');
const router = express.Router();
const { validateToken } = require('../controllers/authController');
const orderController = require('../controllers/orderController');
const restrictOrderMiddleware = require('../middlewares/restrictOrderMiddleware');

router.route('/order/add').post(validateToken, orderController.create_order);
router.route('/order/listings').get(validateToken, orderController.order_listing);
router.route('/order/detail/:id').get(validateToken, orderController.order_detail);
router.route('/order_docs/:id').get(validateToken, orderController.order_docs);
router.route('/lock-order/:id').get(validateToken, orderController.lockOrder);
router.route('/account/order/listings').get(validateToken, orderController.order_listing_account);
router.route('/account/order/update/:id/:type').post(validateToken, restrictOrderMiddleware, orderController.updateOrderPaymentStatus);

router.route('/account/order-status/:id').post(validateToken, restrictOrderMiddleware, orderController.updateOrderStatus);
router.route('/account/order/addnote/:id').post(validateToken, restrictOrderMiddleware, orderController.addnote);

router.route('/overview').get(validateToken, orderController.overview);
router.route('/cummodityLists').get(validateToken, orderController.cummodityLists);
router.route('/removeCummodity').post(validateToken, orderController.removeCummodity);
router.route('/addCummodity').post(validateToken, orderController.addCummodity);


router.route('/equipmentLists').get(validateToken, orderController.equipmentLists);
router.route('/removeEquipment').post(validateToken, orderController.removeEquipment);
router.route('/addEquipment').post(validateToken, orderController.addEquipment);

router.route('/chargesLists').get(validateToken, orderController.chargesLists);
router.route('/removeCharge').post(validateToken, orderController.removeCharge);
router.route('/addCharge').post(validateToken, orderController.addCharges);

// Payments
router.route('/payments/listings').get(validateToken, orderController.orderPayments);

module.exports = router;
