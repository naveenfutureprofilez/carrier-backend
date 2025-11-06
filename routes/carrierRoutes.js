const express = require('express');
const router = express.Router();
const { validateToken } = require('../controllers/multiTenantAuthController');
const { resolveTenant } = require('../middleware/tenant');
const carrierController = require('../controllers/carrierController');
const { checkCarrierLimit } = require('../middlewares/planLimitsMiddleware');

router.route('/carriers/listings').get(validateToken, carrierController.carriers_listing);
router.route('/carriers/add').post(validateToken, resolveTenant, checkCarrierLimit(), carrierController.addCarrier);
router.route('/carriers/remove/:id').get(validateToken, carrierController.deleteCarrier);
router.route('/carriers/update/:id').post(validateToken, carrierController.updateCarrier);
router.route('/carrier/detail/:id').get(validateToken, carrierController.carrierDetail);
router.route('/getdistance').post(carrierController.getDistance);


module.exports = router;