process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_EXPIRES_IN = '1h';

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../../app');

let mongod;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

describe('POST /api/auth/register', () => {
  it('creates a new team and makes the first user its admin', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'admin@example.com',
      password: 'password123',
      teamName: 'Test Team',
    });

    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('admin');
    expect(res.body.teamInviteCode).toBeDefined();
  });

  it('joins an existing team as a member via invite code', async () => {
    const adminRes = await request(app).post('/api/auth/register').send({
      email: 'admin2@example.com',
      password: 'password123',
      teamName: 'Another Team',
    });
    const inviteCode = adminRes.body.teamInviteCode;

    const memberRes = await request(app).post('/api/auth/register').send({
      email: 'member@example.com',
      password: 'password123',
      inviteCode,
    });

    expect(memberRes.status).toBe(201);
    expect(memberRes.body.user.role).toBe('member');
    expect(memberRes.body.user.teamId).toBe(adminRes.body.user.teamId);
  });

  it('rejects a duplicate email', async () => {
    await request(app).post('/api/auth/register').send({
      email: 'dupe@example.com',
      password: 'password123',
      teamName: 'Team A',
    });

    const res = await request(app).post('/api/auth/register').send({
      email: 'dupe@example.com',
      password: 'password123',
      teamName: 'Team B',
    });

    expect(res.status).toBe(409);
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await request(app).post('/api/auth/register').send({
      email: 'login-test@example.com',
      password: 'correct-password',
      teamName: 'Login Test Team',
    });
  });

  it('logs in with correct credentials and sets a session cookie', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'login-test@example.com',
      password: 'correct-password',
    });

    expect(res.status).toBe(200);
    expect(res.headers['set-cookie']).toBeDefined();
    expect(res.headers['set-cookie'][0]).toMatch(/token=/);
  });

  it('rejects an incorrect password without revealing which field was wrong', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'login-test@example.com',
      password: 'wrong-password',
    });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid email or password');
  });
});

describe('GET /api/auth/me', () => {
  it('rejects requests with no session cookie', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns the logged-in user when a valid session cookie is sent', async () => {
    const agent = request.agent(app); // agent persists cookies across requests

    await agent.post('/api/auth/register').send({
      email: 'me-test@example.com',
      password: 'password123',
      teamName: 'Me Test Team',
    });

    const res = await agent.get('/api/auth/me');
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('me-test@example.com');
  });
});
