import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { requireAuth, AuthRequest } from '../../middleware/auth';

const router = Router();

router.get('/', requireAuth, async (req: AuthRequest, res) => {
  const memberships = await prisma.conversationMember.findMany({
    where: { userId: req.userId! },
    include: { conversation: true },
  });
  res.json(memberships.map((m: any) => m.conversation));
});

router.post('/', requireAuth, async (req: AuthRequest, res) => {
  const { type, name, memberIds } = req.body || {};
  const conv = await prisma.conversation.create({
    data: {
      type: type || 'PRIVATE',
      name: name || null,
      ownerId: type === 'GROUP' ? req.userId! : null,
    },
  });
  await prisma.conversationMember.create({ data: { conversationId: conv.id, userId: req.userId!, role: type === 'GROUP' ? 'OWNER' : 'MEMBER' } });
  for (const id of memberIds || []) {
    await prisma.conversationMember.create({ data: { conversationId: conv.id, userId: id, role: 'MEMBER' } });
  }
  res.status(201).json(conv);
});

router.get('/:id', requireAuth, async (req: AuthRequest, res) => {
  const conv = await prisma.conversation.findUnique({ where: { id: String(req.params.id) }, include: { members: true } });
  if (!conv) return res.status(404).json({ error: 'not found' });
  const isMember = conv.members.some((m) => m.userId === req.userId!);
  if (!isMember) return res.status(403).json({ error: 'forbidden' });
  res.json(conv);
});

router.post('/:id/members', requireAuth, async (req: AuthRequest, res) => {
  const { userId } = req.body || {};
  const m = await prisma.conversationMember.create({ data: { conversationId: String(req.params.id), userId, role: 'MEMBER' } });
  res.status(201).json(m);
});

export default router;
