import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { prisma } from '../../lib/prisma';
import { requireAuth, AuthRequest } from '../../middleware/auth';

const router = Router();
const upload = multer({ dest: path.join(process.cwd(), 'uploads') });

router.post('/', requireAuth, upload.single('file'), async (req: AuthRequest, res) => {
  if (!req.file) return res.status(400).json({ error: 'no file' });
  const media = await prisma.mediaFile.create({
    data: { uploaderId: req.userId!, storageKey: req.file.filename, mimeType: req.file.mimetype, size: BigInt(req.file.size) },
  });
  res.status(201).json(media);
});

router.get('/:id', async (req, res) => {
  const m = await prisma.mediaFile.findUnique({ where: { id: String(req.params.id) } });
  if (!m) return res.status(404).end();
  res.sendFile(path.join(process.cwd(), 'uploads', m.storageKey));
});

export default router;
