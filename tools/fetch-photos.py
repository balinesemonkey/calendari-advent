#!/usr/bin/env python3
"""
Fetch the photographs printed on the card.

Two sets, and both come from Wikimedia Commons via the Wikipedia API's
lead image for an article. Those files are freely licensed, so they can
be committed to the repo and served from a public GitHub Pages site —
which is the whole point of baking them in rather than hotlinking.

    cities   the 49 landmarks       js/map.js     → photos/<slug>.jpg
    scenes   the country between    js/scenes.js  → photos/scenes/<slug>.jpg

Run from the project root:

    python3 tools/fetch-photos.py           # both
    python3 tools/fetch-photos.py scenes    # just one set

Anything that already has a file is skipped, so dropping in your own
photo and re-running keeps it. Attribution for every file downloaded is
appended to photos/CREDITS.md.
"""

import json
import os
import re
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "photos")
MAP_JS = os.path.join(ROOT, "js", "map.js")
SCENES_JS = os.path.join(ROOT, "js", "scenes.js")

API = "https://en.wikipedia.org/w/api.php"
UA = "bali-advent-calendar/1.0 (personal project; python-urllib)"
WIDTH = 900
PAUSE = 1.5          # seconds between requests


def table(path, const, fields):
    """Read one of the JS tables straight out of its source file, so the
    route stays a single source of truth. Returns a dict per entry with
    whichever of `fields` that line carries."""
    src = open(path, encoding="utf-8").read()
    block = re.search(r"const %s = \[(.*?)\n\];" % const, src, re.S)
    if not block:
        sys.exit("could not find %s in %s" % (const, os.path.basename(path)))

    out = []
    for line in block.group(1).splitlines():
        row = {}
        for f in fields:
            m = re.search(r'\b%s:\s*"([^"]+)"' % f, line)
            if m:
                row[f] = m.group(1)
        if row:
            out.append(row)
    return out


def city_jobs():
    """The 49 landmarks. `wiki` is optional — without it we ask Wikipedia
    for the landmark's own name, then the city's."""
    jobs = []
    for c in table(MAP_JS, "CITIES", ("name", "slug", "wiki", "landmark")):
        if "slug" not in c:
            continue
        titles = [t for t in (c.get("wiki"), c.get("landmark"), c.get("name")) if t]
        jobs.append((c.get("name", c["slug"]), c["slug"], titles, OUT))
    return jobs


def scene_jobs():
    """The country in between — one photo per stretch of geography."""
    out = os.path.join(OUT, "scenes")
    jobs = []
    for s in table(SCENES_JS, "SCENES", ("name", "slug", "wiki")):
        if "slug" not in s or "wiki" not in s:
            continue
        jobs.append((s.get("name", s["slug"]), s["slug"], [s["wiki"]], out))
    return jobs


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
    which = set(sys.argv[1:]) or {"cities", "scenes"}
    unknown = which - {"cities", "scenes"}
    if unknown:
        sys.exit("unknown set: " + ", ".join(sorted(unknown)))

    jobs = []
    if "cities" in which:
        jobs += city_jobs()
    if "scenes" in which:
        jobs += scene_jobs()

    os.makedirs(OUT, exist_ok=True)
    for _, _, _, out in jobs:
        os.makedirs(out, exist_ok=True)
    tmp = os.path.join(OUT, ".tmp")
    os.makedirs(tmp, exist_ok=True)

    print(f"{len(jobs)} photos to account for\n")

    credits, got, skipped, failed = [], 0, 0, []

    for name, slug, titles, out in jobs:
        dst = os.path.join(out, f"{slug}.jpg")

        if os.path.exists(dst):
            print(f"  ·  {name:<22} already have it")
            skipped += 1
            continue

        try:
            url = filename = None
            for title in titles:
                url, filename = lead_image(title)
                if url:
                    break
            if not url:
                raise RuntimeError('no lead image on "%s"' % '" / "'.join(titles))

            raw = os.path.join(tmp, slug + os.path.splitext(url)[1][:5])
            with open(raw, "wb") as f:
                f.write(get(url))
            to_jpeg(raw, dst)
            os.remove(raw)

            artist, lic = credit(filename)
            credits.append((name, title, filename, artist, lic))
            size = os.path.getsize(dst) // 1024
            print(f"  ✓  {name:<22} {title}  ({size} KB)")
            got += 1

        except Exception as e:
            print(f"  ✗  {name:<22} {e}")
            failed.append((name, titles[0] if titles else "", str(e)))

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
