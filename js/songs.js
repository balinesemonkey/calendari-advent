/* =========================================================
   The playlist.

   One entry per date, keyed YYYY-MM-DD. Every field is optional
   except title/artist — a day with no entry still gets a door,
   it just says "not chosen yet" behind it.

     "2026-08-14": {
       title:  "Song title",
       artist: "Artist name",
       url:    "https://music.apple.com/es/album/…?i=1234567890",
       art:    "art/2026-08-14.jpg"      // omit → placeholder art
     }

   `art` is a local file on purpose: artwork gets downloaded once and
   committed, so the calendar keeps working offline and doesn't break
   when Apple rotates a CDN URL. See PROJECT.md §10.

   The door number, its position on the route, and whether it's a
   vinyl or a CD are all derived from the date — never set here.
   ========================================================= */

const SONGS = {
  // ---- placeholder rows so the prototype has something to show ----
  // Replace these with the real thing; delete the rest of the demo fill.
  "2026-08-14": { title: "La primera", artist: "El dia que vaig marxar", url: null },
  "2026-08-15": { title: "La segona", artist: "Encara per triar", url: null },
  "2026-08-16": { title: "La tercera", artist: "Encara per triar", url: null },
  "2026-08-17": { title: "La quarta", artist: "Encara per triar", url: null },
  "2026-08-18": { title: "La cinquena", artist: "Encara per triar", url: null },
};

/* Deterministic placeholder cover art, drawn as an inline SVG so the
   prototype needs no network and no image files. Real entries point
   at `art/…` instead and this is never used. */
function placeholderArt(dateKey) {
  let h = 0;
  for (let i = 0; i < dateKey.length; i++) {
    h = (h * 31 + dateKey.charCodeAt(i)) >>> 0;
  }

  const hue = h % 360;
  const hue2 = (hue + 40 + (h >> 8) % 90) % 360;
  const angle = (h >> 4) % 180;
  const bars = 2 + (h >> 6) % 4;

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">` +
      `<defs><linearGradient id="g" gradientTransform="rotate(${angle} .5 .5)">` +
        `<stop offset="0" stop-color="hsl(${hue} 62% 52%)"/>` +
        `<stop offset="1" stop-color="hsl(${hue2} 55% 28%)"/>` +
      `</linearGradient></defs>` +
      `<rect width="100" height="100" fill="url(#g)"/>` +
      Array.from({ length: bars }, (_, i) => {
        const y = 18 + i * (64 / bars);
        const w = 22 + ((h >> (i * 3)) % 52);
        return `<rect x="14" y="${y}" width="${w}" height="4" ` +
               `fill="hsl(${hue2} 70% 88%)" opacity="0.55"/>`;
      }).join("") +
      `<circle cx="72" cy="76" r="12" fill="none" ` +
        `stroke="hsl(${hue} 80% 90%)" stroke-width="2.5" opacity="0.5"/>` +
    `</svg>`;

  // single quotes: this gets inlined into a double-quoted style attribute
  return `url('data:image/svg+xml,${encodeURIComponent(svg)}')`;
}
