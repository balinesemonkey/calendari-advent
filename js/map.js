/* =========================================================
   The printed map.

   Everything on the card that isn't a door: sea, coastlines,
   countries, mountains, rivers, cities, landmark photos pinned
   to the card, compass. Drawn as SVG in the same coordinate
   space as the route, so it scales with the card.

   The geography is a strip map — deliberately squashed into a
   long ribbon. It's the shape of the journey, not an atlas.
   ========================================================= */

/* ---------------------------------------------------------
   Orientation

   The card is a ribbon. Everything below is drawn in ribbon
   coordinates — `u` runs along the journey, `v` runs across it —
   and `P()` lays that ribbon out either across the screen (desktop)
   or down it (mobile). Same map, same code, turned ninety degrees.
   --------------------------------------------------------- */

/* The ribbon is wide enough across to hold, top to bottom:
   a band of photos · the northern interior · the route and its doors ·
   the southern coast · the sea · a second band of photos.
   Photos alternate between the two bands so the card stays balanced.

   JOURNEY scales with ACROSS — the doors are spaced by their distance
   along the ribbon, so making it taller without making it longer would
   crowd them together. */
const ACROSS = 3400;     // v: north → south

const VERTICAL = window.matchMedia("(max-width: 700px)").matches;

/* On a phone we look through a narrower window onto the ribbon — same
   map, drawn larger, with the outer margins cropped away. */
const WINDOW_V = VERTICAL ? 1800 : ACROSS;
const V_MIN = (ACROSS - WINDOW_V) / 2;
const VB_X = VERTICAL ? V_MIN : 0;

const DOOR_K = VERTICAL ? 0.22 : 0.118;

/* the two photo bands — places alternate between them */
const PIN_BANDS = VERTICAL ? [1150, 2250] : [620, 3080];
const PIN_W = 520;
const PIN_H = 610;

/* the scene photos are the smaller prints between the landmarks */
const SCENE_W = 430;
const SCENE_H = 500;

const P = (u, v) => (VERTICAL ? { x: v, y: u } : { x: u, y: v });
const pp = (u, v) => { const p = P(u, v); return `${p.x.toFixed(1)},${p.y.toFixed(1)}`; };

/* a step across the ribbon, applied to an already-laid-out point */
const across = (q, d) => (VERTICAL ? { x: q.x + d, y: q.y } : { x: q.x, y: q.y + d });

/* ---------------------------------------------------------
   The running order

   The card is a path you walk down. Along it, in order, come the
   doors — one per day — with the name of each country and each city
   set into the gaps between them: INDONÈSIA, Denpasar, a few days,
   Ubud, a few more, then Singapur, and on it goes.

   Every item claims its own stretch of the journey and the rest
   follow on, so a name can never land on top of a door. That makes
   the ribbon's total length a result of its contents rather than a
   number picked in advance — a long country name genuinely opens a
   gap in the row of doors.
   --------------------------------------------------------- */

let JOURNEY = 0;         // u: Bali → Barcelona, once laid out
let SX = 1;              // journey scale, vs the 40000 the art was drawn against
let VB_W = 0, VB_H = 0, VIEWBOX = "";
let ORDER = [];          // every item on the path, in order
let DOOR_U = [];         // where each day's door sits
let CITY_U = [];         // where each city's name sits
let SCENE_U = [];        // where each scene's photo sits
let CITY_BAND = [];      // which photo band each city pins to
let SCENE_BAND = [];     // …and each scene

const X = t => t * JOURNEY;

/* Room each item needs along the path. Laid out across a screen a name
   takes its full width; turned down a phone it only takes a line of
   type, which is why portrait fits so much more in. Sizes mirror the
   label hierarchy in calendar.css. */
const TYPE = VERTICAL
  ? { country: 118, countryTrack: 28, region: 62, regionTrack: 17,
      city: 76, town: 54, cityTrack: 2 }
  : { country: 300, countryTrack: 96, region: 150, regionTrack: 46,
      city: 118, town: 78, cityTrack: 2 };

/* A door's share of the path. It has to be wider than the door itself:
   an opened flap swings back over the preceding stretch, so the gap in
   front of each door has to be deep enough to keep that flap off
   whatever name comes before it. */
const DOOR_SPAN = 960;

/* Country and region names are set in capitals, which run wider per
   letter than the mixed case the city names keep. */
function spanAlong(text, size, track, caps = false) {
  return VERTICAL
    ? size * 2.0
    : text.length * (size * (caps ? 0.66 : 0.56) + track) + size * 0.8;
}

function layout(totalDays) {
  const cityAtDoor = new Map();
  CITIES.forEach((c, ci) => {
    const d = Math.min(totalDays - 1, Math.round(c.t * (totalDays - 1)));
    if (!cityAtDoor.has(d)) cityAtDoor.set(d, []);
    cityAtDoor.get(d).push(ci);
  });

  ORDER = [];
  let country = null, region = null;

  for (let d = 0; d < totalDays; d++) {
    for (const ci of cityAtDoor.get(d) || []) {
      const c = CITIES[ci];

      /* Each name announces itself the first time you walk into it,
         largest first — INDONÈSIA, then BALI, then Denpasar. A region
         that spans a border (Panjab, Bengala) doesn't repeat itself
         when the country changes around it. */
      const area = areaOf(c);

      if (c.country !== country) {
        country = c.country;
        ORDER.push({ kind: "country", name: country, label: country.toUpperCase(), area,
                     span: spanAlong(country, TYPE.country, TYPE.countryTrack, true) });
      }

      if (c.region && c.region !== region) {
        region = c.region;
        ORDER.push({ kind: "region", name: region, label: region.toUpperCase(), area,
                     span: spanAlong(region, TYPE.region, TYPE.regionTrack, true) });
      }

      /* a city is a point, not an area: it gets a dot on the route as
         well as its name, and the dot needs room of its own */
      const size = c.town ? TYPE.town : TYPE.city;
      ORDER.push({ kind: "city", ci, name: c.name, area,
                   span: spanAlong(c.name, size, TYPE.cityTrack) + size * 1.5 });
    }

    ORDER.push({ kind: "door", d, span: DOOR_SPAN });
  }

  let u = DOOR_SPAN;                       // a margin before the first item
  for (const it of ORDER) {
    it.u = u + it.span / 2;
    u += it.span;
  }

  JOURNEY = u + DOOR_SPAN;
  SX = JOURNEY / 40000;

  DOOR_U = [];
  CITY_U = [];
  AREA_SPAN = {};
  AREA_ORDER = [];

  for (const it of ORDER) {
    if (it.kind === "door") DOOR_U[it.d] = it.u;
    if (it.kind === "city") CITY_U[it.ci] = it.u;

    // how far along the path each named area reaches
    if (it.area) {
      const a = AREA_SPAN[it.area];
      const lo = it.u - it.span / 2, hi = it.u + it.span / 2;
      if (!a) { AREA_SPAN[it.area] = { u0: lo, u1: hi }; AREA_ORDER.push(it.area); }
      else { a.u0 = Math.min(a.u0, lo); a.u1 = Math.max(a.u1, hi); }
    }
  }

  /* An area owns the days that follow it too, up to wherever the next
     area starts — otherwise the land would stop at the last city name
     and the doors after it would be standing in the sea. */
  AREA_ORDER.forEach((name, i) => {
    const next = AREA_ORDER[i + 1];
    if (next) AREA_SPAN[name].u1 = AREA_SPAN[next].u0;
  });
  if (AREA_ORDER.length) {
    AREA_SPAN[AREA_ORDER[0]].u0 = 0;
    AREA_SPAN[AREA_ORDER[AREA_ORDER.length - 1]].u1 = JOURNEY;
  }

  /* the scene photos hang off the same doors the cities do */
  SCENE_U = SCENES.map(s =>
    DOOR_U[Math.min(totalDays - 1, Math.round(s.t * (totalDays - 1)))]);

  /* Which of the two photo bands each pin goes in. Assigning that from
     a city's own index and a scene's own index separately — odd here,
     even there — only alternates each list against itself; merged onto
     one card, in the order they actually appear along the journey,
     several from the same list can still land back to back, and so
     can two from different lists that happen to sit close together.
     Sorting every pin — city and scene alike — into one sequence by
     where it actually falls, then alternating *that*, is what
     guarantees the bands genuinely take turns no matter which list a
     pin came from. */
  const merged = [
    ...CITY_U.map((u, i) => ({ u, kind: "city", i })),
    ...SCENE_U.map((u, i) => ({ u, kind: "scene", i })),
  ].sort((a, b) => a.u - b.u);

  CITY_BAND = [];
  SCENE_BAND = [];
  merged.forEach((it, idx) => {
    (it.kind === "city" ? CITY_BAND : SCENE_BAND)[it.i] = idx % 2;
  });

  VB_W = VERTICAL ? WINDOW_V : JOURNEY;
  VB_H = VERTICAL ? JOURNEY : ACROSS;
  VIEWBOX = `${VB_X} 0 ${VB_W} ${VB_H}`;

  buildLand();
}

/* --- deterministic RNG so the coastline is the same every load --- */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* A smooth wandering line: a few sine waves of falling wavelength and
   falling amplitude, stacked. This is what turns a straight coast into
   bays, headlands and capes. */
function wobbler(seed, wave, amp, octaves = 4) {
  const r = rng(seed);
  const terms = [];
  for (let i = 0; i < octaves; i++) {
    terms.push({
      w: (Math.PI * 2) / (wave * Math.pow(0.41, i)),
      ph: r() * 7,
      a: amp * Math.pow(0.5, i),
    });
  }
  return u => terms.reduce((s, t) => s + t.a * Math.sin(u * t.w + t.ph), 0);
}

