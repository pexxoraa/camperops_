-- Rename bundled demo identity records for the CamperOps brand.
-- This keeps already-initialized demo databases compatible with the renamed app.

UPDATE organizations
SET name='CamperOps Demo Programme'
WHERE id=1 AND country_code='XX';

UPDATE users
SET email='commander@camperops.local',
    password_hash='pbkdf2_sha256$100000$Y2FtcGVyb3BzLWNvbW1hbmRlcg$1zKkbfK_3IrRAG3OE5Nmij8_-aY1BMCGasEQO02Vbzs'
WHERE id=1 AND organization_id=1 AND role='commander';

UPDATE users
SET email='logistics@camperops.local',
    password_hash='pbkdf2_sha256$100000$Y2FtcGVyb3BzLWxvZ2lzdGljcw$C_0Mscgej7lttLGM5_LJJ9Uyf8uORp-UafidLNqx7g4'
WHERE id=2 AND organization_id=1 AND role='logistics';

UPDATE users
SET email='field@camperops.local',
    password_hash='pbkdf2_sha256$100000$Y2FtcGVyb3BzLWZpZWxk$5OTq1dLaueGZ13FyplUjzt9G6-tT4aJqNH-ER8VZNq0'
WHERE id=3 AND organization_id=1 AND role='field';
