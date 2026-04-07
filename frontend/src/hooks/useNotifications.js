import { useState, useEffect } from "react";

// ── useNotifications hook ─────────────────────────────────────────────────────
// Manages browser notification permission + daily reminder scheduling
export function useNotifications(user) {
  var userId = user ? (user.id || 1) : 1;

  var [permission,  setPermission]  = useState(Notification.permission || "default");
  var [enabled,     setEnabled]     = useState(false);
  var [reminderTime, setReminderTime] = useState("09:00");
  var [loading,     setLoading]     = useState(false);

  // Load saved settings from localStorage on mount
  useEffect(function () {
    var saved = localStorage.getItem("notification_settings_" + userId);
    if (saved) {
      try {
        var parsed = JSON.parse(saved);
        setEnabled(parsed.enabled || false);
        setReminderTime(parsed.time || "09:00");
      } catch (e) {}
    }
    setPermission(Notification.permission || "default");
  }, [userId]);

  // Schedule notifications whenever settings change
  useEffect(function () {
    if (!enabled || permission !== "granted") return;
    scheduleDaily(reminderTime);
  }, [enabled, reminderTime, permission]); // eslint-disable-line

  function saveSettings(newEnabled, newTime) {
    var settings = { enabled: newEnabled, time: newTime || reminderTime };
    localStorage.setItem("notification_settings_" + userId, JSON.stringify(settings));
  }

  async function requestPermission() {
    if (!("Notification" in window)) {
      alert("Your browser doesn't support notifications. Try Chrome or Edge.");
      return false;
    }
    setLoading(true);
    try {
      var result = await Notification.requestPermission();
      setPermission(result);
      if (result === "granted") {
        setEnabled(true);
        saveSettings(true, reminderTime);
        // Fire a welcome notification immediately
        fireNotification(
          "🔥 Manifesting Motivation",
          "Notifications enabled! You'll get daily reminders to stay on track.",
          "welcome"
        );
        scheduleDaily(reminderTime);
        return true;
      }
      return false;
    } finally {
      setLoading(false);
    }
  }

  function enable() {
    if (permission === "granted") {
      setEnabled(true);
      saveSettings(true, reminderTime);
      scheduleDaily(reminderTime);
    } else {
      requestPermission();
    }
  }

  function disable() {
    setEnabled(false);
    saveSettings(false, reminderTime);
    clearScheduled();
  }

  function updateTime(newTime) {
    setReminderTime(newTime);
    saveSettings(enabled, newTime);
    if (enabled && permission === "granted") {
      clearScheduled();
      scheduleDaily(newTime);
    }
  }

  function testNotification() {
    if (permission !== "granted") { requestPermission(); return; }
    var messages = [
      { title: "🔥 Stay on track!", body: "Your goals are waiting. Even 5 minutes counts!" },
      { title: "✨ Daily check-in time", body: "How are you feeling today? Log your mood and keep your streak alive." },
      { title: "🎯 Goal reminder", body: "You have active goals! Take one small step today." },
      { title: "📓 Reflect & grow", body: "Write in your journal today — even one sentence makes a difference." },
    ];
    var pick = messages[Math.floor(Math.random() * messages.length)];
    fireNotification(pick.title, pick.body, "test");
  }

  return {
    permission,
    enabled,
    reminderTime,
    loading,
    requestPermission,
    enable,
    disable,
    updateTime,
    testNotification,
    isSupported: "Notification" in window,
  };
}

// ── Notification content pool ─────────────────────────────────────────────────
var MORNING_MESSAGES = [
  { title: "☀️ Good morning!", body: "Start your day with intention. Check in and set your focus." },
  { title: "🔥 Day streak time!", body: "Keep your streak alive — check in now before you forget." },
  { title: "✨ Manifest your day", body: "What do you want to achieve today? Open the app and make it happen." },
  { title: "🌱 Small steps = big change", body: "One goal step today. That's all it takes. You've got this." },
  { title: "💫 Your coach is waiting", body: "Talk to your AI coach and start the day right." },
];

var EVENING_MESSAGES = [
  { title: "🌙 Evening reflection", body: "Take 2 minutes to journal your day. Future you will thank you." },
  { title: "📓 How was your day?", body: "Log how you're feeling tonight. Your mood trend is building." },
  { title: "🎯 Did you hit your goal step?", body: "Check off today's progress before you wind down." },
  { title: "💪 Consistency is key", body: "One more journal entry to close out the day strong." },
];

function getMessageForTime(time) {
  var hour = parseInt((time || "09:00").split(":")[0], 10);
  var pool = hour < 14 ? MORNING_MESSAGES : EVENING_MESSAGES;
  return pool[Math.floor(Math.random() * pool.length)];
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fireNotification(title, body, tag) {
  if (Notification.permission !== "granted") return;
  try {
    var n = new Notification(title, {
      body,
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      tag: tag || "mm-reminder",
      renotify: true,
      requireInteraction: false,
    });
    n.onclick = function () {
      window.focus();
      n.close();
    };
    // Auto close after 6s
    setTimeout(function () { n.close(); }, 6000);
  } catch (e) {
    console.warn("Notification error:", e);
  }
}

// Store timer IDs so we can clear them
var scheduledTimer = null;

function clearScheduled() {
  if (scheduledTimer) {
    clearTimeout(scheduledTimer);
    scheduledTimer = null;
  }
}

function scheduleDaily(time) {
  clearScheduled();
  if (!time || Notification.permission !== "granted") return;

  var now   = new Date();
  var parts = time.split(":");
  var target = new Date();
  target.setHours(parseInt(parts[0], 10), parseInt(parts[1], 10), 0, 0);

  // If time already passed today, schedule for tomorrow
  if (target <= now) {
    target.setDate(target.getDate() + 1);
  }

  var msUntil = target - now;

  scheduledTimer = setTimeout(function () {
    var msg = getMessageForTime(time);
    fireNotification(msg.title, msg.body, "daily-reminder");
    // Reschedule for next day (24h later)
    scheduledTimer = setTimeout(function recurse() {
      var m = getMessageForTime(time);
      fireNotification(m.title, m.body, "daily-reminder");
      scheduledTimer = setTimeout(recurse, 24 * 60 * 60 * 1000);
    }, 24 * 60 * 60 * 1000);
  }, msUntil);
}
