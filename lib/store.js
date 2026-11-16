'use strict';

// A tiny JSON-file store. The seed (data/shops.json) ships with the project;
// your live data goes to data/shops.local.json, created on first run.
// Swap this for a real database (Postgres, SQLite, Firestore...) when you grow.

const fs = require('fs');
const path = require('path');

const SEED = path.join(__dirname, '..', 'data', 'shops.json');
const LIVE = path.join(__dirname, '..', 'data', 'shops.local.json');

function load() {
  if (!fs.existsSync(LIVE)) fs.copyFileSync(SEED, LIVE);
  return JSON.parse(fs.readFileSync(LIVE, 'utf8'));
}

function save(shops) {
  const tmp = LIVE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(shops, null, 2) + '\n');
  fs.renameSync(tmp, LIVE);
}

function slugify(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'shop';
}

function getAll() {
  return load();
}

function getById(id) {
  return load().find((s) => s.id === id) || null;
}

function upsert(shop) {
  const shops = load();
  const i = shops.findIndex((s) => s.id === shop.id);
  if (i === -1) shops.push(shop);
  else shops[i] = { ...shops[i], ...shop };
  save(shops);
  return shop;
}

function uniqueId(base) {
  const shops = load();
  let id = slugify(base);
  let n = 2;
  while (shops.some((s) => s.id === id)) id = `${slugify(base)}-${n++}`;
  return id;
}

module.exports = { getAll, getById, upsert, uniqueId, save };
