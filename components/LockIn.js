"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { BarChart, Bar, XAxis, Cell, ResponsiveContainer, Tooltip } from "recharts";

// ─── Constants ────────────────────────────────────────────────────────────────

const CORE_HABITS = [
  { id: "gym",      label: "Gym Session",   cat: "FITNESS" },
  { id: "pushups",  label: "Pushups",        cat: "FITNESS" },
  { id: "pullups",  label: "Pullups",        cat: "FITNESS" },
  { id: "read",     label: "Read 15 min",    cat: "MIND"    },
  { id: "study",    label: "Study 1 hr",     cat: "SCHOOL"  },
  { id: "hw",       label: "Homework 1 hr",  cat: "SCHOOL"  },
  { id: "projects", label: "Projects 1 hr",  cat: "SCHOOL"  },
];

const RUN_TARGET  = 3;
const SLEEP_GOAL  = 8;
const JUNE_1      = new Date("2026-06-01T00:00:00");

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  bg:      "#08090a",
  surface: "#0f1012",
  border:  "#1c1e22",
  borderHi:"#2a2d33",
  accent:  "#f97316",
  accentDim:"#7c3010",
  accentGlow:"rgba(249,115,22,0.15)",
  text:    "#e8e9eb",
  muted:   "#454850",
  faint:   "#22242a",
  danger:  "#ef4444",
  green:   "#22c55e",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function todayKey() { return new Date().toISOString().slice(0, 10); }
function weekKey() {
  const d = new Date(), day = d.getDay();
  const mon = new Date(d);
  mon.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
  return mon.toISOString().slice(0, 10);
}
function daysLeft() {
  return Math.max(0, Math.ceil((JUNE_1 - new Date()) / 86400000));
}

function lget(key) {
  try { const r = localStorage.getItem("li2:" + key); return r ? JSON.parse(r) : null; }
  catch { return null; }
}
function lset(key, val) {
  try { localStorage.setItem("li2:" + key, JSON.stringify(val)); } catch {}
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ children, action }) {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
      <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, letterSpacing:3, color:C.muted, textTransform:"uppercase" }}>
        {children}
      </div>
      {action}
    </div>
  );
}

function Card({ children, highlight, style = {} }) {
  return (
    <div style={{
      background: highlight ? C.accentGlow : C.surface,
      border: `1px solid ${highlight ? C.accentDim : C.border}`,
      borderRadius: 12,
      padding: 16,
      transition: "border-color 0.25s, background 0.25s",
      ...style,
    }}>
      {children}
    </div>
  );
}