/* --- an organic closed blob around an ellipse, in ribbon coords ---
   The radius is modulated by three angular harmonics, so islands come
   out with headlands and inlets rather than reading as eggs. */
function blob(cu, cv, ru, rv, seed, wob = 0.22, n = 40) {
  const r = rng(seed);
  const ph = [r() * 7, r() * 7, r() * 7];
  const k = [2 + Math.floor(r() * 2), 3 + Math.floor(r() * 3), 6 + Math.floor(r() * 4)];

  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const m = 1 + wob * (0.62 * Math.sin(a * k[0] + ph[0])
                       + 0.30 * Math.sin(a * k[1] + ph[1])
                       + 0.16 * Math.sin(a * k[2] + ph[2]));
    const q = P(cu + Math.cos(a) * ru * m, cv + Math.sin(a) * rv * m);
    pts.push([q.x, q.y]);
  }

  const mid = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
  let d = "M" + mid(pts[n - 1], pts[0]).map(v => v.toFixed(1)).join(",");
  for (let i = 0; i < n; i++) {
    const cur = pts[i];
    const m = mid(cur, pts[(i + 1) % n]);
    d += `Q${cur[0].toFixed(1)},${cur[1].toFixed(1)} ${m[0].toFixed(1)},${m[1].toFixed(1)}`;
  }
  return d + "Z";
}

/* ---------------------------------------------------------
   Biomes — the land changes as the route crosses the world.

   Each one carries its own vocabulary of little drawings: what
   grows there, what the ground does, what lives on it. `cover` is
   what you see everywhere, `rare` is what you come across now and
   then — a village, a herd, a bridge over the river.
   --------------------------------------------------------- */

const BIOMES = {
  jungle: {
    fill: "var(--b-jungle)", ink: "var(--i-jungle)", relief: 1.1,
    cover: ["palm", "palm", "banana", "bamboo", "paddy", "tree", "hills", "volcano"],
    rare:  ["village", "elephant", "bridge"],
  },
  wet: {
    fill: "var(--b-wet)", ink: "var(--i-jungle)", relief: 0.5,
    cover: ["paddy", "paddy", "tree", "bamboo", "banana", "tuft"],
    rare:  ["village", "bridge", "elephant"],
  },
  dry: {
    fill: "var(--b-dry)", ink: "var(--i-dry)", relief: 0.9,
    cover: ["scrub", "tuft", "tree", "hills", "scrub", "thorn"],
    rare:  ["village", "elephant", "fort"],
  },
  desert: {
    fill: "var(--b-desert)", ink: "var(--i-desert)", relief: 0.7,
    cover: ["dune", "dune", "tuft", "crag", "thorn", "oasis"],
    rare:  ["camel", "tent", "fort"],
  },
  alpine: {
    fill: "var(--b-alpine)", ink: "var(--i-alpine)", relief: 2.4,
    /* the ridges drawn behind already say "mountains" — the glyphs are
       here for what's between them, with the odd snowcap for scale */
    cover: ["pine", "pine", "crag", "hills", "snowpeak", "tuft", "pine"],
    rare:  ["goat", "tent", "bridge"],
  },
  steppe: {
    fill: "var(--b-steppe)", ink: "var(--i-dry)", relief: 1.0,
    cover: ["tuft", "tuft", "scrub", "hills", "crag", "thorn"],
    rare:  ["tent", "goat", "fort"],
  },
  temperate: {
    fill: "var(--b-temperate)", ink: "var(--i-temperate)", relief: 1.1,
    cover: ["tree", "tree", "pine", "hills", "tuft", "tree", "pine"],
    rare:  ["village", "bridge", "windmill"],
  },
  med: {
    fill: "var(--b-med)", ink: "var(--i-temperate)", relief: 1.0,
    cover: ["cypress", "olive", "olive", "vine", "scrub", "hills", "cypress"],
    rare:  ["village", "fort", "windmill"],
  },
};

/* ---------------------------------------------------------
   Areas

   The ground under the path belongs to whatever is named above it.
   Each area is drawn to cover exactly the stretch its own cities
   occupy, so when the path says BALI you're standing on Bali, and
   when it says PÈRSIA the land under you has gone to desert.

   An area is a city's region if it has one, otherwise its country —
   which is why Panjab reaches across the border into Pakistan while
   Singapur is its own small island.

   `n` and `s` are where the coast runs across the ribbon: the north
   shore and the south shore. `null` means the land simply carries on
   past the edge of the card — you are deep inside a continent and
   there is no sea to draw. That's what makes the walk read: an
   archipelago you island-hop, a peninsula, a long inland crossing
   with no water at all through the Hindu Kush, then the sea again on
   the far side.
   --------------------------------------------------------- */

const AREAS = {
  /* the archipelago — each island stands alone, with a strait between */
  "Bali":        { biome: "jungle",    island: 1, cv: 1760, rv: 780 },
  "Java":        { biome: "jungle",    island: 1, cv: 1790, rv: 800 },
  "Sumatra":     { biome: "jungle",    island: 1, cv: 1730, rv: 800 },
  "Singapur":    { biome: "jungle",    island: 1, cv: 1700, rv: 620 },

  /* the mainland, from the tip of the Malay peninsula onwards */
  "Malàisia":    { biome: "jungle",    n:  820, s: 2480 },   // narrow, sea both sides
  "Siam":        { biome: "jungle",    n:  520, s: 2620 },
  "Myanmar":     { biome: "jungle",    n:  360, s: 2500 },
  "Bengala":     { biome: "wet",       n:  300, s: 2780 },   // the delta
  "L'Hindustan": { biome: "dry",       n: null, s: 2980 },
  "Panjab":      { biome: "desert",    n: null, s: 3260 },   // sea nearly out of sight
  "Hindu Kush":  { biome: "alpine",    n: null, s: null },   // no sea at all
  "Pèrsia":      { biome: "desert",    n: null, s: 2660 },
  "Armènia":     { biome: "alpine",    n: null, s: null },
  "Anatòlia":    { biome: "steppe",    n:  600, s: 2600 },   // sea to the north again
  "Els Balcans": { biome: "temperate", n:  720, s: 2680 },
  "Llombardia":  { biome: "alpine",    n: null, s: 2540 },
  "Occitània":   { biome: "temperate", n: null, s: 2720 },
  "Catalunya":   { biome: "med",       n: null, s: 2460 },
};

const OFF_N = -1100;     // "the land runs off the top of the card"
const OFF_S =  4500;     // "…and off the bottom"

const areaOf = c => c.region || c.country;

/* filled in by layout(): where along the path each area begins and ends */
let AREA_SPAN = {};
let AREA_ORDER = [];

/* which biome the ribbon is in at a given point along the journey */
function biomeAt(u) {
  let best = AREA_ORDER[0], bd = Infinity;
  for (const name of AREA_ORDER) {
    const s = AREA_SPAN[name];
    const d = u < s.u0 ? s.u0 - u : u > s.u1 ? u - s.u1 : 0;
    if (d < bd) { bd = d; best = name; }
  }
  return BIOMES[AREAS[best].biome];
}

/* ---------------------------------------------------------
   Land

   Three kinds of thing, all rebuilt whenever the path is laid out,
   since the path is what decides where the land goes:

     BODIES   the islands and the mainland — a stretch of journey
              with a north shore and a south shore, both wandering
     ISLES    everything offshore that the route never sets foot on:
              Borneo up north, Ceylon, the Andamans, Crete, Sicily…
     WATERS   sea that reaches into the land — the Bay of Bengal, the
              Persian Gulf, the Adriatic — and the inland ones that
              have no way out: the Caspian, Lake Van, the Alpine lakes
   --------------------------------------------------------- */

let BODIES = [];
let ISLES = [];
let WATERS = [];
let STRAITS = [];        // where the route has to cross water

const STRAIT = 1500;     // how wide a channel between two islands runs

/* Interpolate one of the coast values across the mainland areas, so the
   sea creeps in and retreats gradually instead of stepping at borders. */
function coastProfile(key, off) {
  const pts = [];
  for (const name of AREA_ORDER) {
    const a = AREAS[name];
    if (!a || a.island) continue;
    const sp = AREA_SPAN[name];
    pts.push({ u: (sp.u0 + sp.u1) / 2, v: a[key] == null ? off : a[key] });
  }

  return u => {
    if (!pts.length) return off;
    if (u <= pts[0].u) return pts[0].v;
    for (let i = 1; i < pts.length; i++) {
      if (u <= pts[i].u) {
        const t = (u - pts[i - 1].u) / (pts[i].u - pts[i - 1].u);
        const e = t * t * (3 - 2 * t);         // ease, so borders don't kink
        return pts[i - 1].v + (pts[i].v - pts[i - 1].v) * e;
      }
    }
    return pts[pts.length - 1].v;
  };
}

/* A landmass: a stretch of journey with two wandering shores. The caps
   are how quickly the land closes off at each end — short for an
   island, which ends in a blunt headland, long for the tip of a
   peninsula, zero for a coast that just runs off the card. */
