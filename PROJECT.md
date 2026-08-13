# Bali → Barcelona Advent Calendar

> Living document. The idea is settled enough to build; a working prototype
> exists (see §11). Everything still open is in §9.

## 1. The idea

A private, web-based advent calendar for two people: me (in Bali) and my girlfriend
(in Barcelona). Instead of the usual 24 December doors, this calendar runs for the
**entire length of the time we're apart** — one door per day from **14 August** to
**20 December**, the day I fly home.

The card the doors are cut into is **an illustrated map of the walk from Bali to
Barcelona**. Each day advances along that route, so the calendar is also a progress
bar: by the time the last door opens, the walk has arrived in Barcelona and so
have I.

## 2. Core concept

- **Countdown as a journey.** Every opened day = distance covered. The visual
  metaphor and the calendar mechanic are the same thing.
- **One door per day.** Only *today's* door can be opened. The future is locked.
- **Past doors stay open.** The calendar accumulates into a record of the time
  apart, not a thing that resets.
- **The whole calendar is scrollable.** You can always see the full route and all
  129 days — including the locked ones ahead. Seeing how far there is to go is
  part of it.
- **Two people only.** It is not a public site. Tone is personal, not product-y.

## 3. Timeline

| | |
|---|---|
| Start | **14 August 2026** |
| End | **20 December 2026** (arrival in Barcelona) |
| Total days | **129** |

Breakdown: 18 days in August, 30 in September, 31 in October, 30 in November,
20 in December.

## 4. The route

A walking route from **Bali, Indonesia** to **Barcelona, Spain** — Indonesia →
Southeast Asia → India → Central Asia → Iran → Türkiye → the Balkans → Italy →
France → Catalonia.

It's drawn as a **strip map**: the geography is squashed into one long ribbon, so
the card is the shape of the journey rather than an atlas. The 129 days are spaced
evenly along it, and **49 cities** sit at the day you'd arrive there.

## 5. How it behaves

Every day is in exactly one of three states:

| State | Which days | What you can do |
|---|---|---|
| **Locked** | Any day after today | Visible on the map, but sealed. No preview of what's inside. |
| **Openable** | Today, if not yet opened | The one door that can be opened. This is the moment — the reveal. |
| **Opened** | Today once opened, and every past day | Re-openable any time, but the door is already open — no second reveal. |

Scrolling is free in both directions: back through everything opened so far,
forward across the locked stretch that's still to come. The door swings on its
hinge, and **the record comes up in a popup**.

## 6. What's behind a door

**A song.** One per day, 129 of them.

- **Alternating format.** Odd days are a **vinyl**, even days are a **CD** — so
  scrolling back through the opened doors gives a rhythm of black discs and
  silver ones.
- **The album art is the label.** Vinyl: art on the centre label. CD: art through
  the whole reflective surface, with the clear hub in the middle.
- **The popup** shows the record sliding out of its sleeve, spinning, with title,
  artist, where on the route that day lands you, and a button through to
  **Apple Music**.
- The door itself keeps a small disc in its recess, so an opened calendar reads
  as a card full of records.

This makes the calendar a 129-song playlist that unspools one track a day across
the walk home.

## 7. Non-goals

- Not a public product. No signups, no accounts for strangers, no analytics.
- Not a generic advent calendar template.
- Not a real GPS tracker of my actual location — the walk is the metaphor.

## 8. Feel

**A real cardboard advent calendar, printed with a real map.**

The card:

- Kraft cardboard with print grain and a worn edge.
- **Doors that are actually doors.** Perforated edges, a score line, a hinge on
  one side. Opened ones stay flapped open at an angle, so the calendar's history
  is legible from the pattern of hanging flaps.
- The number printed on the door, **the date printed on the card beneath it**.
- Opening is a hinge animation — the flap swings, it doesn't fade.

The map printed on it:

- **Sea, coastlines, countries, rivers and mountains**, in flat atlas colours.
- **Biomes that change as the route crosses the world** — jungle green through
  Indonesia and Southeast Asia, wet green in Bengal, dry gold across India,
  desert through Punjab and Persia, grey rock and **snow-capped peaks** in the
  Hindu Kush and the Alps, temperate green through the Balkans and France.
  Vegetation changes with it: palms, trees, scrub, dunes, cypresses.
- **49 cities**, each with an ink drawing of its landmark, which turns red once
  the walk has passed it.
- **A photo of each city's landmark**, pinned to the card as a polaroid with a
  tack, captioned *"Landmark, City"*. Clicking one opens it large and uncropped,
  with the day you get there. Photos **alternate above and below the route** so
  the card stays balanced instead of bottom-heavy.
- Trees, dunes, mountains and snow are drawn **only where there's land** — the
  map knows its own coastline.
