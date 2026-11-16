'use strict';

// Refresh every listed shop's products from its latest Instagram posts.
//   npm run refresh              -> all shops (skips the .sample ones)
//   npm run refresh -- someshop  -> just @someshop
// Run it on a schedule (Windows Task Scheduler, cron) every few hours.

require('dotenv').config();
const store = require('../lib/store');
const { fetchShop, postToItem } = require('../lib/instagram');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function refreshOne(shop) {
  const ig = await fetchShop(shop.username);
  const posts = (ig.media && ig.media.data) || [];
  const fromIg = posts.map(postToItem);
  const manual = shop.items.filter((it) => it.source !== 'instagram');
  return {
    ...shop,
    name: shop.name || ig.name || ig.username,
    avatar: ig.profile_picture_url || shop.avatar || null,
    bio: ig.biography || shop.bio || null,
    followers: ig.followers_count ?? shop.followers ?? null,
    items: [...manual, ...fromIg],
    lastRefreshed: new Date().toISOString(),
  };
}

async function main() {
  const only = process.argv[2] ? process.argv[2].replace(/^@/, '') : null;
  const shops = store.getAll();
  const targets = shops.filter((s) => (only ? s.username === only : !s.username.endsWith('.sample')));

  if (!targets.length) {
    console.log(only ? `No listed shop with username @${only}.` : 'No real shops listed yet (sample shops are skipped).');
    return;
  }

  let ok = 0;
  for (const shop of targets) {
    try {
      const updated = await refreshOne(shop);
      store.upsert(updated);
      const priced = updated.items.filter((i) => i.source === 'instagram' && i.price != null).length;
      console.log(`✓ @${shop.username}: ${updated.items.length} items (${priced} posts with a price found)`);
      ok++;
    } catch (err) {
      console.error(`✗ ${err.message}`);
    }
    await sleep(1500); // stay well inside Meta's rate limits
  }
  console.log(`Done: ${ok}/${targets.length} shops refreshed.`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
