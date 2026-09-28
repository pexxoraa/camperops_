import { Router } from 'express';
import { all, get, seedFacilitiesSnapshot } from '../config/database.js';
import { authRequired } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permissions.js';
import { HttpError } from '../utils/http.js';

const router = Router();

router.get('/public/facilities', (req, res) => {
  const rows = all(
    `SELECT id,source_key,name,country,programme,facility_type,seasonality,status,
      latitude,longitude,source,source_url,source_updated_at,synced_at
     FROM public_facilities ORDER BY country,name`,
  );
  res.json(rows.map((row) => ({ ...row, data_kind:'reference', live:false })));
});

router.get('/public/research-stations-reference', (req, res) => {
  res.json({
    source_title:'COMNAP Research Stations Map',
    source_period:'1998-2005',
    data_kind:'historical_reference',
    live:false,
    items:all('SELECT * FROM research_station_reference ORDER BY map_number'),
  });
});

router.get('/public/arctic-research-stations', (req, res) => {
  res.json({
    data_kind:'reference_with_verification',
    live:false,
    items:all('SELECT * FROM arctic_research_stations ORDER BY name'),
  });
});
router.get('/data-sources', authRequired, requirePermission('facilities.read'), (req, res) => {
  res.json(all('SELECT * FROM data_sources ORDER BY name'));
});

router.post('/public/facilities/sync', authRequired, requirePermission('facilities.manage'), (req, res) => {
  seedFacilitiesSnapshot(undefined, true);
  const count = Number(get('SELECT COUNT(*) count FROM public_facilities')?.count || 0);
  res.json({
    ok:true,
    count,
    source:'local November 2024 COMNAP snapshot',
    live:false,
    note:'Local development reloads the bundled reference snapshot and does not modify production data.',
  });
});

router.get('/public/facilities/:id/weather', authRequired, requirePermission('facilities.read'), async (req,res,next)=>{
  try{
    const facility=get('SELECT * FROM public_facilities WHERE id=?',Number(req.params.id));
    if(!facility)throw new HttpError(404,'Facility not found');
    const cached=get('SELECT * FROM facility_weather WHERE facility_id=?',facility.id);
    res.json({facility,cached_weather:cached||null,live:false,
      note:'Use the expedition environment endpoint for optional local live weather fetches.'});
  }catch(error){next(error);}
});

router.post('/public/facilities/:id/import', authRequired, requirePermission('facilities.manage'), (req,res,next)=>{
  try{
    const facility=get('SELECT * FROM public_facilities WHERE id=?',Number(req.params.id));
    if(!facility)throw new HttpError(404,'Facility not found');
    res.status(501).json({error:'Import is intentionally disabled in the local refactor until an explicit expedition/location mapping is provided.',facility});
  }catch(error){next(error);}
});

export default router;
