# Migration from local PolarOps v1.x

The Cloudflare edition is not a drop-in `python app.py` replacement. It changes the runtime and storage layer.

| v1.x | Cloudflare v2 |
|---|---|
| FastAPI + Uvicorn | FastAPI + Cloudflare Python Worker ASGI |
| local SQLite file | D1 |
| in-process WebSocket list | Durable Object per expedition |
| local backup JSON | JSON response + R2 copy |
| local static files | Workers Static Assets |
| environment variables | Worker vars + secrets |

The frontend interaction model is retained: same `/api/...` paths and same `/ws/expeditions/...` path. This is why the existing PolarOps UI required only small wording and COMNAP batching changes.

For existing operational data, export a v1 backup and write/import a one-time D1 migration rather than copying the SQLite file into the Worker.
