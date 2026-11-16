import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const role = await prisma.adminRole.upsert({
    where: { name: 'PLATFORM_ADMIN' },
    update: {},
    create: { name: 'PLATFORM_ADMIN', description: 'Platform administrator' },
  });
  const passwordHash = await bcrypt.hash('Admin123!', 10);
  const user = await prisma.user.upsert({
    where: { email: 'admin@abelchat.local' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@abelchat.local',
      phoneNumber: '+0000000000',
      passwordHash,
      accountStatus: 'ACTIVE',
      emailVerifiedAt: new Date(),
      phoneVerifiedAt: new Date(),
      profile: { create: { displayName: 'Admin', language: 'en', theme: 'light' } },
      privacySettings: { create: {} },
    },
  });
  await prisma.adminUserRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: role.id } },
    update: {},
    create: { userId: user.id, roleId: role.id },
  });
  console.log('seeded admin: admin@abelchat.local / Admin123!');
}

main().finally(() => prisma.$disconnect());
