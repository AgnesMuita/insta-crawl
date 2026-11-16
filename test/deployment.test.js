'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('../server');

test('seller sign-ups are unavailable on Vercel until persistent storage is configured', async () => {
  const previousVercel = process.env.VERCEL;
  process.env.VERCEL = '1';
  const server = app.listen(0);

  try {
    await new Promise((resolve) => server.once('listening', resolve));
    const response = await fetch(`http://localhost:${server.address().port}/api/shops`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'newshop', cats: ['Clothes'], areas: ['CBD'] }),
    });

    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), {
      errors: ['Seller sign-ups are unavailable until persistent storage is configured.'],
    });
  } finally {
    if (previousVercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = previousVercel;
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