function body({ u0, u1, n, s, capL = 0, capR = 0, biome = null, kind = "land" }) {
  const cap = (d, L) => (L <= 0 ? 1 : Math.sqrt(Math.max(0, Math.min(1, d / L))));

  const shape = u => {
    const a = n(u), b = s(u);
    const mid = (a + b) / 2;
    const k = Math.min(cap(u - u0, capL), cap(u1 - u, capR));
    return [mid - (mid - a) * k, mid + (b - mid) * k];
  };

  return { u0, u1, biome, kind, shape,
           n: u => shape(u)[0], s: u => shape(u)[1] };
}

function bodyPath(b, step = 150) {
  const top = [], bot = [];
  for (let u = b.u0; u < b.u1; u += step) {
    const [a, c] = b.shape(u);
    top.push(pp(u, a));
    bot.push(pp(u, c));
  }
  const [a, c] = b.shape(b.u1);
  top.push(pp(b.u1, a));
  bot.push(pp(b.u1, c));
  return "M" + top.join("L") + "L" + bot.reverse().join("L") + "Z";
}

/* Everything offshore, as fractions along the journey. These are the
   places the route never touches — they're there so the sea isn't
   empty and the coast has something to be a coast of. */
const OFFSHORE = [
  { t: 0.010, v: 3230, ru: 2600, rv:  360, biome: "jungle" },                  // Lombok & the Sundes
  { t: 0.031, v:  170, ru: 5200, rv:  620, biome: "jungle", name: "Borneo" },
  { t: 0.052, v: 3280, ru: 1500, rv:  320, biome: "jungle" },
  { t: 0.074, v:  230, ru: 2400, rv:  460, biome: "jungle" },
  { t: 0.100, v: 3190, ru: 1100, rv:  300, biome: "jungle" },
  { t: 0.132, v:  200, ru: 1800, rv:  400, biome: "jungle" },
  { t: 0.162, v: 3250, ru:  900, rv:  280, biome: "jungle" },
  { t: 0.205, v: 3170, ru: 1400, rv:  340, biome: "jungle", name: "Nicobar" },
  { t: 0.244, v: 3240, ru: 1000, rv:  300, biome: "jungle" },
  { t: 0.286, v: 3100, ru: 1700, rv:  330, biome: "jungle", name: "Andaman" },
  { t: 0.352, v: 3260, ru:  820, rv:  240, biome: "jungle" },
  { t: 0.470, v: 3250, ru: 1900, rv:  330, biome: "wet",     name: "Ceilan" },
  { t: 0.735, v: 3200, ru: 1000, rv:  260, biome: "desert" },
  { t: 0.808, v: 3210, ru: 1300, rv:  300, biome: "med",     name: "Xipre" },
  { t: 0.845, v: 3130, ru:  760, rv:  230, biome: "med" },
  { t: 0.872, v: 3270, ru: 1600, rv:  280, biome: "med",     name: "Creta" },
  { t: 0.905, v: 3190, ru: 1100, rv:  340, biome: "med" },
  { t: 0.930, v: 3130, ru: 1500, rv:  390, biome: "med",     name: "Sicília" },
  { t: 0.952, v: 3230, ru:  900, rv:  420, biome: "med",     name: "Còrsega" },
  { t: 0.968, v: 3270, ru:  820, rv:  360, biome: "med",     name: "Sardenya" },
  { t: 0.991, v: 3200, ru: 1100, rv:  300, biome: "med",     name: "Balears" },
];

/* Water that reaches into the land, or sits inside it with no way out. */
const INLAND_WATER = [
  { t: 0.300, v: 2560, ru: 2600, rv:  360 },                       // golf de Martaban
  { t: 0.392, v: 2680, ru: 4200, rv:  520 },                       // golf de Bengala
  { t: 0.520, v: 2900, ru: 3400, rv:  460 },                       // el Rann
  { t: 0.700, v: 2540, ru: 4600, rv:  420 },                       // el golf Pèrsic
  { t: 0.718, v:  660, ru: 3100, rv:  520, lake: 1, name: "MAR CÀSPIA" },
  { t: 0.769, v: 1090, ru:  850, rv:  210, lake: 1 },              // llac Van
  { t: 0.796, v:  400, ru: 3600, rv:  460, name: "MAR NEGRA" },
  { t: 0.862, v: 2620, ru: 1900, rv:  400 },                       // l'Egeu
  { t: 0.896, v: 2560, ru: 2400, rv:  330 },                       // l'Adriàtic
  { t: 0.921, v:  900, ru:  700, rv:  190, lake: 1 },              // els llacs alpins
  { t: 0.934, v: 1010, ru:  520, rv:  150, lake: 1 },
  { t: 0.957, v: 2600, ru: 2200, rv:  380 },                       // el golf del Lleó
];

function buildLand() {
  BODIES = [];
  ISLES = [];
  WATERS = [];
  STRAITS = [];

  const cN = coastProfile("n", OFF_N);
  const cS = coastProfile("s", OFF_S);

  /* the shores wander: big bays, then inlets, then a rough edge */
  const wN = wobbler(41, 24000, 320);
  const wS = wobbler(77, 27000, 360);

  const islandAreas = AREA_ORDER.filter(n => AREAS[n] && AREAS[n].island);
  const mainAreas = AREA_ORDER.filter(n => AREAS[n] && !AREAS[n].island);

  /* --- the islands --- */
  islandAreas.forEach((name, i) => {
    const a = AREAS[name];
    const sp = AREA_SPAN[name];

    /* leave a channel at each end, but only where there's another
       island to be separated from */
    const g0 = i === 0 ? 0 : STRAIT / 2;
    const g1 = STRAIT / 2;

    const iN = wobbler(200 + i * 3, 5200, 150, 3);
    const iS = wobbler(400 + i * 3, 4600, 165, 3);

    BODIES.push(body({
      u0: sp.u0 + g0, u1: sp.u1 - g1,
      n: u => a.cv - a.rv + iN(u),
      s: u => a.cv + a.rv + iS(u),
      capL: g0 ? 700 : 2600, capR: 700,
      biome: a.biome, kind: "island",
    }));

    STRAITS.push(sp.u1);          // the channel to whatever comes next
  });

  /* --- the mainland: one coastline from the Malay peninsula to the sea
         at Barcelona, its shores easing between what each area asks for --- */
  if (mainAreas.length) {
    const u0 = AREA_SPAN[mainAreas[0]].u0;
    BODIES.push(body({
      u0, u1: JOURNEY + 4000,
      n: u => cN(u) + wN(u),
      s: u => cS(u) + wS(u),
      capL: 7000,                       // a long tapering peninsula tip
      kind: "main",
    }));
  }

  /* --- offshore. An island only goes in if there's open water for it
         to sit in: where the coast has come out to meet it, the sea it
         belonged to isn't there any more and neither is it. --- */
  OFFSHORE.forEach((o, i) => {
    const cu = X(o.t);
    const host = BODIES.find(b => cu >= b.u0 && cu <= b.u1);

    if (host) {
      const [n, s] = host.shape(cu);
      const clear = o.v < ACROSS / 2
        ? o.v + o.rv < n - 300        // out in the northern sea
        : o.v - o.rv > s + 300;       // …or the southern one
      if (!clear) return;
    }

    ISLES.push({ cu, cv: o.v, ru: o.ru, rv: o.rv,
                 seed: 900 + i * 7, biome: o.biome, name: o.name });
  });

  /* --- gulfs and lakes --- */
  INLAND_WATER.forEach((w, i) => {
    WATERS.push({ cu: X(w.t), cv: w.v, ru: w.ru, rv: w.rv,
                  seed: 1500 + i * 5, lake: w.lake, name: w.name });
  });
}

const inEllipse = (u, v, e, inset) => {
  const du = (u - e.cu) / Math.max(1, e.ru - inset);
  const dv = (v - e.cv) / Math.max(1, e.rv - inset);
  return du * du + dv * dv <= 1;
};

/* Is this point on land? Everything drawn on the ground — trees, dunes,
   mountains, villages — asks first, so nothing ends up floating in the
   sea. `inset` keeps it comfortably inshore, since the coastline
   wanders around the line the test uses. */
function onLand(u, v, inset = 90) {
  for (const w of WATERS) if (inEllipse(u, v, w, -inset)) return false;

  for (const b of BODIES) {
    if (u < b.u0 || u > b.u1) continue;
    const [n, s] = b.shape(u);
    if (v > n + inset && v < s - inset) return true;
  }

  for (const e of ISLES) if (inEllipse(u, v, e, inset)) return true;

  return false;
}

/* …and the other way round, for anything that belongs in the water. */
function onSea(u, v, inset = 90) {
  for (const w of WATERS) if (inEllipse(u, v, w, inset)) return true;

  for (const b of BODIES) {
    if (u < b.u0 || u > b.u1) continue;
    const [n, s] = b.shape(u);
    if (v > n - inset && v < s + inset) return false;
  }

  for (const e of ISLES) if (inEllipse(u, v, e, -inset)) return false;

  return true;
}

/* Sea names. They sit off whichever coast they belong to, and the coast
   moves, so where exactly is worked out when the map is drawn. */
const SEAS = [
  { t: 0.048, name: "MAR DE JAVA",       size: 128, side: "s" },
  { t: 0.118, name: "ESTRET DE LA SONDA", size: 96, side: "n" },
  { t: 0.186, name: "MAR D'ANDAMAN",     size: 120, side: "s" },
  { t: 0.262, name: "GOLF DE SIAM",      size: 104, side: "n" },
  { t: 0.336, name: "GOLF DE BENGALA",   size: 134, side: "s" },
  { t: 0.505, name: "MAR ARÀBIGA",       size: 144, side: "s" },
  { t: 0.692, name: "EL GOLF PÈRSIC",    size: 112, side: "s" },
  { t: 0.884, name: "L'ADRIÀTIC",        size: 106, side: "s" },
  { t: 0.958, name: "MAR MEDITERRÀNIA",  size: 150, side: "s" },
];

