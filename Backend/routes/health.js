import { Router } from 'express';
import { get } from '../config/database.js';

const router = Router();

router.get('/', (req, res) => {
  const migrations = Number(get('SELECT COUNT(*) AS count FROM schema_migrations')?.count || 0);
  res.json({ ok: true, service: 'polarops-backend', database: 'sqlite', migrations, time: new Date().toISOString() });
});

export default router;
