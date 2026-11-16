import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { hashPassword, verifyPassword, generateToken, hashToken, generateOtp } from '../../shared/crypto';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { requireAuth, AuthRequest } from '../../middleware/auth';
import { sendPushToUser } from '../../lib/push';
import { generateSecret, verifyTotp } from '../../shared/totp';

const router = Router();

router.post('/register', async (req, res) => {
  const { username, email, phoneNumber, password } = req.body || {};
  if (!username || !email || !phoneNumber || !password) return res.status(400).json({ error: 'missing fields' });
  const exists = await prisma.user.findFirst({
    where: { OR: [{ username }, { email }, { phoneNumber }] },
  });
  if (exists) return res.status(409).json({ error: 'username or contact already registered' });
  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      username, email, phoneNumber, passwordHash,
      profile: { create: { displayName: username, language: 'en', theme: 'light' } },
      privacySettings: { create: {} },
    },
  });
  // email verification token
  const rawEmailToken = generateToken();
  await prisma.verificationToken.create({
    data: { userId: user.id, tokenHash: hashToken(rawEmailToken), tokenType: 'EMAIL_VERIFICATION', expiresAt: new Date(Date.now() + 24 * 3600 * 1000) },
  });
  // phone otp
  const otp = generateOtp();
  await prisma.otpCode.create({
    data: { userId: user.id, phoneNumber, codeHash: hashToken(otp), purpose: 'PHONE_VERIFICATION', expiresAt: new Date(Date.now() + 10 * 60 * 1000) },
  });
  res.status(201).json({ userId: user.id, emailToken: rawEmailToken, phoneOtp: otp });
});

router.post('/verify-email', async (req, res) => {
  const { token } = req.body || {};
  if (!token) return res.status(400).json({ error: 'missing token' });
  const record = await prisma.verificationToken.findFirst({ where: { tokenHash: hashToken(token), tokenType: 'EMAIL_VERIFICATION' } });
  if (!record || record.usedAt || record.expiresAt < new Date()) return res.status(400).json({ error: 'invalid or expired token' });
  await prisma.verificationToken.update({ where: { id: record.id }, data: { usedAt: new Date() } });
  await prisma.user.update({ where: { id: record.userId }, data: { emailVerifiedAt: new Date() } });
  await tryActivate(record.userId);
  res.json({ ok: true });
});

router.post('/verify-phone', async (req, res) => {
  const { phoneNumber, code } = req.body || {};
  if (!phoneNumber || !code) return res.status(400).json({ error: 'missing fields' });
  const record = await prisma.otpCode.findFirst({ where: { phoneNumber, purpose: 'PHONE_VERIFICATION' }, orderBy: { createdAt: 'desc' } });
  if (!record || record.usedAt || record.expiresAt < new Date()) return res.status(400).json({ error: 'invalid or expired otp' });
  if (record.codeHash !== hashToken(code)) {
    await prisma.otpCode.update({ where: { id: record.id }, data: { attempts: record.attempts + 1 } });
    return res.status(400).json({ error: 'incorrect otp' });
  }
  await prisma.otpCode.update({ where: { id: record.id }, data: { usedAt: new Date() } });
  const user = await prisma.user.findUnique({ where: { phoneNumber } });
  if (user) {
    await prisma.user.update({ where: { id: user.id }, data: { phoneVerifiedAt: new Date() } });
    await tryActivate(user.id);
  }
  res.json({ ok: true });
});

async function tryActivate(userId: string) {
  const u = await prisma.user.findUnique({ where: { id: userId } });
  if (u && u.emailVerifiedAt && u.phoneVerifiedAt && u.accountStatus === 'PENDING') {
    await prisma.user.update({ where: { id: userId }, data: { accountStatus: 'ACTIVE' } });
  }
}

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'missing fields' });
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.accountStatus !== 'ACTIVE') return res.status(401).json({ error: 'invalid credentials' });
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'invalid credentials' });
  if (user.twoFactorEnabled) {
    return res.json({ requires2fa: true, userId: user.id });
  }
  const token = jwt.sign({ sub: user.id }, env.jwtSecret, { expiresIn: '7d' });
  const prior = await prisma.authSession.findFirst({ where: { userId: user.id, userAgent: req.headers['user-agent'] || null } });
  await prisma.authSession.create({ data: { userId: user.id, refreshTokenHash: hashToken(token), ipAddress: req.ip, userAgent: req.headers['user-agent'] || null, expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000) } });
  if (!prior) {
    await prisma.notification.create({ data: { userId: user.id, type: 'SYSTEM', title: 'New device login', body: 'A login from a new device or browser was detected.' } });
    sendPushToUser(user.id, { title: 'New device login', body: 'A login from a new device or browser was detected.' });
  }
  res.json({ token, userId: user.id });
});

