# PolarOps Cloudflare architecture

```text
Workers Static Assets
        │
        │ same origin HTTPS
        ▼
Python Worker + FastAPI
        │
   ┌────┼───────────────┐
   │    │               │
   ▼    ▼               ▼
  D1   Durable Object   R2
 SQL   WebSocket room   backups/files
   │        │
   │        └──── live events ────► browser clients
   │
   ├── organizations
   ├── expeditions
   ├── locations
   ├── personnel
   ├── cargo/events
   ├── inventory/events
   ├── vehicles/assets
   ├── incidents/events
   ├── telemetry
   └── public Antarctic facilities/weather cache
```

## Tenant boundary

Every private expedition belongs to an `organization_id`. A logged-in user also belongs to an organization. Expedition access is accepted only when both organization IDs match.

## Realtime

`EXPEDITION_ROOM.getByName(str(expedition_id))` guarantees that all clients for one expedition coordinate through the same Durable Object identity. WebSockets use Cloudflare's hibernatable acceptance API. Database writes remain in D1; WebSocket events are invalidation/notification messages, not the system of record.

## External data

- COMNAP -> public facility reference table
- Open-Meteo -> cached current model conditions for a selected facility
- Authorized operator API -> worker roster, camps/bases and optional latest positions
- Field devices -> `/api/telemetry/position`

## Backups

Commander backup requests serialize tenant operational data and also attempt to place a copy into the `BACKUPS` R2 bucket.
