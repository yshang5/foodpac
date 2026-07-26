/**
 * gen-lunat-boxes.mjs — Generates the Boxes-category product mockups
 * as flat-style SVG illustrations, all branded "Lunat".
 *
 * Run:  node gen-lunat-boxes.mjs
 * Output: ../frontend/assets/images/prod-box-lunat-*.svg
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '../frontend/assets/images');
mkdirSync(OUT_DIR, { recursive: true });

/* ── Palette ─────────────────────────────────────────────── */
const BG        = '#f5f1e8';  // warm paper backdrop
const BG_CIRCLE = '#eae3d2';  // soft accent circle
const SHADOW    = 'rgba(0,0,0,0.08)';

const KRAFT       = '#d8b98d';
const KRAFT_DARK  = '#c2a172';
const KRAFT_LIGHT = '#e9d5af';
const KRAFT_INNER = '#f3e8cf';

const WHITE       = '#f9f6f0';
const WHITE_DARK  = '#e6e0d3';
const WHITE_LIGHT = '#fffdf8';

const NAVY = '#232946';  // Lunat wordmark
const GOLD = '#d99a2b';  // Lunat crescent

/* ── Lunat brand lockup: gold crescent over serif wordmark ── */
function lunatLockup(x, y, scale = 1, color = NAVY) {
  return `
  <g transform="translate(${x} ${y}) scale(${scale})">
    <path d="M 6,-60 A 21 21 0 1 0 6,-18 A 26 26 0 0 1 6,-60 Z" fill="${GOLD}"/>
    <circle cx="20" cy="-52" r="2.4" fill="${GOLD}"/>
    <circle cx="26" cy="-42" r="1.7" fill="${GOLD}"/>
    <text x="0" y="0" text-anchor="middle" fill="${color}"
          font-family="Georgia, 'Times New Roman', serif" font-weight="700"
          font-size="42" letter-spacing="1">Lunat</text>
    <text x="0" y="22" text-anchor="middle" fill="${color}" opacity="0.55"
          font-family="Georgia, 'Times New Roman', serif"
          font-size="12" letter-spacing="6">KITCHEN</text>
  </g>`;
}

