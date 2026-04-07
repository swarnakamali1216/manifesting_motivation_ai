/**
 * frontend/src/hooks/useStreak.js
 *
 * CRASH FIX: checkins.some is not a function
 * Root cause: /checkin/history/<uid> sometimes returns {dates:[], streak:0}
 * but this code does checkins.some() which only works on arrays.
 *
 * Fix: normalise the API response to always be an array before using it.
 */
import { useState, useEffect } from "react";
import axios from "axios";

var API = "http://localhost:5000/api";

export function useStreak(user) {
  var userId = user ? (user.id || 1) : 1;
  var [streak,         setStreak]         = useState(0);
  var [longestStreak,  setLongestStreak]  = useState(0);
  var [checkedInToday, setCheckedInToday] = useState(false);
  var [atRisk,         setAtRisk]         = useState(false);
  var [loading,        setLoading]        = useState(true);

  useEffect(function() {
    if (!userId) return;
    axios.get(API + "/checkin/history/" + userId)
      .then(function(res) {
        // ✅ FIX: normalise — API may return array OR {dates:[], streak:0}
        var raw      = res.data;
        var checkins = normaliseCheckins(raw);
        var result   = calculateStreak(checkins);
        setStreak(result.streak);
        setLongestStreak(result.longest);
        setCheckedInToday(result.checkedInToday);
        setAtRisk(result.atRisk);
      })
      .catch(function() {
        setStreak(0); setLongestStreak(0);
        setCheckedInToday(false); setAtRisk(false);
      })
      .finally(function() { setLoading(false); });
  }, [userId]);

  return { streak, longestStreak, checkedInToday, atRisk, loading };
}

/**
 * Normalise whatever the API returns into a plain array of objects with a .date field.
 * Handles: plain array, {dates:[]}, {checkins:[]}, or any other shape.
 */
function normaliseCheckins(raw) {
  if (!raw) return [];
  // Already an array — the correct shape
  if (Array.isArray(raw)) return raw;
  // Object with a dates array: { dates: ["2026-03-17", ...] }
  if (raw.dates && Array.isArray(raw.dates)) {
    return raw.dates.map(function(d) { return { date: typeof d === "string" ? d : String(d) }; });
  }
  // Object with a checkins array
  if (raw.checkins && Array.isArray(raw.checkins)) return raw.checkins;
  // Single object with a date field
  if (raw.date) return [raw];
  // Fallback: empty
  return [];
}

function calculateStreak(checkins) {
  if (!checkins || checkins.length === 0) {
    return { streak:0, longest:0, checkedInToday:false, atRisk:false };
  }

  // Extract date strings, deduplicate, sort descending
  var dates = checkins
    .map(function(c) {
      return c.date || (c.created_at || "").split("T")[0] || "";
    })
    .filter(Boolean)
    .filter(function(d, i, arr) { return arr.indexOf(d) === i; })
    .sort()
    .reverse();

  if (!dates.length) return { streak:0, longest:0, checkedInToday:false, atRisk:false };

  var today     = new Date();
  var todayStr  = today.toISOString().split("T")[0];
  var yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  var yesterStr = yesterday.toISOString().split("T")[0];

  var checkedInToday = dates[0] === todayStr;

  // Current streak
  var streak  = 0;
  var current = new Date(checkedInToday ? today : yesterday);

  for (var i = 0; i < dates.length; i++) {
    var expected = current.toISOString().split("T")[0];
    if (dates[i] === expected) {
      streak++;
      current.setDate(current.getDate() - 1);
    } else if (dates[i] < expected) {
      break;
    }
  }

  // Longest streak
  var longest    = 0;
  var tempStreak = 1;
  var sortedAsc  = dates.slice().reverse();
  for (var j = 1; j < sortedAsc.length; j++) {
    var prev = new Date(sortedAsc[j-1]);
    var curr = new Date(sortedAsc[j]);
    var diff = (curr - prev) / (1000 * 60 * 60 * 24);
    if (diff === 1) {
      tempStreak++;
      if (tempStreak > longest) longest = tempStreak;
    } else {
      tempStreak = 1;
    }
  }
  if (sortedAsc.length > 0 && longest === 0) longest = 1;

  // If no checkin today but had yesterday, show yesterday's streak as current
  var finalStreak = checkedInToday
    ? streak
    : (dates[0] === yesterStr ? streak : 0);

  return {
    streak:         finalStreak,
    longest:        Math.max(longest, finalStreak),
    checkedInToday,
    atRisk:         finalStreak > 0 && !checkedInToday,
  };
}