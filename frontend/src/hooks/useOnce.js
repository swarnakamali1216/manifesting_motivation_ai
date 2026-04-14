/**
 * useOnce.js — Prevents duplicate API calls on component mount
 *
 * PROBLEM (seen in your Network tab):
 *   leaderboard called 3x (18.68s, 50.83s apart)
 *   goals?user_id=4 called 3x
 *   history?user_id=4 called 3x
 *
 * CAUSE: useEffect with no dependency array, or dependency array with
 *        objects/arrays that change reference on every render (e.g. `user`).
 *
 * FIX OPTION 1 — Use this hook instead of useEffect for one-time fetches:
 *
 *   import { useOnce } from "../hooks/useOnce";
 *   useOnce(function() { fetchLeaderboard(); });
 *
 * FIX OPTION 2 — Use user.id (number) not user (object) in deps:
 *   useEffect(function() { fetchGoals(); }, [user.id]);   // ✓ stable
 *   useEffect(function() { fetchGoals(); }, [user]);      // ✗ re-runs every render
 */

import { useEffect, useRef } from "react";

/**
 * Runs callback exactly once when component mounts.
 * Never re-runs even if parent re-renders.
 */
export function useOnce(callback) {
  var ran = useRef(false);
  useEffect(function() {
    if (ran.current) return;
    ran.current = true;
    callback();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}

/**
 * Runs callback once when `id` first becomes truthy.
 * Use for: fetchData(user.id) — waits for user to load, then runs once.
 *
 * Example:
 *   useOnceWhenReady(user && user.id, function() {
 *     fetchLeaderboard(user.id);
 *     fetchGoals(user.id);
 *   });
 */
export function useOnceWhenReady(id, callback) {
  var ran = useRef(false);
  useEffect(function() {
    if (!id || ran.current) return;
    ran.current = true;
    callback();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
}