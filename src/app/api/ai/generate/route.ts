import { handleManagedAIRequest } from '@/lib/nowbuild/managed-ai';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(request: Request) {
  return handleManagedAIRequest(request);
}
