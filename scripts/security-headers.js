export const CSP_REPORT_ONLY = "default-src 'self'; script-src 'self' https://cdn.jsdelivr.net; style-src 'self'; img-src 'self' data: blob: https:; font-src 'self' data: https:; connect-src 'self' https: wss:; media-src 'self' data: blob: https:; frame-src 'self' https:; worker-src 'self' blob:; object-src 'none'; base-uri 'self' https://cdn.jsdelivr.net; form-action 'self' https://www.youtube.com; frame-ancestors 'none'; upgrade-insecure-requests";

export const SECURITY_HEADERS = Object.freeze({
  'Content-Security-Policy': "object-src 'none'; base-uri 'self' https://cdn.jsdelivr.net; form-action 'self' https://www.youtube.com; frame-ancestors 'none'; upgrade-insecure-requests",
  'Content-Security-Policy-Report-Only': CSP_REPORT_ONLY,
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
      'Content-Security-Policy-Report-Only': headers['Content-Security-Policy-Report-Only'].replace("frame-ancestors 'none'", "frame-ancestors 'self'"),
      'X-Frame-Options': 'SAMEORIGIN'
    };
  }
  return headers;
}