/* ---------------------------------------------------------
   Cities

   `t` is how far along the route the city sits — it gets snapped
   to the nearest door, so every city lines up with the day you
   arrive there.

   Each city shows a photo pinned to the card. Drop a file at
   photos/<slug>.jpg and it appears in the frame; until then the
   frame holds an ink drawing of the landmark.
   --------------------------------------------------------- */

const CITIES = [
  { t: 0.000, name: "Kuta",         slug: "kuta",          country: "Indonèsia",  region: "Bali", icon: "beach",   landmark: "La platja de Kuta", wiki: "Kuta, Bali" },
  { t: 0.022, name: "Ubud",         slug: "ubud",         country: "Indonèsia",  region: "Bali", icon: "pura",    landmark: "Tirta Empul", town: 1 },
  { t: 0.045, name: "Surabaya",     slug: "surabaya",     country: "Indonèsia",  region: "Java", icon: "mosque",  landmark: "Mesquita Al Akbar" },
  { t: 0.068, name: "Yogyakarta",   slug: "yogyakarta",   country: "Indonèsia",  region: "Java", icon: "stupa",   landmark: "Borobudur" },
  { t: 0.092, name: "Jakarta",      slug: "jakarta",      country: "Indonèsia",  region: "Java", icon: "towers",  landmark: "El Monas" },
  { t: 0.116, name: "Palembang",    slug: "palembang",    country: "Indonèsia",  region: "Sumatra", icon: "mosque",  landmark: "Pont d'Ampera" },
  { t: 0.138, name: "Singapur",     slug: "singapore",    country: "Singapur",   icon: "towers",  landmark: "Marina Bay Sands" },
  { t: 0.160, name: "Malaca",       slug: "melaka",       country: "Malàisia",   icon: "church",  landmark: "Església de Crist", town: 1 },
  { t: 0.180, name: "Kuala Lumpur", slug: "kuala-lumpur", country: "Malàisia",   icon: "towers",  landmark: "Torres Petronas" },
  { t: 0.200, name: "Penang",       slug: "penang",       country: "Malàisia",   icon: "arch",    landmark: "George Town", town: 1 },
  { t: 0.222, name: "Hat Yai",      slug: "hat-yai",      country: "Tailàndia",  region: "Siam", icon: "wat",     landmark: "Wat Hat Yai Nai", town: 1 },
  { t: 0.245, name: "Bangkok",      slug: "bangkok",      country: "Tailàndia",  region: "Siam", icon: "wat",     landmark: "Wat Arun" },
  { t: 0.266, name: "Ayutthaya",    slug: "ayutthaya",    country: "Tailàndia",  region: "Siam", icon: "stupa",   landmark: "Wat Chaiwatthanaram", town: 1 },
  { t: 0.288, name: "Chiang Mai",   slug: "chiang-mai",   country: "Tailàndia",  region: "Siam", icon: "wat",     landmark: "Wat Phra Singh" },
  { t: 0.310, name: "Yangon",       slug: "yangon",       country: "Myanmar",    icon: "stupa",   landmark: "Pagoda de Shwedagon" },
  { t: 0.332, name: "Bagan",        slug: "bagan",        country: "Myanmar",    icon: "stupa",   landmark: "La plana dels temples", town: 1 },
  { t: 0.354, name: "Mandalay",     slug: "mandalay",     country: "Myanmar",    icon: "wat",     landmark: "Pont d'U Bein" },
  { t: 0.376, name: "Chittagong",   slug: "chittagong",   country: "Bangladesh", region: "Bengala", icon: "mosque",  landmark: "Shahi Jame Masjid" },
  { t: 0.398, name: "Dacca",        slug: "dhaka",        country: "Bangladesh", region: "Bengala", icon: "arch",    landmark: "Fort de Lalbagh" },
  { t: 0.420, name: "Calcuta",      slug: "kolkata",      country: "Índia",      region: "Bengala", icon: "arch",    landmark: "Victoria Memorial" },
  { t: 0.442, name: "Benarés",      slug: "varanasi",     country: "Índia",      region: "L'Hindustan", icon: "dome",    landmark: "Els ghats" },
  { t: 0.462, name: "Lucknow",      slug: "lucknow",      country: "Índia",      region: "L'Hindustan", icon: "mosque",  landmark: "Bara Imambara" },
  { t: 0.482, name: "Agra",         slug: "agra",         country: "Índia",      region: "L'Hindustan", icon: "taj",     landmark: "El Taj Mahal" },
  { t: 0.502, name: "Delhi",        slug: "delhi",        country: "Índia",      region: "L'Hindustan", icon: "arch",    landmark: "Porta de l'Índia" },
  { t: 0.522, name: "Jaipur",       slug: "jaipur",       country: "Índia",      region: "L'Hindustan", icon: "dome",    landmark: "Hawa Mahal" },
  { t: 0.544, name: "Amritsar",     slug: "amritsar",     country: "Índia",      region: "Panjab", icon: "dome",    landmark: "El Temple Daurat" },
  { t: 0.564, name: "Lahore",       slug: "lahore",       country: "Pakistan",   region: "Panjab", icon: "mosque",  landmark: "Mesquita Badshahi" },
  { t: 0.586, name: "Islamabad",    slug: "islamabad",    country: "Pakistan",   region: "Panjab", icon: "mosque",  landmark: "Mesquita Faisal" },
  { t: 0.606, name: "Peshawar",     slug: "peshawar",     country: "Pakistan",   region: "Panjab", icon: "arch",    landmark: "Bala Hisar" },
  { t: 0.626, name: "Kabul",        slug: "kabul",        country: "Afganistan", region: "Hindu Kush", icon: "peaks",   landmark: "L'Hindu Kush" },
  { t: 0.648, name: "Kandahar",     slug: "kandahar",     country: "Afganistan", region: "Hindu Kush", icon: "mosque",  landmark: "Santuari del Mantell", town: 1 },
  { t: 0.668, name: "Herat",        slug: "herat",        country: "Afganistan", region: "Hindu Kush", icon: "mosque",  landmark: "La Mesquita del Divendres", town: 1 },
  { t: 0.690, name: "Mashad",       slug: "mashhad",      country: "Iran",       region: "Pèrsia", icon: "dome",    landmark: "Santuari de l'Imam Reza" },
  { t: 0.710, name: "Teheran",      slug: "tehran",       country: "Iran",       region: "Pèrsia", icon: "dome",    landmark: "Torre Azadi" },
  { t: 0.730, name: "Isfahan",      slug: "esfahan",      country: "Iran",       region: "Pèrsia", icon: "dome",    landmark: "Naqsh-e Jahan" },
  { t: 0.752, name: "Tabriz",       slug: "tabriz",       country: "Iran",       region: "Pèrsia", icon: "mosque",  landmark: "La Mesquita Blava" },
  { t: 0.772, name: "Erevan",       slug: "yerevan",      country: "Armènia",    icon: "church",  landmark: "Mont Ararat" },
  { t: 0.792, name: "Ankara",       slug: "ankara",       country: "Turquia",    region: "Anatòlia", icon: "mosque",  landmark: "Mesquita de Kocatepe" },
  { t: 0.814, name: "Istanbul",     slug: "istanbul",     country: "Turquia",    region: "Anatòlia", icon: "sophia",  landmark: "Santa Sofia" },
  { t: 0.836, name: "Sofia",        slug: "sofia",        country: "Bulgària",   region: "Els Balcans", icon: "church",  landmark: "Alexandre Nevski" },
  { t: 0.856, name: "Belgrad",      slug: "belgrade",     country: "Sèrbia",     region: "Els Balcans", icon: "church",  landmark: "Sant Sava" },
  { t: 0.876, name: "Zagreb",       slug: "zagreb",       country: "Croàcia",    region: "Els Balcans", icon: "church",  landmark: "La catedral" },
  { t: 0.896, name: "Venècia",      slug: "venezia",      country: "Itàlia",     region: "Llombardia", icon: "arch",    landmark: "Sant Marc" },
  { t: 0.918, name: "Milà",         slug: "milano",       country: "Itàlia",     region: "Llombardia", icon: "duomo",   landmark: "El Duomo" },
  { t: 0.938, name: "Torí",         slug: "torino",       country: "Itàlia",     region: "Llombardia", icon: "arch",    landmark: "Mole Antonelliana" },
  { t: 0.958, name: "Marsella",     slug: "marseille",    country: "França",     region: "Occitània", icon: "church",  landmark: "Notre-Dame de la Garde" },
  { t: 0.976, name: "Montpeller",   slug: "montpellier",  country: "França",     region: "Occitània", icon: "arch",    landmark: "Porta del Peyrou", town: 1 },
  { t: 0.990, name: "Girona",       slug: "girona",       country: "Catalunya",  icon: "church",  landmark: "La catedral", town: 1 },
  { t: 1.000, name: "Seva",         slug: "seva",          country: "Catalunya",  icon: "house",   landmark: "C/Can Garriga" },
];

/* ---------------------------------------------------------
   Landmark drawings — ink vignettes, ~200 units tall
   --------------------------------------------------------- */

