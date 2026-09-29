import { all, get } from '../config/database.js';
import { getUnifiedAlerts } from './alertService.js';

const scalar=(sql,id)=>Number(get(sql,Number(id))?.value||0);

export function getDashboard(expeditionId) {
  const id=Number(expeditionId);
  const vehicleRows=all('SELECT * FROM vehicles WHERE expedition_id=? ORDER BY code',id);
  const alerts=getUnifiedAlerts(id);
  return {
    personnel:{
      total:scalar('SELECT COUNT(*) value FROM personnel WHERE expedition_id=?',id),
      safe:scalar("SELECT COUNT(*) value FROM personnel WHERE expedition_id=? AND status='Safe'",id),
      moving:scalar("SELECT COUNT(*) value FROM personnel WHERE expedition_id=? AND status IN ('Moving','Deployed')",id),
      attention:scalar("SELECT COUNT(*) value FROM personnel WHERE expedition_id=? AND status NOT IN ('Safe','Moving','Deployed')",id)
    },
    cargo:{
      total:scalar('SELECT COUNT(*) value FROM cargo WHERE expedition_id=?',id),
      in_transit:scalar("SELECT COUNT(*) value FROM cargo WHERE expedition_id=? AND status='In Transit'",id),
      delivered:scalar("SELECT COUNT(*) value FROM cargo WHERE expedition_id=? AND status='Delivered'",id)
    },
    inventory_warnings:scalar('SELECT COUNT(*) value FROM inventory_items WHERE expedition_id=? AND quantity < min_quantity',id),
    vehicles:{
      total:vehicleRows.length,
      operational:vehicleRows.filter(x=>x.status==='Operational').length,
      low_fuel:vehicleRows.filter(x=>Number(x.fuel_percent)<30).length,
      average_fuel:vehicleRows.length?Math.round(vehicleRows.reduce((s,x)=>s+Number(x.fuel_percent||0),0)/vehicleRows.length):0
    },
    active_incidents:scalar("SELECT COUNT(*) value FROM incidents WHERE expedition_id=? AND status!='Resolved'",id),
    operational_risks:alerts.filter(x=>x.status!=='Resolved').slice(0,8),
    recent_activity:all('SELECT a.*,u.name user_name FROM activity a LEFT JOIN users u ON u.id=a.user_id WHERE a.expedition_id=? ORDER BY a.created_at DESC,a.id DESC LIMIT 12',id)
  };
}
