import 'server-only';
import Stripe from 'stripe';

let stripeClient: Stripe | undefined;
export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) throw new Error('Stripe is not configured. Set STRIPE_SECRET_KEY.');
  stripeClient ??= new Stripe(key, { apiVersion: '2025-02-24.acacia', typescript: true });
  return stripeClient;
}

export const CREDIT_PACKS = {
  starter: { name: 'Starter', credits: 500, priceId: process.env.NEXT_PUBLIC_STRIPE_STARTER_CREDITS_PRICE_ID ?? '' },
  builder: { name: 'Builder', credits: 2000, priceId: process.env.NEXT_PUBLIC_STRIPE_BUILDER_CREDITS_PRICE_ID ?? '' },
  launch: { name: 'Launch', credits: 6000, priceId: process.env.NEXT_PUBLIC_STRIPE_LAUNCH_CREDITS_PRICE_ID ?? '' },
} as const;

export type CreditPackId = keyof typeof CREDIT_PACKS;
