#!/usr/bin/env python3
"""
Build the merged playlist from the two Replay lists.

Inputs
    data/nil-songs.json     Nil's Replay, ranked 1..N
    data/carla-songs.json   Carla's Replay, ranked 1..M

Outputs
    data/mixed-songs.json       the merged ranking, one row per song
    data/mixed-songs-dev.json   the same rows, shuffled, for spoiler-free dev
    js/songs.js                 SONGS{} — the merged list dealt onto the doors,
                                best song on the last door, counting back

Merge order: shared songs, then shared artists, then rank.

  1. Songs on BOTH lists, by nil_rank + carla_rank ascending
     (ties broken by nil_rank).
  2. Solo songs whose artist appears on both lists, the two lists merged
     by rank (Nil wins a rank tie).
  3. Everything else, merged the same way.

Dealing onto the doors:

  - Doors up to FREEZE_THROUGH have already been opened. They are read
    back out of the current js/songs.js and never change.
  - The rest are dealt from the last door backwards, each taking the
    best-ranked song not used yet whose artist hasn't played within
    ARTIST_GAP days either side (collaborations count for every artist
    named, so "A & B" clashes with both A and B).

Run from the repo root:  python3 tools/build-playlist.py
"""

import json
import random
import re
import unicodedata
from datetime import date, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
SONGS_JS = ROOT / "js" / "songs.js"

# The last door, and the one the best-ranked song goes on. Every earlier
# door counts backwards from here, so the list plays best-last.
LAST_DOOR = date(2026, 12, 20)
DOORS = 111                      # 2026-09-01 .. 2026-12-20 inclusive
FIRST_DOOR = LAST_DOOR - timedelta(days=DOORS - 1)

# Opened doors are history: everything up to here stays as dealt.
FREEZE_THROUGH = date(2026, 10, 16)

# An artist plays at most once in any run of this many days.
ARTIST_GAP = 7

DEV_SHUFFLE_SEED = 20261220


def norm(song):
    return (song["title"].strip().lower(), song["artist"].strip().lower())


def fold(s):
    """Lower-case, accents off — so ROSALÍA and Rosalia are one artist."""
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    return re.sub(r"\s+", " ", s.lower()).strip()


def artists(artist):
    """Every artist credited: "A & B", "A, B", "A feat. B" → {a, b}."""
    parts = re.split(r"\s*(?:&|,|\bfeat\.?|\bft\.?)\s*", fold(artist))
    return {p for p in parts if p}


def merge_by_rank(nil_side, carla_side):
    """Interleave two rank-sorted [(rank, key), ...] lists. Nil wins ties."""
    out, i, j = [], 0, 0
    while i < len(nil_side) or j < len(carla_side):
        take_nil = j >= len(carla_side) or (
            i < len(nil_side) and nil_side[i][0] <= carla_side[j][0]
        )
        if take_nil:
            out.append(("nil", nil_side[i][1]))
            i += 1
        else:
            out.append(("carla", carla_side[j][1]))
            j += 1
    return out


def build(nil, carla):
    nil_by = {norm(s): s for s in nil}
    carla_by = {norm(s): s for s in carla}

    shared_artists = {s["artist"].strip().lower() for s in nil} & {
        s["artist"].strip().lower() for s in carla
    }
    shared_keys = set(nil_by) & set(carla_by)

    # 1. songs on both lists
    phase1 = sorted(
        (nil_by[k]["rank"] + carla_by[k]["rank"], nil_by[k]["rank"], k)
        for k in shared_keys
    )

    # 2. + 3. solo songs, split on whether the artist is shared
    nil_solo = sorted((s["rank"], k) for k, s in nil_by.items() if k not in carla_by)
    carla_solo = sorted((s["rank"], k) for k, s in carla_by.items() if k not in nil_by)

    def split(solo):
        yes = [x for x in solo if x[1][1] in shared_artists]
        no = [x for x in solo if x[1][1] not in shared_artists]
        return yes, no

    nil_artist, nil_rest = split(nil_solo)
    carla_artist, carla_rest = split(carla_solo)

    phase2 = merge_by_rank(nil_artist, carla_artist)
    phase3 = merge_by_rank(nil_rest, carla_rest)

    rows, pos = [], 1
    for _, _, k in phase1:
        n, c = nil_by[k], carla_by[k]
        rows.append({
            "title": n["title"], "artist": n["artist"], "url": n["url"],
            "listened_by": ["nil", "carla"],
            "nil_rank": n["rank"], "carla_rank": c["rank"], "position": pos,
        })
        pos += 1
    for phase in (phase2, phase3):
        for who, k in phase:
            src = nil_by[k] if who == "nil" else carla_by[k]
            rows.append({
                "title": src["title"], "artist": src["artist"], "url": src["url"],
                "listened_by": [who],
                "nil_rank": nil_by[k]["rank"] if k in nil_by else None,
                "carla_rank": carla_by[k]["rank"] if k in carla_by else None,
                "position": pos,
            })
            pos += 1
    return rows


