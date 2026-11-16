import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { requireAuth, AuthRequest } from '../../middleware/auth';

const router = Router();

router.get('/search', requireAuth, async (req: AuthRequest, res) => {
  const q = String(req.query.q || '');
  const users = await prisma.user.findMany({
    where: { OR: [{ username: { contains: q, mode: 'insensitive' } }, { phoneNumber: q }] },
    select: { id: true, username: true, email: true },
    take: 20,
  });
  res.json(users);
});

router.get('/:id', requireAuth, async (req: AuthRequest, res) => {
  const u = await prisma.user.findUnique({ where: { id: String(req.params.id) }, include: { profile: true } });
  if (!u) return res.status(404).json({ error: 'not found' });
  res.json(u);
});

router.get('/:id/keys', requireAuth, async (req: AuthRequest, res) => {
  const devices = await prisma.userDevice.findMany({ where: { userId: String(req.params.id) }, include: { encryptionKeys: true } });
  const keys = devices.flatMap((d) => d.encryptionKeys.map((k) => ({ deviceId: d.id, publicKey: k.publicKey })));
  res.json(keys);
});

router.put('/me/profile', requireAuth, async (req: AuthRequest, res) => {
  const { displayName, about, language, theme } = req.body || {};
  const profile = await prisma.userProfile.update({ where: { userId: req.userId! }, data: { displayName, about, language, theme } });
  res.json(profile);
});

router.put('/me/username', requireAuth, async (req: AuthRequest, res) => {
  const { username } = req.body || {};
  const exists = await prisma.user.findUnique({ where: { username } });
  if (exists) return res.status(409).json({ error: 'taken' });
  const u = await prisma.user.update({ where: { id: req.userId! }, data: { username } });
  res.json({ username: u.username });
});

router.put('/me/profile-picture', requireAuth, async (req: AuthRequest, res) => {
  const { mediaId } = req.body || {};
  const profile = await prisma.userProfile.update({ where: { userId: req.userId! }, data: { profilePictureId: mediaId || null } });
  res.json(profile);
});

router.post('/me/phone', requireAuth, async (req: AuthRequest, res) => {
  const { phoneNumber } = req.body || {};
  const exists = await prisma.user.findUnique({ where: { phoneNumber } });
  if (exists) return res.status(409).json({ error: 'phone taken' });
  const otp = (await import('../../shared/crypto')).generateOtp();
  await prisma.otpCode.create({ data: { userId: req.userId!, phoneNumber, codeHash: (await import('../../shared/crypto')).hashToken(otp), purpose: 'PHONE_VERIFICATION', expiresAt: new Date(Date.now() + 10 * 60 * 1000) } });
  res.json({ otp });
});

router.post('/me/phone/verify', requireAuth, async (req: AuthRequest, res) => {
  const { phoneNumber, code } = req.body || {};
  const record = await prisma.otpCode.findFirst({ where: { phoneNumber, purpose: 'PHONE_VERIFICATION', userId: req.userId! }, orderBy: { createdAt: 'desc' } });
  if (!record || record.usedAt || record.expiresAt < new Date()) return res.status(400).json({ error: 'invalid otp' });
  const { hashToken } = await import('../../shared/crypto');
  if (record.codeHash !== hashToken(code)) return res.status(400).json({ error: 'incorrect otp' });
  await prisma.otpCode.update({ where: { id: record.id }, data: { usedAt: new Date() } });
  await prisma.user.update({ where: { id: req.userId! }, data: { phoneNumber, phoneVerifiedAt: new Date() } });
  res.json({ ok: true });
});

export default router;

// update profile
