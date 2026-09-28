# PolarOps Cloudflare Edition

PolarOps v2.0 is the Cloudflare-native edition of the Antarctic expedition logistics and asset-management platform.

## Stack

- **Frontend:** Workers Static Assets
- **API:** FastAPI on Cloudflare Python Workers
- **Database:** Cloudflare D1
- **Realtime:** one Durable Object WebSocket room per expedition
- **Backups:** Cloudflare R2
- **External data:** COMNAP facility sync, Open-Meteo current model conditions, optional authorized operations feed
- **Offline field support:** existing PWA shell and browser mutation queue

The frontend and API are served from the **same Worker/domain**, so there is no separate GitHub Pages deployment and no CORS configuration is required.

## Demo login

After applying both D1 migrations:

- Commander: `commander@polarops.local` / `PolarOps123!`
- Logistics: `logistics@polarops.local` / `Logistics123!`
- Field: `field@polarops.local` / `Field123!`

Change these before using the service beyond a demo.

## Local development

Cloudflare Python Workers use `uv` + `pywrangler`, not a normal `python app.py` server.

```bash
npm install
cp .dev.vars.example .dev.vars
# Edit .dev.vars and set AUTH_SECRET.

uv sync --dev
npx wrangler d1 migrations apply polarops-db --local
uv run pywrangler dev
```

Open the URL printed by pywrangler, normally `http://localhost:8787`.

## Production deployment

See [CLOUDFLARE_DEPLOY.md](CLOUDFLARE_DEPLOY.md). The short version is:

```bash
npx wrangler login
npx wrangler d1 create polarops-db
npx wrangler r2 bucket create polarops-backups
```

Copy the D1 database ID into `wrangler.jsonc`, then:

```bash
npx wrangler secret put AUTH_SECRET
# Optional real worker-feed credential:
npx wrangler secret put OPERATIONS_FEED_TOKEN

npx wrangler d1 migrations apply polarops-db --remote
uv run pywrangler deploy
```

## Multinational model

`organizations` is the tenant boundary. Users and expeditions belong to one organization. The API filters expedition access by `organization_id`. Public Antarctic facility metadata is global reference data; private personnel, cargo, telemetry and incidents remain tenant-scoped.

## Realtime model

Each expedition uses one Durable Object named with the expedition ID. The browser opens:

```text
wss://<your-domain>/ws/expeditions/<id>
```

The browser authenticates over the socket with the same signed session token. After any API mutation, the Worker broadcasts an event through the expedition's Durable Object. The browser then re-reads authoritative state from D1.

## Real workers

PolarOps does **not** scrape live personnel locations. Real workers should enter through either:

1. logged-in field devices posting `/api/telemetry/position`, or
2. an authorized programme/organization feed configured as `OPERATIONS_FEED_URL` plus optional `OPERATIONS_FEED_TOKEN`.

Synthetic workers in the included seed database are marked `source=demo` and `is_synthetic=1`.

## Important free-tier consideration

Cloudflare D1 limits the number of queries per Worker invocation on the Free plan. The COMNAP sync endpoint therefore processes at most 35 facilities per request; the frontend automatically continues until the public directory is synchronized. Large operational worker feeds should be paginated, queued, or run on a paid Workers plan.

## Main files

```text
src/worker.py                 FastAPI Worker + Durable Object
migrations/0001_initial.sql  D1 schema
migrations/0002_seed_demo.sql Demo seed
public/                       Static frontend/PWA
wrangler.jsonc                Cloudflare bindings/config
pyproject.toml                Python Worker dependencies
```
# polarops
