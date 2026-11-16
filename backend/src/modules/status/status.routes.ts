import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { requireAuth, AuthRequest } from '../../middleware/auth';

const router = Router();

router.post('/', requireAuth, async (req: AuthRequest, res) => {
  const { type, content, mediaId, audience } = req.body || {};
  const status = await prisma.status.create({
    data: { userId: req.userId!, type: type || 'TEXT', content: content || null, mediaId: mediaId || null, audience: audience || 'CONTACTS', expiresAt: new Date(Date.now() + 24 * 3600 * 1000) },
  });
  res.status(201).json(status);
});

router.get('/feed', requireAuth, async (req: AuthRequest, res) => {
  const statuses = await prisma.status.findMany({
    where: { expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
    include: { views: true },
  });
  res.json(statuses);
});

router.post('/:id/view', requireAuth, async (req: AuthRequest, res) => {
  await prisma.statusView.upsert({
    where: { statusId_viewerId: { statusId: String(req.params.id), viewerId: req.userId! } },
    update: {},
    create: { statusId: String(req.params.id), viewerId: req.userId! },
  });
  res.json({ ok: true });
});

router.delete('/:id', requireAuth, async (req: AuthRequest, res) => {
  const st = await prisma.status.findUnique({ where: { id: String(req.params.id) } });
  if (!st || st.userId !== req.userId!) return res.status(403).json({ error: 'forbidden' });
  await prisma.status.delete({ where: { id: st.id } });
  res.json({ ok: true });
});

router.get('/:id/views', requireAuth, async (req: AuthRequest, res) => {
  const views = await prisma.statusView.findMany({ where: { statusId: String(req.params.id) } });
  res.json(views);
});

export default router;
