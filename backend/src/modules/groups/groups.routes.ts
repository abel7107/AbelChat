import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { requireAuth, AuthRequest } from '../../middleware/auth';

const router = Router();

// Group creation handled via conversations type GROUP; this module adds group-specific operations.

router.get('/:id/members', requireAuth, async (req: AuthRequest, res) => {
  const members = await prisma.conversationMember.findMany({ where: { conversationId: String(req.params.id) } });
  res.json(members);
});

router.post('/:id/admins', requireAuth, async (req: AuthRequest, res) => {
  const { userId } = req.body || {};
  const m = await prisma.conversationMember.updateMany({ where: { conversationId: String(req.params.id), userId }, data: { role: 'ADMIN' } });
  res.json(m);
});

router.delete('/:id/members/:userId', requireAuth, async (req: AuthRequest, res) => {
  await prisma.conversationMember.deleteMany({ where: { conversationId: String(req.params.id), userId: String(req.params.userId) } });
  res.json({ ok: true });
});

router.post('/:id/leave', requireAuth, async (req: AuthRequest, res) => {
  await prisma.conversationMember.deleteMany({ where: { conversationId: String(req.params.id), userId: req.userId! } });
  res.json({ ok: true });
});

router.delete('/:id', requireAuth, async (req: AuthRequest, res) => {
  const conv = await prisma.conversation.findUnique({ where: { id: String(req.params.id) } });
  if (!conv || conv.ownerId !== req.userId!) return res.status(403).json({ error: 'forbidden' });
  await prisma.conversation.delete({ where: { id: conv.id } });
  res.json({ ok: true });
});

router.put('/:id', requireAuth, async (req: AuthRequest, res) => {
  const { name } = req.body || {};
  const conv = await prisma.conversation.findUnique({ where: { id: String(req.params.id) } });
  if (!conv || conv.ownerId !== req.userId!) return res.status(403).json({ error: 'forbidden' });
  const updated = await prisma.conversation.update({ where: { id: conv.id }, data: { name } });
  res.json(updated);
});

export default router;
