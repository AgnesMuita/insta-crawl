'use strict';

require('dotenv').config();
const path = require('path');
const express = require('express');
const store = require('./lib/store');
const { search, AREAS } = require('./lib/search');

const app = express();
app.use(express.json({ limit: '50kb' }));
app.use(express.static(path.join(__dirname, 'public')));

const CATEGORIES = ['Clothes', 'Shoes', 'Bags', 'Thrift', 'Kids', 'Accessories'];
const SELL_AREAS = [...AREAS, 'All areas'];

function publicShop(shop, matched) {
  const prices = shop.items.map((i) => i.price).filter((p) => typeof p === 'number');
  const matchedNames = new Set((matched || []).map((m) => m.name));
  const items = [...(matched || []), ...shop.items.filter((i) => !matchedNames.has(i.name))].map((i) => ({
    name: i.name,
    price: i.price,
    image: i.image,
    permalink: i.permalink,
    match: matchedNames.has(i.name),
  }));
  return {
    id: shop.id,
    name: shop.name,
    username: shop.username,
    instagramUrl: `https://www.instagram.com/${shop.username}/`,
    whatsappUrl: shop.whatsapp ? `https://wa.me/${shop.whatsapp}` : null,
    avatar: shop.avatar || null,
    cats: shop.cats,
    verified: !!shop.verified,
    rating: shop.rating,
    reviews: shop.reviews,
    replyMins: shop.replyMins,
    areas: shop.areas,
    howToOrder: shop.howToOrder,
    minPrice: prices.length ? Math.min(...prices) : null,
    maxPrice: prices.length ? Math.max(...prices) : null,
    sample: !!shop.sample,
    items,
  };
}

app.get('/api/meta', (_req, res) => {
  res.json({ categories: CATEGORIES, areas: AREAS, sellAreas: SELL_AREAS });
});

app.get('/api/search', (req, res) => {
  const { q, cat, price, area, verified, sort } = req.query;
  const { query, results } = search(store.getAll(), { q, cat, price, area, verified, sort });
  const searching = query.terms.length > 0 || query.maxPrice != null;
  res.json({
    query,
    count: results.length,
    results: results.map((r) => publicShop(r.shop, searching ? r.matched : [])),
  });
});

app.get('/api/shops', (req, res) => {
  const ids = String(req.query.ids || '').split(',').filter(Boolean);
  const all = store.getAll();
  const shops = ids.length ? all.filter((s) => ids.includes(s.id)) : all;
  res.json(shops.map((s) => publicShop(s)));
});

app.get('/api/shops/:id', (req, res) => {
  const shop = store.getById(req.params.id);
  if (!shop) return res.status(404).json({ error: 'Shop not found' });
  res.json(publicShop(shop));
});

// Seller sign-up. New shops start unverified; you verify them by hand.
app.post('/api/shops', (req, res) => {
  if (process.env.VERCEL === '1') {
    return res.status(503).json({ errors: ['Seller sign-ups are unavailable until persistent storage is configured.'] });
  }

  const b = req.body || {};
  const username = String(b.username || '').trim().replace(/^@/, '').toLowerCase();
  const cats = (Array.isArray(b.cats) ? b.cats : []).filter((c) => CATEGORIES.includes(c));
  const areas = (Array.isArray(b.areas) ? b.areas : []).filter((a) => SELL_AREAS.includes(a));
  const errors = [];
  if (!/^[a-z0-9._]{1,30}$/.test(username)) errors.push('Enter a valid Instagram username.');
  if (!cats.length) errors.push('Pick at least one thing you sell.');
  if (!areas.length) errors.push('Pick at least one place you deliver to.');
  if (store.getAll().some((s) => s.username === username)) errors.push('That shop is already listed.');
  if (errors.length) return res.status(400).json({ errors });

  const minP = Number(b.minPrice) || null;
  const maxP = Number(b.maxPrice) || null;
  const whatsapp = String(b.whatsapp || '').replace(/\D/g, '').replace(/^0/, '254') || null;

  const shop = {
    id: store.uniqueId(username),
    name: String(b.name || '').trim().slice(0, 60) || username,
    username,
    cats,
    verified: false,
    rating: 0,
    reviews: 0,
    replyMins: 60,
    areas,
    howToOrder: String(b.howToOrder || '').trim().slice(0, 300) || 'DM the shop on Instagram to order.',
    whatsapp,
    sample: false,
    // Until the first Instagram refresh, the shop is findable by its categories and price range.
    items: cats.map((c) => ({
      name: `${c} from @${username}`,
      price: minP || maxP || null,
      tags: c.toLowerCase(),
      image: null,
      permalink: null,
      source: 'manual',
    })),
    createdAt: new Date().toISOString(),
    lastRefreshed: null,
  };
  store.upsert(shop);
  res.status(201).json(publicShop(shop));
});

const PORT = Number(process.env.PORT || 3000);
if (require.main === module) {
  app.listen(PORT, () => console.log(`Insta-Crawl running at http://localhost:${PORT}`));
}

module.exports = app;
