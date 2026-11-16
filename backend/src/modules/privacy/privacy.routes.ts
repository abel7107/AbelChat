import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { requireAuth, AuthRequest } from '../../middleware/auth';

const router = Router();

router.get('/settings', requireAuth, async (req: AuthRequest, res) => {
  const s = await prisma.userPrivacySettings.findUnique({ where: { userId: req.userId! } });
  res.json(s);
});

router.put('/settings', requireAuth, async (req: AuthRequest, res) => {
  const data = req.body || {};
  const s = await prisma.userPrivacySettings.upsert({
    where: { userId: req.userId! },
    update: data,
    create: { userId: req.userId!, ...data },
  });
  res.json(s);
});

router.post('/block', requireAuth, async (req: AuthRequest, res) => {
  const { userId } = req.body || {};
  const b = await prisma.blockedUser.create({ data: { blockerId: req.userId!, blockedId: userId } });
  res.status(201).json(b);
});

router.post('/unblock', requireAuth, async (req: AuthRequest, res) => {
  const { userId } = req.body || {};
  await prisma.blockedUser.deleteMany({ where: { blockerId: req.userId!, blockedId: userId } });
  res.json({ ok: true });
});

router.post('/report', requireAuth, async (req: AuthRequest, res) => {
  const { userId, reason, details } = req.body || {};
  const r = await prisma.userReport.create({ data: { reporterId: req.userId!, reportedId: userId, reason, details } });
  res.status(201).json(r);
});

export default router;
