/**
 * frontend/src/utils/accentHelper.js
 *
 * Place this file at: frontend/src/utils/accentHelper.js
 *
 * HOW TO USE:
 * 1. Import in Settings.jsx: import { applyAccent, ACCENTS } from "../utils/accentHelper";
 * 2. Import in App.jsx:      import { applyAccent } from "./utils/accentHelper";
 * 3. In App.jsx useEffect:   applyAccent(localStorage.getItem("accent_color") || "purple");
 * 4. In Settings.jsx onClick: applyAccent(a.name); setActiveAccent(a.name);
 */

export var ACCENTS = [
  { name:"purple", color:"#7c5cfc", label:"Purple (default)" },
  { name:"blue",   color:"#3b82f6", label:"Blue"   },
  { name:"green",  color:"#22c55e", label:"Green"  },
  { name:"orange", color:"#f97316", label:"Orange" },
  { name:"red",    color:"#ef4444", label:"Red"    },
  { name:"pink",   color:"#ec4899", label:"Pink"   },
];

/**
 * Apply accent color immediately to document.body and save to localStorage.
 * The CSS in index.css has body.accent-blue, body.accent-green etc.
 */
export function applyAccent(name) {
  // Remove any existing accent class
  ACCENTS.forEach(function(a) {
    document.body.classList.remove("accent-" + a.name);
  });
  // Add new accent class (purple is default — no class needed)
  if (name && name !== "purple") {
    document.body.classList.add("accent-" + name);
  }
  localStorage.setItem("accent_color", name || "purple");
}

/**
 * Get the currently active accent name from localStorage.
 */
export function getAccent() {
  return localStorage.getItem("accent_color") || "purple";
}