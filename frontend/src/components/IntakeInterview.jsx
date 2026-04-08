import React, { useState } from "react";
import axios from "axios";

function IntakeInterview(props) {
  var goalId   = props.goalId;
  var goalTitle= props.goalTitle;
  var userId   = props.userId;
  var onDone   = props.onDone;

  var [step,    setStep]    = useState(0);
  var [answers, setAnswers] = useState({
    daily_time:     "",
    learning_style: "",
    current_level:  ""
  });
  var [loading, setLoading] = useState(false);

  var questions = [
    {
      key:      "daily_time",
      question: "How much time can you realistically give to this goal each day?",
      subtitle: "Be honest — even 15 minutes a day builds real progress",
      options:  [
        { value: "15 mins",  label: "15 mins",  icon: "⚡", desc: "Quick daily habit" },
        { value: "30 mins",  label: "30 mins",  icon: "🕐", desc: "Focused session"   },
        { value: "1 hour",   label: "1 hour",   icon: "🎯", desc: "Deep work block"  },
        { value: "2+ hours", label: "2+ hours", icon: "🔥", desc: "Full commitment"  }
      ]
    },
    {
      key:      "learning_style",
      question: "How do you learn best?",
      subtitle: "AI will suggest resources that match your style",
      options:  [
        { value: "videos",   label: "Videos",    icon: "🎥", desc: "YouTube, tutorials"  },
        { value: "reading",  label: "Reading",   icon: "📖", desc: "Docs, articles"      },
        { value: "practice", label: "Practice",  icon: "💻", desc: "Hands-on exercises"  },
        { value: "mix",      label: "Mix it up", icon: "🌈", desc: "Variety keeps me engaged" }
      ]
    },
    {
      key:      "current_level",
      question: "What is your current knowledge level for this goal?",
      subtitle: "No judgment — the AI adjusts to where you actually are",
      options:  [
        { value: "complete_beginner", label: "Complete Beginner", icon: "🌱", desc: "Starting from zero"    },
        { value: "some_knowledge",    label: "Some Knowledge",    icon: "📚", desc: "Know the basics"      },
        { value: "intermediate",      label: "Intermediate",      icon: "⚡", desc: "Have some experience" },
        { value: "advanced",          label: "Advanced",          icon: "🚀", desc: "Want to master it"    }
      ]
    }
  ];

  var current = questions[step];

  function selectOption(value) {
    var updated = Object.assign({}, answers);
    updated[current.key] = value;
    setAnswers(updated);
  }

  async function handleNext() {
    if (!answers[current.key]) return;
    if (step < questions.length - 1) {
      setStep(step + 1);
    } else {
      // All answered — generate adaptive roadmap
      setLoading(true);
      try {
        var res = await axios.post("https://manifesting-motivation-backend.onrender.com/api/adaptive/interview", {
          goal_id:       goalId,
          user_id:       userId,
          daily_time:    answers.daily_time,
          learning_style:answers.learning_style,
          current_level: answers.current_level
        });
        if (onDone) onDone(res.data.roadmap, answers);
      } catch(e) {
        console.error(e);
        if (onDone) onDone(null, answers);
      } finally {
        setLoading(false);
      }
    }
  }

  if (loading) return (
    <div style={{
      padding: "30px", textAlign: "center",
      borderRadius: "16px",
      background: "rgba(124,92,252,0.06)",
      border: "1px solid rgba(124,92,252,0.2)"
    }}>
      <div style={{ fontSize: "36px", marginBottom: "12px" }}>🤖</div>
      <div style={{
        fontFamily: "'Syne',sans-serif", fontWeight: "800",
        fontSize: "16px", color: "var(--accent)", marginBottom: "6px"
      }}>
        Personalising your roadmap...
      </div>
      <div style={{ fontSize: "12px", color: "var(--muted)" }}>
        AI is creating steps that fit YOUR time and learning style
      </div>
    </div>
  );

  return (
    <div style={{
      padding: "20px", borderRadius: "16px",
      background: "var(--card)",
      border: "1px solid rgba(124,92,252,0.3)"
    }}>
      {/* Progress dots */}
      <div style={{
        display: "flex", gap: "6px",
        justifyContent: "center", marginBottom: "20px"
      }}>
        {questions.map(function(_, i) {
          return (
            <div key={i} style={{
              width:        i === step ? "24px" : "8px",
              height:       "8px",
              borderRadius: "4px",
              background:   i <= step
                ? "linear-gradient(90deg,#7c5cfc,#fc5cf0)"
                : "var(--border)",
              transition:   "all 0.3s ease"
            }} />
          );
        })}
      </div>

      {/* Goal reminder */}
      <div style={{
        fontSize: "11px", color: "var(--muted)",
        fontFamily: "'DM Sans',sans-serif",
        textAlign: "center", marginBottom: "16px"
      }}>
        Setting up your plan for: <strong style={{ color: "var(--accent)" }}>{goalTitle}</strong>
      </div>

      {/* Question */}
      <div style={{
        fontFamily: "'Syne',sans-serif", fontWeight: "800",
        fontSize: "16px", color: "var(--text)",
        textAlign: "center", marginBottom: "6px"
      }}>
        {current.question}
      </div>
      <div style={{
        fontSize: "12px", color: "var(--muted)",
        textAlign: "center", marginBottom: "20px",
        fontFamily: "'DM Sans',sans-serif"
      }}>
        {current.subtitle}
      </div>

      {/* Options */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr",
        gap: "10px", marginBottom: "20px"
      }}>
        {current.options.map(function(opt) {
          var selected = answers[current.key] === opt.value;
          return (
            <button
              key={opt.value}
              onClick={function() { selectOption(opt.value); }}
              style={{
                padding: "14px 12px", borderRadius: "12px",
                cursor: "pointer", textAlign: "left",
                border: selected
                  ? "2px solid #7c5cfc"
                  : "1px solid var(--border)",
                background: selected
                  ? "rgba(124,92,252,0.12)"
                  : "var(--bg)",
                transition: "all 0.2s"
              }}
            >
              <div style={{ fontSize: "24px", marginBottom: "6px" }}>
                {opt.icon}
              </div>
              <div style={{
                fontFamily: "'Syne',sans-serif", fontWeight: "700",
                fontSize: "13px",
                color: selected ? "var(--accent)" : "var(--text)",
                marginBottom: "2px"
              }}>
                {opt.label}
              </div>
              <div style={{
                fontSize: "10px", color: "var(--muted)",
                fontFamily: "'DM Sans',sans-serif"
              }}>
                {opt.desc}
              </div>
            </button>
          );
        })}
      </div>

      <button
        onClick={handleNext}
        disabled={!answers[current.key]}
        style={{
          width: "100%", padding: "12px",
          borderRadius: "12px", cursor: "pointer",
          background: answers[current.key]
            ? "linear-gradient(135deg,#7c5cfc,#fc5cf0)"
            : "var(--border)",
          border: "none", color: "white",
          fontFamily: "'Syne',sans-serif",
          fontWeight: "800", fontSize: "14px",
          opacity: answers[current.key] ? 1 : 0.5
        }}
      >
        {step < questions.length - 1 ? "Next" : "Generate My Personalised Roadmap"}
      </button>
    </div>
  );
}

export default IntakeInterview;

