import bz2
import hashlib
import json
import pathlib
import shutil
import sys
import zipfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
SANDBOX = ROOT / ".data-sandbox"
RAW = SANDBOX / "raw"
WORK = SANDBOX / "work"
MANIFEST = ROOT / "scripts" / "sources" / "raw.json"

def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()

def check(item):
    path = RAW / item["name"]
    if not path.exists():
        sys.exit(f"missing {path}; run `npm run data:fetch`")
    size = path.stat().st_size
    if size != item["bytes"]:
        sys.exit(f"{path.name}: {size} bytes, expected {item['bytes']}; run `npm run data:fetch -- --force`")
    digest = sha256(path)
    if digest != item["sha256"]:
        sys.exit(f"{path.name}: sha256 mismatch; run `npm run data:fetch -- --force`")

items = json.loads(MANIFEST.read_text(encoding="utf-8"))
WORK.mkdir(parents=True, exist_ok=True)
for item in items:
    check(item)
    src = RAW / item["name"]
    if src.suffix not in {".bz2", ".zip"}:
        print(f"verify {src.name} (no extraction)")
        continue

    if src.suffix == ".zip":
        with zipfile.ZipFile(src) as z:
            members = [
                n for n in z.namelist()
                if n.endswith(".en") or n.endswith(".zh") or n.endswith(".zh_CN")
            ]
            if len(members) != 2:
                sys.exit(f"{src.name}: expected one .en and one .zh member, found {members}")
            for member in members:
                dst = WORK / pathlib.Path(member).name
                if dst.exists() and dst.stat().st_size == z.getinfo(member).file_size:
                    print(f"skip {dst.name} (cached)")
                    continue
                tmp = dst.with_suffix(dst.suffix + ".part")
                with z.open(member) as fin, open(tmp, "wb") as fout:
                    shutil.copyfileobj(fin, fout, 1024 * 1024)
                tmp.replace(dst)
                print(f"extract {dst.name} {dst.stat().st_size // 1024} KiB")
        continue

    dst = WORK / src.name.removesuffix(".bz2")
    tmp = dst.with_suffix(dst.suffix + ".part")
    with bz2.open(src, "rb") as fin, open(tmp, "wb") as fout:
        shutil.copyfileobj(fin, fout)
    tmp.replace(dst)
    print(f"extract {dst.name} {dst.stat().st_size // 1024} KiB")
