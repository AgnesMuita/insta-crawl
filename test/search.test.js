'use strict';

const test = require('node:test');
const assert = require('node:assert');
const shops = require('../data/shops.json');
const { search, parseQuery } = require('../lib/search');
const { extractPrice, postToItem } = require('../lib/instagram');

test('parseQuery pulls out price limit and area', () => {
  const q = parseQuery('White sneakers under 3,000 in Westlands');
  assert.deepStrictEqual(q.terms, ['white', 'sneaker']);
  assert.strictEqual(q.maxPrice, 3000);
  assert.strictEqual(q.area, 'Westlands');
  assert.strictEqual(parseQuery('bags under 2.5k').maxPrice, 2500);
});

test('white sneakers under 3000 finds sneaker shops, cheapest-qualifying items only', () => {
  const { results } = search(shops, { q: 'white sneakers under 3000' });
  const ids = results.map((r) => r.shop.id);
  assert.ok(ids.includes('tkicks'));
  assert.ok(!ids.includes('kicks'), 'Kicks Corner white sneakers are KES 3,200, over the limit');
  for (const r of results) for (const it of r.matched) assert.ok(it.price <= 3000);
});

test('area filter respects "All areas" shops', () => {
  const { results } = search(shops, { q: 'dress', area: 'Karen' });
  const ids = results.map((r) => r.shop.id);
  assert.ok(ids.includes('kitenge'));
  assert.ok(!ids.includes('mtumba'));
});

test('verified-only and category filters', () => {
  const { results } = search(shops, { cat: 'Shoes', verified: 'true' });
  assert.ok(results.length > 0);
  for (const r of results) {
    assert.ok(r.shop.verified);
    assert.ok(r.shop.cats.includes('Shoes'));
  }
});

test('fastest-reply sort', () => {
  const { results } = search(shops, { sort: 'reply' });
  for (let i = 1; i < results.length; i++) assert.ok(results[i - 1].shop.replyMins <= results[i].shop.replyMins);
});

test('extractPrice reads common Kenyan caption formats', () => {
  assert.strictEqual(extractPrice('Mom jeans size 30 KES 1,200 DM to order'), 1200);
  assert.strictEqual(extractPrice('Sneakers ksh2500 only'), 2500);
  assert.strictEqual(extractPrice('Tote bag 1800/= free delivery CBD'), 1800);
  assert.strictEqual(extractPrice('Ankle boots going for 4.5k'), 4500);
  assert.strictEqual(extractPrice('New drop! DM for price'), null);
});

test('postToItem makes a searchable item from a caption', () => {
  const it = postToItem({ id: '1', caption: 'Vintage denim jacket 🔥\nSize M · KES 1,500\n#thrift #denim', media_type: 'IMAGE', media_url: 'https://x/y.jpg', permalink: 'https://instagram.com/p/1' });
  assert.strictEqual(it.name, 'Vintage denim jacket 🔥');
  assert.strictEqual(it.price, 1500);
  assert.ok(it.tags.includes('thrift'));
  assert.strictEqual(it.image, 'https://x/y.jpg');
});
