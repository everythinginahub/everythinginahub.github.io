const allowedOrigins = new Set([
  'https://everythinginahub.github.io',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
]);
const previewOrigin = /^https:\/\/\d+-[a-z0-9-]+\.e2b\.app$/i;
const allowedHeaders = 'apikey, content-type';
const allowedMethods = 'POST, OPTIONS';
const categories = new Set(['suggestion', 'problem', 'other']);
const maxBodyBytes = 16384;

export function isFeedbackOriginAllowed(origin) {
  return typeof origin === 'string' && (allowedOrigins.has(origin) || previewOrigin.test(origin));
}

function headersFor(request) {
  const headers = new Headers({
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Vary': 'Origin'
  });
  const origin = request.headers.get('origin');
  if (isFeedbackOriginAllowed(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Headers', allowedHeaders);
    headers.set('Access-Control-Allow-Methods', allowedMethods);
  }
  return headers;
}

function reply(request, status, body, extra = {}) {
  const headers = headersFor(request);
  for (const [key, value] of Object.entries(extra)) headers.set(key, value);
  return new Response(JSON.stringify(body), {status, headers});
}

async function readBoundedBody(request) {
  const reader = request.body?.getReader();
  if (!reader) return {text:'',tooLarge:false};
  const chunks=[];
  let total=0;
  while (true) {
    const {done,value}=await reader.read();
    if (done) break;
    total+=value.byteLength;
    if (total>maxBodyBytes) {
      await reader.cancel();
      return {text:'',tooLarge:true};
    }
    chunks.push(value);
  }
  const bytes=new Uint8Array(total);
  let offset=0;
  for (const chunk of chunks) { bytes.set(chunk,offset);offset+=chunk.byteLength; }
  return {text:new TextDecoder('utf-8',{fatal:true}).decode(bytes),tooLarge:false};
}

export async function hashClientAddress(request, secret) {
  const forwarded = request.headers.get('cf-connecting-ip')
    || request.headers.get('x-forwarded-for')?.split(',')[0].trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), {name:'HMAC',hash:'SHA-256'}, false, ['sign']);
  const input = new TextEncoder().encode(`site-feedback-v1:${forwarded}`);
  const digest = await crypto.subtle.sign('HMAC', key, input);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

export function createFeedbackHandler({configured,submit,hashAddress}) {
  return async request => {
    const origin=request.headers.get('origin');
    if (request.method==='OPTIONS') {
      return new Response(null,{status:isFeedbackOriginAllowed(origin)?204:403,headers:headersFor(request)});
    }
    if (request.method!=='POST') return reply(request,405,{error:'Use POST to send feedback.'},{Allow:allowedMethods});
    if (!isFeedbackOriginAllowed(origin)) return reply(request,403,{error:'This feedback request is not allowed.'});
    if (!configured || typeof submit!=='function' || typeof hashAddress!=='function') {
      return reply(request,503,{error:'Feedback is unavailable right now. Please try again later.'});
    }
    const contentType=(request.headers.get('content-type')||'').split(';',1)[0].trim().toLowerCase();
    if (contentType!=='application/json') return reply(request,415,{error:'Send feedback as JSON.'});

    const contentLength=Number(request.headers.get('content-length'));
    if (Number.isFinite(contentLength)&&contentLength>maxBodyBytes) return reply(request,413,{error:'Feedback is too large.'});
    let body;
    try {
      const result=await readBoundedBody(request);
      if (result.tooLarge) return reply(request,413,{error:'Feedback is too large.'});
      body=JSON.parse(result.text);
    } catch {
      return reply(request,400,{error:'Send valid feedback data.'});
    }
    if (!body || typeof body!=='object' || Array.isArray(body)) return reply(request,400,{error:'Send valid feedback data.'});

    // Quietly accept bot submissions that fill the hidden trap, without storing them.
    if (typeof body.website==='string'&&body.website.trim()) return reply(request,200,{ok:true});
    const category=typeof body.category==='string'?body.category:'';
    const message=typeof body.message==='string'?body.message.trim():'';
    const rawPage=typeof body.page==='string'?body.page.toLowerCase():'';
    const page=/^[a-z0-9-]{1,40}$/.test(rawPage)?rawPage:'website';
    if (!categories.has(category)) return reply(request,400,{error:'Choose a feedback type.'});
    const messageLength=Array.from(message).length;
    if (messageLength<10||messageLength>1500||message.includes(String.fromCharCode(0))) return reply(request,400,{error:'Feedback must be between 10 and 1,500 characters.'});

    try {
      const ipHash=await hashAddress(request);
      await submit({ipHash,category,message,page});
      return reply(request,200,{ok:true});
    } catch (error) {
      if (error?.code==='feedback_rate_limited') {
        return reply(request,429,{error:'You have sent feedback recently. Please try again in about an hour.'});
      }
      return reply(request,503,{error:'Feedback could not be saved right now. Please try again later.'});
    }
  };
}
