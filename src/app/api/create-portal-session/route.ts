import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getStripe } from '@/lib/stripe';
import { getServiceSupabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { locale } = await request.json();
    const safeLocale = locale === 'zh' ? 'zh' : 'en';
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
    const { data, error } = await getServiceSupabase().from('subscriptions')
      .select('stripe_customer_id').eq('user_id', userId).maybeSingle();
    if (error) throw new Error(`Failed to load subscription: ${error.message}`);
    if (!data?.stripe_customer_id) return NextResponse.json({ error: 'No billing account found' }, { status: 404 });
    const session = await getStripe().billingPortal.sessions.create({
      customer: data.stripe_customer_id,
      return_url: `${appUrl}/${safeLocale}/dashboard`,
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Billing portal session error:', error);
    return NextResponse.json({ error: 'Failed to open billing portal' }, { status: 500 });
  }
}
