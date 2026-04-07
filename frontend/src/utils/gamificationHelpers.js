/**
 * frontend/src/utils/gamificationHelpers.js
 *
 * Place at: frontend/src/utils/gamificationHelpers.js
 *
 * THE BUG:
 * gamification API returns level as an OBJECT:
 *   { level: 2, name: "Explorer", emoji: "🧭", xp_required: 100, desc: "..." }
 *
 * But old code does:  <div>{user.level}</div>  ← tries to render object = CRASH
 * Fix:               <div>{getLevelNum(user.level)}</div>  ← renders "2"
 *
 * Import these helpers in Dashboard.jsx, MyProgress.jsx, Sidebar.jsx,
 * BadgesXP / MyProgress page — anywhere that uses level or XP data.
 */

/**
 * Safely get level NUMBER from either a number or level object.
 * getLevelNum(2)                           → 2
 * getLevelNum({level:2, name:"Explorer"})  → 2
 * getLevelNum(null)                        → 1
 */
export function getLevelNum(level) {
  if (!level && level !== 0) return 1;
  if (typeof level === "number") return level;
  if (typeof level === "object" && level !== null) return level.level || 1;
  return parseInt(level, 10) || 1;
}

/**
 * Safely get level NAME.
 * getLevelName(2)                           → "Level 2"
 * getLevelName({level:2, name:"Explorer"}) → "Explorer"
 */
export function getLevelName(level) {
  if (!level && level !== 0) return "Seedling";
  if (typeof level === "object" && level !== null) return level.name || "Seedling";
  return `Level ${level}`;
}

/**
 * Safely get level EMOJI.
 * getLevelEmoji({emoji:"🧭"}) → "🧭"
 * getLevelEmoji(2)             → "🌱"
 */
export function getLevelEmoji(level) {
  if (typeof level === "object" && level !== null && level.emoji) return level.emoji;
  const defaults = ["🌱","🧭","🎯","⚡","🔥","🏆","⭐","💎","🌟","✨"];
  var n = getLevelNum(level);
  return defaults[(n - 1) % defaults.length] || "🌱";
}

/**
 * Safely get level DESC.
 */
export function getLevelDesc(level) {
  if (typeof level === "object" && level !== null) return level.desc || "";
  return "";
}

/**
 * Safely get XP as a number.
 * getXP("290")   → 290
 * getXP(290)     → 290
 * getXP(null)    → 0
 */
export function getXP(xp) {
  if (!xp && xp !== 0) return 0;
  return typeof xp === "number" ? xp : parseInt(xp, 10) || 0;
}

/**
 * Format XP with commas.
 * formatXP(1290) → "1,290"
 */
export function formatXP(xp) {
  return getXP(xp).toLocaleString();
}
