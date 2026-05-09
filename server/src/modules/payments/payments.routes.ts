import { Router } from 'express';
import express from 'express';

import { requireAuth } from '../../middleware/supabase-auth.middleware';
import { createCheckoutSession, stripeWebhook } from './payments.controller';

const router = Router();

router.post('/create-checkout-session', requireAuth, createCheckoutSession);

// Stripe webhook needs to be before express.json() middleware
router.post('/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

export default router;
