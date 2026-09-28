import { Router } from 'express';
import { authRequired } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permissions.js';
import { ensureExpeditionAccess } from '../utils/validation.js';
import { getDashboard } from '../services/dashboardService.js';

const router=Router();
router.get('/',authRequired,requirePermission('dashboard.read'),(req,res,next)=>{
  try {
    const expedition=ensureExpeditionAccess(req.user,req.query.expedition_id);
    res.json({expedition,...getDashboard(expedition.id)});
  } catch(error) { next(error); }
});
export default router;
