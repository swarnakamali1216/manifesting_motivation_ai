import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

function ProgressChart({ sessions }) {
  if (!sessions || sessions.length === 0) {
    return <p style={{ color:"var(--muted,#aaa)", fontSize:13 }}>No data yet — start chatting to see your progress!</p>;
  }

  // Count sessions per weekday — use local date (not UTC)
  var countByDay = {};
  sessions.forEach(function(s) {
    var dt = s.created_at || s.date;
    if (!dt) return;
    var day = new Date(dt).toLocaleDateString("en-US", { weekday:"short" });
    countByDay[day] = (countByDay[day] || 0) + 1;
  });

  // Order Mon→Sun
  var ORDER = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  var data = ORDER
    .filter(function(d){ return countByDay[d] !== undefined; })
    .map(function(d){ return { day:d, count:countByDay[d] }; });

  if (data.length === 0) {
    return <p style={{ color:"var(--muted,#aaa)", fontSize:13 }}>No data yet — start chatting to see your progress!</p>;
  }

  return (
    <div>
      <h3 style={{ color:"var(--muted,#aaa)", fontSize:13, marginBottom:8, fontFamily:"'Syne',sans-serif", fontWeight:700 }}>Sessions This Week</h3>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top:4, right:4, left:-20, bottom:0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border,#333)" vertical={false}/>
          <XAxis dataKey="day" stroke="var(--muted,#aaa)" tick={{ fontSize:11 }} axisLine={false} tickLine={false}/>
          <YAxis stroke="var(--muted,#aaa)" tick={{ fontSize:11 }} axisLine={false} tickLine={false} allowDecimals={false}/>
          <Tooltip
            contentStyle={{ backgroundColor:"var(--card,#1a1a2e)", border:"1px solid rgba(124,92,252,0.3)", borderRadius:10, fontSize:12 }}
            cursor={{ fill:"rgba(124,92,252,0.08)" }}/>
          <Bar dataKey="count" fill="url(#barGrad)" radius={[6,6,0,0]}/>
          <defs>
            <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#a78bfa"/>
              <stop offset="100%" stopColor="#7c5cfc"/>
            </linearGradient>
          </defs>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default ProgressChart;

