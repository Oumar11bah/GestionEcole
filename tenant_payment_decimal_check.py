import os
import sqlite3
from decimal import Decimal, InvalidOperation

path = os.path.join(os.getcwd(), 'db.sqlite3')
print('DB:', path)
conn = sqlite3.connect(path)
conn.row_factory = sqlite3.Row
cur = conn.cursor()

for table, dec_cols in [
    ('payments_payment', ['total_amount', 'amount_paid']),
    ('payments_feetype', ['amount']),
    ('teachers_teacher', ['salary']),
]:
    print('TABLE', table, 'dec_cols', dec_cols)
    cur.execute(f"PRAGMA table_info('{table}')")
    cols = [row['name'] for row in cur.fetchall()]
    print('  cols', cols)
    for tcol in ['tenant_id', 'tenant']:
        if tcol not in cols:
            continue
        try:
            rows = cur.execute(f"SELECT rowid, * FROM {table} WHERE {tcol}=1").fetchall()
        except Exception as e:
            print('  tenant_col', tcol, 'failed', e)
            continue
        print('  rows', len(rows), 'for', tcol)
        for row in rows:
            bad = False
            for col in dec_cols:
                val = row[col]
                if val is None:
                    continue
                try:
                    Decimal(str(val))
                except (InvalidOperation, ValueError) as e:
                    print('   BAD', table, 'row', row['rowid'], col, repr(val), type(val), e)
                    bad = True
            if bad:
                print('   full row:', {col: row[col] for col in cols})
print('done')
