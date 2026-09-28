# Deploy PolarOps entirely on Cloudflare

## 1. Prerequisites

You need:

- Cloudflare account
- Node.js 20+ (Node 22 is fine)
- npm
- `uv`
- Wrangler / pywrangler

Install project tools:

```bash
cd polarops-cloudflare
npm install
uv sync --dev
```

Log in:

```bash
npx wrangler login
```

## 2. Create D1

```bash
npx wrangler d1 create polarops-db
```

Cloudflare prints a database ID. Put that value into:

```json
"database_id": "00000000-0000-0000-0000-000000000000"
```

inside `wrangler.jsonc`.

## 3. Create R2 backup bucket

```bash
npx wrangler r2 bucket create polarops-backups
```

The configured binding is already named `BACKUPS`.

## 4. Configure secrets

Generate a strong session-signing secret:

```bash
openssl rand -hex 32
```

Store it:

```bash
npx wrangler secret put AUTH_SECRET
```

If an authorized national programme / expedition operator provides a worker-feed API token:

```bash
npx wrangler secret put OPERATIONS_FEED_TOKEN
```

Do not commit either secret.

If you have a worker feed, set its URL in `wrangler.jsonc`:

```json
"OPERATIONS_FEED_URL": "https://operator.example/api/polarops/operations"
```

## 5. Apply D1 migrations

Production:

```bash
npx wrangler d1 migrations apply polarops-db --remote
```

Local:

```bash
npx wrangler d1 migrations apply polarops-db --local
```

The second migration creates a demonstration organization, mission and users.

## 6. Local test

Create local secrets:

```bash
cp .dev.vars.example .dev.vars
```

Edit `.dev.vars` and set:

```text
AUTH_SECRET=<random secret>
```

Start:

```bash
uv run pywrangler dev
```

Open the printed local URL. Test:

1. login as Commander
2. Dashboard
3. Personnel check-in
4. Cargo move
5. Inventory adjustment
6. Vehicle live telemetry
7. Trigger SOS
8. second browser window receives a live event
9. Antarctic Network -> Sync COMNAP

## 7. Deploy

```bash
uv run pywrangler deploy
```

Cloudflare prints the `workers.dev` URL. That single URL serves both frontend and API.

## 8. Custom domain

In the Cloudflare dashboard, attach your desired domain/route to the Worker. With a same-origin frontend and API, the final shape is:

```text
https://polarops.example.com/
https://polarops.example.com/api/dashboard
wss://polarops.example.com/ws/expeditions/1
```

## 9. GitHub deployment

Push this entire folder to GitHub. Connect the repository to Cloudflare Workers Builds or deploy from GitHub Actions. The application itself remains hosted on Cloudflare; GitHub is only source control / CI.

## 10. Production hardening

Before real Antarctic use:

- remove or rotate demo credentials
- use organizational SSO/OIDC instead of seeded passwords
- define retention for precise worker telemetry
- add audit/export policy and consent rules
- add rate limiting and abuse protection
- add stronger device identity for field telemetry
- paginate/queue large authorized worker feeds
- test offline conflict resolution on actual field devices
- add monitoring and disaster-recovery procedures
- obtain operator/security review before safety-critical use
