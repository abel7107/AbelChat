import * as webpush from 'web-push';
import { prisma } from './prisma';

let publicKey = process.env.VAPID_PUBLIC_KEY;
let privateKey = process.env.VAPID_PRIVATE_KEY;

if (!publicKey || !privateKey) {
  const keys = webpush.generateVAPIDKeys();
  publicKey = keys.publicKey;
  privateKey = keys.privateKey;
  console.log('VAPID_PUBLIC_KEY=' + publicKey);
  console.log('VAPID_PRIVATE_KEY=' + privateKey);
}

webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:admin@abelchat.local', publicKey!, privateKey!);

export const vapidPublicKey = publicKey!;

export async function sendPushToUser(userId: string, payload: { title: string; body: string }) {
  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  for (const sub of subs) {
    try {
      await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify(payload));
    } catch (e) {
      console.error('push failed', e);
    }
  }
}
