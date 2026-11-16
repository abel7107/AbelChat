import crypto from 'crypto';

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function generateSecret() {
  const buf = crypto.randomBytes(20);
  let bits = '';
  for (const b of buf) bits += b.toString(2).padStart(8, '0');
  let out = '';
  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.slice(i, i + 5).padEnd(5, '0');
    out += BASE32[parseInt(chunk, 2)];
  }
  return out;
}

function base32Decode(s: string) {
  s = s.replace(/=+$/, '').toUpperCase();
  let bits = '';
  for (const c of s) {
    const v = BASE32.indexOf(c);
    if (v < 0) continue;
    bits += v.toString(2).padStart(5, '0');
  }
  const bytes = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2);
  return Buffer.from(bytes);
}

export function totpCode(secret: string, time = Date.now()) {
  const counter = Math.floor(time / 1000 / 30);
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(BigInt(counter));
  const hmac = crypto.createHmac('sha1', base32Decode(secret)).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = ((hmac[offset] & 0x7f) << 24 | (hmac[offset + 1] & 0xff) << 16 | (hmac[offset + 2] & 0xff) << 8 | (hmac[offset + 3] & 0xff)) % 1000000;
  return code.toString().padStart(6, '0');
}

export function verifyTotp(secret: string, code: string) {
  const now = Date.now();
  for (const w of [-1, 0, 1]) {
    if (totpCode(secret, now + w * 30000) === code) return true;
  }
  return false;
}
