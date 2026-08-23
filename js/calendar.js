/* =========================================================
   Bali → Barcelona — calendar logic

   Three states, straight out of PROJECT.md §5:
     locked    — any day after today
     openable  — today, if not yet opened  (the only door you can open)
     open      — today once opened, and every past day
   ========================================================= */

const START = "2026-08-18";
const END   = "2026-12-20";
const STORE = "bb-opened";

/* The ribbon's geometry lives in map.js: JOURNEY (distance along),
   ACROSS, VERTICAL, VB_W / VB_H, and the P() layout function that
   turns the whole thing ninety degrees for mobile. */

/* ---------------------------------------------------------
   Dates
   --------------------------------------------------------- */

const key = d => d.toISOString().slice(0, 10);

function parse(k) {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function buildDates() {
  const out = [];
  const end = parse(END);
  for (let d = parse(START); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    out.push(key(d));
  }
  return out;
}

const DATES = buildDates();
const TOTAL = DATES.length;

const PRETTY = k => parse(k).toLocaleDateString("ca", {
  day: "numeric", month: "long", timeZone: "UTC",
});

/* short form printed under each door: "14 ag." */
const SHORT = k => parse(k).toLocaleDateString("ca", {
  day: "numeric", month: "short", timeZone: "UTC",
});

/* ---------------------------------------------------------
   The route
   --------------------------------------------------------- */

/* Where the route sits across the ribbon at a given point along it.

   Laid out horizontally there's room for the path to wander. Turned
   vertical it becomes a column running down a phone screen, so it
   centres on the ribbon and meanders far less — the doors need to read
   as one straight line of days, not a wobble. */
function routeV(u) {
  const [a1, a2, a3] = VERTICAL ? [110, 60, 24] : [200, 90, 35];

  return ACROSS / 2
    + a1 * Math.sin(u / 6810)
    + a2 * Math.sin(u / 2030 + 1.3)
    + a3 * Math.sin(u /  837 + 0.6);
}

/* The line runs door to door — from the first day to the last — rather
   than out into the margin either side, so it starts exactly at day
   one instead of trailing off into empty card beforehand. */
function routeD() {
  const u0 = DOOR_U[0], u1 = DOOR_U[DOOR_U.length - 1];
  const pts = [];
  for (let u = u0; u <= u1; u += 120) {
    const p = P(u, routeV(u));
    pts.push(`${p.x.toFixed(1)},${p.y.toFixed(1)}`);
  }
  pts.push(`${P(u1, routeV(u1)).x.toFixed(1)},${P(u1, routeV(u1)).y.toFixed(1)}`);
  return "M" + pts.join("L");
}

/* ---------------------------------------------------------
   Storage
   --------------------------------------------------------- */

function loadOpened() {
  try {
    return new Set(JSON.parse(localStorage.getItem(STORE)) || []);
  } catch {
    return new Set();
  }
}

function saveOpened(set) {
  try {
    localStorage.setItem(STORE, JSON.stringify([...set]));
  } catch { /* private browsing — the calendar still works, just forgets */ }
}

/* ---------------------------------------------------------
   Build
   --------------------------------------------------------- */

const els = {
  card:     document.getElementById("card"),
  scroller: document.getElementById("scroller"),
  mapArt:   document.getElementById("mapArt"),
  path:     document.getElementById("routePath"),
  walked:   document.getElementById("routeWalked"),
  doors:    document.getElementById("doorLayer"),
  jump:     document.getElementById("jumpToday"),
  devDate:  document.getElementById("devDate"),
  devReset: document.getElementById("devReset"),

  modal:      document.getElementById("modal"),
  modalScrim: document.getElementById("modalScrim"),
  modalClose: document.getElementById("modalClose"),
  modalPanel: document.getElementById("modalPanel"),
  modalBody:  document.getElementById("modalBody"),
};

/* Work out the running order of the path — doors interleaved with the
   country and city names — before anything is drawn. It sets the
   ribbon's length, so it has to come first. */
layout(TOTAL);

/* lay the card out along whichever axis this screen wants */
document.body.classList.toggle("is-vertical", VERTICAL);
els.card.style.aspectRatio = `${VB_W} / ${VB_H}`;
[els.mapArt, document.getElementById("routeSvg")]
  .forEach(s => s.setAttribute("viewBox", VIEWBOX));

/* The ink-bleed filter's region has to be pinned to real coordinates —
   left at the default (a percentage of the element's own bounding box)
   it blows up into something absurd on a path this long and thin, and
   Safari simply fails to rasterise it: the line vanishes with no error.
   A generous but bounded pad is enough for the turbulence displacement
   (scale 9) to spill over the stroke without the filter region itself
   ballooning. */
{
  const pad = 400;
  const f = document.getElementById("inkBleed");
  f.setAttribute("x", VB_X - pad);
  f.setAttribute("y", -pad);
  f.setAttribute("width", VB_W + pad * 2);
  f.setAttribute("height", VB_H + pad * 2);
}

/* The visible line only runs door to door — see routeD() — but doors,
   cities, pins and labels are positioned all along the ribbon,
   including the stretch before day one where the country and region
   names sit. So positioning is worked out directly from (u, routeV(u))
   rather than by walking along the drawn line: a lookup outside the
   line's own span would otherwise have nowhere on it to land. */
const ROUTE_U0 = DOOR_U[0], ROUTE_U1 = DOOR_U[DOOR_U.length - 1];

const atPos = u => P(u, routeV(u));

/* …and as a percentage of the card, for positioning HTML */
function atPercent(u) {
  const p = atPos(u);
  return { left: ((p.x - VB_X) / VB_W) * 100, top: (p.y / VB_H) * 100 };
}
buildMap(els.mapArt, atPos);

/* The line itself is drawn separately from that positioning — this is
   only ever the door1-to-doorLast stretch. */
const routePathD = routeD();
els.path.setAttribute("d", routePathD);
els.walked.setAttribute("d", routePathD);

/* `pathLength` renormalises the path to a fixed length of our choosing,
   so the reveal trick below can work in small round numbers (0–1000)
   instead of the raw geometric length — which runs into the hundreds
   of thousands here, and floating-point stroke-dasharray at that scale
   is exactly the kind of thing that renders fine in one engine and not
   another. */
const PLEN = 1000;
els.walked.setAttribute("pathLength", PLEN);
els.walked.style.strokeDasharray = PLEN;

let opened = loadOpened();
const doorEls = [];

DATES.forEach((k, i) => {
  const n = i + 1;
  const pos = atPercent(DOOR_U[i]);
  const isVinyl = n % 2 === 1;                 // odd → vinyl, even → CD
  const tilt = (((i * 2654435761) >>> 0) % 700) / 100 - 3.5;

  const door = document.createElement("div");
  door.className = "door";
  door.style.left = pos.left + "%";
  door.style.top = pos.top + "%";
  door.style.setProperty("--tilt", tilt.toFixed(2) + "deg");
  door.dataset.date = k;
  door.dataset.n = n;
  door.dataset.vinyl = isVinyl ? "1" : "";

  door.innerHTML = `
    <div class="door__well"></div>
    <div class="door__flap">
      <div class="door__face door__face--front">
        <span class="door__perf"></span>
        <span class="door__num" style="--numtilt:${(tilt * -0.6).toFixed(2)}deg">${n}</span>
      </div>
      <div class="door__face door__face--back"></div>
    </div>
    <span class="door__date">${SHORT(k)}</span>`;

  door.addEventListener("click", () => onDoorClick(k));

  els.doors.appendChild(door);
  doorEls.push(door);
});

/* Which place on the map each day lands you in. */
const PLACES = CITIES
  .map((c, ci) => ({ i: Math.min(TOTAL - 1, Math.round(c.t * (TOTAL - 1))), ci, name: c.name }))
  .sort((a, b) => a.i - b.i);

function placeFor(i) {
  let cur = PLACES[0];
  for (const p of PLACES) if (p.i <= i) cur = p;
  const next = PLACES.find(p => p.i > i);
  if (cur.i === i) return `arribant a ${cur.name}`;
  return next ? `passat ${cur.name}, caminant cap a ${next.name}` : `gairebé a ${cur.name}`;
}

/* Doors are sized off the card's short side, so spacing along the
   route holds however the window is shaped. */
function sizeDoors() {
  const short = VERTICAL ? els.card.clientWidth : els.card.clientHeight;
  els.card.style.setProperty("--door", (short * DOOR_K).toFixed(1) + "px");
}
sizeDoors();
window.addEventListener("resize", sizeDoors);


/* ---------------------------------------------------------
   State
   --------------------------------------------------------- */

function effectiveDate() {
  const v = els.devDate.value;
  if (v) return v;
  return key(new Date());
}

/* index of the current day; -1 before the calendar starts */
function todayIndex() {
  return DATES.indexOf(effectiveDate());
}

function stateOf(k, i, todayIdx) {
  if (todayIdx < 0) {
    // before the start (or a date outside the range) — everything sealed
    return parse(k) < parse(effectiveDate()) ? "open" : "locked";
  }
  if (i < todayIdx) return "open";
  if (i > todayIdx) return "locked";
  return opened.has(k) ? "open" : "openable";
}

const artFor = k => (SONGS[k] && SONGS[k].art)
  ? `url('${encodeURI(SONGS[k].art)}')`
  : placeholderArt(k);

/* The little disc glimpsed in the recess once a door is open. The
   full-size one lives in the popup. */
function fillDoor(door, k) {
  if (door.querySelector(".disc")) return;

  const disc = document.createElement("div");
  disc.className = "disc " + (door.dataset.vinyl ? "disc--vinyl" : "disc--cd");

  const art = document.createElement("div");
  art.className = "disc__art";
  art.style.backgroundImage = artFor(k);
  disc.appendChild(art);

  door.querySelector(".door__well").appendChild(disc);
}

function render() {
  const todayIdx = todayIndex();

  DATES.forEach((k, i) => {
    const door = doorEls[i];
    const st = stateOf(k, i, todayIdx);

    door.classList.toggle("door--open", st === "open");
    door.classList.toggle("door--today", st === "openable");
    door.classList.toggle("door--locked", st === "locked");

    if (st === "open") fillDoor(door, k);
  });

  // route progress — measured along the path, which is no longer
  // evenly divided by day now that the names take up room on it
  const walkedU = todayIdx < 0 ? ROUTE_U0 : DOOR_U[todayIdx];
  const prog = (walkedU - ROUTE_U0) / (ROUTE_U1 - ROUTE_U0);
  els.walked.style.strokeDashoffset = PLEN * (1 - prog);

  els.mapArt.querySelectorAll(".city").forEach(el => {
    el.classList.toggle("city--passed", parseFloat(el.dataset.u) <= walkedU + 1e-6);
  });

  /* Today's own photo stays covered until its door does — opening the
     door is what reveals where you've landed, so the pin showing it
     ahead of that would give the day away before you've unwrapped it.
     Once it's open, the pin takes its normal place on the card. */
  const todayUnopened = todayIdx >= 0 && !opened.has(DATES[todayIdx]);
  els.mapArt.querySelectorAll(".pin").forEach(el => {
    const t = el.dataset.city !== undefined
      ? CITIES[+el.dataset.city].t
      : SCENES[+el.dataset.scene].t;
    const dayIdx = Math.round(t * (TOTAL - 1));
    el.classList.toggle("pin--today", todayUnopened && dayIdx === todayIdx);
  });
}

/* ---------------------------------------------------------
   Opening a door
   --------------------------------------------------------- */

function onDoorClick(k) {
  const i = DATES.indexOf(k);
  const st = stateOf(k, i, todayIndex());

  if (st === "locked") {
    doorEls[i].classList.remove("door--refuse");
    void doorEls[i].offsetWidth;          // restart the animation
    doorEls[i].classList.add("door--refuse");
    return;
  }

  if (st === "openable") {
    opened.add(k);
    saveOpened(opened);
    render();
    // let the flap finish swinging before the record comes up
    setTimeout(() => showSong(k), 620);
    return;
  }

  showSong(k);
}

const esc = s => String(s).replace(/[&<>"]/g,
  ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));

function showSong(k) {
  const i = DATES.indexOf(k);
  const song = SONGS[k];
  const isVinyl = (i + 1) % 2 === 1;
  const art = artFor(k);

  els.modalBody.innerHTML = `
    <p class="modal__day">Dia ${i + 1} <em>${PRETTY(k)}</em></p>

    <div class="modal__stage">
      <div class="modal__sleeve${isVinyl ? "" : " modal__sleeve--cd"}"
           style="background-image:${art}"></div>
      <div class="modal__disc ${isVinyl ? "disc--vinyl" : "disc--cd"}">
        <div class="disc__art" style="background-image:${art}"></div>
      </div>
    </div>

    <h2 class="modal__title">${esc(song ? song.title : "Encara no triada")}</h2>
    <p class="modal__artist">${esc(song ? song.artist : "—")}</p>
    <p class="modal__place">${esc(placeFor(i))}</p>

    ${song && song.url
      ? `<a class="modal__link" href="${esc(song.url)}" target="_blank" rel="noopener">
           <span class="modal__link-mark"></span> Escolta-la a Apple Music</a>`
      : `<p class="modal__pending">encara no hi ha cançó triada per aquest dia</p>`}`;

  openModal("modal--song");
}

function showCity(ci) {
  const c = CITIES[ci];
  const i = Math.round(c.t * (TOTAL - 1));
  const k = DATES[i];

  els.modalBody.innerHTML = `
    <p class="modal__day">${esc(c.country)} <em>${PRETTY(k)}</em></p>

    <figure class="modal__photo">
      <div class="modal__photo-paper">
        <svg viewBox="-140 -150 280 260" class="modal__photo-draw">${iconOf(c)}</svg>
        <img src="photos/${c.slug}.jpg" alt="${esc(c.landmark)}"
             onload="this.closest('.modal__photo-paper').classList.add('has-photo')"
             onerror="this.remove()">
      </div>
      <figcaption>${esc(c.landmark)}, ${esc(c.name)}</figcaption>
    </figure>`;

  openModal("modal--city");
}

/* the country between the cities — no day attached to it, just the
   place and where along the walk it turns up */
function showScene(si) {
  const s = SCENES[si];
  const i = Math.round(s.t * (TOTAL - 1));

  els.modalBody.innerHTML = `
    <p class="modal__day">${esc(s.where)} <em>${PRETTY(DATES[i])}</em></p>

    <figure class="modal__photo">
      <div class="modal__photo-paper">
        <img src="photos/scenes/${s.slug}.jpg" alt="${esc(s.name)}"
             onload="this.closest('.modal__photo-paper').classList.add('has-photo')"
             onerror="this.remove()">
      </div>
      <figcaption>${esc(s.name)}</figcaption>
    </figure>`;

  openModal("modal--city");
}

function openModal(kind) {
  els.modalPanel.className = "modal__panel " + kind;
  els.modal.hidden = false;
  requestAnimationFrame(() => els.modal.classList.add("modal--in"));
  els.modalClose.focus({ preventScroll: true });
}

function hideModal() {
  els.modal.classList.remove("modal--in");
  setTimeout(() => { els.modal.hidden = true; els.modalBody.innerHTML = ""; }, 260);
}

els.modalScrim.addEventListener("click", hideModal);
els.modalClose.addEventListener("click", hideModal);
document.addEventListener("keydown", e => {
  if (e.key === "Escape" && !els.modal.hidden) hideModal();
});

/* cities and their pinned photos both open the place; the scenes in
   between open on their own */
els.mapArt.addEventListener("click", e => {
  const g = e.target.closest(".pin, .city");
  if (!g) return;
  if (g.dataset.scene !== undefined) showScene(+g.dataset.scene);
  else showCity(+g.dataset.city);
});

function scrollToToday() {
  const i = todayIndex();
  const door = doorEls[i < 0 ? 0 : i];
  if (VERTICAL) {
    const y = door.offsetTop + els.card.offsetTop;
    els.scroller.scrollTo({ top: y - els.scroller.clientHeight / 2, behavior: "smooth" });
  } else {
    const x = door.offsetLeft + els.card.offsetLeft;
    els.scroller.scrollTo({ left: x - els.scroller.clientWidth / 2, behavior: "smooth" });
  }
}

/* ---------------------------------------------------------
   Prototype controls
   --------------------------------------------------------- */

// Real today is 12 Aug 2026 — before the calendar starts — so the
// preview date opens on day one instead of an entirely sealed card.
const realToday = key(new Date());
els.devDate.value =
  realToday < START ? START : realToday > END ? END : realToday;

els.devDate.addEventListener("change", () => { render(); scrollToToday(); });

els.devReset.addEventListener("click", () => {
  opened = new Set();
  saveOpened(opened);
  doorEls.forEach(el => {
    const disc = el.querySelector(".disc");
    if (disc) disc.remove();
  });
  render();
});

els.jump.addEventListener("click", scrollToToday);

/* ---------------------------------------------------------
   Declutter

   Doors, photos, and every tier of map lettering must never overlap
   one another. Doors are the one thing that can't move — a door's
   position on the route *is* the date it represents — so everything
   else resolves around them, in priority order:

     doors  (fixed)
       └─ photos          may nudge along the route to clear a door
            └─ countries  may nudge to clear doors + photos
                 └─ regions/islands   …+ countries
                      └─ seas         …+ regions
                           └─ cities  …+ everything above

   Each tier's already-resolved rects become obstacles for the next,
   so nothing added later can land on top of something placed earlier.
   Elements are axis-aligned rectangles, so a collision is resolved by
   sliding along the journey — there's far more room in that direction
   than across it. An element that can't find a gap steps aside rather
   than sitting on top of something.

   Positions are always recomputed from each element's original drawn
   place (cached in ORIGIN on first run), so calling this again — after
   a resize, say — starts clean instead of compounding old nudges.
   --------------------------------------------------------- */

const ORIGIN = new WeakMap();

/* Where an element sits along the journey, regardless of whether it's
   a <text x=".."> (labels) or a <g transform="translate(..)"> (photo
   pins) — and the matching setter, which preserves any rotate() on a
   pin's transform. */
function journeyCoord(el) {
  const tf = el.getAttribute("transform");
  if (tf) {
    const m = tf.match(/translate\(([-\d.]+),\s*([-\d.]+)\)/);
    return VERTICAL ? parseFloat(m[2]) : parseFloat(m[1]);
  }
  const axis = VERTICAL ? "y" : "x";
  return parseFloat(el.getAttribute(axis)) || 0;
}

function setJourneyCoord(el, val) {
  const tf = el.getAttribute("transform");
  if (tf) {
    const m = tf.match(/translate\(([-\d.]+),\s*([-\d.]+)\)/);
    const x = VERTICAL ? m[1] : val.toFixed(1);
    const y = VERTICAL ? val.toFixed(1) : m[2];
    el.setAttribute("transform",
      tf.replace(/translate\([-\d.]+,\s*[-\d.]+\)/, `translate(${x},${y})`));
  } else {
    el.setAttribute(VERTICAL ? "y" : "x", val.toFixed(1));
  }
}

function originOf(el) {
  if (!ORIGIN.has(el)) ORIGIN.set(el, journeyCoord(el));
  return ORIGIN.get(el);
}

function declutter() {
  /* Nothing to measure while the card has no size — a background tab,
     say. Running anyway would divide by zero and write Infinity into
     every position it touched. */
  if (!els.card.clientWidth || !els.card.clientHeight) return;

  /* user units per pixel, along whichever screen axis sliding actually
     happens on — the journey runs down the card in portrait (VB_H over
     its height) and across it in landscape (VB_W over its width). Using
     the wrong axis here doesn't just point the slide the wrong way, it
     scales it wrong too: a move verified clear in pixel-search space
     then lands short of that in SVG space, and the "resolved" pin is
     still sitting in the gap it was meant to clear. */
  const upp = VERTICAL
    ? VB_H / els.card.clientHeight
    : VB_W / els.card.clientWidth;
  const box = el => el.getBoundingClientRect();

  const overlaps = (a, b, pad) =>
    a.left - pad < b.right && a.right + pad > b.left &&
    a.top - pad < b.bottom && a.bottom + pad > b.top;
  const clearOf = (r, list, pad) => !list.some(o => overlaps(r, o, pad));

  const slid = (r, d) => VERTICAL
    ? { left: r.left, right: r.right, top: r.top + d, bottom: r.bottom + d }
    : { left: r.left + d, right: r.right + d, top: r.top, bottom: r.bottom };

  // doors never move — their position on the route is the date
  let obstacles = doorEls.map(box);

  /* Country and city names sit in the stretches of path the running
     order set aside for them, so they're already clear of the doors
     and of each other. They can't move without leaving their place in
     the sequence — so they join the doors as fixed obstacles, and
     everything else resolves around them. The compass and scale bar
     are fixed the same way — ornaments, not part of the running order,
     but still real ink on the card that nothing else should sit on. */
  obstacles.push(
    ...[...els.mapArt.querySelectorAll(
      ".map-country, .map-region, .city__name, .compass, .scalebar",
    )].map(box),
  );

  /* Photos try hard for a generous gap first, but never disappear for
     want of one — on a packed stretch of card a smaller gap beats no
     photo at all, so a blocked pin steps back through smaller pads
     before it steps back through `hide`. Sea and isle names are
     background dressing, not content, so they keep the old
     one-pad-or-hide behaviour.

     Photos also alternate between the two bands by construction (see
     CITY_BAND / SCENE_BAND in map.js) — but only at the spot each one
     was *drawn*. `noCross` is what keeps that true after sliding too:
     it stops a pin from ever sliding far enough to swap places with
     its journey neighbour, which is exactly the move that would let
     three from the same band end up in a row. */
  const TIERS = [
    { sel: ".pin",      reach: 1400, pad: [46, 28, 14, 4], hide: false, noCross: true },
    { sel: ".map-sea",  reach: 5000, pad: [10],            hide: true },
    { sel: ".map-isle", reach: 2000, pad: [8],             hide: true },
  ];

  for (const tier of TIERS) {
    /* Resolved in journey order, not DOM order — cities and scenes are
       two separate lists in the markup, so DOM order jumps between
       them instead of walking the card the way a reader does. Two
       pins that are actually next to each other on the route need to
       be resolved back to back, or the one processed out of turn is
       dodging obstacles from all over the card instead of just its
       real neighbours, and drifts further than it has to. */
    const nodes = [...els.mapArt.querySelectorAll(tier.sel)]
      .sort((a, b) => originOf(a) - originOf(b));

    // reset to the original drawn position and visibility first, so a
    // repeat run doesn't compound displacement from the last one
    nodes.forEach(el => {
      setJourneyCoord(el, originOf(el));
      el.style.display = "";
    });

    nodes.forEach((el, idx) => {
      let r = box(el);
      const widestPad = tier.pad[0];

      if (!clearOf(r, obstacles, widestPad)) {
        let move = null;

        // capped so a slide can't cross the midpoint to whichever
        // neighbour sits on that side — see `noCross` above
        let reachPos = tier.reach, reachNeg = tier.reach;
        if (tier.noCross) {
          if (idx < nodes.length - 1) {
            reachPos = Math.min(reachPos, (originOf(nodes[idx + 1]) - originOf(el)) / upp / 2);
          }
          if (idx > 0) {
            reachNeg = Math.min(reachNeg, (originOf(el) - originOf(nodes[idx - 1])) / upp / 2);
          }
        }

        for (const pad of tier.pad) {
          for (let d = 14; (d <= reachPos || d <= reachNeg) && move === null; d += 14) {
            if (d <= reachPos && clearOf(slid(r, d), obstacles, pad)) { move = d; break; }
            if (move === null && d <= reachNeg && clearOf(slid(r, -d), obstacles, pad)) { move = -d; break; }
          }
          if (move !== null) break;
        }

        if (move === null) {
          if (tier.hide) { el.style.display = "none"; return; }
          // otherwise: stay put rather than vanish — see comment above
        } else {
          setJourneyCoord(el, originOf(el) + move * upp);
          r = box(el);
        }
      }

      obstacles.push(r);
    });
  }

  /* Vegetation, mountains, boats and the rest of the ground cover are
     drawn underneath all of that — so instead of nudging them (there
     are thousands, and moving one is just as likely to walk it into a
     different obstacle), any symbol left overlapping a door, a photo,
     or a piece of lettering is simply hidden. Generation already keeps
     them a minimum distance apart from one another (see SYMBOL_SPACE
     in map.js), so this pass is only about the text and images sitting
     above them, not about symbols clipping each other. */
  const symbols = [...els.mapArt.querySelectorAll(".veg, .sea-glyph")];
  symbols.forEach(el => { el.style.display = ""; });
  symbols.forEach(el => {
    if (!clearOf(box(el), obstacles, 4)) el.style.display = "none";
  });
}

render();
requestAnimationFrame(scrollToToday);

/* text metrics depend on the webfont, so wait for it before measuring */
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(declutter);
} else {
  window.addEventListener("load", declutter);
}

/* re-resolve on resize — the same svg-space layout can gain or lose
   clearance once it's mapped to a different pixel width */
let declutterTimer;
window.addEventListener("resize", () => {
  clearTimeout(declutterTimer);
  declutterTimer = setTimeout(declutter, 150);
});
