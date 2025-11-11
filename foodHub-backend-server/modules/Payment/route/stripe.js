// routes/stripe.js
const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const stripeController = require('../controllers/stripeController');
const auth = require("../../../middleware/auth");
const { body } = require("express-validator");
// GET /api/stripe/account/:accountId
router.get('/account/:accountId',stripeController.getAccountInfo)
router.post('/delete-stripe-only',stripeController.deleteOnlyInStripe);
router.post('/create', auth.protect, stripeController.createPayment);  // Dùng protect chung (check token + ID)
router.post('/confirm/:orderId', auth.protect, stripeController.confirmPayment);
router.post('/refund/:paymentId', auth.protect, stripeController.refundPayment);
router.get('/status/:paymentId', auth.protect, stripeController.getPaymentStatus);
// Webhook Stripe (Public, không protect)
router.post('/webhook', express.raw({type: 'application/json'}), stripeController.handleStripeWebhook);
module.exports = router;