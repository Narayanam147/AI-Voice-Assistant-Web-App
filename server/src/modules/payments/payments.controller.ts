import { Request, Response } from 'express';

import { env } from '../../config/env';
import { getSupabaseClient } from '../../config/supabase';
import { ApiError } from '../../middleware/error-handler';
import { getStripeClient } from './stripe.client';

const PREMIUM_PLAN_PRICE_ID = env.STRIPE_PREMIUM_PRICE_ID;

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
        price: PREMIUM_PLAN_PRICE_ID,
        quantity: 1,
      },
    ],
    success_url: `${env.CORS_ORIGIN}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.CORS_ORIGIN}/payment-cancelled`,
  });

  if (!session.url) {
    throw new ApiError('Could not create checkout session', 500);
  }

  res.status(200).json({ checkoutUrl: session.url });
};

export const stripeWebhook = async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;
  let event;

  const stripe = getStripeClient();

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, env.STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    console.error('Webhook signature verification failed.', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
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
