import { NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
import { getStripe, PLANS } from '@/lib/stripe';
import { getServiceSupabase } from '@/lib/supabase';

const ACTIVE_SUBSCRIPTION_STATUSES = ['active', 'trialing', 'past_due'];

export async function POST(request: Request) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { plan, billingCycle, locale } = await request.json();

    if (plan !== 'pro') {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    const priceId = billingCycle === 'yearly'
      ? PLANS.pro.yearlyPriceId
      : PLANS.pro.monthlyPriceId;

    if (!priceId) {
      return NextResponse.json({ error: 'Price not configured' }, { status: 500 });
    }

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
    const safeLocale = locale === 'zh' ? 'zh' : 'en';

    const supabase = getServiceSupabase();
    const { data: existingSubscription, error: subscriptionError } = await supabase
      .from('subscriptions').select('stripe_customer_id, status').eq('user_id', userId).maybeSingle();
    if (subscriptionError) throw new Error(`Failed to load subscription: ${subscriptionError.message}`);
    if (existingSubscription && ACTIVE_SUBSCRIPTION_STATUSES.includes(existingSubscription.status)) {
      return NextResponse.json({ error: 'You already have a subscription. Manage it from your dashboard.' }, { status: 409 });
    }

    const stripe = getStripe();
    let customerId = existingSubscription?.stripe_customer_id ?? null;
    if (!customerId) {
      const customer = await stripe.customers.create({ metadata: { userId } });
      customerId = customer.id;
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/${safeLocale}/dashboard?payment=success`,
      cancel_url: `${appUrl}/${safeLocale}/pricing?canceled=true`,
      metadata: { userId, plan, billingCycle },
      subscription_data: { metadata: { userId, plan, billingCycle } },
      client_reference_id: userId,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Checkout session error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
