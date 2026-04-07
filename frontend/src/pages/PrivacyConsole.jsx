import React, { useState, useEffect } from "react";
import axios from "axios";

var API = "https://manifesting-motivation-backend.onrender.com/api";

function PrivacyConsole(props) {
  var user   = props.user;
  var userId = user ? (user.id || 1) : 1;

  var s1 = useState(null);
  var stats    = s1[0];
  var setStats = s1[1];

  var s2 = useState(true);
  var loading    = s2[0];
  var setLoading = s2[1];

  var s3 = useState(null);
  var exporting    = s3[0];
  var setExporting = s3[1];

  var s4 = useState(false);
  var wiping    = s4[0];
  var setWiping = s4[1];

  var s5 = useState(null);
  var message    = s5[0];
  var setMessage = s5[1];

  var s6 = useState(false);
  var confirmWipe    = s6[0];
  var setConfirmWipe = s6[1];

  var s7 = useState(false);
  var confirmFull    = s7[0];
  var setConfirmFull = s7[1];

  useEffect(function() { fetchStats(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function fetchStats() {
    setLoading(true);
    axios.get(API + "/privacy/stats?user_id=" + userId)
      .then(function(res) { setStats(res.data); })
      .catch(function() {
        // Fallback: build stats from other endpoints
        Promise.all([
          axios.get(API + "/goals").catch(function() { return { data: [] }; }),
          axios.get(API + "/history").catch(function() { return { data: [] }; }),
          axios.get(API + "/journal?user_id=" + userId).catch(function() { return { data: [] }; }),
          axios.get(API + "/admin/stats?user_id=" + userId).catch(function() { return { data: {} }; })
        ]).then(function(results) {
          var goals    = results[0].data || [];
          var sessions = results[1].data || [];
          var journals = results[2].data || [];
          var adminStats = results[3].data || {};
          setStats({
            goals:    goals.length,
            sessions: sessions.length,
            journals: journals.length,
            checkins: adminStats.total_checkins || 0,
            xp:       adminStats.total_xp || 0,
            memory_entries: 0
          });
        });
      })
      .finally(function() { setLoading(false); });
  }

  function exportData() {
    setExporting("working");
    setMessage(null);
    axios.get(API + "/privacy/export?user_id=" + userId)
      .then(function(res) {
        var data     = res.data;
        var blob     = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        var url      = URL.createObjectURL(blob);
        var a        = document.createElement("a");
        a.href       = url;
        a.download   = "my_manifesting_data_" + new Date().toISOString().split("T")[0] + ".json";
        a.click();
        URL.revokeObjectURL(url);
        setExporting("done");
        setMessage({ type: "success", text: "Your data has been exported successfully!" });
      })
      .catch(function(e) {
        console.error(e);
        setExporting(null);
        setMessage({ type: "error", text: "Export failed. Try again." });
      });
  }

  function wipeMemory() {
    setWiping(true);
    setMessage(null);
    axios.delete(API + "/privacy/wipe-memory?user_id=" + userId)
      .then(function() {
        setConfirmWipe(false);
        setMessage({ type: "success", text: "AI memory wiped. The AI no longer remembers past conversations." });
        fetchStats();
      })
      .catch(function(e) {
        console.error(e);
        setMessage({ type: "error", text: "Wipe failed. Try again." });
      })
      .finally(function() { setWiping(false); });
  }

  function wipeAll() {
    setWiping(true);
    setMessage(null);
    axios.delete(API + "/privacy/wipe-all?user_id=" + userId)
      .then(function() {
        setConfirmFull(false);
        setMessage({ type: "success", text: "All your data has been permanently deleted." });
        fetchStats();
      })
      .catch(function(e) {
        console.error(e);
        setMessage({ type: "error", text: "Wipe failed. Try again." });
      })
      .finally(function() { setWiping(false); });
  }

  var dataItems = stats ? [
    { label: "Coaching Sessions",  value: stats.sessions || 0, icon: "💬", color: "#7c5cfc" },
    { label: "Goals Created",      value: stats.goals    || 0, icon: "🎯", color: "#fbbf24" },
    { label: "Journal Entries",    value: stats.journals || 0, icon: "📓", color: "#60a5fa" },
    { label: "Check-ins",          value: stats.checkins || 0, icon: "✅", color: "#4ade80" },
    { label: "XP Earned",          value: stats.xp       || 0, icon: "⚡", color: "#a78bfa" },
    { label: "AI Memory Entries",  value: stats.memory_entries || 0, icon: "🧠", color: "#f87171" },
  ] : [];

  return (
    <div>
      <h1 className="page-title">Privacy Console</h1>
      <p className="page-subtitle">
        You own your data. View, export, or delete everything the AI knows about you.
      </p>

      {/* GDPR Banner */}
      <div style={{ padding: "14px 18px", borderRadius: "12px", marginBottom: "24px", background: "rgba(124,92,252,0.06)", border: "1px solid rgba(124,92,252,0.2)", display: "flex", gap: "12px", alignItems: "flex-start" }}>
        <div style={{ fontSize: "20px", flexShrink: 0 }}>🛡️</div>
        <div>
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: "800", fontSize: "12px", color: "var(--accent)", marginBottom: "4px", letterSpacing: "0.06em" }}>
            YOUR RIGHTS (GDPR COMPLIANT)
          </div>
          <div style={{ fontSize: "12px", color: "var(--muted)", fontFamily: "'DM Sans',sans-serif", lineHeight: "1.6" }}>
            You have the right to access all your data, export it at any time, and permanently delete it.
            We never sell your data. Your journal entries are private and never shared.
          </div>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div style={{ padding: "12px 16px", borderRadius: "10px", marginBottom: "20px", background: message.type === "success" ? "rgba(74,222,128,0.08)" : "rgba(248,113,113,0.08)", border: "1px solid " + (message.type === "success" ? "rgba(74,222,128,0.3)" : "rgba(248,113,113,0.3)"), color: message.type === "success" ? "#4ade80" : "#f87171", fontSize: "13px", fontFamily: "'DM Sans',sans-serif", display: "flex", gap: "8px", alignItems: "center" }}>
          <span>{message.type === "success" ? "✅" : "❌"}</span>
          <span>{message.text}</span>
        </div>
      )}

      {/* Data Summary */}
      <div style={{ background: "var(--card)", borderRadius: "16px", padding: "20px", marginBottom: "20px", border: "1px solid var(--border)" }}>
        <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: "800", fontSize: "13px", color: "var(--text)", letterSpacing: "0.08em", marginBottom: "16px" }}>
          WHAT WE STORE ABOUT YOU
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "20px", color: "var(--muted)", fontSize: "13px" }}>
            Loading your data...
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "10px" }}>
            {dataItems.map(function(item) {
              return (
                <div key={item.label} style={{ background: "var(--bg)", borderRadius: "10px", padding: "14px", textAlign: "center", border: "1px solid var(--border)" }}>
                  <div style={{ fontSize: "22px", marginBottom: "6px" }}>{item.icon}</div>
                  <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: "900", fontSize: "22px", color: item.color }}>{item.value}</div>
                  <div style={{ fontSize: "10px", color: "var(--muted)", fontFamily: "'DM Sans',sans-serif", marginTop: "2px" }}>{item.label}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Export Section */}
      <div style={{ background: "var(--card)", borderRadius: "16px", padding: "20px", marginBottom: "16px", border: "1px solid var(--border)" }}>
        <div style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
          <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "rgba(96,165,250,0.12)", border: "1px solid rgba(96,165,250,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", flexShrink: 0 }}>
            📥
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: "800", fontSize: "14px", color: "var(--text)", marginBottom: "4px" }}>
              Export My Data
            </div>
            <div style={{ fontSize: "12px", color: "var(--muted)", fontFamily: "'DM Sans',sans-serif", lineHeight: "1.6", marginBottom: "12px" }}>
              Download everything — your goals, sessions, journals, and AI memory — as a JSON file. This is your data backup.
            </div>
            <button
              onClick={exportData}
              disabled={exporting === "working"}
              style={{ padding: "9px 20px", borderRadius: "10px", cursor: exporting === "working" ? "not-allowed" : "pointer", background: "rgba(96,165,250,0.1)", border: "1px solid rgba(96,165,250,0.3)", color: "#60a5fa", fontSize: "13px", fontFamily: "'Syne',sans-serif", fontWeight: "700", opacity: exporting === "working" ? 0.6 : 1 }}
            >
              {exporting === "working" ? "Exporting..." : exporting === "done" ? "✅ Downloaded!" : "📥 Download My Data (JSON)"}
            </button>
          </div>
        </div>
      </div>

      {/* Wipe AI Memory */}
      <div style={{ background: "var(--card)", borderRadius: "16px", padding: "20px", marginBottom: "16px", border: "1px solid rgba(251,191,36,0.2)" }}>
        <div style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
          <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", flexShrink: 0 }}>
            🧠
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: "800", fontSize: "14px", color: "var(--text)", marginBottom: "4px" }}>
              Wipe AI Memory
            </div>
            <div style={{ fontSize: "12px", color: "var(--muted)", fontFamily: "'DM Sans',sans-serif", lineHeight: "1.6", marginBottom: "12px" }}>
              Clear what the AI remembers about your past conversations and preferences. Your goals and journals are kept — only the AI memory is cleared.
            </div>

            {!confirmWipe ? (
              <button
                onClick={function() { setConfirmWipe(true); }}
                style={{ padding: "9px 20px", borderRadius: "10px", cursor: "pointer", background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.3)", color: "#fbbf24", fontSize: "13px", fontFamily: "'Syne',sans-serif", fontWeight: "700" }}
              >
                🧠 Wipe AI Memory
              </button>
            ) : (
              <div style={{ padding: "14px", borderRadius: "10px", background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.3)" }}>
                <div style={{ fontSize: "13px", color: "#fbbf24", fontFamily: "'Syne',sans-serif", fontWeight: "700", marginBottom: "8px" }}>
                  Are you sure? The AI will forget your preferences.
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={wipeMemory}
                    disabled={wiping}
                    style={{ padding: "8px 16px", borderRadius: "8px", cursor: "pointer", background: "#fbbf24", border: "none", color: "#1a1a2e", fontSize: "12px", fontFamily: "'Syne',sans-serif", fontWeight: "800" }}
                  >
                    {wiping ? "Wiping..." : "Yes, Wipe Memory"}
                  </button>
                  <button
                    onClick={function() { setConfirmWipe(false); }}
                    style={{ padding: "8px 16px", borderRadius: "8px", cursor: "pointer", background: "transparent", border: "1px solid var(--border)", color: "var(--muted)", fontSize: "12px", fontFamily: "'DM Sans',sans-serif" }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Everything */}
      <div style={{ background: "var(--card)", borderRadius: "16px", padding: "20px", border: "1px solid rgba(248,113,113,0.2)" }}>
        <div style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
          <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", flexShrink: 0 }}>
            🗑️
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: "800", fontSize: "14px", color: "#f87171", marginBottom: "4px" }}>
              Delete All My Data
            </div>
            <div style={{ fontSize: "12px", color: "var(--muted)", fontFamily: "'DM Sans',sans-serif", lineHeight: "1.6", marginBottom: "12px" }}>
              Permanently delete all your goals, sessions, journals, and AI memory. This cannot be undone. Export your data first if you want a backup.
            </div>

            {!confirmFull ? (
              <button
                onClick={function() { setConfirmFull(true); }}
                style={{ padding: "9px 20px", borderRadius: "10px", cursor: "pointer", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.3)", color: "#f87171", fontSize: "13px", fontFamily: "'Syne',sans-serif", fontWeight: "700" }}
              >
                🗑️ Delete All My Data
              </button>
            ) : (
              <div style={{ padding: "14px", borderRadius: "10px", background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.3)" }}>
                <div style={{ fontSize: "13px", color: "#f87171", fontFamily: "'Syne',sans-serif", fontWeight: "700", marginBottom: "4px" }}>
                  ⚠️ This is permanent and cannot be undone!
                </div>
                <div style={{ fontSize: "11px", color: "var(--muted)", fontFamily: "'DM Sans',sans-serif", marginBottom: "10px" }}>
                  Export your data first if you want to keep a copy.
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={wipeAll}
                    disabled={wiping}
                    style={{ padding: "8px 16px", borderRadius: "8px", cursor: "pointer", background: "#f87171", border: "none", color: "white", fontSize: "12px", fontFamily: "'Syne',sans-serif", fontWeight: "800" }}
                  >
                    {wiping ? "Deleting..." : "Yes, Delete Everything"}
                  </button>
                  <button
                    onClick={function() { setConfirmFull(false); }}
                    style={{ padding: "8px 16px", borderRadius: "8px", cursor: "pointer", background: "transparent", border: "1px solid var(--border)", color: "var(--muted)", fontSize: "12px", fontFamily: "'DM Sans',sans-serif" }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer note */}
      <div style={{ marginTop: "20px", padding: "12px 16px", borderRadius: "10px", background: "transparent", border: "1px solid var(--border)", fontSize: "11px", color: "var(--muted)", fontFamily: "'DM Sans',sans-serif", lineHeight: "1.7", textAlign: "center" }}>
        Manifesting Motivation AI is GDPR compliant. We never sell your data to third parties.
        All journal entries are private. You can delete your account at any time.
      </div>
    </div>
  );
}

export default PrivacyConsole;