router.post('/login-phone', async (req, res) => {
  const { phoneNumber } = req.body || {};
  if (!phoneNumber) return res.status(400).json({ error: 'missing phone' });
  const user = await prisma.user.findUnique({ where: { phoneNumber } });
  if (!user || user.accountStatus !== 'ACTIVE') return res.status(401).json({ error: 'invalid account' });
  const otp = generateOtp();
  await prisma.otpCode.create({
    data: { userId: user.id, phoneNumber, codeHash: hashToken(otp), purpose: 'PHONE_LOGIN', expiresAt: new Date(Date.now() + 10 * 60 * 1000) },
  });
  res.json({ otp });
});

router.post('/login-phone/verify', async (req, res) => {
  const { phoneNumber, code } = req.body || {};
  const record = await prisma.otpCode.findFirst({ where: { phoneNumber, purpose: 'PHONE_LOGIN' }, orderBy: { createdAt: 'desc' } });
  if (!record || record.usedAt || record.expiresAt < new Date()) return res.status(400).json({ error: 'invalid otp' });
  if (record.codeHash !== hashToken(code)) return res.status(400).json({ error: 'incorrect otp' });
  await prisma.otpCode.update({ where: { id: record.id }, data: { usedAt: new Date() } });
  const user = await prisma.user.findUnique({ where: { phoneNumber } });
  if (!user) return res.status(401).json({ error: 'invalid' });
  const token = jwt.sign({ sub: user.id }, env.jwtSecret, { expiresIn: '7d' });
  await prisma.authSession.create({ data: { userId: user.id, refreshTokenHash: hashToken(token), expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000) } });
  res.json({ token, userId: user.id });
});

router.get('/me', requireAuth, async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId! }, include: { profile: true, privacySettings: true } });
  if (!user) return res.status(404).json({ error: 'not found' });
  res.json({ id: user.id, username: user.username, email: user.email, phoneNumber: user.phoneNumber, accountStatus: user.accountStatus, profile: user.profile, privacy: user.privacySettings });
});

router.get('/sessions', requireAuth, async (req: AuthRequest, res) => {
  const sessions = await prisma.authSession.findMany({ where: { userId: req.userId! } });
  res.json(sessions);
});

router.post('/sessions/:id/revoke', requireAuth, async (req: AuthRequest, res) => {
  await prisma.authSession.updateMany({ where: { id: String(req.params.id), userId: req.userId! }, data: { revokedAt: new Date() } });
  res.json({ ok: true });
});

router.post('/2fa/enable', requireAuth, async (req: AuthRequest, res) => {
  const secret = generateSecret();
  await prisma.user.update({ where: { id: req.userId! }, data: { twoFactorSecret: secret, twoFactorEnabled: false } });
  res.json({ secret, otpauth: `otpauth://totp/Abelchat:${req.userId}?secret=${secret}&issuer=Abelchat` });
});

router.post('/2fa/verify', requireAuth, async (req: AuthRequest, res) => {
  const { code } = req.body || {};
  const user = await prisma.user.findUnique({ where: { id: req.userId! } });
  if (!user?.twoFactorSecret) return res.status(400).json({ error: 'no secret' });
  if (!verifyTotp(user.twoFactorSecret, code)) return res.status(400).json({ error: 'invalid code' });
  await prisma.user.update({ where: { id: req.userId! }, data: { twoFactorEnabled: true } });
  res.json({ ok: true });
});

