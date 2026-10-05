#!/usr/bin/env python3
import sys as _s
_s.stdout.reconfigure(encoding="utf-8")
"""List legacy-Portuguese literals in the client that are not catalog keys yet.

Usage: python tools/i18n/audit.py [path-substring ...]   (exit code 1 when something is missing)
A literal is covered when it equals a catalog key or is a fragment of one (long texts are
sometimes written as concatenated pieces).
"""
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from inventory import ROOT, literals  # noqa: E402

CATALOG_DIR = ROOT / "lib" / "i18n" / "catalog"
KEY = re.compile(r'^  ("(?:[^"\\n]|\.)*"|[A-Za-z_]\w*): \{', re.M)


def catalog_keys():
    keys = set()
    for path in CATALOG_DIR.glob("*.ts"):
        for match in KEY.finditer(path.read_text(encoding="utf-8")):
            raw = match.group(1)
            keys.add(json.loads(raw) if raw.startswith('"') else raw)
    return keys


def decode(value):
    return value.replace("\n", "\n").replace('\\"', '"').replace("\'", "'").replace("\\\\", "\\")


def main():
    filters = [a for a in sys.argv[1:] if not a.startswith("--")]
    keys = catalog_keys()
    blob = "\n".join(keys)
    missing = {}
    for path in ROOT.rglob("*.ts*"):
        rel = str(path.relative_to(ROOT.parent.parent)).replace("\\", "/")
        if any(part in rel for part in ("node_modules", ".next", "/public/", "/generated/", "/i18n/")):
            continue
        if filters and not any(f in rel for f in filters):
            continue
        for value in literals(path.read_text(encoding="utf-8")):
            text = decode(value)
            if "${" in value:
                missing.setdefault(rel, []).append("[template] " + value)
            elif text not in keys and text not in blob:
                missing.setdefault(rel, []).append(text)
    for rel, values in sorted(missing.items()):
        print(f"{len(values):4d} {rel}")
        for value in values[: 3 if "--brief" in sys.argv else 999]:
            print("      ", value[:110].replace("\n", " "))
    total = sum(len(v) for v in missing.values())
    print("missing", total, "in", len(missing), "files")
    sys.exit(1 if total else 0)


if __name__ == "__main__":
    main()
