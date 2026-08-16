import { describe, expect, it } from 'vitest';
import { environmentFields } from '@/lib/nowbuild/environment-schema';

describe('launch configuration contract', () => {
  it('collects every required pre-publish field for Supabase, Stripe, and Vercel', () => {
    const required = environmentFields.filter((field) => field.required && field.phase === 'before-publish').map((field) => field.key);
    expect(required).toEqual(expect.arrayContaining([
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
      'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
      'STRIPE_SECRET_KEY',
      'NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID',
      'NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID',
      'VERCEL_TOKEN',
    ]));
  });

  it('separates the Stripe webhook secret into the post-deploy setup phase', () => {
    expect(environmentFields.find((field) => field.key === 'STRIPE_WEBHOOK_SECRET')).toMatchObject({ group: 'payments', phase: 'after-publish' });
  });
});
