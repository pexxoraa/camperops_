import { Router } from 'express';
import { all, get, run } from '../utils/config/database.js';
import Cargo from '../models/Cargo.js';
import { authRequired } from '../utils/middleware/auth.js';
import { requirePermission } from '../utils/middleware/permissions.js';
import { HttpError } from '../utils/http.js';
import { nowIso } from '../utils/helpers.js';
import { ensureEntityInExpedition, ensureExpeditionAccess, requireFields } from '../utils/validation.js';
import { recordActivity, recordAudit } from '../utils/services/activityService.js';
import { broadcast, makeEvent } from '../utils/services/realtimeService.js';

const router = Router();
router.use(authRequired);

const details = (id) => get(
  `SELECT c.*,o.name origin_name,d.name destination_name,l.name location_name
   FROM cargo c LEFT JOIN locations o ON o.id=c.origin_location_id
   LEFT JOIN locations d ON d.id=c.destination_location_id
   LEFT JOIN locations l ON l.id=c.current_location_id WHERE c.id=?`,
  Number(id),
);

router.get('/', requirePermission('cargo.read'), (req, res, next) => {
  try {
    const expedition = ensureExpeditionAccess(req.user, req.query.expedition_id);
    res.json(all(
      `SELECT c.*,o.name origin_name,d.name destination_name,l.name location_name
       FROM cargo c LEFT JOIN locations o ON o.id=c.origin_location_id
       LEFT JOIN locations d ON d.id=c.destination_location_id
       LEFT JOIN locations l ON l.id=c.current_location_id
       WHERE c.expedition_id=? ORDER BY c.created_at DESC,c.id DESC`,
      expedition.id,
    ));
  } catch (error) { next(error); }
});
router.post('/', requirePermission('cargo.manage'), (req, res, next) => {
  try {
    requireFields(req.body, 'expedition_id', 'code', 'name');
    const expedition = ensureExpeditionAccess(req.user, req.body.expedition_id);
    for (const [field,label] of [['origin_location_id','Origin'],['destination_location_id','Destination'],['current_location_id','Current location']]) {
      ensureEntityInExpedition('locations', req.body[field], expedition.id, label);
    }
    const item = Cargo.create({
      expedition_id: expedition.id, code: String(req.body.code).toUpperCase(),
      name: req.body.name, priority: req.body.priority || 'Medium',
      origin_location_id: req.body.origin_location_id || null,
      destination_location_id: req.body.destination_location_id || null,
      current_location_id: req.body.current_location_id || null,
      status: req.body.status || 'Registered', quantity: Number(req.body.quantity ?? 1),
      unit: req.body.unit || 'unit', assigned_to: req.body.assigned_to || '',
      created_at: nowIso(),
    });
    run('INSERT INTO cargo_events(cargo_id,location_id,event_type,note,user_id,created_at) VALUES(?,?,?,?,?,?)',
      item.id, item.current_location_id, 'Registered', 'Cargo registered', req.user.id, nowIso());
    recordActivity(expedition.id, 'cargo', 'Cargo ' + item.code + ' registered', req.user.id);
    recordAudit(req.user, expedition.id, 'created', 'cargo', item.id, req.body);
    broadcast(expedition.id, makeEvent('cargo.created', expedition.id, 'cargo', item.id));
    res.status(201).json(details(item.id));
  } catch (error) {
    if (String(error.message).includes('UNIQUE')) error = new HttpError(409, 'Cargo code already exists');
    next(error);
  }
});
router.patch('/:id', requirePermission('cargo.manage'), (req, res, next) => {
  try {
    const item = Cargo.getById(req.params.id);
    if (!item) throw new HttpError(404, 'Cargo not found');
    ensureExpeditionAccess(req.user, item.expedition_id);
    for (const [field,label] of [['origin_location_id','Origin'],['destination_location_id','Destination'],['current_location_id','Current location']]) {
      ensureEntityInExpedition('locations', req.body[field], item.expedition_id, label);
    }
    Cargo.update(item.id, req.body);
    recordAudit(req.user, item.expedition_id, 'updated', 'cargo', item.id, req.body);
    broadcast(item.expedition_id, makeEvent('cargo.updated', item.expedition_id, 'cargo', item.id));
    res.json(details(item.id));
  } catch (error) { next(error); }
});

router.post('/:id/move', requirePermission('cargo.manage'), (req, res, next) => {
  try {
    const item = Cargo.getById(req.params.id);
    if (!item) throw new HttpError(404, 'Cargo not found');
    ensureExpeditionAccess(req.user, item.expedition_id);
    ensureEntityInExpedition('locations', req.body.location_id, item.expedition_id, 'Location');
    requireFields(req.body, 'location_id');
    const status = req.body.status || item.status;
    Cargo.update(item.id, { current_location_id: Number(req.body.location_id), status });
    run('INSERT INTO cargo_events(cargo_id,location_id,event_type,note,user_id,created_at) VALUES(?,?,?,?,?,?)',
      item.id, Number(req.body.location_id), 'Movement', req.body.note || '', req.user.id, nowIso());
    recordActivity(item.expedition_id, 'cargo', 'Cargo ' + item.code + ' moved', req.user.id);
    recordAudit(req.user, item.expedition_id, 'moved', 'cargo', item.id, req.body);
    broadcast(item.expedition_id, makeEvent('cargo.moved', item.expedition_id, 'cargo', item.id));
    res.json(details(item.id));
  } catch (error) { next(error); }
});
router.get('/:id/events', requirePermission('cargo.read'), (req, res, next) => {
  try {
    const item = Cargo.getById(req.params.id);
    if (!item) throw new HttpError(404, 'Cargo not found');
    ensureExpeditionAccess(req.user, item.expedition_id);
    res.json(all(
      `SELECT e.*,l.name location_name,u.name user_name FROM cargo_events e
       LEFT JOIN locations l ON l.id=e.location_id LEFT JOIN users u ON u.id=e.user_id
       WHERE e.cargo_id=? ORDER BY e.created_at DESC,e.id DESC`,
      item.id,
    ));
  } catch (error) { next(error); }
});

export default router;
