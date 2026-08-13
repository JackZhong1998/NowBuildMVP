import 'server-only';
import Stripe from 'stripe';

let stripeClient: Stripe | undefined;
export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) throw new Error('Stripe is not configured. Set STRIPE_SECRET_KEY.');
  stripeClient ??= new Stripe(key, { apiVersion: '2025-02-24.acacia', typescript: true });
  return stripeClient;
}

export const PLANS = {
  free: {
    name: 'Free',
    monthlyPriceId: null,
    yearlyPriceId: null,
  },
  pro: {
    name: 'Pro',
    monthlyPriceId: process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID ?? '',
    yearlyPriceId: process.env.NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID ?? '',
  },
} as const;
