const b64 = (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export async function generateKeyPair() {
  const kp = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey']);
  const pub = await crypto.subtle.exportKey('spki', kp.publicKey);
  const priv = await crypto.subtle.exportKey('jwk', kp.privateKey);
  localStorage.setItem('privkey', JSON.stringify(priv));
  return { publicKey: b64(pub), privateKey: kp.privateKey };
}

export async function loadPrivateKey() {
  const raw = localStorage.getItem('privkey');
  if (!raw) return null;
  return crypto.subtle.importKey('jwk', JSON.parse(raw), { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey']);
}

export async function importPublicKey(b64key: string) {
  return crypto.subtle.importKey('spki', fromB64(b64key), { name: 'ECDH', namedCurve: 'P-256' }, true, []);
}

export async function deriveKey(priv: CryptoKey, pub: CryptoKey) {
  return crypto.subtle.deriveKey({ name: 'ECDH', public: pub }, priv, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

export async function encryptText(text: string, key: CryptoKey) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(text));
  return b64(iv.buffer) + ':' + b64(ct);
}

export async function decryptText(payload: string, key: CryptoKey) {
  const [ivB64, ctB64] = payload.split(':');
  const iv = fromB64(ivB64);
  const ct = fromB64(ctB64);
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
  return new TextDecoder().decode(pt);
}
