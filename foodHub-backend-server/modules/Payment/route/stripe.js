// routes/stripe.js
const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const stripeController = require('../controllers/stripeController')
// GET /api/stripe/account/:accountId
router.get('/account/:accountId',stripeController.getAccountInfo)
router.post('/delete-stripe-only',stripeController.deleteOnlyInStripe);

module.exports = router;