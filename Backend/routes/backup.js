import { Router } from 'express';
import { all, get } from '../utils/config/database.js';
import { authRequired } from '../utils/middleware/auth.js';
import { requirePermission } from '../utils/middleware/permissions.js';

const router=Router();

router.get('/',authRequired,requirePermission('operations.manage'),(req,res)=>{
  const organizationId=req.user.organization_id;
  const expeditions=all('SELECT * FROM expeditions WHERE organization_id=? ORDER BY id',organizationId);
  const expeditionIds=expeditions.map((item)=>item.id);
  const byExpedition=(table)=>expeditionIds.flatMap((id)=>all('SELECT * FROM '+table+' WHERE expedition_id=? ORDER BY id',id));
  const cargo=byExpedition('cargo');
  const inventory=byExpedition('inventory_items');
  const incidents=byExpedition('incidents');
  const payload={
    version:1,
    created_at:new Date().toISOString(),
    organization:get('SELECT * FROM organizations WHERE id=?',organizationId),
    users:all('SELECT id,organization_id,email,name,role,active,created_at FROM users WHERE organization_id=? ORDER BY id',organizationId),
    expeditions,
    locations:byExpedition('locations'),
    personnel:byExpedition('personnel'),
    cargo,
    inventory_items:inventory,
    vehicles:byExpedition('vehicles'),
    assets:byExpedition('assets'),
    incidents,
    activity:byExpedition('activity'),
    telemetry_positions:byExpedition('telemetry_positions'),
    mission_tasks:byExpedition('mission_tasks'),
    planned_routes:byExpedition('planned_routes'),
    geofences:byExpedition('geofences'),
    ops_alerts:byExpedition('ops_alerts'),
    science_records:byExpedition('science_records'),
    comms_checkins:byExpedition('comms_checkins'),
    readiness_items:byExpedition('readiness_items'),
    shift_handovers:byExpedition('shift_handovers'),
    cargo_events:cargo.flatMap((item)=>all('SELECT * FROM cargo_events WHERE cargo_id=? ORDER BY id',item.id)),
    inventory_events:inventory.flatMap((item)=>all('SELECT * FROM inventory_events WHERE inventory_id=? ORDER BY id',item.id)),
    incident_events:incidents.flatMap((item)=>all('SELECT * FROM incident_events WHERE incident_id=? ORDER BY id',item.id)),
    incident_actions:incidents.flatMap((item)=>all('SELECT * FROM incident_actions WHERE incident_id=? ORDER BY id',item.id)),
  };
  res.setHeader('Content-Disposition','attachment; filename="polarops-local-backup.json"');
  res.json(payload);
});

export default router;
