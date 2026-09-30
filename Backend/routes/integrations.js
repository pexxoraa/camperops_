import { Router } from 'express';
import { env } from '../utils/config/env.js';
import { authRequired } from '../utils/middleware/auth.js';
import { requirePermission } from '../utils/middleware/permissions.js';

const router=Router();
router.use(authRequired);

router.get('/workers/status',requirePermission('operations.read'),(req,res)=>{
  res.json({
    configured:Boolean(env.operationsFeedUrl),
    status:env.operationsFeedUrl?'configured':'not configured',
    note:'The operations feed URL is never returned to clients.',
  });
});

router.post('/workers/sync',requirePermission('operations.manage'),(req,res)=>{
  if(!env.operationsFeedUrl){
    res.status(409).json({error:'OPERATIONS_FEED_URL is not configured'});
    return;
  }
  res.status(501).json({
    error:'Automatic worker-feed writes are disabled until the provider schema is explicitly authorized.',
  });
});

export default router;
