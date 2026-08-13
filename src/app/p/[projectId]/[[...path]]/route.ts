import { NextRequest, NextResponse } from 'next/server';
import { startProjectPreview } from '@/lib/nowbuild/preview-runtime';
import { handleManagedAIRequest } from '@/lib/nowbuild/managed-ai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function proxy(request: NextRequest, { params }: { params: Promise<{ projectId: string; path?: string[] }> }) {
  try {
    const { projectId, path = [] } = await params;
    if (request.method === 'POST' && path.join('/') === 'api/nowbuild-ai') {
      return handleManagedAIRequest(request, projectId);
    }
    const preview = await startProjectPreview(projectId);
    const suffix = path.length ? `/${path.join('/')}` : '';
    const url = `http://127.0.0.1:${preview.port}/p/${projectId}${suffix}${request.nextUrl.search}`;
    const headers = new Headers(request.headers);
    headers.delete('host');
    const upstream = await fetch(url, {
      method: request.method,
      headers,
      body: ['GET', 'HEAD'].includes(request.method) ? undefined : await request.arrayBuffer(),
      redirect: 'manual',
    });
    const responseHeaders = new Headers(upstream.headers);
    responseHeaders.delete('x-frame-options');
    responseHeaders.delete('content-security-policy');
    responseHeaders.delete('x-middleware-rewrite');
    responseHeaders.delete('x-middleware-next');
    // Node fetch transparently decompresses the upstream body. Forwarding the
    // original encoding/length makes browsers attempt a second decompression.
    responseHeaders.delete('content-encoding');
    responseHeaders.delete('content-length');
    responseHeaders.set('cache-control', path[0] === '_next' ? 'public, max-age=31536000, immutable' : 'no-store');

    const contentType = responseHeaders.get('content-type') || '';
    if (contentType.includes('text/html')) {
      const basePath = `/p/${projectId}`;
      const fetchShim = `<script id="nowbuild-preview-runtime">(function(basePath){var originalFetch=window.fetch.bind(window);window.__NOWBUILD_BASE_PATH__=basePath;window.fetch=function(input,init){if(typeof input==='string'&&input.indexOf('/api/')===0){input=basePath+input;}else if(input instanceof URL&&input.pathname.indexOf('/api/')===0){input=new URL(basePath+input.pathname+input.search,window.location.origin);}else if(input instanceof Request){var url=new URL(input.url);if(url.origin===window.location.origin&&url.pathname.indexOf('/api/')===0){input=new Request(new URL(basePath+url.pathname+url.search,window.location.origin),input);}}return originalFetch(input,init);};})(${JSON.stringify(basePath)});</script>`;
      const html = await upstream.text();
      const instrumented = html.includes('<head>')
        ? html.replace('<head>', `<head>${fetchShim}`)
        : `${fetchShim}${html}`;
      return new NextResponse(instrumented, { status: upstream.status, headers: responseHeaders });
    }

    return new NextResponse(upstream.body, { status: upstream.status, headers: responseHeaders });
  } catch (error) {
    console.error('Generated preview proxy failed:', error);
    return NextResponse.json({ error: 'Generated project preview is unavailable' }, { status: 503 });
  }
}

export const GET = proxy;
export const HEAD = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
