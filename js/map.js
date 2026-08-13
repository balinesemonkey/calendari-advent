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
   country names · a band of photos · cities · the route and its doors ·
   regions and islands · sea names · a second band of photos.
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

/* the two photo bands — cities alternate between them */
const PIN_BANDS = VERTICAL ? [1150, 2250] : [640, 3070];
const PIN_W = 520;
const PIN_H = 610;

const P = (u, v) => (VERTICAL ? { x: v, y: u } : { x: u, y: v });
const pp = (u, v) => { const p = P(u, v); return `${p.x.toFixed(1)},${p.y.toFixed(1)}`; };

/* ---------------------------------------------------------
   The running order

   The card is a path you walk down. Along it, in order, come the
   doors — one per day — with the name of each country and each city
   set into the gaps between them: Indonèsia, Denpasar, a few days,
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

const X = t => t * JOURNEY;

/* Room each item needs along the path. Laid out across a screen a name
   takes its full width; turned down a phone it only takes a line of
   type, which is why portrait fits so much more in. Sizes mirror the
   label hierarchy in calendar.css. */
const TYPE = VERTICAL
  ? { country: 110, countryTrack: 26, region: 66,  regionTrack: 18, city: 54, cityTrack: 1 }
  : { country: 268, countryTrack: 86, region: 132, regionTrack: 42, city: 88, cityTrack: 1 };

/* A door's share of the path. It has to be wider than the door itself:
   an opened flap swings back over the preceding stretch, so the gap in
   front of each door has to be deep enough to keep that flap off
   whatever name comes before it. */
const DOOR_SPAN = 960;

