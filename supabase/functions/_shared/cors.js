const TRUSTED_ORIGINS = Object.freeze([
  'https://everythinginahub.github.io',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
]);
const trustedOrigins = new Set(TRUSTED_ORIGINS);
const allowedHeaders = 'authorization, x-client-info, apikey, content-type';
const allowedMethods = 'POST, OPTIONS';

export function isTrustedOrigin(origin) {
  return typeof origin === 'string' && trustedOrigins.has(origin);
}

export function corsResponseHeaders(request, defaults = {}) {
  const headers = new Headers(defaults);
  const origin = request.headers.get('origin');
  const vary = headers.get('vary');
  const varyValues = (vary || '').split(',').map(value => value.trim()).filter(Boolean);
  if (!varyValues.some(value => value.toLowerCase() === 'origin')) varyValues.push('Origin');
  headers.set('Vary', varyValues.join(', '));

  if (isTrustedOrigin(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Headers', allowedHeaders);
    headers.set('Access-Control-Allow-Methods', allowedMethods);
  }
  return headers;
}

export function corsPreflightResponse(request, defaults = {}) {
  const origin = request.headers.get('origin');
  const allowed = origin === null || isTrustedOrigin(origin);
  return new Response(null, {
    status: allowed ? 204 : 403,
    headers: corsResponseHeaders(request, defaults)
  });
}
