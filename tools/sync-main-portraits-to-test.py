#!/usr/bin/env python3
"""Synchronize drop-in portraits from main into the checked-out TESTver worktree.

Only assets/portraits image files are sourced from main. If a previously optimized
portrait has changed upstream, its old archived source and WebP are replaced ONLY
after verifying the prior archived original exists. The old version remains in
Git history. Conversion is done later by the unchanged optimize-art.py wrapper.
No other files, profiles, or branches are changed here.
"""
import os
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PORTRAITS = ROOT / "assets" / "portraits"
ARCHIVE = ROOT / "assets" / "originals" / "portraits"
SOURCE_REF = os.environ.get("PORTRAIT_SOURCE_REF", "refs/remotes/origin/main")
IMAGE = re.compile(r"^[a-z0-9-]+(?:\.(?:normal|win|silly|angry|mad|sad|think|walk))?\.(?:png|jpe?g|webp)$", re.I)


def git(*args):
    return subprocess.run(["git", *args], cwd=ROOT, check=True, capture_output=True).stdout


def blob_id(path):
    if path.is_file():
        return git("hash-object", "--no-filters", str(path)).decode().strip()
    return None


def source_art():
    raw = git("ls-tree", "-r", "-z", SOURCE_REF, "--", "assets/portraits")
    entries = []
    for row in raw.split(b"\0"):
        if not row:
            continue
        metadata, path = row.split(b"\t", 1)
        mode, kind, sha = metadata.decode().split(" ")
        p = path.decode("utf-8")
        name = Path(p).name
        if kind != "blob" or mode != "100644" or not p.startswith("assets/portraits/"):
            raise RuntimeError("Unexpected upstream portrait entry: " + p)
        if IMAGE.fullmatch(name):
            entries.append((p, sha))
        elif name != "README.txt":
            print("SKIP_UNRECOGNIZED", p, flush=True)
    if len(entries) > 10000:
        raise RuntimeError("Unexpected portrait catalog size")
    return entries


def main():
    if not (ROOT / "tools" / "optimize-art.py").exists():
        raise RuntimeError("The original project optimizer is missing")
    if os.environ.get("PORTRAIT_SYNC_DEST", "TESTver") != "TESTver":
        raise RuntimeError("Never sync portraits into main or a release branch")
    copied, replaced, unchanged = [], [], 0
    for relative, sha in source_art():
        target = ROOT / relative
        name = target.name
        archived = ARCHIVE / name
        if blob_id(target) == sha or (target.suffix.lower() != ".webp" and blob_id(archived) == sha):
            unchanged += 1
            continue
        # A changed PNG may supersede a prior converted WebP, but only if the
        # archived original proves that the old WebP came from this filename.
        if target.suffix.lower() in (".png", ".jpg", ".jpeg"):
            webp = target.with_suffix(".webp")
            if webp.is_file() and not archived.is_file():
                raise RuntimeError("Unverifiable WebP collision; refused overwrite: " + str(webp))
            if archived.is_file() and not webp.is_file():
                raise RuntimeError("Orphaned original archive; refused overwrite: " + str(archived))
            if webp.is_file():
                webp.unlink()
                archived.unlink()
                replaced.append(relative)
            elif target.exists():
                replaced.append(relative)
            else:
                copied.append(relative)
        else:
            if target.exists():
                replaced.append(relative)
            else:
                copied.append(relative)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(git("cat-file", "blob", sha))
        if blob_id(target) != sha:
            raise RuntimeError("Blob mismatch for " + relative)
    print("PORTRAIT_SYNC_SUMMARY", "added", len(copied), "updated", len(replaced),
          "unchanged", unchanged, flush=True)
    for p in copied:
        print("PORTRAIT_ADDED", p, flush=True)
    for p in replaced:
        print("PORTRAIT_UPDATED", p, flush=True)


if __name__ == "__main__":
    main()
