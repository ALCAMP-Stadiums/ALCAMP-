import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// VAPID helpers
function b64uDecode(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  return Uint8Array.from(bin, c => c.charCodeAt(0));
}

function b64uEncode(buf: ArrayBuffer): string {
  const arr = new Uint8Array(buf);
  let bin = '';
  arr.forEach(b => bin += String.fromCharCode(b));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function makeVapidJwt(audience: string, privateKeyB64u: string): Promise<string> {
  const header = b64uEncode(new TextEncoder().encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const exp = Math.floor(Date.now() / 1000) + 12 * 3600;
  const payload = b64uEncode(new TextEncoder().encode(JSON.stringify({
    aud: audience, exp, sub: 'mailto:admin@alcamp.app'
  })));

  const privBytes = b64uDecode(privateKeyB64u);
  const privKey = await crypto.subtle.importKey(
    'raw', privBytes,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false, ['sign']
  ).catch(async () => {
    // Try JWK format
    const jwk = { kty:'EC', crv:'P-256', d: privateKeyB64u, x:'', y:'' };
    return crypto.subtle.importKey('jwk', jwk, { name:'ECDSA', namedCurve:'P-256' }, false, ['sign']);
  });

  const sigInput = new TextEncoder().encode(`${header}.${payload}`);
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, privKey, sigInput);
  return `${header}.${payload}.${b64uEncode(sig)}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const { subscription, title, body } = await req.json();
    if (!subscription?.endpoint) return new Response(JSON.stringify({ error: 'no subscription' }), { status: 400, headers: CORS });

    const PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';
    const PUBLIC_KEY  = Deno.env.get('VAPID_PUBLIC_KEY') ?? '';

    const url = new URL(subscription.endpoint);
    const audience = `${url.protocol}//${url.host}`;
    const jwt = await makeVapidJwt(audience, PRIVATE_KEY);

    // Build encrypted push payload
    const encoder = new TextEncoder();
    const payloadBytes = encoder.encode(JSON.stringify({ title, body }));

    // Use Web Push simple encryption (aes128gcm)
    const authSecret = b64uDecode(subscription.keys.auth);
    const receiverPublicKeyBytes = b64uDecode(subscription.keys.p256dh);

    // Generate sender EC key pair
    const senderKeyPair = await crypto.subtle.generateKey(
      { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey', 'deriveBits']
    );
    const senderPublicKeyRaw = await crypto.subtle.exportKey('raw', senderKeyPair.publicKey);

    const receiverPublicKey = await crypto.subtle.importKey(
      'raw', receiverPublicKeyBytes, { name: 'ECDH', namedCurve: 'P-256' }, true, []
    );

    const sharedSecret = await crypto.subtle.deriveBits(
      { name: 'ECDH', public: receiverPublicKey }, senderKeyPair.privateKey, 256
    );

    // Salt
    const salt = crypto.getRandomValues(new Uint8Array(16));

    // HKDF for content encryption key and nonce
    const hkdfKey = await crypto.subtle.importKey('raw', sharedSecret, 'HKDF', false, ['deriveBits']);

    // PRK
    const authInfo = encoder.encode('Content-Encoding: auth\0');
    const prkBits = await crypto.subtle.deriveBits(
      { name: 'HKDF', hash: 'SHA-256', salt: authSecret, info: authInfo }, hkdfKey, 256
    );
    const prk = await crypto.subtle.importKey('raw', prkBits, 'HKDF', false, ['deriveBits']);

    const senderPubArr = new Uint8Array(senderPublicKeyRaw);
    const context = new Uint8Array([
      ...encoder.encode('P-256\0'),
      0, 65, ...receiverPublicKeyBytes,
      0, 65, ...senderPubArr
    ]);

    const cekInfo = new Uint8Array([...encoder.encode('Content-Encoding: aesgcm\0'), ...context]);
    const nonceInfo = new Uint8Array([...encoder.encode('Content-Encoding: nonce\0'), ...context]);

    const cekBits = await crypto.subtle.deriveBits({ name:'HKDF', hash:'SHA-256', salt, info:cekInfo }, prk, 128);
    const nonceBits = await crypto.subtle.deriveBits({ name:'HKDF', hash:'SHA-256', salt, info:nonceInfo }, prk, 96);

    const cek = await crypto.subtle.importKey('raw', cekBits, 'AES-GCM', false, ['encrypt']);
    const paddedPayload = new Uint8Array([0, 0, ...payloadBytes]);
    const encrypted = await crypto.subtle.encrypt({ name:'AES-GCM', iv: nonceBits }, cek, paddedPayload);

    const encryptedArr = new Uint8Array(encrypted);

    const resp = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `vapid t=${jwt},k=${PUBLIC_KEY}`,
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aesgcm',
        'Encryption': `salt=${b64uEncode(salt)}`,
        'Crypto-Key': `dh=${b64uEncode(senderPublicKeyRaw)};p256ecdsa=${PUBLIC_KEY}`,
        'TTL': '86400',
      },
      body: encryptedArr,
    });

    return new Response(JSON.stringify({ ok: resp.ok, status: resp.status }), {
      headers: { ...CORS, 'Content-Type': 'application/json' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' }
    });
  }
});
