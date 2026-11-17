'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const app = require('../server');

const localShopsFile = path.join(__dirname, '..', 'data', 'shops.local.json');

test('seller sign-up creates a searchable unverified shop', async () => {
  const previousVercel = process.env.VERCEL;
  const originalShops = fs.existsSync(localShopsFile) ? fs.readFileSync(localShopsFile) : null;
  delete process.env.VERCEL;
  const server = app.listen(0);

  try {
    await new Promise((resolve) => server.once('listening', resolve));
    const username = `testshop${Date.now()}`;
    const response = await fetch(`http://localhost:${server.address().port}/api/shops`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, cats: ['Clothes'], areas: ['CBD'] }),
    });

    assert.equal(response.status, 201);
    const shop = await response.json();
    assert.equal(shop.username, username);
    assert.equal(shop.verified, false);
    assert.deepEqual(shop.cats, ['Clothes']);
    assert.deepEqual(shop.areas, ['CBD']);
    assert.equal(shop.items[0].name, `Clothes from @${username}`);
  } finally {
    if (previousVercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = previousVercel;
    if (originalShops) fs.writeFileSync(localShopsFile, originalShops);
    else if (fs.existsSync(localShopsFile)) fs.unlinkSync(localShopsFile);
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

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
