import test from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/app.js';

let server;
let baseUrl;
let authToken;
let brandId;
let clientId;
let ownerUserId;
let memberToken;
let memberUserId;
let memberBrandId;

const unique = Date.now().toString();
const email = `integration+${unique}@example.com`;
const password = 'StrongPass123';

const jsonRequest = async (path, { method = 'GET', token, body } = {}) => {
  const headers = { 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = await response.json();
  return { response, payload };
};

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

test('register and login user', async () => {
  const registerResult = await jsonRequest('/api/auth/register', {
    method: 'POST',
    body: {
      name: 'Integration User',
      email,
      password,
      role: 'agency',
    },
  });

  assert.equal(registerResult.response.status, 201);
  assert.equal(registerResult.payload.status, 'success');
  assert.equal(registerResult.payload.data.user.email, email);
  ownerUserId = registerResult.payload.data.user.id;

  const loginResult = await jsonRequest('/api/auth/login', {
    method: 'POST',
    body: { email, password },
  });

  assert.equal(loginResult.response.status, 200);
  assert.equal(loginResult.payload.status, 'success');
  assert.equal(typeof loginResult.payload.data.accessToken, 'string');
  authToken = loginResult.payload.data.accessToken;
});

test('create brand for authenticated user', async () => {
  const result = await jsonRequest('/api/brands', {
    method: 'POST',
    token: authToken,
    body: {
      name: `Integration Brand ${unique}`,
      primary_color: '#112233',
      secondary_color: '#445566',
    },
  });

  assert.equal(result.response.status, 201);
  assert.equal(result.payload.status, 'success');
  assert.equal(typeof result.payload.data.brand.id, 'string');
  brandId = result.payload.data.brand.id;
});

test('create and list clients in brand', async () => {
  const createResult = await jsonRequest(`/api/clients/${brandId}`, {
    method: 'POST',
    token: authToken,
    body: {
      name: 'Client One',
      email: `client.${unique}@example.com`,
      status: 'active',
      client_type: 'regular',
    },
  });

  assert.equal(createResult.response.status, 201);
  assert.equal(createResult.payload.status, 'success');
  clientId = createResult.payload.data.client.id;
  assert.equal(typeof clientId, 'string');

  const listResult = await jsonRequest(`/api/clients/${brandId}`, {
    token: authToken,
  });

  assert.equal(listResult.response.status, 200);
  assert.equal(listResult.payload.status, 'success');
  assert.ok(Array.isArray(listResult.payload.data.clients));
  assert.ok(listResult.payload.data.clients.some((c) => c.id === clientId));
});

test('create and list pipeline deals in brand', async () => {
  const createResult = await jsonRequest(`/api/pipeline/${brandId}`, {
    method: 'POST',
    token: authToken,
    body: {
      title: 'New Integration Deal',
      value: 1500,
      stage: 'lead',
      probability: 25,
      client_id: clientId,
    },
  });

  assert.equal(createResult.response.status, 201);
  assert.equal(createResult.payload.status, 'success');
  assert.equal(createResult.payload.data.deal.title, 'New Integration Deal');

  const listResult = await jsonRequest(`/api/pipeline/${brandId}`, {
    token: authToken,
  });

  assert.equal(listResult.response.status, 200);
  assert.equal(listResult.payload.status, 'success');
  assert.ok(Array.isArray(listResult.payload.data.deals));
  assert.ok(
    listResult.payload.data.deals.some((deal) => deal.title === 'New Integration Deal')
  );
});

test('reject invalid client payload', async () => {
  const result = await jsonRequest(`/api/clients/${brandId}`, {
    method: 'POST',
    token: authToken,
    body: {
      email: `invalid.${unique}@example.com`,
    },
  });

  assert.equal(result.response.status, 400);
  assert.equal(result.payload.status, 'fail');
  assert.equal(result.payload.message, 'Validation error');
});

test('register/login second user and add as viewer member', async () => {
  const secondEmail = `member+${unique}@example.com`;
  const secondPassword = 'StrongPass123';

  const registerResult = await jsonRequest('/api/auth/register', {
    method: 'POST',
    body: {
      name: 'Viewer User',
      email: secondEmail,
      password: secondPassword,
      role: 'agency',
    },
  });

  assert.equal(registerResult.response.status, 201);
  memberUserId = registerResult.payload.data.user.id;
  assert.notEqual(memberUserId, ownerUserId);

  const loginResult = await jsonRequest('/api/auth/login', {
    method: 'POST',
    body: { email: secondEmail, password: secondPassword },
  });
  assert.equal(loginResult.response.status, 200);
  memberToken = loginResult.payload.data.accessToken;

  const addMemberResult = await jsonRequest(`/api/brands/${brandId}/members`, {
    method: 'POST',
    token: authToken,
    body: {
      user_id: memberUserId,
      role: 'viewer',
    },
  });

  assert.equal(addMemberResult.response.status, 201);
  assert.equal(addMemberResult.payload.status, 'success');
});

test('forbid viewer from deleting client (RBAC)', async () => {
  const result = await jsonRequest(`/api/clients/${brandId}/${clientId}`, {
    method: 'DELETE',
    token: memberToken,
  });

  assert.equal(result.response.status, 403);
  assert.equal(result.payload.status, 'fail');
});

test('forbid cross-brand client access', async () => {
  const createBrandResult = await jsonRequest('/api/brands', {
    method: 'POST',
    token: memberToken,
    body: {
      name: `Member Brand ${unique}`,
    },
  });

  assert.equal(createBrandResult.response.status, 201);
  memberBrandId = createBrandResult.payload.data.brand.id;

  const crossAccess = await jsonRequest(`/api/clients/${memberBrandId}`, {
    token: authToken,
  });

  assert.equal(crossAccess.response.status, 403);
  assert.equal(crossAccess.payload.status, 'fail');
});
