import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { requireAuth, AuthRequest } from '../../middleware/auth';

const router = Router();

router.post('/', requireAuth, async (req: AuthRequest, res) => {
  const { conversationId, type } = req.body || {};
  const call = await prisma.call.create({ data: { conversationId: conversationId || null, type: type || 'VOICE', status: 'INITIATED' } });
  await prisma.callParticipant.create({ data: { callId: call.id, userId: req.userId! } });
  res.status(201).json(call);
});

router.post('/:id/join', requireAuth, async (req: AuthRequest, res) => {
  const p = await prisma.callParticipant.create({ data: { callId: String(req.params.id), userId: req.userId!, joinedAt: new Date() } });
  res.status(201).json(p);
});

router.post('/:id/leave', requireAuth, async (req: AuthRequest, res) => {
  await prisma.callParticipant.updateMany({ where: { callId: String(req.params.id), userId: req.userId! }, data: { leftAt: new Date() } });
  res.json({ ok: true });
});

router.post('/:id/end', requireAuth, async (req: AuthRequest, res) => {
  await prisma.call.update({ where: { id: String(req.params.id) }, data: { status: 'ENDED', endedAt: new Date() } });
  res.json({ ok: true });
});

router.get('/:id', requireAuth, async (req: AuthRequest, res) => {
  const c = await prisma.call.findUnique({ where: { id: String(req.params.id) }, include: { participants: true } });
  res.json(c);
});

export default router;
