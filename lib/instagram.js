'use strict';

// Reads a shop's public profile and recent posts through Meta's official
// Instagram Graph API "Business Discovery" endpoint. This only works for
// Business/Creator accounts, which is what almost every Instagram shop is.
// No scraping: scraping breaks Instagram's terms and gets accounts banned.

const GRAPH = 'https://graph.facebook.com';

function config() {
  const userId = process.env.IG_USER_ID;
  const token = process.env.IG_ACCESS_TOKEN;
  const version = process.env.IG_GRAPH_VERSION || 'v26.0';
  const limit = Number(process.env.IG_POSTS_PER_SHOP || 12);
  if (!userId || !token) {
    throw new Error('Set IG_USER_ID and IG_ACCESS_TOKEN in .env to pull posts from Instagram.');
  }
  return { userId, token, version, limit };
}

async function fetchShop(username) {
  const { userId, token, version, limit } = config();
  const fields =
    `business_discovery.username(${encodeURIComponent(username)})` +
    `{username,name,biography,profile_picture_url,followers_count,media_count,` +
    `media.limit(${limit}){id,caption,media_type,media_url,thumbnail_url,permalink,timestamp}}`;
  const url = `${GRAPH}/${version}/${userId}?fields=${fields}&access_token=${encodeURIComponent(token)}`;

  const res = await fetch(url);
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.error) {
    const msg = body.error ? `${body.error.message} (code ${body.error.code})` : `HTTP ${res.status}`;
    throw new Error(`Instagram lookup failed for @${username}: ${msg}`);
  }
  return body.business_discovery;
}

// Pull a price out of a caption: "KES 2,500", "Ksh2500", "2.5k", "@ 1800/=".
function extractPrice(caption) {
  if (!caption) return null;
  const c = caption.toLowerCase();
  const patterns = [
    /(?:kes|ksh|kshs|sh)\.?\s*([\d,]{3,7})/,
    /([\d,]{3,7})\s*(?:\/=|bob|kes|ksh|shillings)/,
    /\b(\d{1,3}(?:\.\d)?)\s*k\b/,
    /(?:price|@)\s*:?\s*([\d,]{3,7})/,
  ];
  for (const re of patterns) {
    const m = c.match(re);
    if (m) {
      let n = parseFloat(m[1].replace(/,/g, ''));
      if (re.source.includes('\\s*k\\b')) n *= 1000;
      if (n >= 50 && n <= 500000) return Math.round(n);
    }
  }
  return null;
}

// Turn a post into a searchable item: first line of the caption as the name,
// hashtags and caption words as tags.
function postToItem(post) {
  const caption = post.caption || '';
  const firstLine = caption.split('\n').map((l) => l.trim()).find(Boolean) || 'Post';
  const name = firstLine.replace(/#\w+/g, '').replace(/\s+/g, ' ').trim().slice(0, 80) || 'Post';
  const hashtags = (caption.match(/#\w+/g) || []).map((h) => h.slice(1).toLowerCase());
  return {
    name,
    price: extractPrice(caption),
    tags: [caption.toLowerCase().replace(/[^a-z0-9#\s-]/g, ' '), hashtags.join(' ')].join(' ').replace(/\s+/g, ' ').trim(),
    image: post.media_type === 'VIDEO' ? post.thumbnail_url || null : post.media_url || null,
    permalink: post.permalink || null,
    postedAt: post.timestamp || null,
    source: 'instagram',
    igId: post.id,
  };
}

module.exports = { fetchShop, extractPrice, postToItem };
