import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { requireAuth, AuthRequest } from '../../middleware/auth';

const router = Router();

router.post('/', requireAuth, async (req: AuthRequest, res) => {
  const { deviceName } = req.body || {};
  const d = await prisma.userDevice.create({ data: { userId: req.userId!, deviceName: deviceName || null } });
  res.status(201).json(d);
});

router.get('/', requireAuth, async (req: AuthRequest, res) => {
  const list = await prisma.userDevice.findMany({ where: { userId: req.userId! } });
  res.json(list);
});

router.post('/:id/keys', requireAuth, async (req: AuthRequest, res) => {
  const { publicKey } = req.body || {};
  const k = await prisma.deviceEncryptionKey.create({ data: { deviceId: String(req.params.id), publicKey } });
  res.status(201).json(k);
});

export default router;
