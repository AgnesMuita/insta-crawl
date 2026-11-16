# Insta-Crawl

Insta-Crawl helps shoppers discover Instagram shops by **what they sell**—for example "white sneakers under 3000", "thrift jeans" or "leather tote westlands". The public overview is at `/`, and the shop finder is at `/search/`.

## Run it (Windows)

1. Install **Node.js 18 or newer** from https://nodejs.org (the LTS version).
2. Open PowerShell in this folder:
   ```powershell
   cd D:\Scott\insta-crawl
   npm install
   copy .env.example .env
   npm start
   ```
3. Open http://localhost:3000. On your phone, using the same Wi-Fi, open `http://<your-PC-IP>:3000`. Run `ipconfig` to find your PC's IP address.

`npm run dev` restarts the server whenever you change a file. `npm test` runs the tests.

## Deploy to Vercel

Deploy with `vercel --prod`. The deployment includes the current `data/shops.local.json` listings and excludes local `.env` files. Seller sign-ups return a clear unavailable response until persistent storage is configured; Vercel's function filesystem is not a durable database.

## What's inside

| Path | What it does |
|---|---|
| `server.js` | Express server and JSON API |
| `lib/search.js` | Reads plain-language queries (item words, "under 3000" / "under 2.5k", area names) and ranks shops |
| `lib/instagram.js` | Gets a shop's public posts through Meta's official **Business Discovery** API, and reads prices out of captions ("KES 1,500", "ksh2500", "1800/=", "4.5k") |
| `lib/store.js` | Simple JSON-file database (`data/shops.local.json`, created on the first run from `data/shops.json`) |
| `scripts/refresh.js` | Updates every listed shop's products from its latest Instagram posts |
| `public/` | The mobile web app: search, filters, shop page, saved shops and seller sign-up |
| `data/shops.json` | 10 made-up sample shops so you can try it right away |

### API

- `GET /api/search?q=&cat=&price=any|u1500|mid|hi&area=&verified=true&sort=match|reply`
- `GET /api/shops/:id`, `GET /api/shops?ids=a,b`
- `POST /api/shops` lists a new shop: `{ username, name, cats[], areas[], minPrice, maxPrice, whatsapp, howToOrder }`

## Connecting real Instagram data

This project deliberately does **not** scrape Instagram. Scraping breaks Instagram's terms, gets IPs and accounts blocked, and stops working every time they change the page. It uses the official Graph API instead:

1. Turn your own Instagram account into a **Business or Creator** account and link it to a Facebook Page.
2. Create an app at https://developers.facebook.com, add the **Instagram** product (Instagram API with Facebook Login) and get a long-lived user access token with `instagram_basic` and `pages_show_list`.
3. Put your Instagram account ID and the token in `.env` (`IG_USER_ID`, `IG_ACCESS_TOKEN`).
4. Shops list themselves through the **For sellers** tab, or you add them to `data/shops.local.json`.
5. Run `npm run refresh`, or `npm run refresh -- someshop` for one shop. Each post becomes a searchable product with its photo, caption, price and a link to the post.
6. Run the refresh on a schedule with Windows Task Scheduler (every 3–6 hours is plenty).

Limits to know about: Business Discovery only works for Business/Creator accounts (nearly every shop is one), and it is rate-limited per app user. Hashtag search is capped at 30 unique hashtags per 7 days, which is why shops opting in is the main way the directory grows.

## Before going live

- Replace the JSON store with a real database once you have more than a few hundred shops.
- Add an admin page to verify sellers and remove spam sign-ups (new shops start unverified).
- Collect real buyer ratings and reply times. The sample numbers are made up, and new shops start at 0 reviews.
- Add rate limiting to `POST /api/shops`.
- Delete the sample shops from `data/shops.local.json`. They all end in `.sample`.
