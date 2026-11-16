import http from 'http';
import { createApp } from './app';
import { Server } from 'socket.io';
import { env } from './config/env';
import jwt from 'jsonwebtoken';

const app = createApp();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: true, credentials: true } });

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('unauthorized'));
  try {
    const payload = jwt.verify(token, env.jwtSecret) as { sub: string };
    (socket as any).userId = payload.sub;
    next();
  } catch {
    next(new Error('invalid token'));
  }
});

io.on('connection', (socket) => {
  socket.on('join', (conversationId: string) => {
    socket.join(`conv:${conversationId}`);
  });
  socket.on('message', (payload: any) => {
    io.to(`conv:${payload.conversationId}`).emit('message', payload);
  });
  socket.on('typing', (payload: any) => {
    socket.to(`conv:${payload.conversationId}`).emit('typing', { userId: (socket as any).userId, ...payload });
  });
  socket.on('signal', (payload: any) => {
    io.to(`user:${payload.to}`).emit('signal', { from: (socket as any).userId, ...payload });
  });
  socket.on('join-user', () => {
    socket.join(`user:${(socket as any).userId}`);
  });
});

setInterval(async () => {
  try {
    const { prisma } = await import('./lib/prisma');
    await prisma.message.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  } catch {}
}, 60 * 1000);

server.listen(env.port, () => {
  console.log(`server listening on ${env.port}`);
});
