#!/usr/bin/env python3
"""
Fetch a landmark photo for every city on the route.

Source is Wikimedia Commons, via the Wikipedia API's lead image for each
landmark's article. Those files are freely licensed, so they can be
committed to the repo and served from a public GitHub Pages site — which
is the whole point of baking them in rather than hotlinking.

Run from the project root:

    python3 tools/fetch-photos.py

Photos land in photos/<slug>.jpg. Cities that already have a file are
skipped, so dropping in your own photo and re-running keeps it.
Attribution for every file is written to photos/CREDITS.md.
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
OUT = os.path.join(ROOT, "photos")
MAP_JS = os.path.join(ROOT, "js", "map.js")

API = "https://en.wikipedia.org/w/api.php"
UA = "bali-advent-calendar/1.0 (personal project; python-urllib)"
WIDTH = 900
PAUSE = 1.5          # seconds between requests


def slugify(name):
    s = unicodedata.normalize("NFD", name)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn").lower()
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


def cities_from_map_js():
    """Read the CITIES table straight out of map.js so there's one source
    of truth for the route."""
    src = open(MAP_JS, encoding="utf-8").read()
    block = re.search(r"const CITIES = \[(.*?)\n\];", src, re.S)
    if not block:
        sys.exit("could not find CITIES in js/map.js")

    out = []
    for line in block.group(1).splitlines():
        name = re.search(r'name:\s*"([^"]+)"', line)
        wiki = re.search(r'wiki:\s*"([^"]+)"', line)
        if name and wiki:
            out.append((name.group(1), wiki.group(1)))
    return out


_last = [0.0]


def get(url, tries=6):
    """One request at a time, politely spaced. Wikimedia throttles hard,
    so back off and retry rather than hammering it."""
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
            if e.code in (429, 503) and attempt < tries - 1:
                wait = float(e.headers.get("Retry-After") or delay)
                print(f"       … throttled, waiting {wait:.0f}s")
                time.sleep(wait)
                delay = min(delay * 2, 60)
                continue
            raise


def lead_image(title):
    """(thumbnail url, source page) for an article's lead image."""
    q = urllib.parse.urlencode({
        "action": "query",
        "titles": title,
        "prop": "pageimages",
        "piprop": "thumbnail|name",
        "pithumbsize": WIDTH,
        "redirects": 1,
        "format": "json",
        "formatversion": 2,
    })
    data = json.loads(get(f"{API}?{q}"))
    pages = data.get("query", {}).get("pages", [])
    if not pages or "thumbnail" not in pages[0]:
        return None, None
    return pages[0]["thumbnail"]["source"], pages[0].get("pageimage", "")


def credit(filename):
    """Artist and licence for a Commons file."""
    if not filename:
        return "", ""
    q = urllib.parse.urlencode({
        "action": "query",
        "titles": "File:" + filename,
        "prop": "imageinfo",
        "iiprop": "extmetadata",
        "format": "json",
        "formatversion": 2,
    })
    try:
        data = json.loads(get(f"{API}?{q}"))
        meta = data["query"]["pages"][0]["imageinfo"][0]["extmetadata"]
    except Exception:
        return "", ""

    def field(k):
        v = meta.get(k, {}).get("value", "")
        return re.sub(r"<[^>]+>", "", v).strip()

    return field("Artist"), field("LicenseShortName")


def to_jpeg(src, dst):
    """Normalise whatever Commons handed back into a plain JPEG."""
    subprocess.run(
        ["sips", "-s", "format", "jpeg", "-s", "formatOptions", "80",
         src, "--out", dst],
        check=True, capture_output=True,
    )


def main():
    os.makedirs(OUT, exist_ok=True)
    tmp = os.path.join(OUT, ".tmp")
    os.makedirs(tmp, exist_ok=True)

    cities = cities_from_map_js()
    print(f"{len(cities)} cities on the route\n")

    credits, got, skipped, failed = [], 0, 0, []

    for name, wiki in cities:
        slug = slugify(name)
        dst = os.path.join(OUT, f"{slug}.jpg")

        if os.path.exists(dst):
            print(f"  ·  {name:<14} already have it")
            skipped += 1
            continue

        try:
            url, filename = lead_image(wiki)
            if not url:                       # fall back to the city itself
                url, filename = lead_image(name)
            if not url:
                raise RuntimeError(f'no lead image on "{wiki}"')

            raw = os.path.join(tmp, slug + os.path.splitext(url)[1][:5])
            with open(raw, "wb") as f:
                f.write(get(url))
            to_jpeg(raw, dst)
            os.remove(raw)

            artist, lic = credit(filename)
            credits.append((name, wiki, filename, artist, lic))
            size = os.path.getsize(dst) // 1024
            print(f"  ✓  {name:<14} {wiki}  ({size} KB)")
            got += 1

        except Exception as e:
            print(f"  ✗  {name:<14} {e}")
            failed.append((name, wiki, str(e)))

    os.rmdir(tmp) if not os.listdir(tmp) else None

    if credits:
        path = os.path.join(OUT, "CREDITS.md")
        new = not os.path.exists(path)
        with open(path, "a", encoding="utf-8") as f:
            if new:
                f.write("# Photo credits\n\n"
                        "Landmark photos come from Wikimedia Commons via the\n"
                        "Wikipedia lead image for each article. Licences below.\n\n")
            for name, wiki, filename, artist, lic in credits:
                f.write(f"- **{name}** — {wiki} · `{filename}`"
                        f"{' · ' + artist if artist else ''}"
                        f"{' · ' + lic if lic else ''}\n")
        print(f"\ncredits written to photos/CREDITS.md")

    print(f"\n{got} downloaded, {skipped} already there, {len(failed)} failed")
    for name, wiki, err in failed:
        print(f"   {name}: {err}")


if __name__ == "__main__":
    main()
