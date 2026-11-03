import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/server.js';

describe('apps/api integration tests', () => {
  it('responds with 200 on /health', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('headroom-api');
  });

  it('rejects unauthenticated requests to protected endpoints', async () => {
    const res = await request(app).get('/api/accounts');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Access token required');
  });

  it('rejects login with invalid email format', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'not-an-email',
      password: '123',
    });
    expect(res.status).toBe(400);
  });
});
