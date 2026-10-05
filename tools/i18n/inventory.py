#!/usr/bin/env python3
"""List user-facing string literals in the client that look like legacy Portuguese.

Usage: python tools/i18n/inventory.py [--json out.json]
Heuristic: a literal with accented Latin letters or common Portuguese words.
The i18n test (tests/i18n.test.ts) uses the same idea to keep new Portuguese
literals out of the code: new text is written in English and wrapped in t()/tx().
"""
import json
import os
import re
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2] / "apps" / "client"
SKIP = ("node_modules", ".next", "public", "generated", "i18n")
ACCENT = re.compile("[áéíóúâêôãõçÁÉÍÓÚÂÊÔÃÕÇ]")
WORDS = re.compile(r"\b(você|para|com|uma|não|está|seu|sua|dos|das|pelo|que|mais|nenhum)\b", re.I)
LITERAL = re.compile(r'"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`')


def literals(text):
    for match in LITERAL.finditer(text):
        value = match.group(1) if match.group(1) is not None else match.group(2)
        if value and len(value) > 3 and (ACCENT.search(value) or (WORDS.search(value) and " " in value and len(value) > 14)):
            yield value


def main():
    per_file = Counter()
    chars = Counter()
    found = {}
    for base, _dirs, files in os.walk(ROOT):
        if any(part in base for part in SKIP):
            continue
        for name in files:
            if not name.endswith((".ts", ".tsx")):
                continue
            path = Path(base) / name
            text = path.read_text(encoding="utf-8")
            values = list(literals(text))
            if values:
                rel = str(path.relative_to(ROOT.parent.parent)).replace("\\", "/")
                per_file[rel] = len(values)
                chars[rel] = sum(len(v) for v in values)
                found[rel] = values
    for rel, count in sorted(per_file.items(), key=lambda kv: -chars[kv[0]]):
        print(f"{count:4d} {chars[rel]:7d} {rel}")
    print("total literals", sum(per_file.values()), "chars", sum(chars.values()), "files", len(per_file))
    if "--json" in sys.argv:
        out = Path(sys.argv[sys.argv.index("--json") + 1])
        out.write_text(json.dumps(found, ensure_ascii=False, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main()
