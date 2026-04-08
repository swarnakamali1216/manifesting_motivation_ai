import React from "react";
import axios from "axios";

function GoalCard({ goal, onUpdate, onMilestone }) {

  const completeGoal = async () => {
    try {
      const res = await axios.patch(`https://manifesting-motivation-backend.onrender.com/api/goals/${goal.id}/complete`);
      if (res.data.milestone && onMilestone) {
        onMilestone(res.data.milestone);
      }
      onUpdate();
    } catch(err) { alert("Error completing goal!"); }
  };

  const deleteGoal = async () => {
    if (!window.confirm("Delete this goal?")) return;
    try {
      await axios.delete(`https://manifesting-motivation-backend.onrender.com/api/goals/${goal.id}`);
      onUpdate();
    } catch(err) { alert("Error deleting!"); }
  };

  return (
    <div className={`goal-card ${goal.is_complete ? "completed" : ""}`}>
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"12px"}}>
        <div className="goal-title">
          {goal.is_complete ? "✅ " : "🎯 "}{goal.title}
        </div>
        <div className="streak-badge">🔥 {goal.streak} day streak</div>
      </div>

      <div style={{display:"flex", gap:"8px", marginBottom:"14px"}}>
        <span className="tag">{goal.category}</span>
        <span className="tag">{goal.persona}</span>
      </div>

      <div style={{display:"flex", gap:"8px"}}>
        {!goal.is_complete && (
          <button className="btn-success" onClick={completeGoal}>Mark Complete ✓</button>
        )}
        <button className="btn-danger" onClick={deleteGoal}>Delete</button>
      </div>
    </div>
  );
}

export default GoalCard;