def read_opened():
    """{date: song} for every door up to FREEZE_THROUGH, as currently dealt."""
    out = {}
    entry = re.compile(r'^\s*"(\d{4}-\d{2}-\d{2})": \{ (.*) \},\s*$')
    for line in SONGS_JS.read_text().splitlines():
        m = entry.match(line)
        if not m:
            continue
        d = date.fromisoformat(m.group(1))
        if d > FREEZE_THROUGH:
            continue
        body = re.sub(r'(^|, )(title|artist|url|art): ', r'\1"\2": ', m.group(2))
        out[d] = json.loads("{" + body + "}")
    expected = (FREEZE_THROUGH - FIRST_DOOR).days + 1
    if len(out) != expected:
        raise SystemExit(f"read {len(out)} opened doors from songs.js, "
                         f"expected {expected}")
    return out


def deal(rows, opened):
    """{date: song} for every door — opened ones kept, the rest dealt
    backwards from the last door under the artist-gap rule."""
    used = {norm(s) for s in opened.values()}
    pool = [r for r in sorted(rows, key=lambda r: r["position"])
            if norm(r) not in used]
    who = {d: artists(s["artist"]) for d, s in opened.items()}
    out = dict(opened)

    d = LAST_DOOR
    while d > FREEZE_THROUGH:
        near = set()
        for k in range(1 - ARTIST_GAP, ARTIST_GAP):
            if k:
                near |= who.get(d + timedelta(days=k), set())
        for i, r in enumerate(pool):
            if not artists(r["artist"]) & near:
                break
        else:
            raise SystemExit(f"no song left that fits {d}")
        out[d] = pool.pop(i)
        who[d] = artists(out[d]["artist"])
        d -= timedelta(days=1)
    return out


def check_gap(dealt):
    """Clashes among the newly dealt doors (and against the opened ones
    just before them). Returns a list; empty means the rule holds."""
    bad = []
    for d, s in dealt.items():
        if d <= FREEZE_THROUGH:
            continue
        for k in range(1, ARTIST_GAP):
            e = dealt.get(d - timedelta(days=k))
            if e and artists(s["artist"]) & artists(e["artist"]):
                bad.append((d - timedelta(days=k), d))
    return bad


def write_songs_js(dealt):
    art_map = {}
    art_map_path = ROOT / "art" / "art-map.json"
    if art_map_path.exists():
        art_map = json.loads(art_map_path.read_text())

    lines = [
        "/* =========================================================",
        "   The playlist.",
        "",
        "   One entry per date, keyed YYYY-MM-DD. Generated from",
        "   data/mixed-songs.json — the shared top-of-the-year list —",
        "   with the best-ranked songs dealt from the last door backwards",
        "   and no artist playing twice within a week.",
        "",
        "   Regenerate with tools/build-playlist.py — do not edit by hand.",
        "   ========================================================= */",
        "",
        "const SONGS = {",
    ]
    for n in range(DOORS):                        # oldest door first in the file
        d = FIRST_DOOR + timedelta(days=n)
        r = dealt[d]
        art = art_map.get(r["url"]) or r.get("art")
        art_field = f', art: {json.dumps(art, ensure_ascii=False)}' if art else ''
        lines.append(
            f'  "{d.isoformat()}": {{ '
            f'title: {json.dumps(r["title"], ensure_ascii=False)}, '
            f'artist: {json.dumps(r["artist"], ensure_ascii=False)}, '
            f'url: {json.dumps(r["url"], ensure_ascii=False)}{art_field} }},'
        )
    lines.append("};")
    head = "\n".join(lines) + "\n"

    tail = SONGS_JS.read_text().split("};\n", 1)[1]
    SONGS_JS.write_text(head + tail)


def main():
    nil = json.loads((DATA / "nil-songs.json").read_text())
    carla = json.loads((DATA / "carla-songs.json").read_text())

    rows = build(nil, carla)
    if len(rows) < DOORS:
        raise SystemExit(f"only {len(rows)} songs, need at least {DOORS}")

    (DATA / "mixed-songs.json").write_text(
        json.dumps(rows, ensure_ascii=False, indent=2) + "\n"
    )

    dev = rows[:]
    random.Random(DEV_SHUFFLE_SEED).shuffle(dev)
    (DATA / "mixed-songs-dev.json").write_text(
        json.dumps(dev, ensure_ascii=False, indent=2) + "\n"
    )

    opened = read_opened()
    dealt = deal(rows, opened)
    clashes = check_gap(dealt)
    if clashes:
        raise SystemExit(f"{len(clashes)} artist clashes inside {ARTIST_GAP} days")

    write_songs_js(dealt)
    print(f"{len(rows)} songs merged; {len(opened)} opened doors kept, "
          f"{DOORS - len(opened)} dealt with no artist twice in {ARTIST_GAP} days")


if __name__ == "__main__":
    main()
