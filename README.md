# PolarOps — Local Node/React Refactor

This branch is the local-development conversion of PolarOps to JavaScript, Node.js, Express, React and Vite.

**No deployment is configured or performed by this refactor.** The original Cloudflare/Python implementation remains in the repository as reference material. See `NODE_REACT_ARCHITECTURE_AUDIT.md` and `NODE_REACT_MIGRATION_PLAN.md`.

## Local stack

- Backend: Node.js + Express.js
- Database: local SQLite through Node's built-in `node:sqlite`
- Frontend: React + JSX + Vite
- SPA routing: `react-router-dom`
- Maps: Leaflet + `react-leaflet`
- Realtime: WebSocket via `ws`
- Offline: service worker shell cache + IndexedDB read cache/mutation queue

No production D1 connection is used by the Node backend.

## Run locally

Backend:

```bash
cd Backend
npm install
cp .env.example .env
npm run dev
```

Backend: http://127.0.0.1:5000

Frontend:

```bash
cd Frontend
npm install
npm run dev
```

Frontend: http://127.0.0.1:5173

The Vite development server proxies `/api` and `/ws` to the local Express backend.

## Local demo accounts

- Commander: `commander@polarops.local` / `PolarOps123!`
- Logistics: `logistics@polarops.local` / `Logistics123!`
- Field: `field@polarops.local` / `Field123!`

These are synthetic local-development credentials only.

## Validation

Backend:

```bash
cd Backend
npm test
npm run lint
```

Frontend:

```bash
cd Frontend
npm run lint
npm run build
npm run test:browser
```

The browser smoke test uses the locally installed Google Chrome executable. It validates login, role login endpoints, core APIs, realtime, all SPA modules, React-Leaflet routes/zones, Polar Network switching and runtime errors.

For production-build/offline verification:

```bash
cd Frontend
npm run build
npm run preview
POLAROPS_BASE_URL=http://127.0.0.1:4173 POLAROPS_CHECK_OFFLINE=1 node scripts/browser-smoke.mjs
```

See `PHASE_VALIDATION.md` for the completed phase record.

## Data boundaries

Arctic / North and Antarctic / South remain separate operational/reference contexts. Public station/facility records retain source and verification metadata. Synthetic demo records are not labeled as live data.

## Git and deployment

Work remains on `node-react-refactor`. Do not merge to `main`, push, deploy, run remote migrations, alter DNS, or change production Cloudflare resources without explicit approval.
