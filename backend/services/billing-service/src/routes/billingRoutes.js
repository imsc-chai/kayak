const express = require('express');
const router = express.Router();
const billingController = require('../controllers/billingController');

router.get('/', billingController.getBillings);
router.post('/cancel-by-booking', billingController.cancelBillingByBookingId);
router.get('/stats/revenue', billingController.getRevenueStats);
router.get('/:id', billingController.getBillingById);
router.post('/', billingController.createBilling);
router.put('/:id', billingController.updateBilling);
router.post('/:id/refund', billingController.processRefund);

module.exports = router;

