"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { BarChart, Bar, XAxis, Cell, ResponsiveContainer } from "recharts";

// ─── Constants ───────────────────────────────────────────────────────────────

const HABITS = [
  { id: "gym",      label: "GYM SESSION",  cat: "FITNESS" },
  { id: "pushups",  label: "PUSHUPS",      cat: "FITNESS" },
  { id: "pullups",  label: "PULLUPS",      cat: "FITNESS" },
  { id: "read",     label: "READ 15 MIN",  cat: "MIND"    },
  { id: "study",    label: "STUDY 1 HR",   cat: "SCHOOL"  },
  { id: "hw",       label: "HOMEWORK 1 HR",cat: "SCHOOL"  },
  { id: "projects", label: "PROJECTS 1 HR",cat: "SCHOOL"  },
];

const RUN_TARGET   = 3;
const SOCIAL_LIMIT = 2 * 3600; // seconds
const JUNE_1       = new Date("2026-06-01T00:00:00");
const O            = "#FF4500";
const O2           = "#662200";
const R            = "#ff2222";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function weekKey() {
  const d   = new Date();
  const day = d.getDay();
  const mon = new Date(d);
  mon.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
  return mon.toISOString().slice(0, 10);
}

function daysLeft() {
  return Math.max(0, Math.ceil((JUNE_1 - new Date()) / 86400000));
}

function fmtTime(s) {
  const h   = Math.floor(s / 3600);
  const m   = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0)
    return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

// ─── LocalStorage persistence ─────────────────────────────────────────────────

const PFX = "lockin:";

