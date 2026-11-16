'use strict';

(() => {
  const TONES = ['#E9E1D3', '#D9E3DA', '#DCE2EC', '#EEDCD6', '#E6DDEB', '#E3E6D3'];
  const SUGGEST = ['white sneakers under 3000', 'thrift jeans', 'leather tote westlands', 'kitenge dress'];
  const CATS = ['All', 'Clothes', 'Shoes', 'Bags', 'Thrift', 'Kids'];
  const PRICES = [
    { id: 'any', label: 'Any price' },
    { id: 'u1500', label: 'Under 1,500' },
    { id: 'mid', label: '1,500 – 3,000' },
    { id: 'hi', label: '3,000+' },
  ];

  const ICONS = {
    heart: '<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>',
    check: '<svg role="img" aria-label="Verified seller" width="16" height="16" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#1D4ED8"/><path d="M8 12.5l2.6 2.5L16 9.5" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    star: '<svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="#B45309"><path d="M12 3l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.8 6.6 19.7l1.1-6.1L3.2 9.4l6.1-.8z"/></svg>',
    clock: '<svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    truck: '<svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7h11v9H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="17.5" r="1.5"/><circle cx="17" cy="17.5" r="1.5"/></svg>',
    back: '<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
  };

  // ---------- state ----------
  const state = {
    q: '', cat: 'All', price: 'any', area: 'Any area', verified: false, sort: 'match',
    tab: 'search', meta: null, sCats: new Set(), sAreas: new Set(),
  };
  const saved = new Set(readSaved());

  function readSaved() {
    try { return JSON.parse(localStorage.getItem('dukaSaved') || '[]'); } catch { return []; }
  }
  function writeSaved() {
    try { localStorage.setItem('dukaSaved', JSON.stringify([...saved])); } catch { /* private mode */ }
  }

  // ---------- helpers ----------
  const $ = (id) => document.getElementById(id);
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = v; // only ever used with the static ICONS above
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k === 'style') Object.assign(el.style, v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid);
    return el;
  }
  const fmt = (n) => (n == null ? 'Ask for price' : 'KES ' + Number(n).toLocaleString('en-US'));
  const short = (n) => (n >= 1000 ? Math.round(n / 100) / 10 + 'k' : String(n));
  const reply = (m) => (m < 60 ? `~${m} min` : `~${Math.round((m / 60) * 10) / 10} hr`);
  const initials = (name) => name.replace(/[^A-Za-z ]/g, '').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';
  const tone = (id, k = 0) => TONES[([...id].reduce((a, c) => a + c.charCodeAt(0), 0) + k) % TONES.length];
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

  let toastTimer;
  function toast(msg) {
    const el = $('toast');
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 2600);
  }

  function chip(label, pressed, onclick) {
    return h('button', { type: 'button', class: 'chip', 'aria-pressed': String(pressed), onclick }, label);
  }

  // ---------- rendering pieces ----------
  function avatar(shop, big) {
    const el = h('div', { class: 'avatar' + (big ? ' big' : ''), 'aria-hidden': 'true', style: { background: tone(shop.id) } });
    if (shop.avatar) el.append(h('img', { src: shop.avatar, alt: '' }));
    else el.textContent = initials(shop.name);
    return el;
  }

  function tile(shop, item, k) {
    const attrs = { class: 'tile' + (item.image ? ' has-img' : ''), style: { background: tone(shop.id, k + 1) } };
    if (item.image) attrs.style = { backgroundImage: `url("${encodeURI(item.image)}")` };
    const kids = [
      item.match ? h('span', { class: 'badge' }, 'Match') : null,
      h('span', { class: 't-name' }, item.name),
      h('span', { class: 't-price' }, fmt(item.price)),
    ];
    if (item.permalink) return h('a', { ...attrs, href: item.permalink, target: '_blank', rel: 'noopener' }, ...kids);
    return h('div', attrs, ...kids);
  }

  function saveButton(shop) {
    const on = saved.has(shop.id);
    return h('button', {
      type: 'button', class: 'icon-btn', 'aria-pressed': String(on),
      'aria-label': on ? `Remove ${shop.name} from saved` : `Save ${shop.name}`,
      html: ICONS.heart,
      onclick: () => toggleSave(shop),
    });
  }

  function toggleSave(shop) {
    if (saved.has(shop.id)) { saved.delete(shop.id); toast(`Removed ${shop.name} from Saved`); }
    else { saved.add(shop.id); toast(`Saved ${shop.name}. Find it under Saved.`); }
    writeSaved();
    updateSavedTab();
    if (state.tab === 'saved') renderSaved(); else rerenderSaveButtons();
    if (!$('detail').hidden) openDetail(shop.id, true);
  }

  function rerenderSaveButtons() {
    document.querySelectorAll('[data-shop-card]').forEach((card) => {
      const shop = card._shop;
      card.querySelector('.icon-btn').replaceWith(saveButton(shop));
    });
  }

  function shopCard(shop) {
    const card = h('article', { class: 'card', 'data-shop-card': shop.id },
      h('div', { class: 'shop-head' },
        avatar(shop),
        h('div', { class: 'shop-title' },
          h('div', { class: 'name' }, h('h2', {}, shop.name), shop.verified ? h('span', { html: ICONS.check, style: { display: 'flex' } }) : null),
          h('span', { class: 'handle' }, '@' + shop.username)
        ),
        saveButton(shop)
      ),
      h('div', { class: 'tiles' }, shop.items.slice(0, 3).map((it, k) => tile(shop, it, k))),
      h('div', { class: 'meta' },
        shop.reviews ? h('span', { html: ICONS.star }, `${shop.rating.toFixed(1)} (${shop.reviews})`) : h('span', {}, 'New shop'),
        h('span', { html: ICONS.clock }, `Replies ${reply(shop.replyMins)}`),
        h('span', { html: ICONS.truck }, shop.areas.join(', '))
      ),
      h('div', { class: 'actions' },
        h('button', { type: 'button', class: 'btn dark', onclick: () => openDetail(shop.id) }, 'View shop'),
        h('a', { class: 'btn outline', href: shop.instagramUrl, target: '_blank', rel: 'noopener' }, 'Open on Instagram')
      )
    );
    card._shop = shop;
    return card;
  }

  // ---------- search ----------
  let lastResults = new Map();
  let reqId = 0;

  async function runSearch() {
    const id = ++reqId;
    const params = new URLSearchParams({ q: state.q, cat: state.cat, price: state.price, area: state.area, verified: state.verified, sort: state.sort });
    const res = await fetch('/api/search?' + params);
    const data = await res.json();
    if (id !== reqId || state.tab !== 'search') return;

    lastResults = new Map(data.results.map((s) => [s.id, s]));
    const list = $('list');
    list.replaceChildren(...data.results.map(shopCard));

    const searching = data.query.terms.length > 0 || data.query.maxPrice != null;
    const n = data.count;
    $('resultLabel').textContent = n === 0 ? '' : searching
      ? `${n} ${n === 1 ? 'shop sells' : 'shops sell'} “${state.q.trim()}”`
      : `${n} shops${state.cat !== 'All' ? ' in ' + state.cat : ''} · best matches first`;

    const empty = $('empty');
    empty.hidden = n !== 0;
    if (n === 0) {
      empty.replaceChildren(
        h('strong', {}, 'No shops match yet'),
        h('p', {}, 'Try fewer words, a wider price range or another delivery area.'),
        h('button', { type: 'button', class: 'btn dark', onclick: clearAll }, 'Clear search and filters')
      );
    }
  }
  const runSearchSoon = debounce(runSearch, 180);

  function clearAll() {
    Object.assign(state, { q: '', cat: 'All', price: 'any', area: 'Any area', verified: false });
    $('q').value = '';
    renderControls();
    runSearch();
  }

  // ---------- saved ----------
  async function renderSaved() {
    $('resultLabel').textContent = '';
    const empty = $('empty');
    if (!saved.size) {
      $('list').replaceChildren();
      empty.hidden = false;
      empty.replaceChildren(
        h('strong', {}, 'No saved shops yet'),
        h('p', {}, 'Tap the heart on any shop to keep it here, so you can find it again without scrolling back through Instagram.'),
        h('button', { type: 'button', class: 'btn dark', onclick: () => setTab('search') }, 'Find shops')
      );
      return;
    }
    empty.hidden = true;
    const res = await fetch('/api/shops?ids=' + encodeURIComponent([...saved].join(',')));
    const shops = await res.json();
    if (state.tab !== 'saved') return;
    shops.forEach((s) => lastResults.set(s.id, s));
    $('resultLabel').textContent = `${shops.length} saved ${shops.length === 1 ? 'shop' : 'shops'}`;
    $('list').replaceChildren(...shops.map(shopCard));
  }

  function updateSavedTab() {
    $('savedTab').textContent = saved.size ? `Saved (${saved.size})` : 'Saved';
  }

  // ---------- detail ----------
  async function openDetail(id, keepScroll) {
    let shop = lastResults.get(id);
    if (!shop) shop = await (await fetch('/api/shops/' + encodeURIComponent(id))).json();
    const prices = [shop.minPrice, shop.maxPrice].filter((p) => p != null);
    const anyMatch = shop.items.some((i) => i.match);
    const el = $('detail');
    const scroll = el.scrollTop;
    el.replaceChildren(h('div', { class: 'detail-inner' },
      h('div', { class: 'detail-bar' },
        h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Back to results', html: ICONS.back, onclick: closeDetail }),
        h('span', {}, shop.name),
        saveButton(shop)
      ),
      h('div', { class: 'detail-body' },
        h('div', { class: 'shop-head' },
          avatar(shop, true),
          h('div', { class: 'shop-title' },
            h('div', { class: 'name' }, h('h2', { id: 'dName' }, shop.name), shop.verified ? h('span', { html: ICONS.check, style: { display: 'flex' } }) : null),
            h('span', { class: 'handle' }, '@' + shop.username),
            h('span', { class: 'small' }, shop.cats.join(' · '))
          )
        ),
        h('div', { class: 'stats' },
          h('div', { class: 'stat' }, h('b', {}, shop.reviews ? '★ ' + shop.rating.toFixed(1) : 'New'), h('span', {}, `${shop.reviews} buyer reviews`)),
          h('div', { class: 'stat' }, h('b', {}, reply(shop.replyMins).replace('~', '')), h('span', {}, 'usual reply time')),
          h('div', { class: 'stat' }, h('b', {}, prices.length ? `${short(Math.min(...prices))}–${short(Math.max(...prices))}` : '—'), h('span', {}, 'price range (KES)'))
        ),
        h('div', { class: 'stack' },
          h('a', { class: 'btn primary', href: shop.instagramUrl, target: '_blank', rel: 'noopener' }, `Open @${shop.username} on Instagram`),
          shop.whatsappUrl ? h('a', { class: 'btn outline', href: shop.whatsappUrl, target: '_blank', rel: 'noopener' }, 'Order on WhatsApp') : null
        ),
        h('div', { class: 'stack' },
          h('h3', {}, anyMatch ? 'Matches your search, then everything else' : 'Latest from their grid'),
          h('div', { class: 'tiles two-col' }, shop.items.map((it, k) => tile(shop, it, k)))
        ),
        h('div', { class: 'card' },
          h('h3', {}, 'Delivery and ordering'),
          h('div', { class: 'chips wrap' }, shop.areas.map((a) => h('span', { class: 'pill' }, a))),
          h('span', { class: 'small', style: { lineHeight: '1.5', color: 'var(--ink-2)' } }, shop.howToOrder)
        ),
        shop.sample ? h('p', { class: 'muted small' }, 'This is a sample shop for testing; its Instagram link will not work.') : null
      )
    ));
    el.hidden = false;
    el.scrollTop = keepScroll ? scroll : 0;
    if (!keepScroll) el.querySelector('.detail-bar .icon-btn').focus();
  }
  function closeDetail() { $('detail').hidden = true; }
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('detail').hidden) closeDetail(); });

  // ---------- controls ----------
  function renderControls() {
    $('cats').replaceChildren(...CATS.map((c) => chip(c, state.cat === c, () => { state.cat = c; renderControls(); runSearch(); })));
    $('prices').replaceChildren(...PRICES.map((p) => chip(p.label, state.price === p.id, () => { state.price = p.id; renderControls(); runSearch(); })));
    const areas = ['Any area', ...(state.meta ? state.meta.areas : [])];
    $('areas').replaceChildren(...areas.map((a) => chip(a, state.area === a, () => { state.area = a; renderControls(); runSearch(); })));
    $('verifiedBtn').setAttribute('aria-pressed', String(state.verified));
    document.querySelectorAll('.seg button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.sort === state.sort)));
    const active = (state.price !== 'any') + (state.area !== 'Any area') + state.verified;
    $('filtersLabel').textContent = active ? `Filters (${active})` : 'Filters';
    $('suggest').hidden = state.q.length > 0;
  }

  function renderSellChips() {
    if (!state.meta) return;
    $('sCats').replaceChildren(...state.meta.categories.map((c) => chip(c, state.sCats.has(c), () => {
      state.sCats.has(c) ? state.sCats.delete(c) : state.sCats.add(c); renderSellChips();
    })));
    $('sAreas').replaceChildren(...state.meta.sellAreas.map((a) => chip(a === 'All areas' ? 'Countrywide' : a, state.sAreas.has(a), () => {
      state.sAreas.has(a) ? state.sAreas.delete(a) : state.sAreas.add(a); renderSellChips();
    })));
  }

  function setTab(tab) {
    state.tab = tab;
    closeDetail();
    document.querySelectorAll('.tabs button').forEach((b) => {
      if (b.dataset.tab === tab) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    $('pageTitle').textContent = { search: 'What are you looking for?', saved: 'Saved shops', sell: 'List your shop' }[tab];
    $('searchControls').hidden = tab !== 'search';
    const isList = tab !== 'sell';
    $('list').hidden = !isList; $('resultLabel').hidden = !isList; $('empty').hidden = true;
    $('sellForm').hidden = tab !== 'sell' || !$('sellDone').hidden;
    if (tab !== 'sell') $('sellDone').hidden = true;
    if (tab === 'search') runSearch();
    if (tab === 'saved') renderSaved();
    window.scrollTo(0, 0);
  }

  // ---------- seller sign-up ----------
  $('sellForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    const body = {
      username: f.username.value, name: f.name.value,
      minPrice: f.minPrice.value.replace(/\D/g, ''), maxPrice: f.maxPrice.value.replace(/\D/g, ''),
      whatsapp: f.whatsapp.value, howToOrder: f.howToOrder.value,
      cats: [...state.sCats], areas: [...state.sAreas],
    };
    const res = await fetch('/api/shops', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json();
    const err = $('sErr');
    if (!res.ok) { err.textContent = data.errors.join(' '); err.hidden = false; return; }
    err.hidden = true;
    f.reset(); state.sCats.clear(); state.sAreas.clear(); renderSellChips();
    f.hidden = true;
    const done = $('sellDone');
    done.replaceChildren(
      h('div', { class: 'card' },
        h('strong', { style: { fontFamily: "'Space Grotesk', sans-serif", fontSize: '20px' } }, 'You’re listed'),
        h('span', { class: 'small', style: { lineHeight: '1.5' } }, 'This is how shoppers will see you in search. Your products fill in automatically after the next Instagram refresh.')
      ),
      shopCard(data),
      h('button', { type: 'button', class: 'btn outline', onclick: () => { done.hidden = true; f.hidden = false; } }, 'List another shop')
    );
    done.hidden = false;
  });

  // ---------- wire up ----------
  $('q').addEventListener('input', (e) => { state.q = e.target.value; renderControls(); runSearchSoon(); });
  $('searchForm').addEventListener('submit', (e) => { e.preventDefault(); $('q').blur(); runSearch(); });
  $('filtersBtn').addEventListener('click', () => {
    const p = $('filters'); p.hidden = !p.hidden; $('filtersBtn').setAttribute('aria-expanded', String(!p.hidden));
  });
  $('verifiedBtn').addEventListener('click', () => { state.verified = !state.verified; renderControls(); runSearch(); });
  $('resetBtn').addEventListener('click', () => { Object.assign(state, { price: 'any', area: 'Any area', verified: false }); renderControls(); runSearch(); });
  document.querySelectorAll('.seg button').forEach((b) => b.addEventListener('click', () => { state.sort = b.dataset.sort; renderControls(); runSearch(); }));
  document.querySelectorAll('.tabs button').forEach((b) => b.addEventListener('click', () => setTab(b.dataset.tab)));
  $('suggest').append(...SUGGEST.map((s) => h('button', { type: 'button', onclick: () => { state.q = s; $('q').value = s; renderControls(); runSearch(); } }, s)));

  (async () => {
    state.meta = await (await fetch('/api/meta')).json();
    renderControls();
    renderSellChips();
    updateSavedTab();
    runSearch();
  })();
})();
