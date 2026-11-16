'use strict';

// Turns a plain-language query like "white sneakers under 3000 westlands"
// into search terms, a max price and a delivery area, then ranks shops.

const AREAS = ['CBD', 'Westlands', 'Kilimani', 'Karen', 'Thika Rd'];

const AREA_PATTERNS = [
  [/\bcbd\b|\btown\b/, 'CBD'],
  [/\bwestlands\b/, 'Westlands'],
  [/\bkilimani\b/, 'Kilimani'],
  [/\bkaren\b/, 'Karen'],
  [/\bthika(?: rd| road)?\b/, 'Thika Rd'],
];

const STOP = new Set([
  'under', 'below', 'less', 'than', 'in', 'for', 'the', 'a', 'an', 'and', 'with',
  'size', 'cheap', 'nairobi', 'ksh', 'kes', 'shop', 'shops', 'near', 'me',
  'delivery', 'deliver', 'to', 'buy', 'max', 'of', 'on', 'i', 'want', 'need',
]);

const PRICE_BANDS = {
  any: { min: 0, max: Infinity },
  u1500: { min: 0, max: 1499 },
  mid: { min: 1500, max: 3000 },
  hi: { min: 3001, max: Infinity },
};

function singular(w) {
  if (w.length > 4 && w.endsWith('ies')) return w.slice(0, -3) + 'y';
  if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1);
  return w;
}

function parseQuery(q) {
  let s = String(q || '').toLowerCase();
  let maxPrice = null;

  const m = s.match(/(?:under|below|less than|max)\s*(?:kes|ksh)?\s*([\d,.]+)\s*(k)?\b/);
  if (m) {
    maxPrice = parseFloat(m[1].replace(/,/g, '')) * (m[2] ? 1000 : 1);
    s = s.replace(m[0], ' ');
  }

  let area = null;
  for (const [re, name] of AREA_PATTERNS) {
    if (re.test(s)) {
      area = name;
      s = s.replace(new RegExp(re.source, 'g'), ' ');
    }
  }

  const terms = s
    .split(/[^a-z0-9-]+/)
    .filter((w) => w && !STOP.has(w) && !/^\d+$/.test(w))
    .map(singular);

  return { terms, maxPrice, area };
}

function itemText(shop, item) {
  return [item.name, item.tags, shop.cats.join(' '), shop.name].join(' ').toLowerCase();
}

function deliversTo(shop, area) {
  if (!area) return true;
  return shop.areas.includes(area) || shop.areas.includes('All areas');
}

/**
 * @param {Array} shops  all shops
 * @param {object} opts  { q, cat, price, area, verified, sort }
 * @returns {{ query: object, results: Array<{ shop, matched }> }}
 */
function search(shops, opts = {}) {
  const parsed = parseQuery(opts.q);
  const band = PRICE_BANDS[opts.price] || PRICE_BANDS.any;
  const max = Math.min(band.max, parsed.maxPrice == null ? Infinity : parsed.maxPrice);
  const area = opts.area && opts.area !== 'Any area' ? opts.area : parsed.area;
  const cat = opts.cat && opts.cat !== 'All' ? opts.cat : null;
  const verifiedOnly = opts.verified === true || opts.verified === 'true' || opts.verified === '1';

  const results = [];
  for (const shop of shops) {
    if (cat && !shop.cats.includes(cat)) continue;
    if (verifiedOnly && !shop.verified) continue;
    if (!deliversTo(shop, area)) continue;

    const matched = shop.items.filter((it) => {
      if (typeof it.price === 'number' && (it.price < band.min || it.price > max)) return false;
      if (typeof it.price !== 'number' && (band.min > 0 || max !== Infinity)) return false;
      const text = itemText(shop, it);
      return parsed.terms.every((t) => text.includes(t));
    });
    if (matched.length) results.push({ shop, matched });
  }

  if (opts.sort === 'reply') {
    results.sort((a, b) => a.shop.replyMins - b.shop.replyMins || b.shop.rating - a.shop.rating);
  } else {
    results.sort(
      (a, b) =>
        b.matched.length - a.matched.length ||
        Number(b.shop.verified) - Number(a.shop.verified) ||
        b.shop.rating - a.shop.rating
    );
  }

  return { query: { ...parsed, area, maxPrice: max === Infinity ? null : max }, results };
}

module.exports = { search, parseQuery, AREAS, PRICE_BANDS };
