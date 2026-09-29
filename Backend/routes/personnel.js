import { Router } from 'express';
import { all, get } from '../utils/config/database.js';
import Personnel from '../models/Personnel.js';
import { authRequired } from '../utils/middleware/auth.js';
import { requirePermission } from '../utils/middleware/permissions.js';
import { HttpError } from '../utils/http.js';
import { nowIso } from '../utils/helpers.js';
import { ensureEntityInExpedition, ensureExpeditionAccess, requireFields } from '../utils/validation.js';
import { recordActivity, recordAudit } from '../utils/services/activityService.js';

const router = Router();
router.use(authRequired);

const details = (id) => get(
  'SELECT p.*,l.name location_name FROM personnel p LEFT JOIN locations l ON l.id=p.location_id WHERE p.id=?',
  Number(id),
);

router.get('/', requirePermission('personnel.read'), (req, res, next) => {
  try {
    const expedition = ensureExpeditionAccess(req.user, req.query.expedition_id);
    res.json(all(
      'SELECT p.*,l.name location_name FROM personnel p LEFT JOIN locations l ON l.id=p.location_id WHERE p.expedition_id=? ORDER BY p.team,p.name',
      expedition.id,
    ));
  } catch (error) { next(error); }
});

router.post('/', requirePermission('personnel.manage'), (req, res, next) => {
  try {
    requireFields(req.body, 'expedition_id', 'name', 'role');
    const expedition = ensureExpeditionAccess(req.user, req.body.expedition_id);
    ensureEntityInExpedition('locations', req.body.location_id, expedition.id, 'Location');
    const item = Personnel.create({
      expedition_id: expedition.id, external_id: req.body.external_id || null,
      name: req.body.name, role: req.body.role, team: req.body.team || '',
      location_id: req.body.location_id || null, status: req.body.status || 'Safe',
      last_checkin: req.body.last_checkin || null, contact: req.body.contact || '',
      clearance_status: req.body.clearance_status || 'Cleared',
      source: req.body.source || 'manual', is_synthetic: req.body.is_synthetic ? 1 : 0,
      created_at: nowIso(),
    });
    recordActivity(expedition.id, 'personnel', 'Personnel ' + item.name + ' added', req.user.id);
    recordAudit(req.user, expedition.id, 'created', 'personnel', item.id, req.body);
    res.status(201).json(details(item.id));
  } catch (error) { next(error); }
});
router.patch('/:id', requirePermission('personnel.manage'), (req, res, next) => {
  try {
    const item = Personnel.getById(req.params.id);
    if (!item) throw new HttpError(404, 'Personnel not found');
    ensureExpeditionAccess(req.user, item.expedition_id);
    ensureEntityInExpedition('locations', req.body.location_id, item.expedition_id, 'Location');
    const updated = Personnel.update(item.id, req.body);
    recordAudit(req.user, item.expedition_id, 'updated', 'personnel', item.id, req.body);
    res.json(details(updated.id));
  } catch (error) { next(error); }
});

router.post('/:id/checkin', requirePermission('personnel.checkin'), (req, res, next) => {
  try {
    const item = Personnel.getById(req.params.id);
    if (!item) throw new HttpError(404, 'Personnel not found');
    ensureExpeditionAccess(req.user, item.expedition_id);
    ensureEntityInExpedition('locations', req.body.location_id, item.expedition_id, 'Location');
    Personnel.update(item.id, {
      location_id: req.body.location_id ?? item.location_id,
      status: req.body.status || 'Safe',
      last_checkin: nowIso(),
    });
    recordActivity(item.expedition_id, 'personnel', item.name + ' checked in', req.user.id);
    recordAudit(req.user, item.expedition_id, 'checkin', 'personnel', item.id, req.body);
    res.json(details(item.id));
  } catch (error) { next(error); }
});

router.delete('/:id', requirePermission('personnel.manage'), (req, res, next) => {
  try {
    const item = Personnel.getById(req.params.id);
    if (!item) throw new HttpError(404, 'Personnel not found');
    ensureExpeditionAccess(req.user, item.expedition_id);
    Personnel.delete(item.id);
    recordAudit(req.user, item.expedition_id, 'deleted', 'personnel', item.id);
    res.json({ ok: true });
  } catch (error) { next(error); }
});

export default router;
