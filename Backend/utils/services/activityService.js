import { run } from '../config/database.js';
import { nowIso } from '../utils/helpers.js';

export function recordActivity(expeditionId, category, message, userId = null) {
  run('INSERT INTO activity(expedition_id,category,message,user_id,created_at) VALUES(?,?,?,?,?)',
    Number(expeditionId), category, message, userId, nowIso());
}

export function recordAudit(user, expeditionId, action, entityType, entityId = null, detail = null) {
  run('INSERT INTO audit_events(organization_id,expedition_id,user_id,action,entity_type,entity_id,detail_json,created_at) VALUES(?,?,?,?,?,?,?,?)',
    Number(user.organization_id), expeditionId ? Number(expeditionId) : null, Number(user.id), action, entityType,
    entityId ? Number(entityId) : null, detail ? JSON.stringify(detail) : null, nowIso());
}
