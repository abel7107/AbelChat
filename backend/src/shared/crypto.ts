import crypto from 'crypto';
import bcrypt from 'bcrypt';

export function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

export function hashToken(t: string) {
  return crypto.createHash('sha256').update(t).digest('hex');
}

export async function hashPassword(p: string) {
  return bcrypt.hash(p, 10);
}

export async function verifyPassword(p: string, h: string) {
  return bcrypt.compare(p, h);
}

export function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}
