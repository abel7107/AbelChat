import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';

describe('messaging flow', () => {
  const app = createApp();
  const s = Date.now();
  let tokenA = '', tokenB = '', userB = '', convId = '';

  async function register(email: string, phone: string, username: string) {
    const r = await request(app).post('/api/auth/register').send({ username, email, phoneNumber: phone, password: 'Pass123!' });
    await request(app).post('/api/auth/verify-email').send({ token: r.body.emailToken });
    await request(app).post('/api/auth/verify-phone').send({ phoneNumber: phone, code: r.body.phoneOtp });
    const l = await request(app).post('/api/auth/login').send({ email, password: 'Pass123!' });
    return { token: l.body.token, userId: l.body.userId };
  }

  it('sets up two users', async () => {
    const a = await register(`a${s}@t.com`, `+1${s}`, `ua${s}`);
    const b = await register(`b${s}@t.com`, `+2${s}`, `ub${s}`);
    tokenA = a.token; tokenB = b.token; userB = b.userId;
    expect(tokenA).toBeTruthy();
  });

  it('creates conversation and sends message', async () => {
    const c = await request(app).post('/api/conversations').set('Authorization', `Bearer ${tokenA}`).send({ type: 'PRIVATE', memberIds: [userB] });
    expect(c.status).toBe(201);
    convId = c.body.id;
    const m = await request(app).post(`/api/messages/conversation/${convId}`).set('Authorization', `Bearer ${tokenA}`).send({ content: 'hi' });
    expect(m.status).toBe(201);
    const list = await request(app).get(`/api/messages/conversation/${convId}`).set('Authorization', `Bearer ${tokenB}`);
    expect(list.status).toBe(200);
    expect(list.body.length).toBe(1);
  });
});