function HabitRow({ label, cat, done, onToggle, onRemove, index }) {
  return (
    <div
      onClick={onToggle}
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 14px",
        marginBottom: 6,
        background: done ? C.accentGlow : C.surface,
        border: `1px solid ${done ? C.accentDim : C.border}`,
        borderRadius: 10,
        cursor: "pointer",
        transition: "all 0.2s ease",
        animation: `slideIn 0.3s ease ${index * 0.04}s both`,
      }}
    >
      <div style={{ display:"flex", alignItems:"center", gap:12, flex:1, minWidth:0 }}>
        <div style={{
          width: 20, height: 20, borderRadius: 6, flexShrink: 0,
          background: done ? C.accent : "transparent",
          border: `1.5px solid ${done ? C.accent : C.borderHi}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all 0.2s ease",
        }}>
          {done && <svg width="11" height="9" viewBox="0 0 11 9" fill="none"><path d="M1 4L4 7.5L10 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
        </div>
        <div style={{ minWidth:0 }}>
          <div style={{
            fontFamily: "'Barlow Condensed',sans-serif",
            fontSize: 16, letterSpacing: 0.5,
            color: done ? C.accent : C.text,
            transition: "color 0.2s",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {label}
          </div>
          <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9, color:C.muted, marginTop:2, letterSpacing:1 }}>
            {cat}
          </div>
        </div>
      </div>
      {onRemove && (
        <button
          onClick={e => { e.stopPropagation(); onRemove(); }}
          style={{
            background:"transparent", border:"none", color:C.muted,
            fontSize:16, padding:"0 4px", cursor:"pointer", lineHeight:1,
            marginLeft:8, flexShrink:0,
            transition:"color 0.15s",
          }}
          onMouseEnter={e => e.target.style.color = C.danger}
          onMouseLeave={e => e.target.style.color = C.muted}
        >
          ×
        </button>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function LockIn() {
  const today = todayKey();
  const week  = weekKey();

  const [habits,       setHabits]       = useState({});
  const [customHabits, setCustomHabits] = useState([]); // [{id, label}]
  const [runs,         setRuns]         = useState(0);
  const [sleepHours,   setSleepHours]   = useState("");
  const [streak,       setStreak]       = useState(0);
  const [chart,        setChart]        = useState([]);
  const [ready,        setReady]        = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [addingTask,   setAddingTask]   = useState(false);
  const [newTask,      setNewTask]      = useState("");
  const inputRef = useRef(null);

  // ── All habits combined ──────────────────────────────────────────────────
  const allHabits = [
    ...CORE_HABITS,
    ...customHabits.map(c => ({ ...c, cat: "CUSTOM" })),
  ];

  // ── Load ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const day  = lget("day:" + today) || { habits: {}, sleep: "" };
    const wk   = lget("week:" + week) || { runs: 0 };
    const cust = lget("customHabits")  || [];

    setHabits(day.habits || {});
    setSleepHours(day.sleep ?? "");
    setRuns(wk.runs || 0);
    setCustomHabits(cust);

    // streak
    let s = 0;
    const chk = new Date();
    chk.setDate(chk.getDate() - 1);
    for (let i = 0; i < 90; i++) {
      const d   = lget("day:" + chk.toISOString().slice(0, 10));
      const len = [...CORE_HABITS, ...(cust)].length;
      if (d && Object.values(d.habits || {}).filter(Boolean).length >= CORE_HABITS.length) {
        s++;
      } else break;
      chk.setDate(chk.getDate() - 1);
    }
    setStreak(s);

    // chart
    const bars = [];
    for (let i = 6; i >= 0; i--) {
      const dt = new Date();
      dt.setDate(dt.getDate() - i);
      const ds = dt.toISOString().slice(0, 10);
      const dd = ds === today ? day : lget("day:" + ds);
      const cnt = dd ? Object.values(dd.habits || {}).filter(Boolean).length : 0;
      bars.push({ day: ["Su","Mo","Tu","We","Th","Fr","Sa"][dt.getDay()], cnt, isToday: ds === today });
    }
    setChart(bars);
    setReady(true);
  }, []);

  // ── Persist helpers ───────────────────────────────────────────────────────
  const persistDay = useCallback((newHabits, newSleep) => {
    lset("day:" + today, { habits: newHabits, sleep: newSleep });
  }, [today]);

  // ── Toggle habit ──────────────────────────────────────────────────────────
  const toggleHabit = useCallback((id) => {
    setHabits(prev => {
      const next = { ...prev, [id]: !prev[id] };
      persistDay(next, sleepHours);
      const cnt = Object.values(next).filter(Boolean).length;
      setChart(c => c.map(b => b.isToday ? { ...b, cnt } : b));
      if (cnt >= allHabits.length) setTimeout(() => setShowComplete(true), 200);
      return next;
    });
  }, [sleepHours, allHabits.length, persistDay]);

  // ── Sleep ─────────────────────────────────────────────────────────────────
  const handleSleep = (val) => {
    const clean = val.replace(/[^0-9.]/g, "").slice(0, 4);
    setSleepHours(clean);
    persistDay(habits, clean);
  };

  // ── Runs ──────────────────────────────────────────────────────────────────
  const addRun = () => {
    const n = runs < RUN_TARGET ? runs + 1 : 0;
    setRuns(n);
    lset("week:" + week, { runs: n });
  };

  // ── Custom tasks ──────────────────────────────────────────────────────────
  const submitCustom = () => {
    const label = newTask.trim();
    if (!label) return;
    const id   = "custom_" + Date.now();
    const next = [...customHabits, { id, label }];
    setCustomHabits(next);
    lset("customHabits", next);
    setNewTask("");
    setAddingTask(false);
  };

  const removeCustom = (id) => {
    const next = customHabits.filter(c => c.id !== id);
    setCustomHabits(next);
    lset("customHabits", next);
    setHabits(prev => {
      const next2 = { ...prev };
      delete next2[id];
      persistDay(next2, sleepHours);
      return next2;
    });
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const done          = Object.values(habits).filter(Boolean).length;
  const total         = allHabits.length;
  const allDone       = done >= total;
  const displayStreak = allDone ? streak + 1 : streak;
  const sleepNum      = parseFloat(sleepHours) || 0;
  const sleepOk       = sleepNum >= SLEEP_GOAL;
  const sleepPct      = Math.min(1, sleepNum / SLEEP_GOAL);

  const dayLabel = new Date().toLocaleDateString("en-US", {
    weekday:"long", month:"short", day:"numeric"
  });

  if (!ready) return (
    <div style={{ background:C.bg, minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:22, letterSpacing:5, color:C.muted }}>
        LOADING
      </div>
    </div>
  );

  return (
    <div style={{ background:C.bg, minHeight:"100vh", color:C.text, fontFamily:"'Barlow Condensed',sans-serif", padding:"24px 16px 56px", maxWidth:460, margin:"0 auto" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@300;400;500;600;700&family=JetBrains+Mono:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        body { background:${C.bg} !important; }
        input { outline:none; }
        button { cursor:pointer; }
        @keyframes slideIn {
          from { opacity:0; transform:translateY(10px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity:0; }
          to   { opacity:1; }
        }
        @keyframes popIn {
          0%   { opacity:0; transform:scale(0.85); }
          65%  { transform:scale(1.04); }
          100% { opacity:1; transform:scale(1); }
        }
        @keyframes pulse {
          0%,100% { opacity:1; }
          50%      { opacity:0.5; }
        }
        .habit-row:hover { filter:brightness(1.08); }
        .btn-primary {
          width:100%; padding:13px;
          background:${C.accent}; border:none; border-radius:10px;
          color:#fff; font-family:'Barlow Condensed',sans-serif;
          font-size:15px; font-weight:600; letter-spacing:2px;
          transition:all 0.2s ease;
        }
        .btn-primary:hover { background:#ea6a0a; transform:translateY(-1px); }
        .btn-primary:active { transform:translateY(0); opacity:0.9; }
        .btn-ghost {
          padding:13px 18px; background:transparent;
          border:1px solid ${C.border}; border-radius:10px;
          color:${C.muted}; font-family:'Barlow Condensed',sans-serif;
          font-size:15px; font-weight:500; letter-spacing:1px;
          transition:all 0.2s ease;
        }
        .btn-ghost:hover { border-color:${C.borderHi}; color:${C.text}; }
      `}</style>

      {/* ── Completion Overlay ── */}
      {showComplete && (
        <div onClick={() => setShowComplete(false)} style={{
          position:"fixed", inset:0, background:"rgba(8,9,10,0.92)",
          display:"flex", alignItems:"center", justifyContent:"center",
          zIndex:200, cursor:"pointer", animation:"fadeIn 0.3s ease",
        }}>
          <div style={{ textAlign:"center", animation:"popIn 0.4s ease" }}>
            <div style={{ fontSize:88, lineHeight:1 }}>🔥</div>
            <div style={{ fontSize:48, fontWeight:700, color:C.accent, letterSpacing:6, marginTop:16 }}>
              ALL DONE
            </div>
            <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10, color:C.muted, marginTop:10, letterSpacing:2 }}>
              TAP TO CLOSE
            </div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:32, animation:"slideIn 0.4s ease" }}>
        <div>
          <div style={{ fontSize:62, fontWeight:700, lineHeight:0.88, letterSpacing:2, color:C.accent }}>LOCK</div>
          <div style={{ fontSize:62, fontWeight:700, lineHeight:0.88, letterSpacing:2, color:C.text }}>IN.</div>
          <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10, color:C.muted, letterSpacing:1.5, marginTop:12 }}>
            {dayLabel.toUpperCase()}
          </div>
        </div>
        <div style={{ textAlign:"right", paddingTop:4 }}>
          <div style={{ fontSize:72, fontWeight:300, lineHeight:1, color:C.accent, letterSpacing:-2 }}>{daysLeft()}</div>
          <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9, color:C.muted, letterSpacing:1, lineHeight:1.7 }}>
            DAYS TO<br/>JUNE 1ST
          </div>
        </div>
      </div>

      {/* ── Stats ── */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:28, animation:"slideIn 0.4s ease 0.05s both" }}>
        <Card highlight={displayStreak > 0}>
          <div style={{ fontSize:46, fontWeight:700, lineHeight:1, color: displayStreak > 0 ? C.accent : C.text }}>
            {displayStreak} <span style={{ fontSize:28 }}>🔥</span>
          </div>
          <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9, color:C.muted, marginTop:6, letterSpacing:1 }}>
            DAY STREAK
          </div>
        </Card>
        <Card highlight={allDone}>
          <div style={{ fontSize:46, fontWeight:700, lineHeight:1, color: allDone ? C.accent : C.text }}>
            {done}<span style={{ fontSize:22, color:C.muted, fontWeight:400 }}>/{total}</span>
          </div>
          <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9, color:C.muted, marginTop:6, letterSpacing:1 }}>
            TODAY DONE
          </div>
        </Card>
      </div>

      {/* ── Daily Habits ── */}
      <div style={{ marginBottom:28, animation:"slideIn 0.4s ease 0.1s both" }}>
        <SectionLabel>Daily Grind</SectionLabel>
        {CORE_HABITS.map((h, i) => (
          <HabitRow
            key={h.id}
            label={h.label}
            cat={h.cat}
            done={!!habits[h.id]}
            onToggle={() => toggleHabit(h.id)}
            index={i}
          />
        ))}
      </div>

      {/* ── Custom Tasks ── */}
      <div style={{ marginBottom:28, animation:"slideIn 0.4s ease 0.15s both" }}>
        <SectionLabel
          action={
            <button
              onClick={() => { setAddingTask(true); setTimeout(() => inputRef.current?.focus(), 50); }}
              style={{
                background:"transparent", border:`1px solid ${C.border}`,
                borderRadius:6, padding:"4px 10px",
                color:C.muted, fontFamily:"'Barlow Condensed',sans-serif",
                fontSize:12, letterSpacing:1, transition:"all 0.2s",
              }}
              onMouseEnter={e => { e.target.style.borderColor=C.accent; e.target.style.color=C.accent; }}
              onMouseLeave={e => { e.target.style.borderColor=C.border; e.target.style.color=C.muted; }}
            >
              + ADD TASK
            </button>
          }
        >
          Custom Tasks
        </SectionLabel>

        {customHabits.length === 0 && !addingTask && (
          <div style={{
            padding:"20px 14px", border:`1px dashed ${C.border}`,
            borderRadius:10, textAlign:"center",
            fontFamily:"'JetBrains Mono',monospace", fontSize:11, color:C.muted,
            lineHeight:1.7,
          }}>
            No custom tasks yet.<br/>
            <span style={{ color:C.accent, cursor:"pointer" }} onClick={() => { setAddingTask(true); setTimeout(() => inputRef.current?.focus(), 50); }}>
              + Add one
            </span>
          </div>
        )}

        {customHabits.map((h, i) => (
          <HabitRow
            key={h.id}
            label={h.label}
            cat="CUSTOM"
            done={!!habits[h.id]}
            onToggle={() => toggleHabit(h.id)}
            onRemove={() => removeCustom(h.id)}
            index={i}
          />
        ))}

        {addingTask && (
          <div style={{ display:"flex", gap:8, marginTop:8, animation:"slideIn 0.2s ease" }}>
            <input
              ref={inputRef}
              value={newTask}
              onChange={e => setNewTask(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") submitCustom(); if (e.key === "Escape") { setAddingTask(false); setNewTask(""); } }}
              placeholder="e.g. Meditate 10 min"
              style={{
                flex:1, padding:"11px 14px",
                background:C.surface, border:`1px solid ${C.accent}`,
                borderRadius:10, color:C.text,
                fontFamily:"'Barlow Condensed',sans-serif", fontSize:15, letterSpacing:0.5,
              }}
            />
            <button onClick={submitCustom} className="btn-primary" style={{ width:"auto", padding:"11px 18px", fontSize:14 }}>
              ADD
            </button>
            <button onClick={() => { setAddingTask(false); setNewTask(""); }} className="btn-ghost" style={{ padding:"11px 14px" }}>
              ✕
            </button>
          </div>
        )}
      </div>

      {/* ── Weekly Runs ── */}
      <div style={{ marginBottom:28, animation:"slideIn 0.4s ease 0.2s both" }}>
        <SectionLabel>Weekly Runs</SectionLabel>
        <Card highlight={runs >= RUN_TARGET}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
            <div>
              <div style={{ fontSize:20, fontWeight:600, letterSpacing:1 }}>Run this week</div>
              <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9, color:C.muted, marginTop:4 }}>3× MINIMUM</div>
            </div>
            <div style={{ fontSize:52, fontWeight:300, lineHeight:1, color: runs >= RUN_TARGET ? C.accent : C.text }}>
              {runs}<span style={{ fontSize:24, color:C.muted }}>/{RUN_TARGET}</span>
            </div>
          </div>
          <div style={{ display:"flex", gap:6, marginBottom:14 }}>
            {[0,1,2].map(i => (
              <div key={i} style={{
                flex:1, height:5, borderRadius:3,
                background: i < runs ? C.accent : C.faint,
                transition:"background 0.3s ease",
              }} />
            ))}
          </div>
          <button onClick={addRun} className="btn-primary" style={{ background: runs >= RUN_TARGET ? C.accentDim : C.accent }}>
            {runs >= RUN_TARGET ? "✓ WEEK COMPLETE — TAP TO RESET" : "+ LOG A RUN"}
          </button>
        </Card>
      </div>

      {/* ── Sleep Logger ── */}
      <div style={{ marginBottom:28, animation:"slideIn 0.4s ease 0.25s both" }}>
        <SectionLabel>Sleep</SectionLabel>
        <Card highlight={sleepOk}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
            <div>
              <div style={{ fontSize:20, fontWeight:600, letterSpacing:1 }}>Hours slept</div>
              <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9, color:C.muted, marginTop:4 }}>
                {sleepOk ? "✓ GOAL MET" : `GOAL: ${SLEEP_GOAL} HRS`}
              </div>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:4 }}>
              <input
                type="number"
                min="0"
                max="24"
                step="0.5"
                value={sleepHours}
                onChange={e => handleSleep(e.target.value)}
                placeholder="0"
                style={{
                  width:72, padding:"8px 10px",
                  background:C.faint, border:`1px solid ${sleepOk ? C.accentDim : C.border}`,
                  borderRadius:8, color: sleepOk ? C.accent : C.text,
                  fontFamily:"'JetBrains Mono',monospace", fontSize:22, fontWeight:500,
                  textAlign:"center", transition:"all 0.2s",
                }}
              />
              <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:11, color:C.muted }}>hrs</span>
            </div>
          </div>
          <div style={{ background:C.faint, borderRadius:3, height:5, overflow:"hidden" }}>
            <div style={{
              width:`${sleepPct * 100}%`, height:"100%", borderRadius:3,
              background: sleepOk ? C.green : sleepNum > 5 ? "#f59e0b" : C.muted,
              transition:"width 0.4s ease, background 0.3s ease",
            }} />
          </div>
        </Card>
      </div>

      {/* ── 7-Day Chart ── */}
      <div style={{ marginBottom:28, animation:"slideIn 0.4s ease 0.3s both" }}>
        <SectionLabel>Last 7 Days</SectionLabel>
        <Card>
          <ResponsiveContainer width="100%" height={100}>
            <BarChart data={chart} barCategoryGap="38%">
              <XAxis dataKey="day" axisLine={false} tickLine={false}
                tick={{ fill:C.muted, fontFamily:"JetBrains Mono,monospace", fontSize:10 }} />
              <Bar dataKey="cnt" maxBarSize={28} radius={[4,4,0,0]}>
                {chart.map((c, i) => (
                  <Cell key={i} fill={c.isToday ? C.accent : c.cnt > 0 ? C.accentDim : C.faint} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display:"flex", gap:14, paddingLeft:4, marginTop:8 }}>
            {[[C.accent,"Today"],[C.accentDim,"Done"],[C.faint,"Missed"]].map(([col,lbl]) => (
              <div key={lbl} style={{ display:"flex", alignItems:"center", gap:5 }}>
                <div style={{ width:8, height:8, background:col, borderRadius:2, border: col===C.faint ? `1px solid ${C.border}`:""}} />
                <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9, color:C.muted, letterSpacing:0.5 }}>{lbl}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ── Footer ── */}
      <div style={{ textAlign:"center", paddingTop:16, borderTop:`1px solid ${C.border}` }}>
        <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10, color:C.faint, letterSpacing:1.5 }}>
          {daysLeft()} days to gym fit
        </div>
      </div>
    </div>
  );
}
