import { prisma } from '../src/lib/prisma';

async function main() {
  const email = process.argv[2];
  if (!email) { console.error('usage: promote-admin <email>'); process.exit(1); }
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) { console.error('user not found'); process.exit(1); }
  let role = await prisma.adminRole.findFirst({ where: { name: 'PLATFORM_ADMIN' } });
  if (!role) role = await prisma.adminRole.create({ data: { name: 'PLATFORM_ADMIN', description: 'Platform administrator' } });
  await prisma.adminUserRole.upsert({ where: { userId_roleId: { userId: user.id, roleId: role.id } }, update: {}, create: { userId: user.id, roleId: role.id } });
  // grant all permissions? create a few
  console.log('promoted', email);
  await prisma.$disconnect();
}
main();