function svg(body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800">
  <rect width="800" height="800" fill="${BG}"/>
  <circle cx="400" cy="390" r="265" fill="${BG_CIRCLE}"/>
  ${body}
</svg>
`;
}

const shadow = (cy = 645, rx = 215) =>
  `<ellipse cx="400" cy="${cy}" rx="${rx}" ry="26" fill="${SHADOW}"/>`;

/* ── 1. Kraft take-out box (tuck-top) ────────────────────── */
function takeout() {
  return svg(`
  ${shadow()}
  <path d="M 250 340 L 400 300 L 550 340 L 400 380 Z" fill="${KRAFT_LIGHT}"/>
  <path d="M 250 340 L 250 580 Q 250 600 270 600 L 400 630 L 400 380 Z" fill="${KRAFT}"/>
  <path d="M 550 340 L 550 580 Q 550 600 530 600 L 400 630 L 400 380 Z" fill="${KRAFT_DARK}"/>
  <path d="M 250 340 L 310 296 L 400 268 L 400 300 Z" fill="${KRAFT_INNER}"/>
  <path d="M 550 340 L 490 296 L 400 268 L 400 300 Z" fill="${KRAFT_LIGHT}"/>
  ${lunatLockup(322, 510, 0.95)}
  `);
}

/* ── 2. Chinese take-out pail ────────────────────────────── */
function chinese() {
  return svg(`
  ${shadow(655, 170)}
  <path d="M 265 300 L 535 300 L 495 640 L 305 640 Z" fill="${KRAFT}"/>
  <path d="M 265 300 L 535 300 L 530 336 L 270 336 Z" fill="${KRAFT_DARK}"/>
  <path d="M 350 300 L 450 300 L 400 250 Z" fill="${KRAFT_LIGHT}"/>
  <rect x="393" y="244" width="14" height="18" rx="4" fill="${KRAFT_DARK}"/>
  ${lunatLockup(400, 510, 1)}
  `);
}

/* ── 3. Compostable burger clamshell ─────────────────────── */
function burger() {
  return svg(`
  ${shadow(645, 210)}
  <path d="M 245 430 Q 245 300 400 300 Q 555 300 555 430 L 545 440 L 255 440 Z" fill="${KRAFT_LIGHT}"/>
  <path d="M 255 440 L 545 440 L 545 452 L 255 452 Z" fill="${KRAFT_INNER}"/>
  <path d="M 245 462 L 555 462 L 555 590 Q 555 615 525 615 L 275 615 Q 245 615 245 590 Z" fill="${KRAFT}"/>
  <path d="M 245 462 L 555 462 L 555 478 L 245 478 Z" fill="${KRAFT_DARK}" opacity="0.5"/>
  <circle cx="308" cy="352" r="6" fill="${KRAFT_DARK}" opacity="0.55"/>
  <circle cx="400" cy="336" r="6" fill="${KRAFT_DARK}" opacity="0.55"/>
  <circle cx="492" cy="352" r="6" fill="${KRAFT_DARK}" opacity="0.55"/>
  ${lunatLockup(400, 560, 0.9)}
  `);
}

/* ── 4. French fry holder ────────────────────────────────── */
function fry() {
  const fries = [
    [352, 200, -8], [378, 178, -3], [404, 170, 2], [430, 182, 6], [452, 204, 10],
  ].map(([x, y, r]) =>
    `<rect x="${x}" y="${y}" width="22" height="150" rx="9"
       fill="#f2c14e" transform="rotate(${r} ${x + 11} ${y + 75})"/>`).join('');
  return svg(`
  ${shadow(650, 165)}
  ${fries}
  <path d="M 290 330 L 510 330 L 480 640 L 320 640 Z" fill="${KRAFT}"/>
  <path d="M 290 330 L 510 330 L 505 362 L 295 362 Z" fill="${KRAFT_DARK}"/>
  ${lunatLockup(400, 530, 0.95)}
  `);
}

/* ── 5. Hot dog box ──────────────────────────────────────── */
function hotdog() {
  return svg(`
  ${shadow(655, 230)}
  <path d="M 215 470 L 585 470 L 565 640 L 235 640 Z" fill="${KRAFT}"/>
  <path d="M 215 470 L 585 470 L 580 494 L 220 494 Z" fill="${KRAFT_DARK}"/>
  <path d="M 240 440 Q 240 380 400 380 Q 560 380 560 440 L 560 470 L 240 470 Z" fill="#e8b872"/>
  <path d="M 252 430 Q 260 348 400 348 Q 540 348 548 430 Q 548 452 528 452 L 272 452 Q 252 452 252 430 Z" fill="#c46a44"/>
  <path d="M 300 384 q 25 -14 50 0 q 25 14 50 0 q 25 -14 50 0" stroke="#e9c94f" stroke-width="9" fill="none" stroke-linecap="round"/>
  ${lunatLockup(400, 590, 0.72)}
  `);
}

/* ── 6. Fried chicken box (tuck-top auto-bottom) ─────────── */
function chicken() {
  return svg(`
  ${shadow()}
  <path d="M 262 330 L 538 330 L 500 292 L 300 292 Z" fill="${KRAFT_LIGHT}"/>
  <path d="M 262 330 L 538 330 L 538 610 Q 538 628 520 628 L 280 628 Q 262 628 262 610 Z" fill="${KRAFT}"/>
  <path d="M 262 330 L 538 330 L 538 352 L 262 352 Z" fill="${KRAFT_DARK}" opacity="0.45"/>
  <circle cx="352" cy="395" r="9" fill="${KRAFT_INNER}"/>
  <circle cx="400" cy="395" r="9" fill="${KRAFT_INNER}"/>
  <circle cx="448" cy="395" r="9" fill="${KRAFT_INNER}"/>
  ${lunatLockup(400, 540, 1)}
  `);
}

/* ── 7. Dessert box with clear lid ───────────────────────── */
function dessert() {
  return svg(`
  ${shadow(650, 205)}
  <path d="M 344 402 Q 344 362 400 362 Q 456 362 456 402 L 456 430 L 344 430 Z" fill="#e6a9b8"/>
  <rect x="352" y="428" width="96" height="34" rx="6" fill="#c98a9c"/>
  <rect x="252" y="330" width="296" height="140" rx="14" fill="#bcd7e6" opacity="0.45"/>
  <rect x="252" y="330" width="296" height="140" rx="14" fill="none" stroke="#ffffff" stroke-width="5" opacity="0.8"/>
  <path d="M 244 470 L 556 470 L 556 606 Q 556 626 532 626 L 268 626 Q 244 626 244 606 Z" fill="${WHITE}"/>
  <path d="M 244 470 L 556 470 L 556 488 L 244 488 Z" fill="${WHITE_DARK}"/>
  ${lunatLockup(400, 578, 0.78)}
  `);
}

/* ── 8. Donut box with window ────────────────────────────── */
function donut() {
  return svg(`
  ${shadow(650, 230)}
  <path d="M 225 380 L 575 380 L 575 600 Q 575 622 550 622 L 250 622 Q 225 622 225 600 Z" fill="${WHITE}"/>
  <path d="M 225 380 L 575 380 L 575 400 L 225 400 Z" fill="${WHITE_DARK}"/>
  <circle cx="478" cy="505" r="64" fill="#efe9dd"/>
  <circle cx="478" cy="505" r="64" fill="none" stroke="${WHITE_DARK}" stroke-width="5"/>
  <circle cx="478" cy="505" r="46" fill="#d9903f"/>
  <path d="M 434 496 q 10 -18 30 -12 q 12 -14 30 -6 q 16 -8 26 6 q 8 10 2 22 q -18 22 -58 18 q -30 -4 -30 -28 Z" fill="#ee9fb4"/>
  <circle cx="478" cy="505" r="15" fill="${WHITE}"/>
  <rect x="452" y="486" width="10" height="3.4" rx="1.7" fill="#fff3c9" transform="rotate(24 457 488)"/>
  <rect x="486" y="480" width="10" height="3.4" rx="1.7" fill="#8fd0c2" transform="rotate(-18 491 482)"/>
  <rect x="500" y="497" width="10" height="3.4" rx="1.7" fill="#fff3c9" transform="rotate(38 505 499)"/>
  ${lunatLockup(322, 520, 0.85)}
  `);
}

/* ── 9. Kraft corrugated pizza box ───────────────────────── */
function pizza() {
  return svg(`
  ${shadow(655, 250)}
  <path d="M 210 470 L 400 402 L 590 470 L 400 538 Z" fill="${KRAFT_LIGHT}"/>
  <path d="M 210 470 L 210 560 L 400 634 L 400 538 Z" fill="${KRAFT}"/>
  <path d="M 590 470 L 590 560 L 400 634 L 400 538 Z" fill="${KRAFT_DARK}"/>
  <path d="M 224 486 L 224 545" stroke="${KRAFT_DARK}" stroke-width="4" stroke-dasharray="1 7" stroke-linecap="round"/>
  <g transform="translate(400 500) scale(1.25 0.72)">
    ${lunatLockup(0, 20, 1)}
  </g>
  `);
}

/* ── 10. Paper gable box ─────────────────────────────────── */
function gable() {
  return svg(`
  ${shadow(650, 175)}
  <path d="M 285 420 L 400 302 L 515 420 Z" fill="${KRAFT_LIGHT}"/>
  <path d="M 362 262 L 438 262 L 456 282 L 344 282 Z" fill="${KRAFT_DARK}"/>
  <path d="M 344 282 L 456 282 L 515 420 L 285 420 Z" fill="${KRAFT_LIGHT}"/>
  <ellipse cx="400" cy="292" rx="26" ry="9" fill="${BG_CIRCLE}"/>
  <path d="M 285 420 L 515 420 L 515 612 Q 515 632 493 632 L 307 632 Q 285 632 285 612 Z" fill="${KRAFT}"/>
  <path d="M 285 420 L 515 420 L 515 440 L 285 440 Z" fill="${KRAFT_DARK}" opacity="0.4"/>
  ${lunatLockup(400, 550, 0.92)}
  `);
}

/* ── 11. Paper food tray (boat) ──────────────────────────── */
function tray() {
  return svg(`
  ${shadow(645, 235)}
  <path d="M 205 400 L 595 400 L 545 618 Q 542 632 526 632 L 274 632 Q 258 632 255 618 Z" fill="${KRAFT}"/>
  <path d="M 205 400 L 595 400 L 585 428 L 215 428 Z" fill="${KRAFT_INNER}"/>
  <path d="M 205 400 Q 200 388 214 388 L 586 388 Q 600 388 595 400 Z" fill="${KRAFT_LIGHT}"/>
  ${lunatLockup(400, 560, 0.85)}
  `);
}

/* ── 12. Tuck-top bento box ──────────────────────────────── */
function bento() {
  return svg(`
  ${shadow(650, 220)}
  <path d="M 240 356 L 560 356 L 560 600 Q 560 622 536 622 L 264 622 Q 240 622 240 600 Z" fill="${KRAFT}"/>
  <path d="M 240 356 L 560 356 L 560 420 L 240 420 Z" fill="${KRAFT_LIGHT}"/>
  <path d="M 368 420 A 32 32 0 0 0 432 420 Z" fill="${KRAFT}"/>
  <path d="M 240 420 L 560 420" stroke="${KRAFT_DARK}" stroke-width="3" stroke-dasharray="8 8" opacity="0.6"/>
  ${lunatLockup(400, 545, 0.95)}
  `);
}

/* ── Emit ────────────────────────────────────────────────── */
const FILES = {
  'prod-box-lunat-takeout.svg': takeout(),
  'prod-box-lunat-chinese.svg': chinese(),
  'prod-box-lunat-burger.svg':  burger(),
  'prod-box-lunat-fry.svg':     fry(),
  'prod-box-lunat-hotdog.svg':  hotdog(),
  'prod-box-lunat-chicken.svg': chicken(),
  'prod-box-lunat-dessert.svg': dessert(),
  'prod-box-lunat-donut.svg':   donut(),
  'prod-box-lunat-pizza.svg':   pizza(),
  'prod-box-lunat-gable.svg':   gable(),
  'prod-box-lunat-tray.svg':    tray(),
  'prod-box-lunat-bento.svg':   bento(),
};

for (const [name, content] of Object.entries(FILES)) {
  writeFileSync(join(OUT_DIR, name), content);
  console.log('wrote', name);
}
