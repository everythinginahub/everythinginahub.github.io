export const SECURITY_HEADERS = Object.freeze({
  'Content-Security-Policy': "object-src 'none'; base-uri 'self' https://cdn.jsdelivr.net; form-action 'self' https://www.youtube.com; frame-ancestors 'none'; upgrade-insecure-requests",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()'
});

export function securityHeadersForRequest(request) {
  const forwardedHeader = request.headers?.['x-forwarded-proto'];
  const forwardedProto = typeof forwardedHeader === 'string' ? forwardedHeader.split(',')[0].trim().toLowerCase() : '';
  const secure = Boolean(request.socket?.encrypted) || forwardedProto === 'https';
  const headers = secure
    ? {...SECURITY_HEADERS, 'Strict-Transport-Security': 'max-age=31536000'}
    : {...SECURITY_HEADERS};
  const pathname = new URL(request.url || '/', 'http://localhost').pathname;
  if (pathname === '/voxelcraft-survival.html' || pathname === '/public/voxelcraft-survival.html') {
    return {
      ...headers,
      'Content-Security-Policy': headers['Content-Security-Policy'].replace("frame-ancestors 'none'", "frame-ancestors 'self'"),
      'X-Frame-Options': 'SAMEORIGIN'
    };
  }
  return headers;
}
