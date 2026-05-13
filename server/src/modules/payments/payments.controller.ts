import { Request, Response } from 'express';

import { env } from '../../config/env';
import { getSupabaseClient } from '../../config/supabase';
import { ApiError } from '../../middleware/error-handler';
import { getStripeClient } from './stripe.client';

// Inline plan definition — no Stripe dashboard product required
const PLAN = {
  name: 'AVA Pro',
  description: 'Unlimited voice minutes, priority processing & premium voice models',
  amount: 1900,   // $19.00 in cents
  currency: 'usd',
  interval: 'month' as const,
};

const getOrCreateProfile = async (userId: string, email: string) => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new ApiError('Failed to load profile', 500);
  }

  if (data) {
    return data;
  }

  const { data: created, error: createError } = await supabase
    .from('profiles')
    .insert({ id: userId, email, role: 'user' })
    .select('*')
    .single();

  if (createError || !created) {
    throw new ApiError('Failed to create profile', 500);
  }

  return created;
};

export const createCheckoutSession = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const email = req.user?.email;

  if (!userId || !email) {
    throw new ApiError('Unauthorized', 401);
  }

  const profile = await getOrCreateProfile(userId, email);

  const stripe = getStripeClient();
  let stripeCustomerId = profile.stripe_customer_id as string | null;
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email,
      metadata: {
        userId,
      },
    });
    stripeCustomerId = customer.id;

    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('profiles')
      .update({ stripe_customer_id: stripeCustomerId })
      .eq('id', userId);

    if (error) {
      throw new ApiError('Failed to update profile', 500);
    }
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'subscription',
    customer: stripeCustomerId,
    line_items: [
      {
        price_data: {
          currency: PLAN.currency,
          product_data: {
            name: PLAN.name,
            description: PLAN.description,
          },
          unit_amount: PLAN.amount,
          recurring: {
            interval: PLAN.interval,
          },
        },
        quantity: 1,
      },
    ],
    success_url: `${env.FRONTEND_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.FRONTEND_URL}/payment-cancelled`,
  });

  if (!session.url) {
    throw new ApiError('Could not create checkout session', 500);
  }

  res.status(200).json({ checkoutUrl: session.url });
};

/**
 * POST /api/payments/create-subscription-intent
 * Creates an incomplete Stripe subscription and returns the PaymentIntent
 * client_secret so the frontend can confirm payment with Stripe Elements.
 */
export const createSubscriptionIntent = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const email = req.user?.email;

  if (!userId || !email) throw new ApiError('Unauthorized', 401);

  const profile = await getOrCreateProfile(userId, email);
  const stripe = getStripeClient();
  const supabase = getSupabaseClient();

  let customerId = profile.stripe_customer_id as string | null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email,
      metadata: { userId },
    });
    customerId = customer.id;
    await supabase
      .from('profiles')
      .update({ stripe_customer_id: customerId })
      .eq('id', userId);
  }

  // Create an incomplete subscription — payment not confirmed yet
  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{
      price_data: {
        currency: PLAN.currency,
        product_data: { name: PLAN.name, description: PLAN.description },
        unit_amount: PLAN.amount,
        recurring: { interval: PLAN.interval },
      },
    }],
    payment_behavior: 'default_incomplete',
    payment_settings: { save_default_payment_method: 'on_subscription' },
    expand: ['latest_invoice.payment_intent'],
  });

  const invoice = subscription.latest_invoice as any;
  const paymentIntent = invoice?.payment_intent as any;

  if (!paymentIntent?.client_secret) {
    throw new ApiError('Failed to create payment intent', 500);
  }

  res.status(200).json({
    clientSecret: paymentIntent.client_secret,
    subscriptionId: subscription.id,
  });
};

/**
 * POST /api/payments/activate-premium
 * Called after the frontend confirms the card payment.
 * Verifies subscription is active in Stripe and upgrades user role.
 */
export const activatePremium = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const email = req.user?.email;

  if (!userId || !email) throw new ApiError('Unauthorized', 401);

  const { subscriptionId } = req.body as { subscriptionId: string };
  if (!subscriptionId) throw new ApiError('subscriptionId is required', 400);

  const stripe = getStripeClient();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  if (!['active', 'trialing'].includes(subscription.status)) {
    return res.status(402).json({
      error: 'Subscription not active',
      status: subscription.status,
    });
  }

  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('profiles')
    .update({
      role: 'premium',
      stripe_customer_id: subscription.customer as string,
    })
    .eq('id', userId);

  if (error) throw new ApiError('Failed to activate premium', 500);

  res.status(200).json({ success: true, role: 'premium' });
};

/**
 * POST /api/payments/verify-session
 * Called by the frontend on the success page with the session_id from Stripe.
 * Verifies payment was successful and immediately upgrades the user to premium.
 */
export const verifyCheckoutSession = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const email = req.user?.email;

  if (!userId || !email) {
    throw new ApiError('Unauthorized', 401);
  }

  const { sessionId } = req.body as { sessionId: string };
  if (!sessionId) {
    throw new ApiError('sessionId is required', 400);
  }

  const stripe = getStripeClient();
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (session.payment_status !== 'paid') {
    return res.status(402).json({ error: 'Payment not completed', payment_status: session.payment_status });
  }

  const supabase = getSupabaseClient();

  // Save stripe_customer_id if not already stored
  await supabase
    .from('profiles')
    .update({
      role: 'premium',
      stripe_customer_id: session.customer as string,
    })
    .eq('id', userId);

  res.status(200).json({ success: true, role: 'premium' });
};

export const stripeWebhook = async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;
  const stripe = getStripeClient();
  let event;

  if (env.STRIPE_WEBHOOK_SECRET) {
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, env.STRIPE_WEBHOOK_SECRET);
    } catch (err: any) {
      console.error('Webhook signature verification failed.', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
  } else {
    // No webhook secret set — parse body directly (dev/test only)
    console.warn('[Stripe] STRIPE_WEBHOOK_SECRET not set — skipping signature verification');
    try {
      event = JSON.parse(req.body.toString());
    } catch {
      return res.status(400).send('Invalid webhook payload');
    }
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const customerId = session.customer as string;
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('profiles')
        .update({ role: 'premium' })
        .eq('stripe_customer_id', customerId);

      if (error) {
        console.error('Failed to update premium role', error.message);
      }
      break;
    }
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.status(200).json({ received: true });
};

/**
 * GET /api/payments/subscription-status
 * Returns the authenticated user's current role and Stripe customer ID.
 */
export const getSubscriptionStatus = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const email = req.user?.email;

  if (!userId || !email) {
    throw new ApiError('Unauthorized', 401);
  }

  const profile = await getOrCreateProfile(userId, email);

  res.status(200).json({
    role: profile.role ?? 'user',
    stripe_customer_id: profile.stripe_customer_id ?? null,
  });
};
