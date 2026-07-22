import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getStripe } from '@/lib/stripe';
import { getServiceSupabase } from '@/lib/supabase';
import type Stripe from 'stripe';

function getPlan(subscription: Stripe.Subscription) {
  const priceId = subscription.items.data[0]?.price.id;
  if (priceId === process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID) return 'pro';
  if (priceId === process.env.NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID) return 'pro';
  return subscription.metadata.plan || 'free';
}

export async function POST(request: Request) {
  const body = await request.text();
  const sig = (await headers()).get('stripe-signature');
  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  const stripe = getStripe();
  try {
    const { error: eventError } = await supabase.from('stripe_events').insert({ event_id: event.id, event_type: event.type });
    if (eventError?.code === '23505') return NextResponse.json({ received: true, duplicate: true });
    if (eventError) throw new Error(`Failed to claim webhook event: ${eventError.message}`);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
      const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
      if (userId && subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const { error } = await supabase.from('subscriptions').upsert({
          user_id: userId, stripe_customer_id: customerId ?? null, stripe_subscription_id: subscriptionId,
          plan: getPlan(subscription), status: subscription.status,
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        }, { onConflict: 'user_id' });
        if (error) throw new Error(`Failed to upsert subscription: ${error.message}`);
      }
    } else if (event.type === 'customer.subscription.updated') {
      const subscription = event.data.object as Stripe.Subscription;
      const { error } = await supabase.from('subscriptions').update({
        plan: getPlan(subscription), status: subscription.status,
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      }).eq('stripe_subscription_id', subscription.id);
      if (error) throw new Error(`Failed to update subscription: ${error.message}`);
    } else if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription;
      const { error } = await supabase.from('subscriptions').update({ status: 'canceled' }).eq('stripe_subscription_id', subscription.id);
      if (error) throw new Error(`Failed to cancel subscription: ${error.message}`);
    } else if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id;
      if (subscriptionId) {
        const { error } = await supabase.from('subscriptions').update({ status: 'past_due' }).eq('stripe_subscription_id', subscriptionId);
        if (error) throw new Error(`Failed to mark payment failure: ${error.message}`);
      }
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    await supabase.from('stripe_events').delete().eq('event_id', event.id);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
