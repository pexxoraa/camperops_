import { Router } from 'express';
import { all, get, run } from '../config/database.js';
import { authRequired } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permissions.js';
import { nowIso } from '../utils/helpers.js';
import { ensureEntityInExpedition, ensureExpeditionAccess, requireFields, validateCoordinates } from '../utils/validation.js';

const router = Router();
router.use(authRequired);

function insertPosition(user, payload) {
  requireFields(payload, 'expedition_id', 'entity_type', 'entity_id', 'latitude', 'longitude');
  const expedition = ensureExpeditionAccess(user, payload.expedition_id);
  if (!['personnel', 'vehicle'].includes(payload.entity_type)) {
    const error = new Error('Invalid telemetry entity type');
    error.status = 400;
    throw error;
  }
  ensureEntityInExpedition(
    payload.entity_type === 'personnel' ? 'personnel' : 'vehicles',
    payload.entity_id,
    expedition.id,
    'Telemetry entity',
  );
  const [latitude, longitude] = validateCoordinates(payload.latitude, payload.longitude);
  const receivedAt = nowIso();
  const recordedAt = payload.recorded_at || receivedAt;
  const result = run(
    'INSERT INTO telemetry_positions(expedition_id,entity_type,entity_id,latitude,longitude,altitude_m,accuracy_m,speed_kph,heading,source,recorded_at,received_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)',
    expedition.id, payload.entity_type, Number(payload.entity_id), latitude, longitude,
    payload.altitude_m ?? null, payload.accuracy_m ?? null, payload.speed_kph ?? null,
    payload.heading ?? null, payload.source || 'gps', recordedAt, receivedAt,
  );
  if (payload.entity_type === 'personnel') {
    run('UPDATE personnel SET last_checkin=? WHERE id=?', recordedAt, Number(payload.entity_id));
  }
  return get('SELECT * FROM telemetry_positions WHERE id=?', Number(result.lastInsertRowid));
}
router.post('/position', requirePermission('telemetry.manage'), (req, res, next) => {
  try { res.status(201).json(insertPosition(req.user, req.body)); } catch (error) { next(error); }
});

router.post('/batch', requirePermission('telemetry.manage'), (req, res, next) => {
  try {
    const rows = Array.isArray(req.body) ? req.body : req.body.items || [];
    res.status(201).json({ items: rows.map((payload) => insertPosition(req.user, payload)) });
  } catch (error) { next(error); }
});

router.get('/latest', requirePermission('personnel.read'), (req, res, next) => {
  try {
    const expedition = ensureExpeditionAccess(req.user, req.query.expedition_id);
    res.json(all(
      'SELECT t.* FROM telemetry_positions t JOIN (SELECT entity_type,entity_id,MAX(id) id FROM telemetry_positions WHERE expedition_id=? GROUP BY entity_type,entity_id) x ON x.id=t.id ORDER BY t.entity_type,t.entity_id',
      expedition.id,
    ));
  } catch (error) { next(error); }
});

router.get('/history', requirePermission('personnel.read'), (req, res, next) => {
  try {
    const expedition = ensureExpeditionAccess(req.user, req.query.expedition_id);
    let sql = 'SELECT * FROM telemetry_positions WHERE expedition_id=?';
    const params = [expedition.id];
    if (req.query.entity_type) { sql += ' AND entity_type=?'; params.push(req.query.entity_type); }
    if (req.query.entity_id) { sql += ' AND entity_id=?'; params.push(Number(req.query.entity_id)); }
    res.json(all(sql + ' ORDER BY recorded_at DESC LIMIT 500', ...params));
  } catch (error) { next(error); }
});

export default router;
