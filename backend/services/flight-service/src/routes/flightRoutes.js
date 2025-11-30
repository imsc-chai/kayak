const express = require('express');
const router = express.Router();
const flightController = require('../controllers/flightController');

// Public routes
router.get('/', flightController.getFlights);
router.get('/flight/:flightId', flightController.getFlightByFlightId);

// Specific routes must come before generic :id route
router.get('/:id/seatmap', flightController.getSeatMap);
router.post('/:id/reserve-seats', flightController.reserveSeats);
router.post('/:id/release-seats', flightController.releaseSeats);
router.post('/:id/confirm-seats', flightController.confirmSeats);
router.post('/:id/cleanup-reservations', flightController.cleanupExpiredReservations);
router.post('/:id/reviews', flightController.addReview);
router.put('/:id/seats', flightController.updateSeats);

// Generic routes (must come after specific routes)
router.get('/:id', flightController.getFlightById);

// Admin routes (add authentication middleware later)
router.post('/', flightController.createFlight);
router.put('/:id', flightController.updateFlight);
router.delete('/:id', flightController.deleteFlight);

module.exports = router;