const ICONS = {
  pura: `<path d="M-60 60 L60 60 M-46 60 L-46 18 L46 18 L46 60
                  M-52 18 L0 -6 L52 18 M-40 -6 L-40 -26 L40 -26 L40 -6
                  M-46 -26 L0 -48 L46 -26 M-28 -48 L-28 -66 L28 -66 L28 -48
                  M-34 -66 L0 -92 L34 -66 M0 -92 L0 -118"/>`,

  volcano: `<path d="M-84 60 L-22 -52 L22 -52 L84 60 Z M-22 -52 Q0 -34 22 -52"/>`,

  towers: `<path d="M-70 60 L-70 -14 L-38 -14 L-38 60 M-24 60 L-24 -46 L8 -46 L8 60
                    M22 60 L22 -22 L54 -22 L54 60 M-86 60 L74 60
                    M-8 -46 L-8 -74 M38 -22 L38 -48"/>`,

  wat: `<path d="M-70 60 L70 60 M-54 60 L-54 10 L54 10 L54 60
                 M-62 10 L0 -22 L62 10 M-16 -22 L-16 -50 L16 -50 L16 -22
                 M-24 -50 L0 -78 L24 -50 M0 -78 L0 -104 M-12 -96 L12 -96"/>`,

  stupa: `<path d="M-76 60 L76 60 M-58 60 L-58 34 L58 34 L58 60
                   M-46 34 Q-46 -30 0 -62 Q46 -30 46 34
                   M0 -62 L0 -118 M-16 -92 L16 -92 M-10 -106 L10 -106"/>`,

  arch: `<path d="M-64 60 L-64 -30 Q0 -84 64 -30 L64 60 M-64 60 L64 60
                  M-34 60 L-34 -8 Q0 -40 34 -8 L34 60
                  M-64 -30 L-78 -30 M64 -30 L78 -30"/>`,

  taj: `<path d="M-96 60 L96 60 M-76 60 L-76 24 L76 24 L76 60
                 M-46 24 L-46 -14 Q0 -78 46 -14 L46 24
                 M0 -78 L0 -104 M-14 -46 L-14 24 M14 -46 L14 24
                 M-70 24 L-70 -46 M70 24 L70 -46 M-58 24 L-58 -30 M58 24 L58 -30"/>`,

  mosque: `<path d="M-84 60 L84 60 M-64 60 L-64 20 L64 20 L64 60
                    M-40 20 Q-40 -34 0 -56 Q40 -34 40 20 M0 -56 L0 -80
                    M-72 20 L-72 -40 L-58 -40 L-58 20 M72 20 L72 -40 L58 -40 L58 20
                    M-65 -40 L-65 -56 M65 -40 L65 -56"/>`,

  peaks: `<path d="M-100 60 L-40 -46 L-4 6 L34 -68 L100 60 Z
                   M-56 -18 L-40 -46 L-24 -18 M18 -42 L34 -68 L50 -42"/>`,

  dome: `<path d="M-72 60 L72 60 M-54 60 L-54 14 L54 14 L54 60
                  M-40 14 Q-40 -26 -18 -38 Q0 -74 18 -38 Q40 -26 40 14
                  M0 -74 L0 -96 M-54 14 L-54 -22 M54 14 L54 -22"/>`,

  sophia: `<path d="M-104 60 L104 60 M-72 60 L-72 16 L72 16 L72 60
                    M-48 16 Q-48 -40 0 -62 Q48 -40 48 16 M0 -62 L0 -78
                    M-72 16 Q-72 -14 -48 -24 M72 16 Q72 -14 48 -24
                    M-92 60 L-92 -34 L-82 -34 L-82 60 M92 60 L92 -34 L82 -34 L82 60
                    M-87 -34 L-87 -52 M87 -34 L87 -52"/>`,

  church: `<path d="M-64 60 L-64 -6 L64 -6 L64 60 M-64 60 L64 60
                    M-74 -6 L0 -50 L74 -6 M-18 -50 L-18 -84 L18 -84 L18 -50
                    M0 -84 L0 -112 M-12 -102 L12 -102"/>`,

  duomo: `<path d="M-90 60 L90 60 M-74 60 L-74 4 L74 4 L74 60
                   M-74 4 L-58 -40 L-42 4 M-42 4 L-26 -56 L-10 4
                   M-10 4 L0 -86 L10 4 M10 4 L26 -56 L42 4 M42 4 L58 -40 L74 4
                   M0 -86 L0 -104"/>`,

  sagrada: `<path d="M-86 60 L86 60 M-62 60 L-62 -18 Q-62 -74 -50 -108 Q-38 -74 -38 -18 L-38 60
                     M-24 60 L-24 -34 Q-24 -100 -10 -140 Q4 -100 4 -34 L4 60
                     M18 60 L18 -28 Q18 -92 32 -128 Q46 -92 46 -28 L46 60
                     M62 60 L62 -6 Q62 -56 72 -86 Q82 -56 82 -6 L82 60
                     M-50 -108 L-50 -122 M-10 -140 L-10 -156 M32 -128 L32 -142"/>`,

  /* the journey's actual ends, not landmarks: a beach to start barefoot
     from, a door to come home through */
  beach: `<path d="M-90 60 Q0 40 90 60 M-90 44 Q-40 20 10 40 Q50 6 90 30
                   M-52 -50 Q-30 -78 -6 -50 M-30 -50 L-30 -78"/>`,

  house: `<path d="M-70 60 L-70 -6 L0 -66 L70 -6 L70 60 M-70 60 L70 60
                   M-24 60 L-24 8 L24 8 L24 60 M-88 -6 L0 -78 L88 -6"/>`,
};

const iconOf = c => ICONS[c.icon] || ICONS.arch;

/* ---------------------------------------------------------
   The little drawings

   One vocabulary for the land and one for the sea, drawn around the
   origin with their feet on y=0. They're defined once in <defs> and
   stamped out with <use>, which is what keeps a few thousand of them
   affordable. Strokes take `currentColor`, so a glyph picks up
   whatever ink the biome it lands in is drawn with.
   --------------------------------------------------------- */

