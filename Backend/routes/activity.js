import { Router } from 'express';
import { all } from '../config/database.js';
import { authRequired } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permissions.js';
import { ensureExpeditionAccess } from '../utils/validation.js';

const router=Router();
router.get('/',authRequired,requirePermission('audit.read'),(req,res,next)=>{
  try{
    const expedition=ensureExpeditionAccess(req.user,req.query.expedition_id);
    const limit=Math.max(1,Math.min(Number(req.query.limit||200),500));
    res.json(all(
      'SELECT a.*,u.name user_name FROM activity a LEFT JOIN users u ON u.id=a.user_id WHERE a.expedition_id=? ORDER BY a.created_at DESC,a.id DESC LIMIT ?',
      expedition.id,limit,
    ));
  }catch(error){next(error);}
});
export default router;
