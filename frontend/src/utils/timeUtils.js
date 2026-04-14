/**
 * timeUtils.js
 *
 * FIX: Backend stores all timestamps as UTC (NOW() in PostgreSQL = UTC).
 * Indian users are in IST = UTC+5:30.
 * Without conversion, "03:17 am" shows instead of "08:47 am" (IST).
 *
 * Usage:
 *   import { toIST, formatDateIST, formatTimeIST, formatDateTimeIST } from "../utils/timeUtils";
 *
 *   formatDateTimeIST("2026-04-14T03:17:00Z")
 *   // → "Tuesday, 14 April 2026 · 08:47 am"
 */

// Convert any date string/object to IST Date
export function toIST(dateInput) {
  if (!dateInput) return new Date();
  var d = new Date(dateInput);
  // IST = UTC + 5h30m = UTC + 330 minutes
  var istOffset = 5.5 * 60 * 60 * 1000;
  var utcMs = d.getTime() + (d.getTimezoneOffset() * 60 * 1000);
  return new Date(utcMs + istOffset);
}

// "Tuesday, 14 April 2026"
export function formatDateIST(dateInput) {
  var d = toIST(dateInput);
  return d.toLocaleDateString("en-IN", {
    weekday: "long",
    day:     "numeric",
    month:   "long",
    year:    "numeric",
    timeZone: "Asia/Kolkata",
  });
}

// "09:01 pm"
export function formatTimeIST(dateInput) {
  var d = toIST(dateInput);
  return d.toLocaleTimeString("en-IN", {
    hour:     "2-digit",
    minute:   "2-digit",
    hour12:   true,
    timeZone: "Asia/Kolkata",
  });
}

// "Tuesday, 14 April 2026 · 09:01 pm"
export function formatDateTimeIST(dateInput) {
  return formatDateIST(dateInput) + " · " + formatTimeIST(dateInput);
}

// Short: "14 Apr · 09:01 pm"
export function formatShortIST(dateInput) {
  var d = toIST(dateInput);
  var day   = d.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
  var time  = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" });
  return day + " · " + time;
}

// "2 hours ago" / "just now" — relative time in IST
export function timeAgoIST(dateInput) {
  var now   = new Date();
  var d     = new Date(dateInput);
  var diffMs = now - d;
  var diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1)   return "just now";
  if (diffMin < 60)  return diffMin + "m ago";
  var diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24)   return diffHr + "h ago";
  var diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7)   return diffDay + "d ago";
  return formatShortIST(dateInput);
}