const GLYPHS = {
  palm: `<path d="M0 0 Q-6 -34 -2 -62 M-2 -62 Q-30 -76 -50 -62 M-2 -62 Q-30 -92 -52 -88
                  M-2 -62 Q22 -88 46 -80 M-2 -62 Q26 -74 48 -58 M-2 -62 Q0 -84 -14 -96"/>`,

  banana: `<path d="M0 0 L0 -28 M0 -28 Q-34 -38 -46 -64 M0 -28 Q-16 -56 -32 -78
                    M0 -28 Q26 -44 36 -70 M0 -28 Q12 -58 4 -84"/>`,

  bamboo: `<path d="M-15 0 L-18 -72 M0 0 L0 -94 M15 0 L19 -64
                    M-21 -28 L-12 -28 M-20 -52 L-13 -52 M-4 -38 L4 -38 M-3 -68 L3 -68
                    M13 -26 L21 -26 M14 -48 L21 -48"/>`,

  paddy: `<path d="M-48 0 Q0 -13 48 0 M-42 -17 Q0 -30 42 -17
                   M-33 -34 Q0 -46 33 -34 M-23 -50 Q0 -60 23 -50"/>`,

  tree: `<path d="M0 0 L0 -30"/>
         <path d="M0 -30 Q-30 -34 -26 -58 Q-24 -84 0 -86 Q24 -84 26 -58 Q30 -34 0 -30 Z"
               fill="currentColor" fill-opacity=".2"/>`,

  pine: `<path d="M0 0 L0 -20"/>
         <path d="M0 -20 L-23 -20 L-13 -46 L-19 -46 L-8 -72 L-13 -72 L0 -102
                  L13 -72 L8 -72 L19 -46 L13 -46 L23 -20 Z"
               fill="currentColor" fill-opacity=".2"/>`,

  cypress: `<path d="M0 0 L0 -22"/>
            <path d="M0 -22 Q-15 -30 -13 -62 Q-11 -94 0 -104 Q11 -94 13 -62 Q15 -30 0 -22 Z"
                  fill="currentColor" fill-opacity=".2"/>`,

  olive: `<path d="M0 0 L0 -26 M0 -19 L-11 -31 M0 -23 L12 -35"/>
          <path d="M0 -26 Q-29 -30 -27 -50 Q-25 -71 0 -71 Q25 -71 27 -50 Q29 -30 0 -26 Z"
                fill="currentColor" fill-opacity=".2"/>`,

  /* rows of vines on their wires, seen along the row */
  vine: `<path d="M-56 2 Q0 -10 56 2 M-50 -20 Q0 -31 50 -20"/>
         <path d="M-38 0 L-38 -16 M-13 -3 L-13 -19 M13 -3 L13 -19 M38 0 L38 -16
                  M-26 -22 L-26 -38 M0 -25 L0 -41 M26 -22 L26 -38"/>`,

  scrub: `<path d="M-22 0 Q-18 -22 -4 -26 M4 0 Q10 -18 24 -20 M-8 0 Q-6 -14 2 -16"/>`,

  tuft: `<path d="M-16 0 L-12 -22 M-2 0 L-2 -28 M12 0 L16 -20"/>`,

  thorn: `<path d="M0 0 L0 -42 M0 -27 L-19 -42 M0 -18 L17 -35
                   M-19 -42 L-19 -55 M17 -35 L17 -48"/>`,

  dune: `<path d="M-52 0 Q-22 -26 10 -8 Q30 -20 54 -4 M-30 14 Q0 -6 34 12"/>`,

  oasis: `<path d="M-48 6 Q0 -12 48 6 Q0 20 -48 6 Z" fill="currentColor" fill-opacity=".22"/>
          <path d="M-24 0 Q-28 -26 -24 -48 M-24 -48 Q-44 -58 -57 -47 M-24 -48 Q-7 -62 8 -52
                   M22 0 Q20 -22 22 -40 M22 -40 Q7 -50 -4 -42 M22 -40 Q38 -50 50 -41"/>`,

  hills: `<path d="M-54 0 Q-30 -34 -6 0 M-14 0 Q14 -44 42 0 M28 0 Q44 -22 58 0"/>`,

  crag: `<path d="M-42 0 L-23 -46 L-8 -25 L4 -58 L21 -31 L42 0 Z"
               fill="currentColor" fill-opacity=".14"/>`,

  snowpeak: `<path d="M-56 0 L-16 -66 L6 -38 L30 -78 L60 0 Z"
                   fill="currentColor" fill-opacity=".16"/>
             <path d="M-30 -30 L-16 -66 L-4 -44 Q-16 -34 -30 -30 Z
                      M16 -52 L30 -78 L44 -50 Q30 -40 16 -52 Z"
                   fill="var(--snow)" stroke="none" opacity=".92"/>`,

  volcano: `<path d="M-54 0 L-17 -56 L17 -56 L54 0 Z" fill="currentColor" fill-opacity=".16"/>
            <path d="M-17 -56 Q0 -46 17 -56 M-5 -66 Q-17 -86 -2 -95 Q13 -104 6 -120"/>`,

  village: `<path d="M-48 0 L-48 -20 L-31 -33 L-14 -20 L-14 0
                     M-5 0 L-5 -27 L14 -42 L33 -27 L33 0
                     M40 0 L40 -14 L52 -24 L64 -14 L64 0"/>`,

  fort: `<path d="M-42 0 L-42 -34 L-31 -34 L-31 -45 L-19 -45 L-19 -34 L19 -34
                  L19 -45 L31 -45 L31 -34 L42 -34 L42 0 M-9 0 L-9 -20 L9 -20 L9 0"/>`,

  bridge: `<path d="M-54 0 L-54 -14 M54 0 L54 -14 M-54 -14 Q0 -58 54 -14
                    M-31 -14 L-31 -30 M0 -14 L0 -40 M31 -14 L31 -30"/>`,

  tent: `<path d="M-42 0 L0 -52 L42 0 Z M0 -52 L0 -64 M-15 0 Q0 -23 15 0"/>`,

  windmill: `<path d="M-15 0 L-7 -46 L7 -46 L15 0 Z M0 -46 L0 -55
                      M0 -55 L-36 -76 M0 -55 L36 -34 M0 -55 L-21 -19 M0 -55 L21 -91"/>`,

  camel: `<path d="M-38 0 L-35 -21 Q-23 -35 -9 -31 Q0 -47 12 -41 Q23 -51 33 -34
                   M33 -34 Q46 -37 48 -49 L53 -53 M-35 -21 L-39 0 M-21 -27 L-23 0
                   M8 -33 L6 0 M27 -32 L31 0"/>`,

  elephant: `<path d="M-45 0 L-43 -27 Q-41 -53 -12 -55 Q23 -57 35 -41 Q45 -29 43 -13 L43 0
                      M41 -35 Q56 -27 54 -6 M-43 -31 L-47 0 M-16 -35 L-18 0
                      M14 -37 L12 0 M35 -31 L37 0 M-31 -41 Q-42 -35 -39 -22"/>`,

  goat: `<path d="M-31 0 L-29 -19 Q-15 -27 4 -25 L27 -23 L31 -35 M27 -23 L31 -9 L31 0
                  M29 -35 Q39 -41 35 -52 M29 -35 Q21 -43 27 -52
                  M-29 -19 L-31 0 M-13 -23 L-15 0 M8 -23 L8 0"/>`,
};

const SEA_GLYPHS = {
  waves: `<path d="M-42 0 Q-28 -13 -14 0 Q0 13 14 0 M-26 24 Q-12 11 2 24 Q16 37 30 24"/>`,

  fish: `<path d="M-27 0 Q-9 -15 13 0 Q-9 15 -27 0 Z M13 0 L28 -13 L28 13 Z"/>`,

  bird: `<path d="M-28 0 Q-14 -13 0 0 Q14 -13 28 0"/>`,

  ship: `<path d="M-40 -4 Q-32 16 0 18 Q32 16 40 -4 Z" fill="currentColor" fill-opacity=".14"/>
         <path d="M0 -4 L0 -70 M0 -64 Q30 -50 30 -20 L0 -20 M0 -55 Q-25 -45 -25 -22 L0 -22"/>`,

  junk: `<path d="M-46 -4 Q-38 16 0 18 Q38 16 46 -4 Z" fill="currentColor" fill-opacity=".14"/>
         <path d="M-14 -4 L-14 -74 M22 -4 L22 -54"/>
         <path d="M-14 -68 L-48 -56 L-48 -14 L-14 -22 Z M22 -50 L48 -41 L48 -10 L22 -17 Z"/>`,

  whale: `<path d="M-46 0 Q-31 -23 0 -23 Q31 -23 41 -4 L50 -19 L54 5 Q21 15 -15 8 Q-40 6 -46 0 Z
                   M-4 -23 Q-2 -37 9 -42 M-4 -23 Q0 -35 -13 -41"/>`,

  boat: `<path d="M-26 0 Q0 13 26 0 Z M0 0 L0 -44 M0 -40 Q19 -30 19 -12 L0 -12"/>`,

  wind: `<path d="M0 -36 L9 0 L0 36 L-9 0 Z M-36 0 L0 -8 L36 0 L0 8 Z"/>`,
};

/* ---------------------------------------------------------
   Build

   `routePointAt(u)` maps a distance along the journey to a point on the
   drawn route, in screen coordinates. calendar.js owns the route, so it
   passes this in.
   --------------------------------------------------------- */

function buildMap(svg, routePointAt) {
  const p = [];
  SYMBOL_SPACE = makeSpacing(230);
  RIDGE_SPACE = makeSpacing(500);    // ridges are wider, so keep them further apart

  /* ---- open sea ---- */
  p.push(`<rect x="${VB_X}" y="0" width="${VB_W}" height="${VB_H}" fill="url(#seaGrad)"/>`);

  /* ---- the shapes of the land ---- */
  const shapes = [];       // everything that is land
  BODIES.forEach(b => shapes.push({
    d: bodyPath(b),
    fill: b.biome ? BIOMES[b.biome].fill : "url(#biomeGrad)",
  }));
  ISLES.forEach(e => shapes.push({
    d: blob(e.cu, e.cv, e.ru, e.rv, e.seed),
    fill: BIOMES[e.biome].fill,
  }));

  const waters = WATERS.map(w => ({
    ...w, d: blob(w.cu, w.cv, w.ru, w.rv, w.seed, 0.17, 34),
  }));

  /* Shallows: the coastline stroked a few times over, wide and faint
     first, narrow and stronger last. It reads as depth banding round
     every island and every bay, and it costs five strokes. */
  const SHELF = [[420, .09], [320, .12], [230, .16], [150, .22], [80, .3]];
  const outlines = shapes.map(s => `<path d="${s.d}"/>`).join("");

  p.push(SHELF.map(([w, o]) =>
    `<g fill="none" stroke="var(--coast-halo)" stroke-width="${w}"
        stroke-linejoin="round" opacity="${o}">${outlines}</g>`).join(""));

  /* ---- the land itself ---- */
  p.push(`<g>${shapes.map(s => `<path d="${s.d}" fill="${s.fill}"/>`).join("")}</g>`);

  /* ---- gulfs and lakes, cut back out of it ---- */
  p.push(waters.map((w, i) => `
    <clipPath id="w${i}"><path d="${w.d}"/></clipPath>
    <path d="${w.d}" fill="${w.lake ? "var(--lake)" : "url(#seaGrad)"}"/>
    <g clip-path="url(#w${i})" fill="none" stroke="var(--coast-halo)" stroke-linejoin="round">
      ${SHELF.map(([wd, o]) =>
        `<path d="${w.d}" stroke-width="${wd * 0.8}" opacity="${o}"/>`).join("")}
    </g>`).join(""));

  /* ---- the coastline, printed as a hairline ---- */
  p.push(`<g fill="none" stroke="var(--map-ink)" stroke-width="5" opacity=".34"
             stroke-dasharray="30 20">${outlines}
    ${waters.map(w => `<path d="${w.d}"/>`).join("")}</g>`);

  /* ---- what's on the ground, and what's in the water ---- */
  p.push(terrain());
  p.push(seaLife());

  /* ---- names ---- */
  const label = (cls, u, v, txt, style = "") => {
    const q = P(u, v);
    return `<text class="${cls}" x="${q.x.toFixed(1)}" y="${q.y.toFixed(1)}" ${style}>${txt}</text>`;
  };

  /* Sea and island names are the only background lettering left — the
     countries, regions and cities all live on the path itself now.
     In portrait there's no water beside the column to letter. */
  if (!VERTICAL) {
    p.push(SEAS.map(s => {
      const u = X(s.t);
      const b = BODIES.find(b => u >= b.u0 && u <= b.u1);
      const edge = b ? b.shape(u) : [900, 2500];
      const v = s.side === "n"
        ? Math.max(s.size * 1.4, edge[0] - 260)
        : Math.min(ACROSS - s.size * 1.2, edge[1] + 300);
      return label("map-sea", u, v, s.name, `style="font-size:${s.size}px"`);
    }).join(""));

    p.push(WATERS.filter(w => w.name).map(w =>
      label("map-sea map-sea--inland", w.cu, w.cv + 34, w.name,
            `style="font-size:${Math.min(104, w.ru * 0.09)}px"`)).join(""));

    p.push(ISLES.filter(e => e.name).map(e =>
      label("map-isle", e.cu, e.cv + 22, e.name.toUpperCase(),
            `style="font-size:${Math.min(76, e.ru * 0.05)}px"`)).join(""));
  }

  /* ---- compass + scale ---- */
  p.push(compass(X(0.017), VERTICAL ? 1180 : 1120));
  if (!VERTICAL) p.push(scaleBar(X(0.56), 210));

  /* ---- the path itself: the names set between the doors ----

     Two different things happen here, and they're meant to look
     different. An area — a country, a region — is lettered *along* the
     route, wide and pale, because you're walking through it. A city is
     a point: a dot printed on the route, with its name lifted just off
     the line in the darkest ink on the card. */
  for (const it of ORDER) {
    if (it.kind === "country" || it.kind === "region") {
      const q = routePointAt(it.u);
      p.push(`<text class="map-${it.kind}" x="${q.x.toFixed(1)}" y="${q.y.toFixed(1)}"
                dominant-baseline="central">${it.label}</text>`);
    }

    if (it.kind === "city") {
      const c = CITIES[it.ci];
      const q = routePointAt(it.u);
      /* the name steps off the line far enough to clear its own dot —
         which takes more room in portrait, where the step is sideways
         and the name is centred on it rather than sitting above it */
      const off = VERTICAL ? (c.town ? -235 : -290) : (c.town ? -112 : -145);
      const n = across(q, off);
      p.push(`<g class="city${c.town ? " city--town" : ""}"
                 data-city="${it.ci}" data-u="${it.u.toFixed(1)}">
          <circle class="city__dot" cx="${q.x.toFixed(1)}" cy="${q.y.toFixed(1)}"
                  r="${c.town ? 21 : 30}"/>
          <text class="city__name" x="${n.x.toFixed(1)}" y="${n.y.toFixed(1)}"
                dominant-baseline="auto">${c.name}</text>
        </g>`);
    }
  }

  /* ---- the photos, pinned around the path ----

     Landmarks and scenes share the two bands and alternate between
     them, so the card stays balanced whichever kind of photo falls
     where. calendar.js nudges any that end up on top of each other. */
  CITIES.forEach((c, i) => p.push(cityPin(c, i, CITY_U[i])));
  SCENES.forEach((s, i) => p.push(scenePin(s, i, SCENE_U[i])));

  svg.innerHTML = defs() + p.join("");
}

