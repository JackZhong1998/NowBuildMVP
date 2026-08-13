import 'server-only';
import { auth } from '@clerk/nextjs/server';

export function isClerkConfigured() {
  const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  return Boolean(key && !key.includes('xxxxx'));
}

export async function getNowBuildUserId() {
  if (!isClerkConfigured()) return 'demo-user';
  const { userId } = await auth();
  return userId;
}