- Compass rose, sea names, a scale bar that doesn't mean anything.

**Label hierarchy**, four tiers, in ribbon units:

| | Size | Weight | Tracking | Feel |
|---|---|---|---|---|
| **Country** | 268 | 700 | very wide | dominant — INDONESIA, INDIA, IRAN |
| Region / island | 132 | 400 | wide | half the country, lighter — BALI, PUNJAB, PERSIA |
| **City** | 88 | 900 | tight | small but the darkest ink on the card, haloed so it reads over terrain |
| Town | 62 | 700 | tight | the smaller stops — Ubud, Bagan, Girona |

Areas get **size and tracking**; points get **weight and contrast**. Each tier is
about half the one above rather than a nudge, so the ranking survives any zoom.
Archipelago country names are lettered out over the water, atlas-style.

## 9. Open questions

- [ ] Does she open the doors, do I, or both?
- [ ] If a day gets missed, is it just "opened" like any other past day, or does
      the reveal wait for her? (Missing a day currently means missing the moment.)
- [ ] Are all 129 songs picked before 14 August, or do I keep adding as we go?
- [ ] Is there a note alongside the song, or does the song speak for itself?
- [ ] Timezone: Bali (UTC+8) or Barcelona (UTC+1/+2)? Determines when a door unlocks.
- [ ] Does anything special happen on the last day (20 Dec)?
- [ ] Repo public or private, and where does it live? (see §10)
- [ ] Do any of the 49 landmark photos want swapping for our own?

## 10. Technical

### Now: plain HTML, CSS and JavaScript

No build step, no dependencies, no framework. Open `index.html` and it runs.
This is deliberate for the prototype — the design questions were the hard part,
and a static page answers them faster than a pipeline.

```
index.html          the page
css/calendar.css    cardboard, doors, map lettering, popups
js/map.js           the printed map — geography, biomes, cities, photo pins
js/songs.js         the playlist (one entry per date) + placeholder art
js/calendar.js      dates, door states, popups, orientation
photos/             49 landmark photos + CREDITS.md
tools/fetch-photos.py   re-fetches any missing landmark photo
```

### Orientation

The map is drawn in **ribbon coordinates** — `u` along the journey, `v` across it
— and a single `P(u, v)` function lays that ribbon out either across the screen or
down it. So **mobile gets the same map, turned ninety degrees**: the route runs
top to bottom, dates sit left of the doors, photos to the right, and the view
crops to a narrower window across the ribbon so everything is drawn larger.
One map, one set of code.

### Later: Saga

The end state is still [Saga](https://github.com/loopwerk/Saga) — static site
generation in Swift — with the 129 days as Markdown files with front matter, and
the same CSS and client-side JS coming through unchanged. Nothing about the
prototype blocks that; the song data is already a flat table keyed by date.

### What "static" forces

- **Unlocking is client-side.** The build ships all 129 days; JavaScript compares
  today's date against each door's date. Nothing is enforced — a determined
  person can read the source and see every song early.
- **All content lives in the repo.** Song data, artwork and photos are committed
  files.
- **Adding a song is a commit and a deploy**, not a CMS.

### Apple Music

- **The link** is a plain `music.apple.com` URL. On iPhone/Mac it opens the app;
  elsewhere the web player. No SDK, no auth, no MusicKit.
- **Album art** should be downloaded once and committed rather than hotlinked, so
  the calendar keeps working offline and doesn't break when Apple rotates a URL.
  Until real art is added, each day gets a generated placeholder cover.

### Photos

The 49 landmark photos come from **Wikimedia Commons**, via the lead image of each
landmark's Wikipedia article, fetched by `tools/fetch-photos.py` and committed as
`photos/<city>.jpg`. They're freely licensed, so they're safe to publish on a
public site — attribution for every one is in `photos/CREDITS.md`. Google Images
results mostly aren't, which matters here because the plan is to serve this from
a public URL.

Dropping your own photo in at `photos/<city>.jpg` overrides the fetched one, and
the script skips any city that already has a file. A city with no photo at all
falls back to the ink drawing, so the map is never broken.

### Hosting

GitHub Pages. On the free plan Pages only serves from **public** repos, which
would make the song list readable to anyone who found it. Options:

1. Public repo, obscure URL, accept it. For a playlist rather than private
   photos this is an easy yes.
2. Paid plan → Pages from a private repo.
3. Client-side password gate that decrypts the content in the browser.

## 11. Running it

```bash
python3 -m http.server 4321
```

Then open <http://localhost:4321>.

The bar at the bottom is **prototype-only**: a preview date for scrubbing through
the calendar (the real thing just uses today), and a reset for the opened-doors
state kept in `localStorage`. Both come out before this goes anywhere.
