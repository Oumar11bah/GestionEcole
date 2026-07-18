import sqlite3
import os
from decimal import Decimal, InvalidOperation

path = os.path.join(os.getcwd(), 'db.sqlite3')
print('DB:', path)
conn = sqlite3.connect(path)
conn.row_factory = sqlite3.Row
cur = conn.cursor()
cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
models = [r[0] for r in cur.fetchall()]
print('Tables:', len(models))
for table in models:
    cur.execute(f"PRAGMA table_info('{table}')")
    cols = cur.fetchall()
    dec_cols = [c['name'] for c in cols if c['type'] and ('DECIMAL' in c['type'].upper() or 'NUMERIC' in c['type'].upper())]
    if not dec_cols:
        continue
    if not any(c['name'] in ('tenant_id', 'tenant') for c in cols):
        continue
    print('TABLE', table, 'DECIMAL cols', dec_cols)
    q = f"SELECT rowid, * FROM {table} WHERE tenant_id = 1 OR tenant = 1"
    try:
        rows = cur.execute(q).fetchall()
    except Exception as e:
        print(' QUERY FAILED:', e)
        continue
    print('  row count', len(rows))
    for row in rows[:20]:
        for col in dec_cols:
            v = row[col]
            if v is None:
                continue
            try:
                Decimal(str(v))
            except (InvalidOperation, ValueError) as e:
                print('   BAD', table, 'row', row['rowid'], col, repr(v), type(v), e)
                raise
print('done')
