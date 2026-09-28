import { Router } from 'express';
import { all, get } from '../config/database.js';
import Vehicle from '../models/Vehicle.js';
import { authRequired } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permissions.js';
import { HttpError } from '../utils/http.js';
import { nowIso } from '../utils/helpers.js';
import { ensureEntityInExpedition, ensureExpeditionAccess, requireFields } from '../utils/validation.js';
import { recordActivity, recordAudit } from '../services/activityService.js';
import { broadcast, makeEvent } from '../services/realtimeService.js';

const router=Router();router.use(authRequired);
const details=(id)=>get('SELECT v.*,l.name location_name FROM vehicles v LEFT JOIN locations l ON l.id=v.location_id WHERE v.id=?',Number(id));

router.get('/',requirePermission('vehicles.read'),(req,res,next)=>{try{
  const e=ensureExpeditionAccess(req.user,req.query.expedition_id);
  res.json(all('SELECT v.*,l.name location_name FROM vehicles v LEFT JOIN locations l ON l.id=v.location_id WHERE v.expedition_id=? ORDER BY v.code',e.id));
}catch(error){next(error);}});
router.post('/',requirePermission('vehicles.manage'),(req,res,next)=>{try{
  requireFields(req.body,'expedition_id','code','name');const e=ensureExpeditionAccess(req.user,req.body.expedition_id);
  ensureEntityInExpedition('locations',req.body.location_id,e.id,'Location');
  const item=Vehicle.create({expedition_id:e.id,code:String(req.body.code).toUpperCase(),name:req.body.name,type:req.body.type||'Ground',
    location_id:req.body.location_id||null,status:req.body.status||'Operational',fuel_percent:Number(req.body.fuel_percent??100),
    range_km:Number(req.body.range_km||0),created_at:nowIso()});
  recordActivity(e.id,'vehicle','Vehicle '+item.code+' added',req.user.id);recordAudit(req.user,e.id,'created','vehicle',item.id,req.body);
  broadcast(e.id,makeEvent('vehicle.created',e.id,'vehicle',item.id));res.status(201).json(details(item.id));
}catch(error){if(String(error.message).includes('UNIQUE'))error=new HttpError(409,'Vehicle code already exists');next(error);}});

router.patch('/:id',requirePermission('vehicles.manage'),(req,res,next)=>{try{
  const item=Vehicle.getById(req.params.id);if(!item)throw new HttpError(404,'Vehicle not found');ensureExpeditionAccess(req.user,item.expedition_id);
  ensureEntityInExpedition('locations',req.body.location_id,item.expedition_id,'Location');
  if(req.body.fuel_percent!==undefined){const fuel=Number(req.body.fuel_percent);if(!Number.isFinite(fuel)||fuel<0||fuel>100)throw new HttpError(400,'Fuel percent must be between 0 and 100');req.body.fuel_percent=fuel;}
  Vehicle.update(item.id,req.body);recordAudit(req.user,item.expedition_id,'updated','vehicle',item.id,req.body);
  broadcast(item.expedition_id,makeEvent('vehicle.updated',item.expedition_id,'vehicle',item.id));res.json(details(item.id));
}catch(error){next(error);}});

export default router;
