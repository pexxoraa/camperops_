from __future__ import annotations

import ast
import base64
import hashlib
import pathlib
import re
import sqlite3

ROOT = pathlib.Path(__file__).resolve().parents[1]

# Python syntax
ast.parse((ROOT / "src/worker.py").read_text())

# D1 SQL is SQLite-compatible enough to validate locally.
con = sqlite3.connect(":memory:")
con.executescript((ROOT / "migrations/0001_initial.sql").read_text())
con.executescript((ROOT / "migrations/0002_seed_demo.sql").read_text())
assert con.execute("SELECT COUNT(*) FROM users").fetchone()[0] == 3
assert con.execute("SELECT COUNT(*) FROM expeditions").fetchone()[0] == 1
assert con.execute("SELECT COUNT(*) FROM personnel").fetchone()[0] == 6
assert con.execute("SELECT COUNT(*) FROM vehicles").fetchone()[0] == 5

# Verify seeded password hashes.
def verify(password: str, encoded: str) -> bool:
    algo, rounds, salt_b64, digest_b64 = encoded.split("$", 3)
    assert algo == "pbkdf2_sha256"
    salt = base64.urlsafe_b64decode(salt_b64.encode())
    expected = base64.urlsafe_b64decode(digest_b64.encode())
    actual = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, int(rounds))
    return actual == expected

rows = con.execute("SELECT email,password_hash FROM users ORDER BY id").fetchall()
assert verify("PolarOps123!", rows[0][1])
assert verify("Logistics123!", rows[1][1])
assert verify("Field123!", rows[2][1])

# Basic route coverage for frontend API calls.
js = (ROOT / "public/static/app.js").read_text()
worker = (ROOT / "src/worker.py").read_text()
required = [
    "/api/auth/login", "/api/me", "/api/expeditions", "/api/dashboard",
    "/api/locations", "/api/personnel", "/api/cargo", "/api/inventory",
    "/api/vehicles", "/api/assets", "/api/incidents", "/api/activity",
    "/api/data-sources", "/api/public/facilities", "/api/backup",
    "/api/telemetry/position", "/api/integrations/workers/status",
]
for route in required:
    assert route in js, f"frontend missing {route}"
    assert route in worker, f"worker missing {route}"

print("POLAROPS_CLOUDFLARE_OFFLINE_CHECKS_PASS")