function spanAlong(text, size, track) {
  return VERTICAL
    ? size * 2.0
    : text.length * (size * 0.56 + track) + size * 0.8;
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
         largest first — Indonèsia, then Bali, then Denpasar. A region
         that spans a border (Panjab, Bengala) doesn't repeat itself
         when the country changes around it. */
      const area = areaOf(c);

      if (c.country !== country) {
        country = c.country;
        ORDER.push({ kind: "country", name: country, area,
                     span: spanAlong(country, TYPE.country, TYPE.countryTrack) });
      }

      if (c.region && c.region !== region) {
        region = c.region;
        ORDER.push({ kind: "region", name: region, area,
                     span: spanAlong(region, TYPE.region, TYPE.regionTrack) });
      }

      ORDER.push({ kind: "city", ci, name: c.name, area,
                   span: spanAlong(c.name, TYPE.city, TYPE.cityTrack) });
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

/* --- an organic closed blob around an ellipse, in ribbon coords --- */
function blob(cu, cv, ru, rv, seed, wob = 0.18, n = 26) {
  const r = rng(seed);
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const k = 1 + (r() - 0.5) * 2 * wob;
    const q = P(cu + Math.cos(a) * ru * k, cv + Math.sin(a) * rv * k);
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
   Landmasses
   --------------------------------------------------------- */

/* Biomes — the land changes as the route crosses the world. */
const BIOMES = {
  jungle:    { fill: "var(--b-jungle)",    ink: "var(--i-jungle)",    glyph: "palm",     n: 4 },
  wet:       { fill: "var(--b-wet)",       ink: "var(--i-jungle)",    glyph: "tree",     n: 4 },
  dry:       { fill: "var(--b-dry)",       ink: "var(--i-dry)",       glyph: "scrub",    n: 3 },
  desert:    { fill: "var(--b-desert)",    ink: "var(--i-desert)",    glyph: "dune",     n: 3 },
  alpine:    { fill: "var(--b-alpine)",    ink: "var(--i-alpine)",    glyph: "snowpeak", n: 3 },
  steppe:    { fill: "var(--b-steppe)",    ink: "var(--i-dry)",       glyph: "tuft",     n: 3 },
  temperate: { fill: "var(--b-temperate)", ink: "var(--i-temperate)", glyph: "tree",     n: 4 },
  med:       { fill: "var(--b-med)",       ink: "var(--i-temperate)", glyph: "cypress",  n: 4 },
};

/* ---------------------------------------------------------
   Areas

   The ground under the path belongs to whatever is named above it.
   Each area is drawn to cover exactly the stretch its own cities
   occupy, so when the path says Bali you're standing on Bali, and
   when it says Pèrsia the land under you has gone to desert.

   An area is a city's region if it has one, otherwise its country —
   which is why Panjab reaches across the border into Pakistan while
   Singapur is its own small island.
   --------------------------------------------------------- */

const AREAS = {
  /* Islands still have to be wide enough across to hold the route
     wherever it wanders, or the path walks into the sea at their
     tapered ends. */
  "Bali":        { biome: "jungle",    island: 1, cv: 1780, rv: 760 },
  "Java":        { biome: "jungle",    island: 1, cv: 1790, rv: 780 },
  "Sumatra":     { biome: "jungle",    island: 1, cv: 1740, rv: 780 },
  "Singapur":    { biome: "jungle",    island: 1, cv: 1700, rv: 700 },
  "Malàisia":    { biome: "jungle",    cv: 1720, rv:  900 },
  "Siam":        { biome: "jungle",    cv: 1700, rv: 1000 },
  "Myanmar":     { biome: "jungle",    cv: 1700, rv: 1000 },
  "Bengala":     { biome: "wet",       cv: 1740, rv: 1040 },
  "L'Hindustan": { biome: "dry",       cv: 1760, rv: 1100 },
  "Panjab":      { biome: "desert",    cv: 1700, rv: 1000 },
  "Hindu Kush":  { biome: "alpine",    cv: 1670, rv:  960 },
  "Pèrsia":      { biome: "desert",    cv: 1700, rv: 1040 },
  "Armènia":     { biome: "alpine",    cv: 1690, rv:  940 },
  "Anatòlia":    { biome: "steppe",    cv: 1690, rv:  960 },
  "Els Balcans": { biome: "temperate", cv: 1660, rv:  940 },
  "Llombardia":  { biome: "alpine",    cv: 1680, rv:  930 },
  "Occitània":   { biome: "temperate", cv: 1660, rv:  930 },
  "Catalunya":   { biome: "med",       cv: 1720, rv:  900 },
};

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

/* Every landmass in one list, in ribbon coordinates. Rebuilt whenever
   the path is laid out, since the path is what decides where the land
   goes. */
let LAND = [];

function buildLand() {
  LAND = [];
  let seed = 21;

  AREA_ORDER.forEach(name => {
    const a = AREAS[name];
    const s = AREA_SPAN[name];
    if (!a) return;

    /* An island is drawn to its own stretch and no further, so open
       sea shows between it and the next one. Mainland areas overlap
       their neighbours, which is what fuses them into one coastline. */
    const pad = a.island ? DOOR_SPAN * 1.3 : DOOR_SPAN * 2.2;

    LAND.push({
      cu: (s.u0 + s.u1) / 2,
      cv: a.cv,
      ru: (s.u1 - s.u0) / 2 + pad,
      rv: a.rv,
      seed: seed++,
      kind: a.island ? "island" : "region",
      biome: a.biome,
    });
  });

  /* The continental mass behind the route — everything north of the
     path once it leaves the islands. */
  const mainland = AREA_ORDER.find(n => AREAS[n] && !AREAS[n].island);
  if (mainland) {
    const from = AREA_SPAN[mainland].u0;
    const step = 9000 * SX;
    for (let u = from, i = 0; u < JOURNEY + step; u += step, i++) {
      LAND.push({
        cu: u, cv: -480 - (i % 3) * 60,
        ru: step * 0.78, rv: 1300 + (i % 4) * 40,
        seed: 100 + i, kind: "north",
      });
    }
  }
}

/* Is this point on land? Used to keep trees, dunes and mountains out of
   the sea. The coastline wobbles around the base ellipse, so the test
   shrinks it a little and stays comfortably inshore. */
function onLand(u, v, inset = 0.86) {
  for (const b of LAND) {
    const du = (u - b.cu) / (b.ru * inset);
    const dv = (v - b.cv) / (b.rv * inset);
    if (du * du + dv * dv <= 1) return true;
  }
  return false;
}

/* Sea names are the last background lettering — country, region and
   city names all live on the path itself now, in the running order. */
const SEAS = [
  { t: 0.042, y: 2720, name: "MAR DE JAVA",         size: 128 },
  { t: 0.185, y: 2720, name: "MAR D'ANDAMAN",       size: 120 },
  { t: 0.325, y: 2720, name: "GOLF DE BENGALA",     size: 134 },
  { t: 0.480, y: 2720, name: "MAR ARÀBIGA",         size: 144 },
  { t: 0.685, y: 2720, name: "EL GOLF PÈRSIC",      size: 122 },
  { t: 0.885, y: 2720, name: "MAR MEDITERRÀNIA",    size: 150 },
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
  { t: 0.000, name: "Denpasar",     slug: "denpasar",     country: "Indonèsia",  region: "Bali", icon: "pura",    landmark: "Temple d'Uluwatu" },
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
  { t: 1.000, name: "Barcelona",    slug: "barcelona",    country: "Catalunya",  icon: "sagrada", landmark: "La Sagrada Família" },
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
};

const iconOf = c => ICONS[c.icon] || ICONS.arch;

/* ---------------------------------------------------------
   Build
   --------------------------------------------------------- */

/* `routePointAt(u)` maps a distance along the journey to a point on the
   drawn route, in screen coordinates. calendar.js owns the route, so it
   passes this in. */
function buildMap(svg, routePointAt) {
  const p = [];

  /* ---- sea ---- */
  p.push(`<rect x="${VB_X}" y="0" width="${VB_W}" height="${VB_H}" fill="url(#seaGrad)"/>`);

  const contours = [];
  for (let i = 0; i < 8; i++) {
    const base = 2640 + i * 78;
    const pts = [];
    for (let u = 0; u <= JOURNEY; u += 240) {
      pts.push(pp(u, base + 28 * Math.sin(u / 1400 + i) + 15 * Math.sin(u / 480 + i * 2)));
    }
    contours.push(`<polyline points="${pts.join(" ")}" fill="none" stroke="var(--sea-line)"
      stroke-width="${4 + (i % 2)}" opacity="${0.45 - i * 0.04}"/>`);
  }
  p.push(`<g>${contours.join("")}</g>`);

  /* ---- land ---- */
  const all = LAND.map(b => ({
    ...b,
    tint: b.biome ? BIOMES[b.biome].fill : biomeAt(b.cu).fill,
  }));
  const paths = all.map(b => blob(b.cu, b.cv, b.ru, b.rv, b.seed));

  p.push(`<g fill="none" stroke="var(--coast-halo)" stroke-width="150" stroke-linejoin="round" opacity=".45">
    ${paths.map(d => `<path d="${d}"/>`).join("")}</g>`);
  p.push(`<g fill="none" stroke="var(--coast-halo)" stroke-width="56" stroke-linejoin="round" opacity=".65">
    ${paths.map(d => `<path d="${d}"/>`).join("")}</g>`);
  p.push(`<g>${all.map((b, i) => `<path d="${paths[i]}" fill="${b.tint}"/>`).join("")}</g>`);
  p.push(`<g fill="none" stroke="var(--map-ink)" stroke-width="5" opacity=".34" stroke-dasharray="28 20">
    ${paths.map(d => `<path d="${d}"/>`).join("")}</g>`);

  /* ---- terrain ---- */
  p.push(terrain());

  /* ---- names ---- */
  const label = (cls, u, v, txt, style = "") => {
    const q = P(u, v);
    return `<text class="${cls}" x="${q.x.toFixed(1)}" y="${q.y.toFixed(1)}" ${style}>${txt}</text>`;
  };

  /* Sea names are the only background lettering left — the regions and
     islands moved onto the path, where you walk into them by name.
     In portrait there's no water beside the column to letter. */
  if (!VERTICAL) {
    p.push(SEAS.map(s =>
      label("map-sea", X(s.t), s.y, s.name, `style="font-size:${s.size}px"`)).join(""));
  }

  /* ---- compass + scale ---- */
  p.push(compass(X(0.017), VERTICAL ? 1180 : 740));
  if (!VERTICAL) p.push(scaleBar(X(0.56), 190));   // no room for it in portrait

  /* ---- the path itself: country and city names between the doors ----

     Both sit centred on the route, in the stretch the running order
     set aside for them, so you read them as you walk past. Names only
     — the landmark drawings live in the photo frames now. */
  for (const it of ORDER) {
    if (it.kind === "country" || it.kind === "region") {
      const q = routePointAt(it.u);
      p.push(`<text class="map-${it.kind}" x="${q.x.toFixed(1)}" y="${q.y.toFixed(1)}"
                dominant-baseline="central">${it.name}</text>`);
    }

    if (it.kind === "city") {
      const c = CITIES[it.ci];
      const q = routePointAt(it.u);
      p.push(`<g class="city${c.town ? " city--town" : ""}"
                 data-city="${it.ci}" data-u="${it.u.toFixed(1)}">
          <text class="city__name" x="${q.x.toFixed(1)}" y="${q.y.toFixed(1)}"
                dominant-baseline="central">${c.name}</text>
        </g>`);
    }
  }

  /* ---- the photos, pinned around the path ---- */
  CITIES.forEach((c, i) => p.push(photoPin(c, i, CITY_U[i])));

  svg.innerHTML = defs() + p.join("");
}

function defs() {
  const g = VERTICAL
    ? `x1="0" y1="0" x2="1" y2="0"`
    : `x1="0" y1="0" x2="0" y2="1"`;
  return `<defs>
    <linearGradient id="seaGrad" ${g}>
      <stop offset="0"    stop-color="var(--sea-2)"/>
      <stop offset="0.55" stop-color="var(--sea)"/>
      <stop offset="1"    stop-color="var(--sea-2)"/>
    </linearGradient>
  </defs>`;
}

/* --- vegetation & ground cover, one glyph vocabulary per biome --- */
const GLYPHS = {
  palm: `<path d="M0 0 Q-6 -34 -2 -62 M-2 -62 Q-30 -76 -50 -62 M-2 -62 Q-30 -92 -52 -88
                  M-2 -62 Q22 -88 46 -80 M-2 -62 Q26 -74 48 -58 M-2 -62 Q0 -84 -14 -96"/>`,

  tree: `<path d="M0 0 L0 -30"/><path d="M0 -30 Q-30 -34 -26 -58 Q-24 -84 0 -86
                  Q24 -84 26 -58 Q30 -34 0 -30 Z"/>`,

  cypress: `<path d="M0 0 L0 -22"/><path d="M0 -22 Q-15 -30 -13 -62 Q-11 -94 0 -104
                     Q11 -94 13 -62 Q15 -30 0 -22 Z"/>`,

  scrub: `<path d="M-22 0 Q-18 -22 -4 -26 M4 0 Q10 -18 24 -20 M-8 0 Q-6 -14 2 -16"/>`,

  tuft: `<path d="M-16 0 L-12 -22 M-2 0 L-2 -28 M12 0 L16 -20"/>`,

  dune: `<path d="M-52 0 Q-22 -26 10 -8 Q30 -20 54 -4 M-30 14 Q0 -6 34 12"/>`,

  snowpeak: `<path class="rock" d="M-56 0 L-16 -66 L6 -38 L30 -78 L60 0 Z"/>
             <path class="snow" d="M-30 -30 L-16 -66 L-4 -44 Q-16 -34 -30 -30 Z
                                   M16 -52 L30 -78 L44 -50 Q30 -40 16 -52 Z"/>`,
};

function terrain() {
  const g = [];
  const r = rng(909);

  /* mountain ranges across the interior, snow-capped where it's alpine */
  for (let k = 0; k < Math.round(26 * SX); k++) {
    const cu = 5200 * SX + k * 1340 * SX + r() * 400;
    const cv = 400 + r() * 320;
    const alpine = biomeAt(cu) === BIOMES.alpine;
    const n = 3 + Math.floor(r() * 3);
    const ridge = [];
    const caps = [];

    if (!onLand(cu, cv)) continue;      // no ranges out at sea

    for (let i = 0; i < n; i++) {
      const u = cu + i * 130 - (n * 130) / 2;
      const h = 70 + r() * 80;
      ridge.push(`M${pp(u - 82, cv)} L${pp(u, cv - h)} L${pp(u + 82, cv)}`);
      if (alpine || h > 120) {
        caps.push(`M${pp(u - 26, cv - h * 0.62)} L${pp(u, cv - h)} ` +
                  `L${pp(u + 26, cv - h * 0.62)} Q${pp(u, cv - h * 0.46)} ${pp(u - 26, cv - h * 0.62)} Z`);
      }
    }

    g.push(`<path d="${ridge.join(" ")}" fill="none" stroke="var(--map-ink)"
      stroke-width="6" opacity=".3" stroke-linejoin="round"/>`);
    if (caps.length) {
      g.push(`<path d="${caps.join(" ")}" fill="var(--snow)" opacity=".85" stroke="none"/>`);
    }
  }

  /* rivers running to the sea — drawn only over the stretches that are
     actually on land, so they stop at the coast instead of carrying on
     across open water */
  for (let k = 0; k < Math.round(12 * SX); k++) {
    const u0 = 7000 * SX + k * 2600 * SX + r() * 700;
    let run = [];

    const flush = () => {
      if (run.length > 2) {
        g.push(`<polyline points="${run.join(" ")}" fill="none" stroke="var(--river)"
          stroke-width="7" opacity=".45" stroke-linecap="round"/>`);
      }
      run = [];
    };

    for (let v = 300; v < 2600; v += 90) {
      const u = u0 + 160 * Math.sin(v / 340 + k) + 75 * Math.sin(v / 125);
      if (onLand(u, v, 0.94)) run.push(pp(u, v));
      else flush();
    }
    flush();
  }

  /* ground cover, kept out of the corridor where the doors run */
  const BANDS = [[520, 900], [1960, 2280]];
  for (let u = 1200; u < JOURNEY - 900; u += 320) {
    const b = biomeAt(u);
    const count = 1 + Math.floor(r() * b.n * 0.6);
    for (let i = 0; i < count; i++) {
      const band = BANDS[r() < 0.55 ? 0 : 1];
      const v = band[0] + r() * (band[1] - band[0]);
      const uu = u + r() * 240 - 120;

      if (!onLand(uu, v)) continue;     // nothing grows in the sea

      const q = P(uu, v);
      const s = (0.75 + r() * 0.6).toFixed(2);
      g.push(`<g class="veg veg--${b.glyph}" style="--veg:${b.ink}"
        transform="translate(${q.x.toFixed(1)},${q.y.toFixed(1)}) scale(${s})">${GLYPHS[b.glyph]}</g>`);
    }
  }

  return `<g class="terrain">${g.join("")}</g>`;
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

/* A polaroid pinned to the card. The ink drawing sits underneath, so
   if photos/<slug>.jpg isn't there yet the frame still holds the
   landmark — drop the file in and it takes over. */
function photoPin(c, i, u0) {
  const w = PIN_W, h = PIN_H, pad = 34;
  const iw = w - pad * 2;

  // keep the first and last frames fully on the card
  const edge = w / 2 + 120;
  const u = Math.max(edge, Math.min(JOURNEY - edge, u0));

  const q = P(u, PIN_BANDS[i % 2]);        // alternate: up, down, up, down
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
