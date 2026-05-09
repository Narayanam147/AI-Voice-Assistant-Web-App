import Stripe from 'stripe';
import { env } from '../../config/env';

let client: any = null;

export const getStripeClient = () => {
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }

  if (!client) {
    client = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-04-22.dahlia' as any,
      typescript: true,
    });
  }

  return client;
};
