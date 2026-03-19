/**
 * avatar.js — Letter-based avatar generation.
 *
 * Clean, neutral, no external API. Shows the user's first initial
 * in a coloured circle whose hue is deterministically derived from
 * the user's email so it's always consistent across sessions.
 *
 * Usage:
 *   import { avatarHtml } from './avatar.js';
 *   someEl.innerHTML = avatarHtml(user, 40);
 */

// 8 brand-compatible colours — green first (matches foodPac identity)
const PALETTE = [
  '#2e7d32', // forest green  (brand primary)
  '#1565c0', // ocean blue
  '#6a1b9a', // purple
  '#c62828', // deep red
  '#e65100', // warm orange
  '#00695c', // teal
  '#4527a0', // indigo
  '#37474f', // slate
];

function _hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

/** Pick a consistent background colour based on email or id */
export function avatarColor(user) {
  return PALETTE[_hash(user.email || String(user.id ?? '')) % PALETTE.length];
}

/** First letter of name, falling back to email or '?' */
export function avatarInitial(user) {
  return (user.name || user.email || '?').trim()[0].toUpperCase();
}

/**
 * Returns an HTML string — a coloured circle with the user's initial.
 *
 * If user.picture is set and is NOT a DiceBear URL, it's displayed as
 * an <img> with a letter-avatar fallback on error, so future custom
 * profile photos work automatically.
 *
 * @param {object} user  { name, email, id, picture }
 * @param {number} size  diameter in px (default 36)
 */
export function avatarHtml(user, size = 36) {
  const initial = avatarInitial(user);
  const bg      = avatarColor(user);
  const fs      = Math.round(size * 0.42);

  const letterDiv = `<div style="width:${size}px;height:${size}px;background:${bg};border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:${fs}px;font-family:system-ui,sans-serif;flex-shrink:0;user-select:none;">${initial}</div>`;

  // Only use picture if it's not a DiceBear-generated avatar
  const pic = (user.picture && !user.picture.includes('dicebear.com'))
    ? user.picture
    : null;

  if (pic) {
    // Wrapper hides the image and reveals the letter fallback on load error
    return `<div style="width:${size}px;height:${size}px;border-radius:50%;overflow:hidden;flex-shrink:0;">
      <img src="${pic}" alt="${initial}"
        style="width:100%;height:100%;object-fit:cover;display:block;"
        onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
      <div style="display:none;width:100%;height:100%;background:${bg};align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:${fs}px;font-family:system-ui,sans-serif;user-select:none;">${initial}</div>
    </div>`;
  }

  return letterDiv;
}
