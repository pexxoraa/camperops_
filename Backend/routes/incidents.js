import { Router } from 'express';
import { all, get, run } from '../config/database.js';
import Incident from '../models/Incident.js';
import { authRequired } from '../middleware/auth.js';
import { hasPermission, requirePermission } from '../middleware/permissions.js';
import { HttpError } from '../utils/http.js';
import { nowIso } from '../utils/helpers.js';
import { ensureEntityInExpedition, ensureExpeditionAccess, requireFields } from '../utils/validation.js';
import { recordActivity, recordAudit } from '../services/activityService.js';
import { broadcast, makeEvent } from '../services/realtimeService.js';

const router = Router();
router.use(authRequired);

const detail = (id) => get(
  `SELECT i.*,l.name location_name,v.code vehicle_code,v.name vehicle_name,u.name created_by_name
   FROM incidents i LEFT JOIN locations l ON l.id=i.location_id
   LEFT JOIN vehicles v ON v.id=i.assigned_vehicle_id LEFT JOIN users u ON u.id=i.created_by
   WHERE i.id=?`, Number(id),
);

router.get('/', requirePermission('incidents.read'), (req, res, next) => {
  try {
    const expedition = ensureExpeditionAccess(req.user, req.query.expedition_id);
    res.json(all(
      `SELECT i.*,l.name location_name,v.code vehicle_code FROM incidents i
       LEFT JOIN locations l ON l.id=i.location_id LEFT JOIN vehicles v ON v.id=i.assigned_vehicle_id
       WHERE i.expedition_id=? ORDER BY CASE i.status WHEN 'Active' THEN 0 WHEN 'Response' THEN 1 ELSE 2 END,i.created_at DESC`,
      expedition.id,
    ));
  } catch (error) { next(error); }
});
router.post('/', (req, res, next) => {
  try {
    if (!hasPermission(req.user, 'incidents.manage') && !hasPermission(req.user, 'incidents.create')) {
      throw new HttpError(403, 'Permission denied');
    }
    requireFields(req.body, 'expedition_id', 'title');
    const expedition = ensureExpeditionAccess(req.user, req.body.expedition_id);
    ensureEntityInExpedition('locations', req.body.location_id, expedition.id, 'Incident location');
    const count = Number(get('SELECT COUNT(*) value FROM incidents WHERE expedition_id=?', expedition.id)?.value || 0);
    const code = req.body.code || 'INC-' + String(count + 1).padStart(3, '0');
    const item = Incident.create({
      expedition_id: expedition.id, code, title: req.body.title,
      type: req.body.type || 'Field Emergency', severity: req.body.severity || 'High',
      location_id: req.body.location_id || null, status: req.body.status || 'Active',
      description: req.body.description || '', affected_count: Number(req.body.affected_count || 0),
      assigned_vehicle_id: null, created_by: req.user.id, created_at: nowIso(), resolved_at: null,
    });
    run('INSERT INTO incident_events(incident_id,event_type,note,user_id,created_at) VALUES(?,?,?,?,?)',
      item.id, 'Incident created', req.body.description || item.title, req.user.id, nowIso());
    recordActivity(expedition.id, 'incident', 'Incident ' + item.code + ' activated', req.user.id);
    recordAudit(req.user, expedition.id, 'created', 'incident', item.id, req.body);
    broadcast(expedition.id, makeEvent('incident.created', expedition.id, 'incident', item.id));
    res.status(201).json(detail(item.id));
  } catch (error) {
    if (String(error.message).includes('UNIQUE')) error = new HttpError(409, 'Incident code already exists');
    next(error);
  }
});
router.get('/:id', requirePermission('incidents.read'), (req, res, next) => {
  try {
    const item = Incident.getById(req.params.id);
    if (!item) throw new HttpError(404, 'Incident not found');
    ensureExpeditionAccess(req.user, item.expedition_id);
    res.json({
      ...detail(item.id),
      events: all(
        'SELECT e.*,u.name user_name FROM incident_events e LEFT JOIN users u ON u.id=e.user_id WHERE e.incident_id=? ORDER BY e.created_at,e.id',
        item.id,
      ),
      actions: all('SELECT * FROM incident_actions WHERE incident_id=? ORDER BY created_at,id', item.id),
    });
  } catch (error) { next(error); }
});

router.post('/:id/dispatch', requirePermission('incidents.manage'), (req, res, next) => {
  try {
    const item = Incident.getById(req.params.id);
    if (!item) throw new HttpError(404, 'Incident not found');
    ensureExpeditionAccess(req.user, item.expedition_id);
    ensureEntityInExpedition('vehicles', req.body.vehicle_id, item.expedition_id, 'Response vehicle');
    requireFields(req.body, 'vehicle_id');
    Incident.update(item.id, { assigned_vehicle_id: Number(req.body.vehicle_id), status: 'Response' });
    run('INSERT INTO incident_events(incident_id,event_type,note,user_id,created_at) VALUES(?,?,?,?,?)',
      item.id, 'Vehicle dispatched', req.body.note || 'Response vehicle assigned', req.user.id, nowIso());
    recordAudit(req.user, item.expedition_id, 'dispatched', 'incident', item.id, req.body);
    broadcast(item.expedition_id, makeEvent('incident.dispatched', item.expedition_id, 'incident', item.id));
    res.json(detail(item.id));
  } catch (error) { next(error); }
});
router.post('/:id/resolve', requirePermission('incidents.manage'), (req, res, next) => {
  try {
    const item = Incident.getById(req.params.id);
    if (!item) throw new HttpError(404, 'Incident not found');
    ensureExpeditionAccess(req.user, item.expedition_id);
    Incident.update(item.id, { status: 'Resolved', resolved_at: nowIso() });
    run('INSERT INTO incident_events(incident_id,event_type,note,user_id,created_at) VALUES(?,?,?,?,?)',
      item.id, 'Resolved', req.body.note || 'Incident resolved', req.user.id, nowIso());
    recordActivity(item.expedition_id, 'incident', 'Incident ' + item.code + ' resolved', req.user.id);
    recordAudit(req.user, item.expedition_id, 'resolved', 'incident', item.id, req.body);
    broadcast(item.expedition_id, makeEvent('incident.resolved', item.expedition_id, 'incident', item.id));
    res.json(detail(item.id));
  } catch (error) { next(error); }
});

router.post('/:id/events', requirePermission('incidents.manage'), (req, res, next) => {
  try {
    const item = Incident.getById(req.params.id);
    if (!item) throw new HttpError(404, 'Incident not found');
    ensureExpeditionAccess(req.user, item.expedition_id);
    requireFields(req.body, 'note');
    const result = run(
      'INSERT INTO incident_events(incident_id,event_type,note,user_id,created_at) VALUES(?,?,?,?,?)',
      item.id, req.body.event_type || 'Update', req.body.note, req.user.id, nowIso(),
    );
    recordAudit(req.user, item.expedition_id, 'event_added', 'incident', item.id, req.body);
    broadcast(item.expedition_id, makeEvent('incident.event', item.expedition_id, 'incident', item.id));
    res.status(201).json(get('SELECT * FROM incident_events WHERE id=?', Number(result.lastInsertRowid)));
  } catch (error) { next(error); }
});

export default router;
