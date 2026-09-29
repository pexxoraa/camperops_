import { Router } from 'express';
import { all, get } from '../utils/config/database.js';
import Vehicle from '../models/Vehicle.js';
import { authRequired } from '../utils/middleware/auth.js';
import { requirePermission } from '../utils/middleware/permissions.js';
import { HttpError } from '../utils/http.js';
import { nowIso } from '../utils/helpers.js';
import {
  ensureEntityInExpedition,
  ensureExpeditionAccess,
  requireFields,
} from '../utils/validation.js';
import {
  recordActivity,
  recordAudit,
} from '../utils/services/activityService.js';
import {
  broadcast,
  makeEvent,
} from '../utils/services/realtimeService.js';

const router = Router();
router.use(authRequired);

const details = (id) =>
  get(
    `SELECT v.*,l.name location_name
     FROM vehicles v
     LEFT JOIN locations l ON l.id=v.location_id
     WHERE v.id=?`,
    Number(id),
  );

router.get(
  '/',
  requirePermission('vehicles.read'),
  async (req, res, next) => {
    try {
      const expedition = await ensureExpeditionAccess(
        req.user,
        req.query.expedition_id,
      );
      res.json(
        await all(
          `SELECT v.*,l.name location_name
           FROM vehicles v
           LEFT JOIN locations l ON l.id=v.location_id
           WHERE v.expedition_id=?
           ORDER BY v.code`,
          expedition.id,
        ),
      );
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  '/',
  requirePermission('vehicles.manage'),
  async (req, res, next) => {
    try {
      requireFields(req.body, 'expedition_id', 'code', 'name');
      const expedition = await ensureExpeditionAccess(
        req.user,
        req.body.expedition_id,
      );
      await ensureEntityInExpedition(
        'locations',
        req.body.location_id,
        expedition.id,
        'Location',
      );

      const item = await Vehicle.create({
        expedition_id: expedition.id,
        code: String(req.body.code).toUpperCase(),
        name: req.body.name,
        type: req.body.type || 'Ground',
        location_id: req.body.location_id || null,
        status: req.body.status || 'Operational',
        fuel_percent: Number(req.body.fuel_percent ?? 100),
        range_km: Number(req.body.range_km || 0),
        created_at: nowIso(),
      });

      await recordActivity(
        expedition.id,
        'vehicle',
        'Vehicle ' + item.code + ' added',
        req.user.id,
      );
      await recordAudit(
        req.user,
        expedition.id,
        'created',
        'vehicle',
        item.id,
        req.body,
      );
      await broadcast(
        expedition.id,
        makeEvent(
          'vehicle.created',
          expedition.id,
          'vehicle',
          item.id,
        ),
      );
      res.status(201).json(await details(item.id));
    } catch (error) {
      if (String(error.message).includes('UNIQUE')) {
        error = new HttpError(409, 'Vehicle code already exists');
      }
      next(error);
    }
  },
);

router.patch(
  '/:id',
  requirePermission('vehicles.manage'),
  async (req, res, next) => {
    try {
      const item = await Vehicle.getById(req.params.id);
      if (!item) throw new HttpError(404, 'Vehicle not found');

      await ensureExpeditionAccess(req.user, item.expedition_id);
      await ensureEntityInExpedition(
        'locations',
        req.body.location_id,
        item.expedition_id,
        'Location',
      );

      if (req.body.fuel_percent !== undefined) {
        const fuel = Number(req.body.fuel_percent);
        if (!Number.isFinite(fuel) || fuel < 0 || fuel > 100) {
          throw new HttpError(
            400,
            'Fuel percent must be between 0 and 100',
          );
        }
        req.body.fuel_percent = fuel;
      }

      await Vehicle.update(item.id, req.body);
      await recordAudit(
        req.user,
        item.expedition_id,
        'updated',
        'vehicle',
        item.id,
        req.body,
      );
      await broadcast(
        item.expedition_id,
        makeEvent(
          'vehicle.updated',
          item.expedition_id,
          'vehicle',
          item.id,
        ),
      );
      res.json(await details(item.id));
    } catch (error) {
      next(error);
    }
  },
);

export default router;
