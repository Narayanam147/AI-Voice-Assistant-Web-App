import { Router } from 'express';
import express from 'express';

import { requireAuth } from '../../middleware/supabase-auth.middleware';
import { createCheckoutSession, stripeWebhook, getSubscriptionStatus, verifyCheckoutSession, createSubscriptionIntent, activatePremium } from './payments.controller';

const router = Router();

router.post('/create-checkout-session', requireAuth, createCheckoutSession);
router.get('/subscription-status', requireAuth, getSubscriptionStatus);
router.post('/verify-session', requireAuth, verifyCheckoutSession);
router.post('/create-subscription-intent', requireAuth, createSubscriptionIntent);
router.post('/activate-premium', requireAuth, activatePremium);

// Stripe webhook needs to be before express.json() middleware
router.post('/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

export default router;
