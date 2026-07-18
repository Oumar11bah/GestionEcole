import os
import sqlite3

path = os.path.join(os.getcwd(), 'db.sqlite3')
conn = sqlite3.connect(path)
conn.row_factory = sqlite3.Row
cur = conn.cursor()

candidates = [
    ('payments_payment', ['total_amount', 'amount_paid']),
    ('payments_feetype', ['amount']),
    ('payments_paymenthistory', ['amount']),
]

for table, cols in candidates:
    print('TABLE', table)
    q = f"SELECT id, {', '.join(cols)} FROM {table}"
    for row in cur.execute(q):
        for col in cols:
            val = row[col]
            if val is None:
                continue
            try:
                v = float(val)
            except Exception:
                print(' BAD VALUE', table, row['id'], col, repr(val), type(val))
                continue
            if abs(v) >= 10**8:
                print(' OVERFLOW', table, row['id'], col, val)
print('done')