function lget(key) {
  try {
    const raw = localStorage.getItem(PFX + key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function lset(key, val) {
  try {
    localStorage.setItem(PFX + key, JSON.stringify(val));
  } catch {}
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function LockIn() {
  const today = todayKey();
  const week  = weekKey();

  const [habits,       setHabits]       = useState({});
  const [runs,         setRuns]         = useState(0);
  const [socialSecs,   setSocialSecs]   = useState(0);
  const [socialOn,     setSocialOn]     = useState(false);
  const [streak,       setStreak]       = useState(0);
  const [chart,        setChart]        = useState([]);
  const [ready,        setReady]        = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const timerRef = useRef(null);

  // ── Load from localStorage ───────────────────────────────────────────────
  useEffect(() => {
    const day = lget("day:" + today) || { habits: {}, social: 0 };
    const wk  = lget("week:" + week) || { runs: 0 };

    setHabits(day.habits || {});
    setSocialSecs(day.social || 0);
    setRuns(wk.runs || 0);

    // streak: consecutive fully-completed days before today
    let s = 0;
    const chk = new Date();
    chk.setDate(chk.getDate() - 1);
    for (let i = 0; i < 90; i++) {
      const d = lget("day:" + chk.toISOString().slice(0, 10));
      if (d && Object.values(d.habits || {}).filter(Boolean).length >= HABITS.length) {
        s++;
      } else {
        break;
      }
      chk.setDate(chk.getDate() - 1);
    }
    setStreak(s);

    // chart: last 7 days
    const bars = [];
    for (let i = 6; i >= 0; i--) {
      const dt  = new Date();
      dt.setDate(dt.getDate() - i);
      const ds  = dt.toISOString().slice(0, 10);
      const dd  = ds === today ? day : lget("day:" + ds);
      const cnt = dd ? Object.values(dd.habits || {}).filter(Boolean).length : 0;
      bars.push({
        day: ["Su","Mo","Tu","We","Th","Fr","Sa"][dt.getDay()],
        cnt,
        isToday: ds === today,
      });
    }
    setChart(bars);
    setReady(true);
  }, []);

  // ── Social timer ──────────────────────────────────────────────────────────
  useEffect(() => {
    clearInterval(timerRef.current);
    if (socialOn) {
      timerRef.current = setInterval(() => setSocialSecs((s) => s + 1), 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [socialOn]);

  // persist social secs (debounced)
  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => {
      const d = lget("day:" + today) || { habits, social: 0 };
      d.social = socialSecs;
      lset("day:" + today, d);
    }, 1500);
    return () => clearTimeout(t);
  }, [socialSecs, ready]);

  // ── Toggle habit ─────────────────────────────────────────────────────────
  const toggleHabit = useCallback(
    (id) => {
      setHabits((prev) => {
        const next = { ...prev, [id]: !prev[id] };
        const d    = lget("day:" + today) || { habits: {}, social: socialSecs };
        d.habits   = next;
        lset("day:" + today, d);
        const cnt  = Object.values(next).filter(Boolean).length;
        setChart((c) => c.map((b) => (b.isToday ? { ...b, cnt } : b)));
        if (cnt === HABITS.length) setShowComplete(true);
        return next;
      });
    },
    [today, socialSecs]
  );

  // ── Log run ───────────────────────────────────────────────────────────────
  const addRun = () => {
    const n = runs < RUN_TARGET ? runs + 1 : 0;
    setRuns(n);
    lset("week:" + week, { runs: n });
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const done          = Object.values(habits).filter(Boolean).length;
  const allDone       = done === HABITS.length;
  const remaining     = Math.max(0, SOCIAL_LIMIT - socialSecs);
  const pct           = Math.min(1, socialSecs / SOCIAL_LIMIT);
  const overLimit     = socialSecs > SOCIAL_LIMIT;
  const displayStreak = allDone ? streak + 1 : streak;
  const dayLabel      = new Date()
    .toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })
    .toUpperCase();

  if (!ready) {
    return (
      <div style={{ background:"#090909", minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center" }}>
        <div style={{ color:O, fontFamily:"'Bebas Neue',sans-serif", fontSize:28, letterSpacing:6 }}>
          LOADING...
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: "#090909",
      minHeight: "100vh",
      color: "#fff",
      fontFamily: "'Bebas Neue', sans-serif",
      padding: "env(safe-area-inset-top, 20px) 16px 48px",
      paddingTop: "max(env(safe-area-inset-top), 20px)",
      maxWidth: 480,
      margin: "0 auto",
    }}>

      {/* ── Completion Overlay ── */}
      {showComplete && (
        <div
          onClick={() => setShowComplete(false)}
          style={{
            position: "fixed", inset: 0,
            background: "rgba(0,0,0,.88)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 100, cursor: "pointer",
          }}
        >
          <div style={{ textAlign: "center", animation: "pop .4s ease" }}>
            <div style={{ fontSize: 90, lineHeight: 1 }}>🔥</div>
            <div style={{ fontSize: 56, color: O, letterSpacing: 5, marginTop: 14 }}>ALL DONE</div>
            <div style={{ fontFamily: "DM Mono", fontSize: 11, color: "#555", marginTop: 10, letterSpacing: 2 }}>
              TAP TO CLOSE
            </div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 28 }}>
        <div>
          <div style={{ fontSize: 60, lineHeight: 0.88, letterSpacing: 5, color: O }}>LOCK</div>
          <div style={{ fontSize: 60, lineHeight: 0.88, letterSpacing: 5 }}>IN.</div>
          <div style={{ fontFamily: "DM Mono, monospace", fontSize: 10, color: "#2e2e2e", letterSpacing: 2, marginTop: 10 }}>
            {dayLabel}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 66, lineHeight: 1, color: O }}>{daysLeft()}</div>
          <div style={{ fontFamily: "DM Mono, monospace", fontSize: 10, color: "#2e2e2e", letterSpacing: 1, lineHeight: 1.6 }}>
            DAYS TO<br />JUNE 1ST
          </div>
        </div>
      </div>

      {/* ── Stats ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
        {[
          { val: `${displayStreak}🔥`, label: "DAY STREAK",  active: displayStreak > 0 },
          { val: `${done}/${HABITS.length}`,  label: "TODAY DONE",  active: allDone },
        ].map((s, i) => (
          <div key={i} style={{
            background: "#111",
            border: `1px solid ${s.active ? O2 : "#1d1d1d"}`,
            borderRadius: 6,
            padding: "16px 14px",
            animation: "fadeIn .4s ease",
          }}>
            <div style={{ fontSize: 44, lineHeight: 1, color: s.active ? O : "#e0e0e0" }}>{s.val}</div>
            <div style={{ fontFamily: "DM Mono, monospace", fontSize: 9, color: "#333", marginTop: 6, letterSpacing: 1 }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* ── Daily Habits ── */}
      <SectionLabel>DAILY GRIND</SectionLabel>
      <div style={{ marginBottom: 24 }}>
        {HABITS.map((h) => {
          const on = !!habits[h.id];
          return (
            <div
              key={h.id}
              onClick={() => toggleHabit(h.id)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "13px 14px", marginBottom: 6,
                background: on ? "#130700" : "#0f0f0f",
                border: `1px solid ${on ? O : "#1d1d1d"}`,
                borderRadius: 5, cursor: "pointer",
                transition: "all .15s",
              }}
            >
              <div>
                <div style={{ fontSize: 19, letterSpacing: 2, color: on ? O : "#ccc" }}>{h.label}</div>
                <div style={{ fontFamily: "DM Mono, monospace", fontSize: 9, color: "#333", marginTop: 3, letterSpacing: 1 }}>
                  {h.cat}
                </div>
              </div>
              <div style={{
                width: 26, height: 26, borderRadius: 3, flexShrink: 0,
                background: on ? O : "transparent",
                border: `2px solid ${on ? O : "#2a2a2a"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, color: "#fff",
                transition: "all .15s",
              }}>
                {on ? "✓" : ""}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Weekly Runs ── */}
      <SectionLabel>WEEKLY RUNS</SectionLabel>
      <div style={{ background: "#0f0f0f", border: "1px solid #1d1d1d", borderRadius: 5, padding: 16, marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 22, letterSpacing: 2 }}>RUN THIS WEEK</div>
            <div style={{ fontFamily: "DM Mono, monospace", fontSize: 9, color: "#333", marginTop: 3 }}>3× MINIMUM</div>
          </div>
          <div style={{ fontSize: 48, lineHeight: 1, color: runs >= RUN_TARGET ? O : "#fff" }}>
            {runs}/{RUN_TARGET}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{
              flex: 1, height: 7, borderRadius: 2,
              background: i < runs ? O : "#1d1d1d",
              transition: "background .2s",
            }} />
          ))}
        </div>
        <button
          onClick={addRun}
          style={{
            width: "100%", padding: "11px 0",
            background: runs >= RUN_TARGET ? O2 : O,
            border: "none", borderRadius: 4,
            color: "#fff", fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 17, letterSpacing: 3,
          }}
        >
          {runs >= RUN_TARGET ? "✓ WEEK COMPLETE — TAP TO RESET" : "+ LOG A RUN"}
        </button>
      </div>

      {/* ── Social Media Timer ── */}
      <SectionLabel>SOCIAL MEDIA</SectionLabel>
      <div style={{
        background: "#0f0f0f",
        border: `1px solid ${overLimit ? R : "#1d1d1d"}`,
        borderRadius: 5, padding: 16, marginBottom: 24,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div>
            <div style={{
              fontSize: 22, letterSpacing: 2,
              color: overLimit ? R : "#fff",
              animation: overLimit ? "pulse 1.2s infinite" : "none",
            }}>
              {overLimit ? "OVER LIMIT ⚠" : "TIME LEFT"}
            </div>
            <div style={{ fontFamily: "DM Mono, monospace", fontSize: 9, color: "#333", marginTop: 3 }}>
              2 HR DAILY CAP
            </div>
          </div>
          <div style={{
            fontFamily: "DM Mono, monospace", fontSize: 32, fontWeight: 500,
            color: overLimit ? R : O, letterSpacing: -1,
          }}>
            {fmtTime(remaining)}
          </div>
        </div>
        <div style={{ background: "#1d1d1d", borderRadius: 2, height: 5, marginBottom: 14, overflow: "hidden" }}>
          <div style={{
            width: `${Math.min(100, pct * 100)}%`, height: "100%", borderRadius: 2,
            background: pct > 0.9 ? R : pct > 0.7 ? "#ff8c00" : O,
            transition: "width 1s linear",
          }} />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setSocialOn((v) => !v)}
            style={{
              flex: 1, padding: "11px 0",
              background: socialOn ? "#1a0000" : O,
              border: socialOn ? `1px solid ${R}` : "none",
              borderRadius: 4, color: "#fff",
              fontFamily: "'Bebas Neue', sans-serif", fontSize: 17, letterSpacing: 3,
            }}
          >
            {socialOn ? "⏸  PAUSE" : "▶  START TRACKING"}
          </button>
          <button
            onClick={() => { setSocialSecs(0); setSocialOn(false); }}
            style={{
              padding: "11px 18px",
              background: "transparent",
              border: "1px solid #1d1d1d",
              borderRadius: 4, color: "#444",
              fontFamily: "'Bebas Neue', sans-serif", fontSize: 17, letterSpacing: 2,
            }}
          >
            RESET
          </button>
        </div>
      </div>

      {/* ── 7-Day Chart ── */}
      <SectionLabel>LAST 7 DAYS</SectionLabel>
      <div style={{ background: "#0f0f0f", border: "1px solid #1d1d1d", borderRadius: 5, padding: "16px 10px 10px", marginBottom: 24 }}>
        <ResponsiveContainer width="100%" height={110}>
          <BarChart data={chart} barCategoryGap="35%">
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#3a3a3a", fontFamily: "DM Mono, monospace", fontSize: 10 }}
            />
            <Bar dataKey="cnt" maxBarSize={32} radius={[3, 3, 0, 0]}>
              {chart.map((c, i) => (
                <Cell key={i} fill={c.isToday ? O : c.cnt > 0 ? O2 : "#1a1a1a"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div style={{ display: "flex", gap: 16, paddingLeft: 8, marginTop: 4 }}>
          {[[O, "TODAY"], [O2, "DONE"], ["#1a1a1a", "MISSED"]].map(([col, lbl]) => (
            <div key={lbl} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{
                width: 8, height: 8, background: col, borderRadius: 2,
                border: col === "#1a1a1a" ? "1px solid #333" : "none",
              }} />
              <div style={{ fontFamily: "DM Mono, monospace", fontSize: 9, color: "#333", letterSpacing: 1 }}>{lbl}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Footer ── */}
      <div style={{ textAlign: "center", paddingTop: 16, borderTop: "1px solid #111" }}>
        <div style={{ fontFamily: "DM Mono, monospace", fontSize: 10, color: "#222", letterSpacing: 2 }}>
          {daysLeft()} DAYS TO GYM FIT — KEEP GOING
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: 12, letterSpacing: 4, color: "#2e2e2e",
      marginBottom: 10, borderBottom: "1px solid #111", paddingBottom: 8,
    }}>
      — {children}
    </div>
  );
}