function defs() {
  const g = VERTICAL
    ? `x1="0" y1="0" x2="1" y2="0"`
    : `x1="0" y1="0" x2="0" y2="1"`;

  /* the mainland is one continuous shape, so the biomes have to come
     from a gradient running the length of it rather than from a
     different fill per country */
  const stops = AREA_ORDER
    .filter(n => AREAS[n] && !AREAS[n].island)
    .map(n => {
      const s = AREA_SPAN[n];
      const at = ((s.u0 + s.u1) / 2 / JOURNEY * 100).toFixed(2);
      return `<stop offset="${at}%" stop-color="${BIOMES[AREAS[n].biome].fill}"/>`;
    }).join("");

  const bg = VERTICAL
    ? `x1="0" y1="0" x2="0" y2="${JOURNEY}"`
    : `x1="0" y1="0" x2="${JOURNEY}" y2="0"`;

  const glyphs = Object.entries(GLYPHS)
    .map(([k, d]) => `<g id="g-${k}">${d}</g>`).join("")
    + Object.entries(SEA_GLYPHS)
      .map(([k, d]) => `<g id="s-${k}">${d}</g>`).join("");

  return `<defs>
    <linearGradient id="seaGrad" ${g}>
      <stop offset="0"    stop-color="var(--sea-2)"/>
      <stop offset="0.55" stop-color="var(--sea)"/>
      <stop offset="1"    stop-color="var(--sea-2)"/>
    </linearGradient>
    <linearGradient id="biomeGrad" gradientUnits="userSpaceOnUse" ${bg}>${stops}</linearGradient>
    ${glyphs}
  </defs>`;
}

/* ---------------------------------------------------------
   Terrain

   Relief first, then the water running off it, then everything that
   grows and lives on the ground. All of it asks onLand() before it is
   drawn, and all of it keeps out of the corridor the doors run down.
   --------------------------------------------------------- */

/* The strip either side of the route that the doors and their dates
   need to themselves. It follows the route rather than the middle of
   the ribbon, so it stays exactly as wide as the doors are wherever
   the path has wandered to — measuring from the centre would leave a
   gap on the outside of every bend.

   Everything else is fair game: the photographs are opaque and printed
   over the top, so terrain underneath them simply doesn't show. */
const CORRIDOR = 360;
const clearOfRoute = (u, v) => Math.abs(v - routeV(u)) > CORRIDOR;

/* How far across the ribbon anything scattered can land. In portrait
   the card is cropped to a narrower window onto the same ribbon, so
   scattering across its full width would throw two thirds of
   everything off the sides of the card and leave the map looking bare
   on a phone. */
const V_LO = VB_X + 60;
const V_HI = VB_X + (VERTICAL ? WINDOW_V : ACROSS) - 60;
const spanV = r => V_LO + r() * (V_HI - V_LO);

/* Everything scattered on the map draws N tries per step along the
   journey, spread across however much of the ribbon is in view. In
   portrait that's a narrower window (WINDOW_V) onto the same ribbon —
   so at a fixed try-count the same glyphs land in half the area and
   the map reads as crowded. Scaling tries by how much width is
   actually on screen keeps the *density* constant across both
   orientations instead of the raw count. */
const DENSITY = (VERTICAL ? WINDOW_V : ACROSS) / ACROSS;

/* A coarse occupancy grid so scattered symbols keep a minimum distance
   from one another instead of landing right on top of one another —
   claiming a cell also claims its neighbours, so two claims always
   read as at least one cell apart. Land glyphs, sea glyphs and
   mountain ridges share one grid: a tree and a wave never need to be
   drawn any closer than a tree and a tree do. Text and photos get a
   harder guarantee later, in calendar.js's declutter() — this is only
   about symbols not piling up on *each other*. */
function makeSpacing(cell) {
  const claimed = new Set();
  return (u, v) => {
    const cx = Math.round(u / cell), cy = Math.round(v / cell);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (claimed.has(`${cx + dx},${cy + dy}`)) return false;
      }
    }
    claimed.add(`${cx},${cy}`);
    return true;
  };
}
let SYMBOL_SPACE, RIDGE_SPACE;   // (re)built once per buildMap() call, see below

function terrain() {
  const g = [];
  const r = rng(909);

  const put = (id, u, v, s, ink, cls) => {
    const q = P(u, v);
    g.push(`<use href="#${id}" class="${cls}" style="color:${ink}"
      transform="translate(${q.x.toFixed(1)},${q.y.toFixed(1)}) scale(${s.toFixed(2)})"/>`);
  };

  /* --- mountains: ridges of three to six peaks, thickest where the
         biome is alpine and the walk is climbing --- */
  for (let u = 200; u < JOURNEY; u += 1300) {
    const b = biomeAt(u);
    const want = b.relief * 0.5 * DENSITY;
    for (let k = 0; k < Math.ceil(want); k++) {
      if (r() > want - k) continue;

      const cu = u + r() * 800;
      const cv = Math.max(V_LO + 240, spanV(r));   // room above for the peaks
      if (!clearOfRoute(cu, cv) || !onLand(cu, cv, 150)) continue;
      if (!RIDGE_SPACE(cu, cv)) continue;

      const alpine = b === BIOMES.alpine;
      const n = 3 + Math.floor(r() * 4);
      const ridge = [], caps = [];

      for (let i = 0; i < n; i++) {
        const uu = cu + i * 140 - (n * 140) / 2;
        const h = (alpine ? 95 : 60) + r() * (alpine ? 110 : 70);
        ridge.push(`M${pp(uu - 88, cv)} L${pp(uu, cv - h)} L${pp(uu + 88, cv)}`);
        if (alpine) {                     // snow only where snow belongs
          caps.push(`M${pp(uu - 28, cv - h * 0.6)} L${pp(uu, cv - h)} ` +
                    `L${pp(uu + 28, cv - h * 0.6)} Q${pp(uu, cv - h * 0.44)} ${pp(uu - 28, cv - h * 0.6)} Z`);
        }
      }

      g.push(`<path d="${ridge.join(" ")}" fill="none" stroke="var(--map-ink)"
        stroke-width="6" opacity=".32" stroke-linejoin="round"/>`);
      if (caps.length) {
        g.push(`<path d="${caps.join(" ")}" fill="var(--snow)" opacity=".82" stroke="none"/>`);
      }
    }
  }

  /* --- rivers: down off the high ground, widening, then a delta where
         they reach the sea --- */
  for (let k = 0; k < Math.round(17 * SX); k++) {
    const u0 = 6000 * SX + k * 1900 * SX + r() * 900;
    const bend = 130 + r() * 130;
    const at = v => u0 + bend * Math.sin(v / 360 + k) + 70 * Math.sin(v / 130 + k);

    let run = [], width = 5, mouth = null;

    const flush = () => {
      if (run.length > 2) {
        g.push(`<polyline points="${run.join(" ")}" fill="none" stroke="var(--river)"
          stroke-width="${width.toFixed(1)}" opacity=".5" stroke-linecap="round"/>`);
      }
      run = [];
    };

    for (let v = 240; v < 3200; v += 80) {
      const u = at(v);
      if (onLand(u, v, 40)) {
        run.push(pp(u, v));
        width = 5 + (v / 3200) * 9;
        mouth = [u, v];
      } else if (run.length) {
        flush();
      }
    }
    flush();

    /* the delta — three short channels fanning out at the coast */
    if (mouth && mouth[1] < 3050) {
      const [mu, mv] = mouth;
      const d = [-1, 0, 1].map(i =>
        `M${pp(mu, mv)} Q${pp(mu + i * 130, mv + 90)} ${pp(mu + i * 240, mv + 190)}`).join(" ");
      g.push(`<path d="${d}" fill="none" stroke="var(--river)" stroke-width="6"
        opacity=".4" stroke-linecap="round"/>`);
    }
  }

  /* --- what grows on it. Seven throws of the dice at every step along
         the journey, anywhere across the ribbon; whatever lands on dry
         ground stays. Scattering rather than gridding is what lets a
         narrow island get covered as densely as a continent, without
         either of them having to know how wide it is. --- */
  const VEG_TRIES = Math.max(1, Math.round(3 * DENSITY));
  for (let u = 200; u < JOURNEY - 400; u += 340) {
    const b = biomeAt(u);
    for (let k = 0; k < VEG_TRIES; k++) {
      const uu = u + (r() - 0.5) * 340;
      const vv = spanV(r);
      if (!clearOfRoute(uu, vv) || !onLand(uu, vv)) continue;
      if (!SYMBOL_SPACE(uu, vv)) continue;

      const rare = r() < 0.05;
      const set = rare ? b.rare : b.cover;
      const id = set[Math.floor(r() * set.length)];
      put(`g-${id}`, uu, vv, (1.1 + r() * 0.8) * (VERTICAL ? 0.85 : 1),
          rare ? "var(--map-ink)" : b.ink, rare ? "veg veg--built" : "veg");
    }
  }

  /* --- and the crossings: where the route leaves one island for the
         next, there is a boat in the channel --- */
  for (const u of STRAITS) {
    if (u <= 0 || u >= JOURNEY) continue;
    put("s-boat", u, ACROSS / 2 + 520, 3.2, "var(--map-ink)", "sea-glyph sea-glyph--ship");
  }

  return `<g class="terrain">${g.join("")}</g>`;
}

