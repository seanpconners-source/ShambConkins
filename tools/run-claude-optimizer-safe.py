#!/usr/bin/env python3
"""Safely run the project's EXISTING tools/optimize-art.py, unmodified.

Pre-existing compressed files and archived originals are quarantined before the
original script runs, then restored. Output pixels use exactly the historical
Pillow LANCZOS 480px / WebP quality=88 method=6 path. Never force overwrite.
"""
import hashlib
import json
import os
import re
import runpy
import shutil
import tempfile
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "assets"
FOLDERS = ("portraits", "items", "locations")
MIN_COUNT = int(os.environ.get("OPTIMIZER_MIN_COUNT", "1"))


def artwork_keys():
    keys = set()
    for folder in FOLDERS:
        directory = ASSETS / folder
        if not directory.is_dir():
            continue
        for item in directory.iterdir():
            if not item.is_file():
                continue
            if folder == "portraits":
                match = re.fullmatch(
                    r"([a-z0-9-]+)(?:\.(normal|win|silly|angry|sad|think|walk))?\.(webp|png|jpe?g)",
                    item.name, re.I)
                if match:
                    keys.add((folder, match.group(1).lower(), (match.group(2) or "base").lower()))
            else:
                match = re.fullmatch(r"([a-z0-9-]+)\.(webp|png|jpe?g|svg)", item.name, re.I)
                if match:
                    keys.add((folder, match.group(1).lower()))
    return keys


def main():
    original_keys = artwork_keys()
    planned, quarantined, outputs = [], [], set()
    before_bytes = 0
    with tempfile.TemporaryDirectory(prefix="shamb-art-collision-") as temp:
        try:
            for folder in FOLDERS:
                directory = ASSETS / folder
                if not directory.is_dir():
                    continue
                for source in sorted(directory.iterdir()):
                    if not source.is_file() or source.suffix.lower() not in (".png", ".jpg", ".jpeg"):
                        continue
                    size = source.stat().st_size
                    with Image.open(source) as img:
                        eligible = not (max(img.size) <= 480 and size < 120_000)
                    if not eligible:
                        continue
                    compressed = source.with_suffix(".webp")
                    archived = ASSETS / "originals" / folder / source.name
                    if compressed.exists() or archived.exists() or compressed in outputs:
                        saved = Path(temp) / folder / source.name
                        saved.parent.mkdir(parents=True, exist_ok=True)
                        shutil.move(source, saved)
                        reason = ("existing WebP" if compressed.exists() else
                                  "existing archived original" if archived.exists() else
                                  "duplicate conversion output")
                        quarantined.append((source, saved, reason))
                        print("PRESERVE_COLLISION", source.relative_to(ROOT), reason, flush=True)
                        continue
                    outputs.add(compressed)
                    planned.append((source, compressed, archived, size,
                                    hashlib.sha256(source.read_bytes()).hexdigest()))
                    before_bytes += size
            if len(planned) < MIN_COUNT:
                raise RuntimeError(f"Expected >= {MIN_COUNT} eligible non-colliding images; found {len(planned)}")
            # Run Claude's original file and original settings WITHOUT modification.
            runpy.run_path(str(ROOT / "tools" / "optimize-art.py"), run_name="__main__")
        finally:
            for original, saved, _ in quarantined:
                if original.exists():
                    raise RuntimeError(f"Collision overwrite detected: {original}")
                shutil.move(saved, original)
    results = []
    for source, compressed, archived, old_size, original_sha in planned:
        if source.exists() or not compressed.is_file() or not archived.is_file():
            raise RuntimeError(f"Missing compressed image or original backup: {source}")
        if hashlib.sha256(archived.read_bytes()).hexdigest() != original_sha:
            raise RuntimeError(f"Original backup changed: {archived}")
        with Image.open(compressed) as img:
            if img.format != "WEBP" or max(img.size) > 480:
                raise RuntimeError(f"Incorrect output encoding/dimensions: {compressed}")
            new_size = compressed.stat().st_size
            if new_size >= old_size:
                raise RuntimeError(f"No size saving on {source}")
            results.append({
                "name": str(source.relative_to(ROOT)),
                "archived": str(archived.relative_to(ROOT)),
                "webp": str(compressed.relative_to(ROOT)),
                "before": old_size,
                "after": new_size,
                "size": list(img.size),
            })
    if artwork_keys() != original_keys:
        raise RuntimeError("The set of artwork lookup keys changed: preserve character and mood identities")
    after_bytes = sum(item["after"] for item in results)
    report = {
        "method": "unchanged tools/optimize-art.py (Pillow LANCZOS max 480, WebP quality=88 method=6)",
        "optimized_count": len(results),
        "skipped_collisions": [
            {"name": str(source.relative_to(ROOT)), "reason": reason}
            for source, _, reason in quarantined
        ],
        "before_bytes": before_bytes,
        "after_bytes": after_bytes,
        "saved_bytes": before_bytes - after_bytes,
        "files": results,
    }
    out = Path(os.environ.get("OPTIMIZER_REPORT", str(ROOT / "portrait-optimization-report.json")))
    out.write_text(json.dumps(report, indent=2) + "\n")
    print("OPTIMIZATION_SUMMARY", json.dumps({k: v for k, v in report.items() if k != "files"}), flush=True)


if __name__ == "__main__":
    main()
