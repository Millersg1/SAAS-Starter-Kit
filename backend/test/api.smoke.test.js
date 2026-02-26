import test from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/app.js';

let server;
let baseUrl;

test.before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
});

test.after(async () => {
  if (!server) return;
  await new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
});

test('GET / returns API metadata', async () => {
  const response = await fetch(`${baseUrl}/`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.message, 'ClientHub API');
  assert.equal(typeof body.health, 'string');
});

test('POST /api/auth/login validates request payload', async () => {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({}),
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.status, 'fail');
  assert.equal(body.message, 'Validation error');
});

test('GET /api/auth/me rejects unauthenticated requests', async () => {
  const response = await fetch(`${baseUrl}/api/auth/me`);
  const body = await response.json();

  assert.equal(response.status, 401);
  assert.equal(body.status, 'fail');
});

test('GET /api/export/clients/:brandId is mounted and protected', async () => {
  const response = await fetch(`${baseUrl}/api/export/clients/test-brand-id`);
  const body = await response.json();

  // 401 verifies route is mounted and protected (not 404).
  assert.equal(response.status, 401);
  assert.equal(body.status, 'fail');
});
