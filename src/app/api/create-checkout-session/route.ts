import { NextResponse } from 'next/server';
import { getNowBuildUserId } from '@/lib/nowbuild/auth';
import { CREDIT_PACKS, getStripe, type CreditPackId } from '@/lib/stripe';

export async function POST(request: Request) {
  try {
    const userId = await getNowBuildUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { pack, locale } = await request.json() as { pack?: string; locale?: string };
    if (!pack || !(pack in CREDIT_PACKS)) return NextResponse.json({ error: 'Invalid credit pack' }, { status: 400 });
    const selected = CREDIT_PACKS[pack as CreditPackId];
    if (!selected.priceId) return NextResponse.json({ error: 'Credit pack price is not configured' }, { status: 503 });

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
    const safeLocale = locale === 'zh' ? 'zh' : 'en';
    const session = await getStripe().checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: selected.priceId, quantity: 1 }],
      success_url: `${appUrl}/${safeLocale}/dashboard?payment=success`,
      cancel_url: `${appUrl}/${safeLocale}/pricing?canceled=true`,
      client_reference_id: userId,
      metadata: { userId, pack, credits: String(selected.credits) },
      payment_intent_data: { metadata: { userId, pack, credits: String(selected.credits) } },
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Credit checkout error:', error);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