router.post('/2fa/disable', requireAuth, async (req: AuthRequest, res) => {
  const { code } = req.body || {};
  const user = await prisma.user.findUnique({ where: { id: req.userId! } });
  if (!user?.twoFactorSecret || !user.twoFactorEnabled) return res.status(400).json({ error: 'not enabled' });
  if (!verifyTotp(user.twoFactorSecret, code)) return res.status(400).json({ error: 'invalid code' });
  await prisma.user.update({ where: { id: req.userId! }, data: { twoFactorEnabled: false, twoFactorSecret: null } });
  res.json({ ok: true });
});

router.post('/2fa/login-verify', async (req, res) => {
  const { userId, code } = req.body || {};
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) return res.status(400).json({ error: 'invalid' });
  if (!verifyTotp(user.twoFactorSecret, code)) return res.status(400).json({ error: 'invalid code' });
  const token = jwt.sign({ sub: user.id }, env.jwtSecret, { expiresIn: '7d' });
  await prisma.authSession.create({ data: { userId: user.id, refreshTokenHash: hashToken(token), expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000) } });
  res.json({ token, userId: user.id });
});

router.delete('/account', requireAuth, async (req: AuthRequest, res) => {
  await prisma.authSession.updateMany({ where: { userId: req.userId! }, data: { revokedAt: new Date() } });
  await prisma.user.update({ where: { id: req.userId! }, data: { accountStatus: 'DELETED', deletedAt: new Date() } });
  res.json({ ok: true });
});

router.post('/backup-codes', requireAuth, async (req: AuthRequest, res) => {
  const { generateToken, hashToken } = await import('../../shared/crypto');
  const codes: string[] = [];
  await prisma.backupCode.deleteMany({ where: { userId: req.userId! } });
  for (let i = 0; i < 10; i++) {
    const c = generateToken().slice(0, 10);
    codes.push(c);
    await prisma.backupCode.create({ data: { userId: req.userId!, codeHash: hashToken(c) } });
  }
  res.json({ codes });
});

router.post('/password-reset/request', async (req, res) => {
  const { email } = req.body || {};
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.json({ ok: true }); // safe
  const raw = (await import('../../shared/crypto')).generateToken();
  await prisma.verificationToken.create({ data: { userId: user.id, tokenHash: (await import('../../shared/crypto')).hashToken(raw), tokenType: 'PASSWORD_RESET', expiresAt: new Date(Date.now() + 60 * 60 * 1000) } });
  res.json({ token: raw });
});

router.post('/password-reset/confirm', async (req, res) => {
  const { token, newPassword } = req.body || {};
  const { hashToken, hashPassword } = await import('../../shared/crypto');
  const record = await prisma.verificationToken.findFirst({ where: { tokenHash: hashToken(token), tokenType: 'PASSWORD_RESET' } });
  if (!record || record.usedAt || record.expiresAt < new Date()) return res.status(400).json({ error: 'invalid or expired token' });
  await prisma.verificationToken.update({ where: { id: record.id }, data: { usedAt: new Date() } });
  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: record.userId }, data: { passwordHash } });
  res.json({ ok: true });
});

router.post('/password-reset/phone/request', async (req, res) => {
  const { phoneNumber } = req.body || {};
  const user = await prisma.user.findUnique({ where: { phoneNumber } });
  if (!user) return res.json({ ok: true });
  const otp = (await import('../../shared/crypto')).generateOtp();
  await prisma.otpCode.create({ data: { userId: user.id, phoneNumber, codeHash: (await import('../../shared/crypto')).hashToken(otp), purpose: 'PASSWORD_RECOVERY', expiresAt: new Date(Date.now() + 10 * 60 * 1000) } });
  res.json({ otp });
});

router.post('/password-reset/phone/confirm', async (req, res) => {
  const { phoneNumber, code, newPassword } = req.body || {};
  const record = await prisma.otpCode.findFirst({ where: { phoneNumber, purpose: 'PASSWORD_RECOVERY' }, orderBy: { createdAt: 'desc' } });
  if (!record || record.usedAt || record.expiresAt < new Date()) return res.status(400).json({ error: 'invalid or expired otp' });
  const { hashToken, hashPassword } = await import('../../shared/crypto');
  if (record.codeHash !== hashToken(code)) return res.status(400).json({ error: 'incorrect otp' });
  await prisma.otpCode.update({ where: { id: record.id }, data: { usedAt: new Date() } });
  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: record.userId! }, data: { passwordHash } });
  res.json({ ok: true });
});

export default router;
