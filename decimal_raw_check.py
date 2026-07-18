import os
import sqlite3
from decimal import Decimal, InvalidOperation

path = os.path.join(os.getcwd(), 'db.sqlite3')
print('DB:', path)
conn = sqlite3.connect(path)
conn.row_factory = sqlite3.Row
cur = conn.cursor()

candidates = [
    ('teachers_teacher', ['salary']),
    ('payments_feetype', ['amount']),
    ('payments_payment', ['total_amount', 'amount_paid']),
]

for table, dec_cols in candidates:
    print('TABLE', table, 'dec_cols', dec_cols)
    cur.execute(f"PRAGMA table_info('{table}')")
    cols = [r['name'] for r in cur.fetchall()]
    print('  cols', cols)
    if 'tenant_id' not in cols and 'tenant' not in cols:
        print('  no tenant column, skipping')
        continue
    q = f"SELECT * FROM {table} WHERE tenant_id = 1"
    rows = cur.execute(q).fetchall()
    print('  rows', len(rows))
    for row in rows:
        print('  ROW', {k: row[k] for k in row.keys() if k in ['id', 'tenant_id']}, {col: row[col] for col in dec_cols})
        for col in dec_cols:
            val = row[col]
            try:
                if val is None:
                    print('   OK', col, 'NULL')
                else:
                    Decimal(str(val))
                    print('   OK', col, repr(val), type(val))
            except (InvalidOperation, ValueError) as e:
                print('   BAD', col, repr(val), type(val), e)
print('done')
