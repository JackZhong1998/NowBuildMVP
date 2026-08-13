import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import type Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';
import { getServiceSupabase } from '@/lib/supabase';

export async function POST(request: Request) {
  const body = await request.text();
  const signature = (await headers()).get('stripe-signature');
  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) return NextResponse.json({ error: 'Missing signature' }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  const { error: claimError } = await supabase.from('stripe_events').insert({ event_id: event.id, event_type: event.type });
  if (claimError?.code === '23505') return NextResponse.json({ received: true, duplicate: true });
  if (claimError) return NextResponse.json({ error: 'Unable to claim event' }, { status: 500 });

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const credits = Number(session.metadata?.credits || 0);
      if (session.payment_status === 'paid' && userId && Number.isInteger(credits) && credits > 0) {
        const { error } = await supabase.rpc('grant_credits', {
          p_user_id: userId,
          p_checkout_session_id: session.id,
          p_payment_intent_id: typeof session.payment_intent === 'string' ? session.payment_intent : null,
          p_pack: session.metadata?.pack || 'unknown',
          p_credits: credits,
          p_amount_total: session.amount_total || 0,
          p_currency: session.currency || 'usd',
        });
        if (error) throw error;
      }
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Credit webhook failed:', error);
    await supabase.from('stripe_events').delete().eq('event_id', event.id);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
