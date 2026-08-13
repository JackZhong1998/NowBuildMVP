const FALLBACK_BASE_URL = 'https://example.com';

function normalizeBaseUrl(url: string) {
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

export function getBaseUrl() {
  const rawUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (!rawUrl || rawUrl.includes('yourdomain.com')) {
    return FALLBACK_BASE_URL;
  }

  return normalizeBaseUrl(rawUrl);
}

export function getSiteName() {
  return process.env.NEXT_PUBLIC_APP_NAME?.trim() || 'NowBuild';
}

export function buildAbsoluteUrl(pathname: string) {
  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return `${getBaseUrl()}${normalizedPath}`;
}
