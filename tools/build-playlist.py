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

Run from the repo root:  python3 tools/build-playlist.py
"""

import json
import random
from datetime import date, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"

# The last door, and the one the best-ranked song goes on. Every earlier
# door counts backwards from here, so the list plays best-last.
LAST_DOOR = date(2026, 12, 20)
DOORS = 111                      # 2026-09-01 .. 2026-12-20 inclusive

DEV_SHUFFLE_SEED = 20261220


def norm(song):
    return (song["title"].strip().lower(), song["artist"].strip().lower())


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


def write_songs_js(rows):
    by_pos = {r["position"]: r for r in rows}

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
        "   with the single best-ranked song placed on the last door",
        "   and the rest counting down backwards from there.",
        "",
        "   Regenerate with tools/build-playlist.py — do not edit by hand.",
        "   ========================================================= */",
        "",
        "const SONGS = {",
    ]
    for n in range(DOORS, 0, -1):                 # oldest door first in the file
        d = LAST_DOOR - timedelta(days=n - 1)
        r = by_pos[n]
        art = art_map.get(r["url"])
        art_field = f', art: {json.dumps(art, ensure_ascii=False)}' if art else ''
        lines.append(
            f'  "{d.isoformat()}": {{ '
            f'title: {json.dumps(r["title"], ensure_ascii=False)}, '
            f'artist: {json.dumps(r["artist"], ensure_ascii=False)}, '
            f'url: {json.dumps(r["url"], ensure_ascii=False)}{art_field} }},'
        )
    lines.append("};")
    head = "\n".join(lines) + "\n"

    tail = (ROOT / "js" / "songs.js").read_text().split("};\n", 1)[1]
    (ROOT / "js" / "songs.js").write_text(head + tail)


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

    write_songs_js(rows)
    print(f"{len(rows)} songs merged, {DOORS} dealt onto doors")


if __name__ == "__main__":
    main()
