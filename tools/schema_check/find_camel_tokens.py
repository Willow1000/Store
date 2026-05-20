#!/usr/bin/env python3
import re, os, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
INCLUDE = ['server', 'client', 'tools', 'drizzle', 'order-status-emailer']
EXTS = ('.ts', '.tsx', '.js', '.jsx', '.py', '.sql', '.jsx', '.json')

camel_re = re.compile(r"\b([a-z]+[A-Z][A-Za-z0-9_]*)\b")
context_re = re.compile(r"(select\s*\(|\.eq\s*\(|\.lt\s*\(|\.update\s*\(|FROM\s+|from_\s*\()", re.IGNORECASE)

results = []
for root, dirs, files in os.walk(ROOT):
    parts = root.split(os.sep)
    if not any(p in parts for p in INCLUDE):
        continue
    for f in files:
        if not f.endswith(EXTS):
            continue
        path = os.path.join(root, f)
        try:
            txt = open(path, 'r', encoding='utf8', errors='ignore').read()
        except Exception:
            continue
        for m in camel_re.finditer(txt):
            tok = m.group(1)
            # check if token appears near DB query contexts (within 80 chars before)
            i = m.start(1)
            before = txt[max(0, i-120):i]
            if context_re.search(before):
                # get line number
                line_no = txt.count('\n', 0, i) + 1
                results.append((path, line_no, tok))

# print results
if not results:
    print('No camelCase DB-ish tokens found in selected folders.')
    sys.exit(0)

for path, line, tok in results:
    print(f"{path}:{line}: {tok}")

print('\nTotal matches: %d' % len(results))
