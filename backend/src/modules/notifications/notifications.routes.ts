import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { requireAuth, AuthRequest } from '../../middleware/auth';

const router = Router();

router.get('/', requireAuth, async (req: AuthRequest, res) => {
  const list = await prisma.notification.findMany({ where: { userId: req.userId! }, orderBy: { createdAt: 'desc' }, take: 50 });
  res.json(list);
});

router.post('/:id/read', requireAuth, async (req: AuthRequest, res) => {
  await prisma.notification.update({ where: { id: String(req.params.id) }, data: { readAt: new Date() } });
  res.json({ ok: true });
});

router.get('/preferences', requireAuth, async (req: AuthRequest, res) => {
  const p = await prisma.notificationPreference.findUnique({ where: { userId: req.userId! } });
  res.json(p);
});

router.put('/preferences', requireAuth, async (req: AuthRequest, res) => {
  const data = req.body || {};
  const p = await prisma.notificationPreference.upsert({ where: { userId: req.userId! }, update: data, create: { userId: req.userId!, ...data } });
  res.json(p);
});

router.post('/push/subscribe', requireAuth, async (req: AuthRequest, res) => {
  const { endpoint, p256dh, auth } = req.body || {};
  const sub = await prisma.pushSubscription.create({ data: { userId: req.userId!, endpoint, p256dh, auth } });
  res.status(201).json(sub);
});

router.get('/push/subscriptions', requireAuth, async (req: AuthRequest, res) => {
  const subs = await prisma.pushSubscription.findMany({ where: { userId: req.userId! } });
  res.json(subs);
});

export default router;
