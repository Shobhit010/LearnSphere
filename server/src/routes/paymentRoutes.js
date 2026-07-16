const express = require('express');
const {
  createCheckoutSession,
  stripeWebhook,
  simulateMockCheckout,
} = require('../controllers/paymentController');
const { protect } = require('../middlewares/auth');

const router = express.Router();

// Stripe Webhook Endpoint (requires raw buffer for signature verification)
router.post('/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

// JSON parser for checkout routes
router.use(express.json());
router.use(express.urlencoded({ extended: true }));

// Protected endpoints for Checkout and Mock testing
router.post('/checkout-session', protect, createCheckoutSession);
router.post('/mock-checkout', protect, simulateMockCheckout);

module.exports = router;
