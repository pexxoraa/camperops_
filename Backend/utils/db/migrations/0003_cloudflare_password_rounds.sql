-- Cloudflare Web Crypto limits PBKDF2 iterations to 100000.
-- Re-hash the three bundled demo accounts at that supported work factor.
UPDATE users SET password_hash='pbkdf2_sha256$100000$Y2FtcGVyb3BzLWNvbW1hbmRlcg$1zKkbfK_3IrRAG3OE5Nmij8_-aY1BMCGasEQO02Vbzs'
WHERE email='commander@camperops.local';

UPDATE users SET password_hash='pbkdf2_sha256$100000$Y2FtcGVyb3BzLWxvZ2lzdGljcw$C_0Mscgej7lttLGM5_LJJ9Uyf8uORp-UafidLNqx7g4'
WHERE email='logistics@camperops.local';

UPDATE users SET password_hash='pbkdf2_sha256$100000$Y2FtcGVyb3BzLWZpZWxk$5OTq1dLaueGZ13FyplUjzt9G6-tT4aJqNH-ER8VZNq0'
WHERE email='field@camperops.local';
