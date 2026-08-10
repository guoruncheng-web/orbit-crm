/**
 * The tenant boundary is the one property of this API that must not regress:
 * a signed-in user may never observe or mutate another organization's rows.
 *
 * Two workspaces are registered per run with unique emails, so the suite is safe
 * to run repeatedly against a shared development database.
 */
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createApp } from '../src/bootstrap';
import { PrismaService } from '../src/prisma/prisma.service';

type Workspace = { token: string; organizationId: string; email: string };

describe('Tenant isolation (e2e)', () => {
  let app: INestApplication;
  let http: string;
  let acme: Workspace;
  let globex: Workspace;
  let acmeCustomerId: string;

  beforeAll(async () => {
    app = await createApp();
    await app.listen(0);
    http = await app.getUrl();

    acme = await register('acme');
    globex = await register('globex');

    const created = await request(http)
      .post('/api/customers')
      .set('Authorization', `Bearer ${acme.token}`)
      .send({ name: 'Olivia Martin', company: 'Northstar', email: 'olivia@northstar.example', status: 'ACTIVE', value: 18400 })
      .expect(201);

    acmeCustomerId = created.body.id;
  });

  afterAll(async () => {
    const prisma = app.get(PrismaService);
    await prisma.organization.deleteMany({
      where: { id: { in: [acme.organizationId, globex.organizationId] } },
    });
    await app.close();
  });

  async function register(prefix: string): Promise<Workspace> {
    const email = `${prefix}-${process.pid}-${Date.now()}@example.test`;

    const response = await request(http)
      .post('/api/auth/register')
      .send({ name: 'Owner', organizationName: prefix, email, password: 'password123' })
      .expect(201);

    return {
      token: response.body.accessToken,
      organizationId: response.body.user.organizationId,
      email,
    };
  }

  it('rejects requests without a bearer token', async () => {
    await request(http).get('/api/customers').expect(401);
  });

  it('does not leak another organization’s customers into the list', async () => {
    const response = await request(http)
      .get('/api/customers')
      .set('Authorization', `Bearer ${globex.token}`)
      .expect(200);

    expect(response.body.content).toHaveLength(0);
    expect(response.body.totalElements).toBe(0);
  });

  it('returns the owning organization’s own customers', async () => {
    const response = await request(http)
      .get('/api/customers')
      .set('Authorization', `Bearer ${acme.token}`)
      .expect(200);

    expect(response.body.content.map((row: { id: string }) => row.id)).toContain(acmeCustomerId);
  });

  it('refuses a cross-tenant update', async () => {
    await request(http)
      .patch(`/api/customers/${acmeCustomerId}`)
      .set('Authorization', `Bearer ${globex.token}`)
      .send({ status: 'AT_RISK', name: 'Renamed by a stranger' })
      .expect(404);

    const untouched = await app.get(PrismaService).customer.findUniqueOrThrow({
      where: { id: acmeCustomerId },
    });

    expect(untouched.name).toBe('Olivia Martin');
    expect(untouched.status).toBe('ACTIVE');
  });

  it('updates only the fields it was given', async () => {
    const before = await app.get(PrismaService).customer.findUniqueOrThrow({
      where: { id: acmeCustomerId },
    });

    const response = await request(http)
      .patch(`/api/customers/${acmeCustomerId}`)
      .set('Authorization', `Bearer ${acme.token}`)
      .send({ company: 'Northstar Laboratories' })
      .expect(200);

    expect(response.body.company).toBe('Northstar Laboratories');
    expect(response.body.name).toBe(before.name);
    expect(response.body.value).toBe(Number(before.value));
    // Renaming a company is not a contact event, so the date must not move.
    expect(response.body.lastContact).toBe(before.lastContact.toISOString().slice(0, 10));
  });

  it('rejects an update that carries no fields', async () => {
    await request(http)
      .patch(`/api/customers/${acmeCustomerId}`)
      .set('Authorization', `Bearer ${acme.token}`)
      .send({})
      .expect(400);
  });

  it('locks an account after repeated failed sign-ins', async () => {
    const email = `locked-${process.pid}-${Date.now()}@example.test`;

    const created = await request(http)
      .post('/api/auth/register')
      .send({ name: 'Owner', organizationName: 'lockme', email, password: 'password123' })
      .expect(201);

    // Five failures are allowed; the sixth starts the backoff.
    for (let attempt = 0; attempt < 6; attempt += 1) {
      await request(http).post('/api/auth/login').send({ email, password: 'wrong-password' }).expect(401);
    }

    // The correct password is now refused too — that is the point of a lockout.
    const locked = await request(http)
      .post('/api/auth/login')
      .send({ email, password: 'password123' })
      .expect(401);

    expect(locked.body.message).toMatch(/too many failed attempts/i);

    await app.get(PrismaService).organization.delete({
      where: { id: created.body.user.organizationId },
    });
  });

  it('refuses a cross-tenant delete and leaves the row intact', async () => {
    await request(http)
      .delete(`/api/customers/${acmeCustomerId}`)
      .set('Authorization', `Bearer ${globex.token}`)
      .expect(404);

    const survivor = await app.get(PrismaService).customer.findUnique({ where: { id: acmeCustomerId } });
    expect(survivor).not.toBeNull();
  });

  it('keeps dashboard aggregates scoped to the caller', async () => {
    const response = await request(http)
      .get('/api/dashboard/summary')
      .set('Authorization', `Bearer ${globex.token}`)
      .expect(200);

    expect(response.body.customers).toBe(0);
    expect(response.body.pipeline).toBe(0);
    expect(response.body.revenue).toHaveLength(12);
  });

  it('gives each demo visitor a separate, fully populated workspace', async () => {
    const [first, second] = await Promise.all([startDemoSession(), startDemoSession()]);

    expect(first.organizationId).not.toBe(second.organizationId);

    // Both land on a complete dashboard rather than an empty one.
    for (const session of [first, second]) {
      const listing = await request(http)
        .get('/api/customers')
        .set('Authorization', `Bearer ${session.token}`)
        .expect(200);

      expect(listing.body.totalElements).toBe(28);
    }

    // What one visitor deletes stays visible to the other.
    const victim = await request(http)
      .get('/api/customers?size=1')
      .set('Authorization', `Bearer ${first.token}`)
      .expect(200);

    await request(http)
      .delete(`/api/customers/${victim.body.content[0].id}`)
      .set('Authorization', `Bearer ${first.token}`)
      .expect(204);

    const untouched = await request(http)
      .get('/api/customers')
      .set('Authorization', `Bearer ${second.token}`)
      .expect(200);

    expect(untouched.body.totalElements).toBe(28);

    const prisma = app.get(PrismaService);
    await prisma.organization.deleteMany({
      where: { id: { in: [first.organizationId, second.organizationId] } },
    });
  });

  it('invalidates a token whose user no longer exists', async () => {
    const session = await startDemoSession();

    await request(http).get('/api/auth/me').set('Authorization', `Bearer ${session.token}`).expect(200);

    await app.get(PrismaService).organization.delete({ where: { id: session.organizationId } });

    await request(http).get('/api/auth/me').set('Authorization', `Bearer ${session.token}`).expect(401);
  });

  async function startDemoSession(): Promise<Workspace> {
    const response = await request(http).post('/api/demo/session').expect(201);

    return {
      token: response.body.accessToken,
      organizationId: response.body.user.organizationId,
      email: response.body.user.email,
    };
  }

  it('rejects an unknown pipeline status instead of storing it', async () => {
    await request(http)
      .post('/api/customers')
      .set('Authorization', `Bearer ${acme.token}`)
      .send({ name: 'X', company: 'Y', email: 'x@y.example', status: 'CHURNED', value: 1 })
      .expect(400);
  });
});
