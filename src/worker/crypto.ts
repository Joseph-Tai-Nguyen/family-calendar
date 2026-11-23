/** Web Crypto helpers (available natively in Workers). */

export function b64urlEncode(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function b64urlDecode(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function randomToken(bytes = 32): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return b64urlEncode(buf);
}

const keyCache = new Map<string, Promise<CryptoKey>>();

function importKey(base64Key: string): Promise<CryptoKey> {
  let k = keyCache.get(base64Key);
  if (!k) {
    const raw = Uint8Array.from(atob(base64Key), (c) => c.charCodeAt(0));
    if (raw.length !== 32) throw new Error('TOKEN_ENCRYPTION_KEY must be 32 bytes (base64)');
    k = crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
    keyCache.set(base64Key, k);
  }
  return k;
}

export async function encrypt(plain: string, base64Key: string): Promise<string> {
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await importKey(base64Key), new TextEncoder().encode(plain));
  return `${b64urlEncode(iv)}.${b64urlEncode(new Uint8Array(ct))}`;
}

export async function decrypt(token: string, base64Key: string): Promise<string> {
  const [iv, ct] = token.split('.');
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64urlDecode(iv) }, await importKey(base64Key), b64urlDecode(ct));
  return new TextDecoder().decode(pt);
}

export async function sha256(s: string): Promise<string> {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return b64urlEncode(new Uint8Array(d));
}