/* Whatever is out on the water: swell everywhere, and now and then
   something crossing it. */
function seaLife() {
  const g = [];
  const r = rng(4242);

  for (let u = 200; u < JOURNEY; u += 480) {
    /* junks and sampans in the east, square-riggers once the route is
       into the Mediterranean */
    const west = u / JOURNEY > 0.72;
    const craft = west ? "ship" : "junk";

    for (let k = 0; k < Math.max(1, Math.round(2 * DENSITY)); k++) {
      const uu = u + (r() - 0.5) * 320;
      const vv = spanV(r);
      if (!clearOfRoute(uu, vv) || !onSea(uu, vv, 170)) continue;
      if (!SYMBOL_SPACE(uu, vv)) continue;

      const pick = r();
      const id = pick < 0.52 ? "waves"
               : pick < 0.68 ? "fish"
               : pick < 0.80 ? "bird"
               : pick < 0.91 ? craft
               : pick < 0.97 ? "whale"
               : "wind";                 // a rose of the winds, now and then

      const big = id === craft || id === "whale" || id === "wind";
      const q = P(uu, vv);
      g.push(`<use href="#s-${id}" class="sea-glyph sea-glyph--${id}"
        transform="translate(${q.x.toFixed(1)},${q.y.toFixed(1)}) scale(${((big ? 1.5 : 1.05) + r() * 0.7).toFixed(2)})"/>`);
    }
  }

  return `<g class="sealife">${g.join("")}</g>`;
}

function compass(u, v) {
  const R = 190;
  const q = P(u, v);
  return `<g class="compass" transform="translate(${q.x.toFixed(1)},${q.y.toFixed(1)})">
    <circle r="${R}" fill="none" stroke-width="7" opacity=".5"/>
    <circle r="${R * 0.72}" fill="none" stroke-width="3" opacity=".3"/>
    <path d="M0 ${-R * 0.9} L42 0 L0 ${R * 0.9} L-42 0 Z" fill="var(--map-ink)" opacity=".5"/>
    <path d="M${-R * 0.9} 0 L0 -32 L${R * 0.9} 0 L0 32 Z" fill="var(--map-ink)" opacity=".25"/>
    <text class="compass__n" y="${-R - 42}">N</text>
  </g>`;
}

function scaleBar(u, v) {
  const w = 1100;
  const q = P(u, v);
  const rot = VERTICAL ? " rotate(90)" : "";
  return `<g class="scalebar" transform="translate(${q.x.toFixed(1)},${q.y.toFixed(1)})${rot}">
    <path d="M${-w / 2} 0 h${w} M${-w / 2} -18 v36 M${w / 2} -18 v36 M0 -14 v28"
      fill="none" stroke-width="7" opacity=".45"/>
    <rect x="${-w / 2}" y="-9" width="${w / 2}" height="18" opacity=".3"/>
    <text class="scalebar__t" y="-48">MIL MILLES, MÉS O MENYS</text>
  </g>`;
}

/* Where a photo hangs: whichever band CITY_BAND/SCENE_BAND assigned it
   (see layout(), where that's worked out for cities and scenes
   together so the two bands genuinely take turns), kept clear of the
   card's ends. */
function pinAt(band, u0, w) {
  const edge = w / 2 + 120;
  const u = Math.max(edge, Math.min(JOURNEY - edge, u0));
  return P(u, PIN_BANDS[band]);
}

/* A polaroid pinned to the card. The ink drawing sits underneath, so
   if photos/<slug>.jpg isn't there yet the frame still holds the
   landmark — drop the file in and it takes over. */
function cityPin(c, i, u0) {
  const w = PIN_W, h = PIN_H, pad = 34;
  const iw = w - pad * 2;
  const q = pinAt(CITY_BAND[i], u0, w);
  const rot = (((i * 2654435761) >>> 0) % 900) / 100 - 4.5;

  return `<g class="pin" data-city="${i}"
             transform="translate(${q.x.toFixed(1)},${q.y.toFixed(1)}) rotate(${rot.toFixed(2)})">
    <rect class="pin__shadow" x="${-w / 2 + 7}" y="${-h / 2 + 11}" width="${w}" height="${h}" rx="4"/>
    <rect class="pin__frame"  x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="4"/>
    <rect class="pin__paper"  x="${-w / 2 + pad}" y="${-h / 2 + pad}" width="${iw}" height="${iw}"/>
    <g class="pin__draw" transform="translate(0,${-h / 2 + pad + iw * 0.62}) scale(1.15)">${iconOf(c)}</g>
    <image class="pin__photo" href="photos/${c.slug}.jpg" onerror="this.remove()"
           x="${-w / 2 + pad}" y="${-h / 2 + pad}" width="${iw}" height="${iw}"
           preserveAspectRatio="xMidYMid slice"/>
    <text class="pin__cap" y="${h / 2 - 62}">${c.landmark},</text>
    <text class="pin__cap pin__cap--city" y="${h / 2 - 20}">${c.name}</text>
    <circle class="pin__tack" cx="0" cy="${-h / 2 + 16}" r="17"/>
  </g>`;
}

/* The country between the cities: a smaller print, taped rather than
   tacked, so the two kinds of photo read apart at a glance. A scene
   with no file simply isn't there — unlike a city it has no landmark
   drawing to fall back on. */
function scenePin(s, i, u0) {
  const w = SCENE_W, h = SCENE_H, pad = 22;
  const iw = w - pad * 2;
  const ih = iw * 0.74;
  const q = pinAt(SCENE_BAND[i], u0, w);
  const rot = (((i * 40503 + 7919) >>> 0) % 1100) / 100 - 5.5;
  const tape = (x, k) => `<rect class="pin__tape" x="${x - 52}" y="${-h / 2 - 12}"
      width="104" height="40" transform="rotate(${k} ${x} ${-h / 2 + 8})"/>`;

  return `<g class="pin pin--scene" data-scene="${i}"
             transform="translate(${q.x.toFixed(1)},${q.y.toFixed(1)}) rotate(${rot.toFixed(2)})">
    <rect class="pin__shadow" x="${-w / 2 + 6}" y="${-h / 2 + 9}" width="${w}" height="${h}" rx="3"/>
    <rect class="pin__frame"  x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="3"/>
    <rect class="pin__paper"  x="${-w / 2 + pad}" y="${-h / 2 + pad}" width="${iw}" height="${ih}"/>
    <image class="pin__photo" href="photos/scenes/${s.slug}.jpg"
           onerror="this.closest('.pin').remove()"
           x="${-w / 2 + pad}" y="${-h / 2 + pad}" width="${iw}" height="${ih}"
           preserveAspectRatio="xMidYMid slice"/>
    <text class="pin__cap pin__cap--scene" y="${h / 2 - 74}">${s.name}</text>
    <text class="pin__cap pin__cap--where" y="${h / 2 - 34}">${s.where}</text>
    ${tape(-w / 2 + 30, -22)}${tape(w / 2 - 30, 20)}
  </g>`;
}
