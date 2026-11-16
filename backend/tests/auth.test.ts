import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';

describe('auth flow', () => {
  const app = createApp();
  const suffix = Date.now();
  const username = `u${suffix}`;
  const email = `t${suffix}@test.com`;
  const phone = `+9${suffix}`;
  let emailToken = '';
  let phoneOtp = '';

  it('registers', async () => {
    const res = await request(app).post('/api/auth/register').send({ username, email, phoneNumber: phone, password: 'Pass123!' });
    expect(res.status).toBe(201);
    emailToken = res.body.emailToken;
    phoneOtp = res.body.phoneOtp;
  });

  it('verifies email', async () => {
    const res = await request(app).post('/api/auth/verify-email').send({ token: emailToken });
    expect(res.status).toBe(200);
  });

  it('verifies phone', async () => {
    const res = await request(app).post('/api/auth/verify-phone').send({ phoneNumber: phone, code: phoneOtp });
    expect(res.status).toBe(200);
  });

  it('logs in', async () => {
    const res = await request(app).post('/api/auth/login').send({ email, password: 'Pass123!' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
  });
});
