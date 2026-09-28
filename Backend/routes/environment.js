import { Router } from 'express';
import { authRequired } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permissions.js';
import { ensureExpeditionAccess } from '../utils/validation.js';
import { environmentOverview } from '../services/environmentService.js';

const router=Router();
router.get('/overview',authRequired,requirePermission('environment.read'),async(req,res,next)=>{
  try{
    const expedition=ensureExpeditionAccess(req.user,req.query.expedition_id);
    res.json(await environmentOverview(expedition,String(req.query.force||'')==='1'));
  }catch(error){next(error);}
});
export default router;
