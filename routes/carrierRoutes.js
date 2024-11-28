const express = require('express');
const router = express.Router();
const { validateToken } = require('../controllers/authController');
const carrierController = require('../controllers/carrierController');

router.route('/carriers/listings').get(validateToken, carrierController.carriers_listing);

module.exports = router;