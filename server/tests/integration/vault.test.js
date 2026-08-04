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

const fakePromptPayload = (overrides = {}) => ({
  title: 'Test Prompt',
  encryptedPromptText: 'ZmFrZS1jaXBoZXJ0ZXh0', // arbitrary base64-looking string - vault doesn't decrypt on the server for CRUD
  iv: 'ZmFrZS1pdg==',
  salt: 'ZmFrZS1zYWx0',
  tags: ['test'],
  ...overrides,
});

describe('POST /api/vault/prompts', () => {
  it('requires authentication', async () => {
    const res = await request(app).post('/api/vault/prompts').send(fakePromptPayload());
    expect(res.status).toBe(401);
  });

  it('creates a prompt for the logged-in user/team', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/register').send({
      email: 'creator@example.com',
      password: 'password123',
      teamName: 'Creator Team',
    });

    const res = await agent.post('/api/vault/prompts').send(fakePromptPayload());

    expect(res.status).toBe(201);
    expect(res.body.prompt.title).toBe('Test Prompt');
    expect(res.body.prompt.version).toBe(1);
  });
});

describe('GET /api/vault/prompts - team scoping', () => {
  it('only returns prompts belonging to the requester\'s own team', async () => {
    const teamAAgent = request.agent(app);
    await teamAAgent.post('/api/auth/register').send({
      email: 'teamA@example.com',
      password: 'password123',
      teamName: 'Team A',
    });
    await teamAAgent.post('/api/vault/prompts').send(fakePromptPayload({ title: 'Team A Prompt' }));

    const teamBAgent = request.agent(app);
    await teamBAgent.post('/api/auth/register').send({
      email: 'teamB@example.com',
      password: 'password123',
      teamName: 'Team B',
    });

    const res = await teamBAgent.get('/api/vault/prompts');

    expect(res.status).toBe(200);
    expect(res.body.prompts).toHaveLength(0); // Team B can't see Team A's prompt
  });
});

describe('PUT /api/vault/prompts/:id - versioning', () => {
  it('creates a new version instead of overwriting the original', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/register').send({
      email: 'versioner@example.com',
      password: 'password123',
      teamName: 'Version Team',
    });

    const created = await agent.post('/api/vault/prompts').send(fakePromptPayload());
    const originalId = created.body.prompt._id;

    const updated = await agent
      .put(`/api/vault/prompts/${originalId}`)
      .send(fakePromptPayload({ title: 'Updated Title' }));

    expect(updated.status).toBe(200);
    expect(updated.body.prompt._id).not.toBe(originalId); // new document, not an overwrite
    expect(updated.body.prompt.version).toBe(2);
    expect(updated.body.prompt.parentVersion).toBe(originalId);

    // The original document should still exist, untouched
    const original = await agent.get(`/api/vault/prompts/${originalId}`);
    expect(original.body.prompt.title).toBe('Test Prompt');
  });
});

describe('DELETE /api/vault/prompts/:id - permissions', () => {
  it('allows the admin who owns the team to delete any prompt', async () => {
    const adminAgent = request.agent(app);
    const adminReg = await adminAgent.post('/api/auth/register').send({
      email: 'owner-admin@example.com',
      password: 'password123',
      teamName: 'Owner Team',
    });
    const inviteCode = adminReg.body.teamInviteCode;

    const memberAgent = request.agent(app);
    await memberAgent.post('/api/auth/register').send({
      email: 'plain-member@example.com',
      password: 'password123',
      inviteCode,
    });

    // Member creates a prompt
    const created = await memberAgent.post('/api/vault/prompts').send(fakePromptPayload());
    const promptId = created.body.prompt._id;

    // A DIFFERENT non-owner, non-admin member should NOT be able to delete it
    const otherMemberAgent = request.agent(app);
    await otherMemberAgent.post('/api/auth/register').send({
      email: 'other-member@example.com',
      password: 'password123',
      inviteCode,
    });
    const deniedRes = await otherMemberAgent.delete(`/api/vault/prompts/${promptId}`);
    expect(deniedRes.status).toBe(403);

    // But the team admin CAN delete it, even though they didn't create it
    const allowedRes = await adminAgent.delete(`/api/vault/prompts/${promptId}`);
    expect(allowedRes.status).toBe(200);
  });
});
