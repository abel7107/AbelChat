import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { requireAuth, AuthRequest } from '../../middleware/auth';

const router = Router();

async function isAdmin(userId: string) {
  const r = await prisma.adminUserRole.findFirst({ where: { userId } });
  return !!r;
}

router.get('/users', requireAuth, async (req: AuthRequest, res) => {
  if (!(await isAdmin(req.userId!))) return res.status(403).json({ error: 'forbidden' });
  const users = await prisma.user.findMany({ select: { id: true, username: true, email: true, accountStatus: true, createdAt: true } });
  res.json(users);
});

router.post('/users/:id/suspend', requireAuth, async (req: AuthRequest, res) => {
  if (!(await isAdmin(req.userId!))) return res.status(403).json({ error: 'forbidden' });
  await prisma.user.update({ where: { id: String(req.params.id) }, data: { accountStatus: 'SUSPENDED' } });
  await prisma.adminAuditLog.create({ data: { actorId: req.userId!, action: 'SUSPEND_USER', target: String(req.params.id) } });
  res.json({ ok: true });
});

router.post('/users/:id/ban', requireAuth, async (req: AuthRequest, res) => {
  if (!(await isAdmin(req.userId!))) return res.status(403).json({ error: 'forbidden' });
  await prisma.user.update({ where: { id: String(req.params.id) }, data: { accountStatus: 'BANNED' } });
  await prisma.adminAuditLog.create({ data: { actorId: req.userId!, action: 'BAN_USER', target: String(req.params.id) } });
  res.json({ ok: true });
});

router.get('/reports', requireAuth, async (req: AuthRequest, res) => {
  if (!(await isAdmin(req.userId!))) return res.status(403).json({ error: 'forbidden' });
  const reports = await prisma.userReport.findMany({ orderBy: { createdAt: 'desc' } });
  res.json(reports);
});

router.get('/stats', requireAuth, async (req: AuthRequest, res) => {
  if (!(await isAdmin(req.userId!))) return res.status(403).json({ error: 'forbidden' });
  const users = await prisma.user.count();
  const messages = await prisma.message.count();
  const conversations = await prisma.conversation.count();
  res.json({ users, messages, conversations });
});

router.get('/audit', requireAuth, async (req: AuthRequest, res) => {
  if (!(await isAdmin(req.userId!))) return res.status(403).json({ error: 'forbidden' });
  const logs = await prisma.adminAuditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 100 });
  res.json(logs);
});

export default router;
