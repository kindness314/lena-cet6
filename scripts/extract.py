import bz2
import pathlib
import shutil
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent / "data"
NAMES = ["cmn-eng_links", "cmn_sentences", "eng_sentences"]

for name in NAMES:
    src = ROOT / f"{name}.tsv.bz2"
    dst = ROOT / f"{name}.tsv"
    if dst.exists():
        print(f"skip {dst.name}")
        continue
    if not src.exists():
        sys.exit(f"missing {src}")
    with bz2.open(src, "rb") as fin, open(dst, "wb") as fout:
        shutil.copyfileobj(fin, fout)
    print(f"extracted {dst.name} {dst.stat().st_size // 1024} KiB")
