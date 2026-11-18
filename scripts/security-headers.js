export const CSP_SITE = "default-src 'self'; img-src 'self' data: https://launchorbit.co https://www.betterlaunch.co https://www.codehype.ai; script-src 'self'; style-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests";
export const CSP_PRIVACY = "default-src 'self'; img-src 'self' data:; script-src 'self'; style-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests";

// The app keeps third-party games that inject HTML into sandboxed srcdoc frames.
// Their inline scripts and jsDelivr resources require explicit compatibility allowances.
export const CSP_APP = "default-src 'self'; img-src 'self' data: blob: https://launchorbit.co https://www.betterlaunch.co https://www.codehype.ai https://i.ytimg.com https://cdn.jsdelivr.net; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; font-src 'self' data: https://cdn.jsdelivr.net; connect-src 'self' https://tytcagbeucbugwjwgiog.supabase.co wss://tytcagbeucbugwjwgiog.supabase.co https://cdn.jsdelivr.net http://localhost:* http://127.0.0.1:* https://localhost:* https://127.0.0.1:*; media-src 'self' data: blob: https://cdn.jsdelivr.net; frame-src 'self' https://www.youtube-nocookie.com https://www.bing.com https://bing.com https://www.geometrydash.com https://www.twoplayergames.org https://sausi-7.github.io https://archive.org; worker-src 'self' blob:; object-src 'none'; base-uri 'self' https://cdn.jsdelivr.net; form-action 'self' https://www.youtube.com https://www.bing.com; frame-ancestors 'none'; upgrade-insecure-requests";

export const CSP_STATUS = "default-src 'self'; img-src 'self' data:; script-src 'self'; style-src 'self'; connect-src 'self' https://tytcagbeucbugwjwgiog.supabase.co wss://tytcagbeucbugwjwgiog.supabase.co; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests";
export const CSP_FEEDBACK = "default-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests";
export const CSP_DUNGEON = "default-src 'self'; img-src 'self' data: blob: https:; script-src 'self' 'unsafe-inline' https://unpkg.com; style-src 'self' 'unsafe-inline'; connect-src 'self' https://0.peerjs.com wss://0.peerjs.com; media-src 'self' data: blob:; frame-src 'self'; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'; upgrade-insecure-requests";
export const CSP_REPORT_ONLY = "default-src 'self'; script-src 'self' https://cdn.jsdelivr.net; style-src 'self'; img-src 'self' data: blob: https:; font-src 'self' data: https:; connect-src 'self' https: wss:; media-src 'self' data: blob: https:; frame-src 'self' https:; worker-src 'self' blob:; object-src 'none'; base-uri 'self' https://cdn.jsdelivr.net; form-action 'self' https://www.youtube.com; frame-ancestors 'none'; upgrade-insecure-requests";

export const SECURITY_HEADERS = Object.freeze({
  'Content-Security-Policy': "object-src 'none'; base-uri 'self' https://cdn.jsdelivr.net; form-action 'self' https://www.youtube.com; frame-ancestors 'none'; upgrade-insecure-requests",
  'Content-Security-Policy-Report-Only': CSP_REPORT_ONLY,
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()'
});

function policyForPath(pathname) {
  if (pathname === '/' || pathname === '/index.html') return CSP_SITE;
  if (pathname === '/privacy' || pathname === '/privacy/' || pathname === '/privacy/index.html') return CSP_PRIVACY;
  if (pathname === '/feedback' || pathname === '/feedback/' || pathname === '/feedback/index.html') return CSP_FEEDBACK;
  if (pathname === '/public/' || pathname === '/public/index.html') return CSP_APP;
  if (pathname === '/public/login.html' || pathname === '/public/status.html' || pathname === '/status/' || pathname === '/status/index.html') return CSP_STATUS;
  return null;
}

export function securityHeadersForRequest(request) {
  const forwardedHeader = request.headers?.['x-forwarded-proto'];
  const forwardedProto = typeof forwardedHeader === 'string' ? forwardedHeader.split(',')[0].trim().toLowerCase() : '';
  const secure = Boolean(request.socket?.encrypted) || forwardedProto === 'https';
  const headers = secure
    ? {...SECURITY_HEADERS, 'Strict-Transport-Security': 'max-age=31536000'}
    : {...SECURITY_HEADERS};
  const pathname = new URL(request.url || '/', 'http://localhost').pathname;
  const policy = policyForPath(pathname);
  if (policy) headers['Content-Security-Policy'] = policy;
  if (pathname === '/dungeon-quest-3d.html' || pathname === '/public/dungeon-quest-3d.html') {
    headers['Content-Security-Policy'] = CSP_DUNGEON;
    headers['Content-Security-Policy-Report-Only'] = headers['Content-Security-Policy-Report-Only'].replace("frame-ancestors 'none'", "frame-ancestors 'self'");
    headers['X-Frame-Options'] = 'SAMEORIGIN';
  } else if (pathname === '/voxelcraft-survival.html' || pathname === '/public/voxelcraft-survival.html') {
    headers['Content-Security-Policy'] = headers['Content-Security-Policy'].replace("frame-ancestors 'none'", "frame-ancestors 'self'");
    headers['Content-Security-Policy-Report-Only'] = headers['Content-Security-Policy-Report-Only'].replace("frame-ancestors 'none'", "frame-ancestors 'self'");
    headers['X-Frame-Options'] = 'SAMEORIGIN';
  }
  return headers;
}
