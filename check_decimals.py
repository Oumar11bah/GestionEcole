import sqlite3
from decimal import Decimal, InvalidOperation

conn = sqlite3.connect('db.sqlite3')
cur = conn.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [r[0] for r in cur.fetchall()]
for table in tables:
    cur = conn.execute(f'PRAGMA table_info({table})')
    dec_cols = [c[1] for c in cur.fetchall() if c[2] == 'decimal']
    if dec_cols:
        for col in dec_cols:
            try:
                cur = conn.execute(f'SELECT id, [{col}] FROM [{table}]')
                for r in cur.fetchall():
                    val = r[1]
                    if val is not None:
                        try:
                            Decimal(str(val))
                        except InvalidOperation:
                            print(f'BAD: {table} id={r[0]} {col}={val!r}')
            except Exception as e:
                print(f'{table}.{col}: {e}')
conn.close()
print('Done checking all tables')
