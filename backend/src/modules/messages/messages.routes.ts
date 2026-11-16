import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { requireAuth, AuthRequest } from '../../middleware/auth';
import { sendPushToUser } from '../../lib/push';

const router = Router();

router.get('/conversation/:id', requireAuth, async (req: AuthRequest, res) => {
  const msgs = await prisma.message.findMany({
    where: { conversationId:  String(req.params.id) },
    orderBy: { createdAt: 'asc' },
    include: { reactions: true },
  });
  res.json(msgs);
});

router.post('/conversation/:id', requireAuth, async (req: AuthRequest, res) => {
  const { content, type, replyToId } = req.body || {};
  const msg = await prisma.message.create({
    data: { conversationId:  String(req.params.id), senderId: req.userId!, content: content || null, type: type || 'TEXT', replyToId: replyToId || null },
  });
  res.status(201).json(msg);
});

router.patch('/:id', requireAuth, async (req: AuthRequest, res) => {
  const { content } = req.body || {};
  const msg = await prisma.message.findUnique({ where: { id:  String(req.params.id) } });
  if (!msg || msg.senderId !== req.userId!) return res.status(403).json({ error: 'forbidden' });
  const rev = await prisma.messageRevision.create({ data: { messageId: msg.id, editorId: req.userId!, content: msg.content || '' } });
  const updated = await prisma.message.update({ where: { id: msg.id }, data: { content, updatedAt: new Date() } });
  res.json(updated);
});

router.delete('/:id', requireAuth, async (req: AuthRequest, res) => {
  const scope = req.query.scope || 'self';
  const msg = await prisma.message.findUnique({ where: { id:  String(req.params.id) } });
  if (!msg) return res.status(404).json({ error: 'not found' });
  if (scope === 'all') {
    if (msg.senderId !== req.userId!) return res.status(403).json({ error: 'forbidden' });
    await prisma.message.update({ where: { id: msg.id }, data: { deletedForEveryone: true, content: null } });
  } else {
    await prisma.messageUserState.upsert({
      where: { messageId_userId: { messageId: msg.id, userId: req.userId! } },
      update: { deleted: true },
      create: { messageId: msg.id, userId: req.userId!, deleted: true },
    });
  }
  res.json({ ok: true });
});

router.post('/:id/reactions', requireAuth, async (req: AuthRequest, res) => {
  const { emoji } = req.body || {};
  const r = await prisma.messageReaction.create({ data: { messageId:  String(req.params.id), userId: req.userId!, emoji } });
  res.status(201).json(r);
});

router.delete('/:id/reactions', requireAuth, async (req: AuthRequest, res) => {
  const { emoji } = req.body || {};
  await prisma.messageReaction.deleteMany({ where: { messageId:  String(req.params.id), userId: req.userId!, emoji } });
  res.json({ ok: true });
});

router.post('/:id/read', requireAuth, async (req: AuthRequest, res) => {
  await prisma.messageUserState.upsert({
    where: { messageId_userId: { messageId: String(req.params.id), userId: req.userId! } },
    update: { readAt: new Date() },
    create: { messageId: String(req.params.id), userId: req.userId!, readAt: new Date() },
  });
  res.json({ ok: true });
});

router.post('/:id/deliver', requireAuth, async (req: AuthRequest, res) => {
  await prisma.messageUserState.upsert({
    where: { messageId_userId: { messageId: String(req.params.id), userId: req.userId! } },
    update: { deliveredAt: new Date() },
    create: { messageId: String(req.params.id), userId: req.userId!, deliveredAt: new Date() },
  });
  res.json({ ok: true });
});

router.post('/:id/pin', requireAuth, async (req: AuthRequest, res) => {
  const msg = await prisma.message.findUnique({ where: { id: String(req.params.id) } });
  if (!msg) return res.status(404).json({ error: 'not found' });
  const updated = await prisma.message.update({ where: { id: msg.id }, data: { pinned: !msg.pinned } });
  res.json(updated);
});

router.post('/:id/star', requireAuth, async (req: AuthRequest, res) => {
  const msg = await prisma.message.findUnique({ where: { id: String(req.params.id) } });
  if (!msg) return res.status(404).json({ error: 'not found' });
  const updated = await prisma.message.update({ where: { id: msg.id }, data: { starred: !msg.starred } });
  res.json(updated);
});

router.post('/:id/forward', requireAuth, async (req: AuthRequest, res) => {
  const { conversationId } = req.body || {};
  const msg = await prisma.message.findUnique({ where: { id: String(req.params.id) } });
  if (!msg) return res.status(404).json({ error: 'not found' });
  const created = await prisma.message.create({
    data: { conversationId, senderId: req.userId!, content: msg.content, type: msg.type, forwardedFromId: msg.id },
  });
  res.status(201).json(created);
});

export default router;
