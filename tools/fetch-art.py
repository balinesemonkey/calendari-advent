#!/usr/bin/env python3
"""
Fetch the album art printed on the discs.

For every song dealt onto a door (data/mixed-songs.json, positions 1..112)
this looks the track up in Apple's public iTunes API by the id in its
music.apple.com URL, downloads the cover at 600×600 and writes it to
art/<slug>.jpg. A small art/art-map.json (song url → file) is written
alongside; tools/build-playlist.py reads it to point each songs.js entry
at its cover, falling back to the generated placeholder for anything
missing (a song linked only by search, or not found).

The images are Apple's, used here only as the label art on a private
two-person calendar that links straight back to Apple Music to play.

Run from the project root:

    python3 tools/fetch-art.py

Anything that already has a file is skipped, so a hand-placed cover
survives a re-run.
"""

import json
import os
import re
import subprocess
import sys
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "art")
MIXED = os.path.join(ROOT, "data", "mixed-songs.json")
ART_MAP = os.path.join(OUT, "art-map.json")

DOORS = 112
SIZE = 600
COUNTRY = "es"
UA = "bali-advent-calendar/1.0 (personal project; python-urllib)"
PAUSE = 0.5
BATCH = 150


def slugify(title):
    s = unicodedata.normalize("NFKD", title).encode("ascii", "ignore").decode()
    s = s.lower().replace("&", " and ")
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return re.sub(r"-{2,}", "-", s) or "track"


def track_id(url):
    """The numeric track id from a music.apple.com URL, or None."""
    m = re.search(r"[?&]i=(\d+)", url) or re.search(r"/song/(\d+)", url)
    return m.group(1) if m else None


_last = [0.0]


def get(url, tries=5):
    delay = 2.0
    for attempt in range(tries):
        gap = PAUSE - (time.time() - _last[0])
        if gap > 0:
            time.sleep(gap)
        _last[0] = time.time()
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code in (403, 429, 503) and attempt < tries - 1:
                wait = float(e.headers.get("Retry-After") or delay)
                print(f"       … throttled, waiting {wait:.0f}s")
                time.sleep(wait)
                delay = min(delay * 2, 60)
                continue
            raise


def lookup(ids):
    """{trackId: artworkUrl600} for a batch of ids."""
    out = {}
    for i in range(0, len(ids), BATCH):
        chunk = ids[i:i + BATCH]
        q = urllib.parse.urlencode({"id": ",".join(chunk), "country": COUNTRY,
                                    "entity": "song"})
        data = json.loads(get(f"https://itunes.apple.com/lookup?{q}"))
        for r in data.get("results", []):
            art = r.get("artworkUrl100") or r.get("artworkUrl60") or ""
            if r.get("trackId") and art:
                out[str(r["trackId"])] = art.replace(
                    "100x100bb", f"{SIZE}x{SIZE}bb")
    return out


def to_jpeg(src, dst):
    subprocess.run(
        ["sips", "-s", "format", "jpeg", "-s", "formatOptions", "82",
         src, "--out", dst],
        check=True, capture_output=True,
    )


def main():
    songs = json.loads(open(MIXED, encoding="utf-8").read())
    doors = sorted((s for s in songs if s["position"] <= DOORS),
                   key=lambda s: s["position"])

    os.makedirs(OUT, exist_ok=True)
    tmp = os.path.join(OUT, ".tmp")
    os.makedirs(tmp, exist_ok=True)

    art_map = {}
    if os.path.exists(ART_MAP):
        art_map = json.loads(open(ART_MAP, encoding="utf-8").read())

    ids = [tid for s in doors if (tid := track_id(s["url"]))]
    print(f"{len(doors)} songs on doors, {len(ids)} with a track id\n")
    print("looking them up …")
    art_by_id = lookup(ids)
    print(f"  {len(art_by_id)} covers found\n")

    got = skipped = 0
    failed = []
    seen = set()

    for s in doors:
        title, url = s["title"], s["url"]
        slug = slugify(title)
        while slug in seen:
            slug += "-" + slugify(s["artist"])
        seen.add(slug)
        dst = os.path.join(OUT, f"{slug}.jpg")
        rel = f"art/{slug}.jpg"

        if os.path.exists(dst):
            art_map[url] = rel
            print(f"  ·  {title[:34]:<34} already have it")
            skipped += 1
            continue

        tid = track_id(url)
        art = art_by_id.get(tid) if tid else None
        if not art:
            print(f"  ✗  {title[:34]:<34} no cover (linked by search?)")
            failed.append(title)
            continue

        try:
            raw = os.path.join(tmp, slug + ".src")
            with open(raw, "wb") as f:
                f.write(get(art))
            to_jpeg(raw, dst)
            os.remove(raw)
            art_map[url] = rel
            size = os.path.getsize(dst) // 1024
            print(f"  ✓  {title[:34]:<34} ({size} KB)")
            got += 1
        except Exception as e:
            print(f"  ✗  {title[:34]:<34} {e}")
            failed.append(title)

    if not os.listdir(tmp):
        os.rmdir(tmp)

    with open(ART_MAP, "w", encoding="utf-8") as f:
        json.dump(dict(sorted(art_map.items())), f, ensure_ascii=False, indent=2)
        f.write("\n")

    print(f"\n{got} downloaded, {skipped} already there, {len(failed)} without art")
    for t in failed:
        print(f"   {t}")
    print("\nnow run:  python3 tools/build-playlist.py")


if __name__ == "__main__":
    main()
