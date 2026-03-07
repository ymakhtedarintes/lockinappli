"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { BarChart, Bar, XAxis, Cell, ResponsiveContainer } from "recharts";
import { supabase } from "../lib/supabase";
import { dbGet, dbSet } from "../lib/db";
import Auth from "./Auth";

/* ══════════ PALETTE (ARCTIC STEALTH) ══════════════════════════════════════ */
const C = {
  bg: "#050b14", surface: "#0b1221", border: "#1a2436", borderHi: "#2a3b59",
  accent: "#00f0ff", accentDim: "#008c99", accentGlow: "rgba(0, 240, 255, 0.12)",
  text: "#f8fafc", muted: "#64748b", faint: "#0f172a",
  danger: "#fb7185", green: "#10b981",
};

/* ══════════ DATA ══════════════════════════════════════════════════════════ */
const CORE_HABITS = [
  { id:"pushups",  label:"Pushups",          cat:"FITNESS" },
  { id:"pullups",  label:"Pullups",           cat:"FITNESS" },
  { id:"read",     label:"Read 15 min",       cat:"MIND"    },
  { id:"study",    label:"Study 1 hr",        cat:"SCHOOL"  },
  { id:"hw",       label:"Homework 1 hr",     cat:"SCHOOL"  },
  { id:"projects", label:"Projects 1 hr",     cat:"SCHOOL"  },
];
const RUN_TARGET = 3;
const GYM_TARGET = 5;
const JUNE_1 = new Date("2026-06-01T00:00:00");

const PPL_DAYS = [
  { id:"chest_tri",      label:"Chest & Triceps",  short:"Chest / Tri",  day:1, muscles:["chest","triceps"],  color:"#00f0ff",
    suggestions:["Bench Press","Incline DB Press","Cable Fly","Tricep Pushdown","Overhead Extension","Skull Crusher"] },
  { id:"back_bi",        label:"Back & Biceps",     short:"Back / Bi",    day:2, muscles:["back","biceps"],    color:"#818cf8",
    suggestions:["Lat Pulldown","Barbell Row","Seated Row","Bicep Curl","Hammer Curl","Face Pull"] },
  { id:"legs_shoulders", label:"Legs & Shoulders",  short:"Legs / Shld",  day:3, muscles:["legs","shoulders"], color:"#34d399",
    suggestions:["Squat","Leg Press","Romanian Deadlift","Leg Curl","Shoulder Press","Lateral Raise","Calf Raise"] },
  { id:"chest_back",     label:"Chest & Back",      short:"Chest / Back", day:4, muscles:["chest","back"],    color:"#c084fc",
    suggestions:["Incline DB Press","Pull-ups","Dips","Cable Row","Pec Deck","T-Bar Row"] },
  { id:"abs_flex",       label:"Abs & Flex",        short:"Abs / Flex",   day:5, muscles:["abs"],             color:"#f472b6",
    suggestions:["Crunches","Plank","Leg Raise","Cable Crunch","Russian Twist","Mountain Climbers"] },
];
const MUSCLE_GROUPS = ["chest","back","biceps","triceps","shoulders","legs","abs"];

/* ══════════ HELPERS ════════════════════════════════════════════════════════ */
function todayKey(){ return new Date().toISOString().slice(0,10); }
function weekKey(){ const d=new Date(),day=d.getDay(),m=new Date(d); m.setDate(d.getDate()-day+(day===0?-6:1)); return m.toISOString().slice(0,10); }
function daysLeft(){ return Math.max(0,Math.ceil((JUNE_1-new Date())/86400000)); }
function mkDate(y,mo,d){ return `${y}-${String(mo+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`; }
function fmtMonth(y,m){ return new Date(y,m,1).toLocaleDateString("en-US",{month:"long",year:"numeric"}); }
function uid(){ return Math.random().toString(36).slice(2,9); }

function muscleColor(p){
  const t = Math.min(1, Math.max(0, p / 100));
  if(t < 0.02) return C.border;
  // Interpolate from deep border blue to bright cyan
  const r = Math.round(26 + (0 - 26) * t);
  const g = Math.round(36 + (240 - 36) * t);
  const b = Math.round(54 + (255 - 54) * t);
  return `rgb(${r},${g},${b})`;
}
function calcMuscleProgress(totals){
  const MAX=300,out={};
  MUSCLE_GROUPS.forEach(m=>{ out[m]=Math.min(100,((totals[m]||0)/MAX)*100); });
  return out;
}

/* ══════════ SHARED UI ══════════════════════════════════════════════════════ */
function SectionLabel({ children, action }){
  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
      <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:12,letterSpacing:3,color:C.muted,textTransform:"uppercase"}}>{children}</div>
      {action}
    </div>
  );
}
function Card({ children, highlight, style={}, className="" }){
  return (
    <div className={`hover-lift ${className}`} style={{background:highlight?C.accentGlow:C.surface,border:`1px solid ${highlight?C.accentDim:C.border}`,boxShadow:highlight?`0 0 20px ${C.accentGlow}`:"none",borderRadius:14,padding:18,...style}}>
      {children}
    </div>
  );
}

/* ══════════ CALENDAR MODAL ════════════════════════════════════════════════ */
function CalendarModal({ habitId, habitLabel, onClose }){
  const todayStr=todayKey(),now=new Date();
  const [yr,setYr]=useState(now.getFullYear());
  const [mo,setMo]=useState(now.getMonth());
  const [data,setData]=useState({});
  const [loading,setLoading]=useState(false);

  useEffect(()=>{
    let cancelled=false;
    (async()=>{
      setLoading(true);
      const days=new Date(yr,mo+1,0).getDate(),d={};
      for(let i=1;i<=days;i++){
        const ds=mkDate(yr,mo,i),raw=await dbGet("day:"+ds);
        d[ds]=raw?.habits?.[habitId]??null;
      }
      if(!cancelled){ setData(d); setLoading(false); }
    })();
    return ()=>{ cancelled=true; };
  },[yr,mo,habitId]);

  const daysInMonth=new Date(yr,mo+1,0).getDate(),firstDow=new Date(yr,mo,1).getDay(),cells=[];
  for(let i=0;i<firstDow;i++) cells.push(null);
  for(let d=1;d<=daysInMonth;d++) cells.push(d);
  const canNext=yr<now.getFullYear()||(yr===now.getFullYear()&&mo<now.getMonth());
  const prevMo=()=>{ if(mo===0){setMo(11);setYr(y=>y-1);}else setMo(m=>m-1); };
  const nextMo=()=>{ if(!canNext)return; if(mo===11){setMo(0);setYr(y=>y+1);}else setMo(m=>m+1); };

  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(5,11,20,0.95)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:400,padding:"0 16px",animation:"fadeIn .2s ease"}}>
      <div onClick={e=>e.stopPropagation()} style={{background:C.surface,border:`1px solid ${C.borderHi}`,boxShadow:"0 20px 40px rgba(0,0,0,0.5)",borderRadius:16,padding:"20px 16px",width:"100%",maxWidth:340,animation:"popIn .25s cubic-bezier(0.175, 0.885, 0.32, 1.275)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:20,fontWeight:600,letterSpacing:1,color:C.text}}>{habitLabel}</div>
          <button onClick={onClose} className="btn-press" style={{background:"transparent",border:"none",color:C.muted,fontSize:26,lineHeight:1,cursor:"pointer",padding:"0 4px"}}>×</button>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <button onClick={prevMo} className="btn-press" style={{background:C.faint,border:`1px solid ${C.border}`,color:C.text,width:36,height:36,borderRadius:10,fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>‹</button>
          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.accent,letterSpacing:2}}>{fmtMonth(yr,mo).toUpperCase()}</div>
          <button onClick={nextMo} className="btn-press" style={{background:C.faint,border:`1px solid ${canNext?C.border:"transparent"}`,color:canNext?C.text:C.faint,width:36,height:36,borderRadius:10,fontSize:18,cursor:canNext?"pointer":"default",display:"flex",alignItems:"center",justifyContent:"center"}}>›</button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4,marginBottom:8}}>
          {["S","M","T","W","T","F","S"].map((d,i)=><div key={i} style={{textAlign:"center",fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:C.muted,paddingBottom:4}}>{d}</div>)}
        </div>
        {loading?(
          <div style={{textAlign:"center",padding:"30px 0",fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.muted}}>loading...</div>
        ):(
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4}}>
            {cells.map((day,i)=>{
              if(!day)return <div key={i}/>;
              const ds=mkDate(yr,mo,day),isToday=ds===todayStr,isPast=ds<todayStr,status=data[ds];
              let bg=C.faint,tc=C.muted,bc="transparent", shadow="none";
              if(status===true){bg=C.accentGlow; tc=C.accent; bc=C.accentDim; shadow=`0 0 8px ${C.accentGlow}`;}
              else if(isPast){bg="rgba(251,113,133,0.08)"; tc="#fb718588";}
              return <div key={i} style={{aspectRatio:"1",display:"flex",alignItems:"center",justifyContent:"center",background:bg,borderRadius:8,border:isToday?`1.5px solid ${C.text}`:`1px solid ${bc}`,boxShadow:shadow,fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:tc}}>{day}</div>;
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════ BODY MAP ═══════════════════════════════════════════════════════ */
function BodyMapSVG({ progress, view }){
  const mc=m=>muscleColor(progress[m]||0);
  const base=C.faint,ol=C.borderHi;
  const Sil=()=>(
    <>
      <circle cx={80} cy={22} r={17} fill={base} stroke={ol} strokeWidth={1}/>
      <rect x={73} y={38} width={14} height={14} rx={4} fill={base} stroke={ol} strokeWidth={1}/>
      <path d="M44,52 C32,54 26,68 26,80 L26,162 C26,168 32,172 40,172 L120,172 C128,172 134,168 134,162 L134,80 C134,68 128,54 116,52 Z" fill={base} stroke={ol} strokeWidth={1}/>
      <rect x={18} y={68} width={18} height={62} rx={9} fill={base} stroke={ol} strokeWidth={1}/>
      <rect x={124} y={68} width={18} height={62} rx={9} fill={base} stroke={ol} strokeWidth={1}/>
      <rect x={16} y={134} width={16} height={44} rx={8} fill={base} stroke={ol} strokeWidth={1}/>
      <rect x={128} y={134} width={16} height={44} rx={8} fill={base} stroke={ol} strokeWidth={1}/>
      <rect x={44} y={170} width={72} height={18} rx={4} fill={base} stroke={ol} strokeWidth={1}/>
      <rect x={44} y={186} width={30} height={70} rx={15} fill={base} stroke={ol} strokeWidth={1}/>
      <rect x={86} y={186} width={30} height={70} rx={15} fill={base} stroke={ol} strokeWidth={1}/>
      <rect x={47} y={260} width={24} height={50} rx={12} fill={base} stroke={ol} strokeWidth={1}/>
      <rect x={89} y={260} width={24} height={50} rx={12} fill={base} stroke={ol} strokeWidth={1}/>
    </>
  );
  if(view==="front") return (
    <svg viewBox="0 0 160 318" style={{width:"100%",height:"100%",filter:"drop-shadow(0 4px 12px rgba(0,0,0,0.5))"}}>
      <Sil/>
      <ellipse cx={38} cy={76} rx={16} ry={15} fill={mc("shoulders")} style={{transition:"fill .5s ease"}}/>
      <ellipse cx={122} cy={76} rx={16} ry={15} fill={mc("shoulders")} style={{transition:"fill .5s ease"}}/>
      <ellipse cx={64} cy={90} rx={18} ry={19} fill={mc("chest")} style={{transition:"fill .5s ease"}}/>
      <ellipse cx={96} cy={90} rx={18} ry={19} fill={mc("chest")} style={{transition:"fill .5s ease"}}/>
      <rect x={20} y={86} width={16} height={32} rx={8} fill={mc("biceps")} style={{transition:"fill .5s ease"}}/>
      <rect x={124} y={86} width={16} height={32} rx={8} fill={mc("biceps")} style={{transition:"fill .5s ease"}}/>
      {[0,1,2].map(row=>[0,1].map(col=>(
        <rect key={`${row}-${col}`} x={63+col*18} y={114+row*19} width={14} height={15} rx={4} fill={mc("abs")} style={{transition:"fill .5s ease"}}/>
      )))}
      <rect x={46} y={190} width={26} height={60} rx={13} fill={mc("legs")} style={{transition:"fill .5s ease"}}/>
      <rect x={88} y={190} width={26} height={60} rx={13} fill={mc("legs")} style={{transition:"fill .5s ease"}}/>
    </svg>
  );
  return (
    <svg viewBox="0 0 160 318" style={{width:"100%",height:"100%",filter:"drop-shadow(0 4px 12px rgba(0,0,0,0.5))"}}>
      <Sil/>
      <path d="M74,50 L86,50 L120,68 L80,80 L40,68 Z" fill={mc("back")} style={{transition:"fill .5s ease"}}/>
      <path d="M42,72 C30,82 26,105 28,130 L44,138 L44,90 Z" fill={mc("back")} style={{transition:"fill .5s ease"}}/>
      <path d="M118,72 C130,82 134,105 132,130 L116,138 L116,90 Z" fill={mc("back")} style={{transition:"fill .5s ease"}}/>
      <rect x={20} y={86} width={16} height={32} rx={8} fill={mc("triceps")} style={{transition:"fill .5s ease"}}/>
      <rect x={124} y={86} width={16} height={32} rx={8} fill={mc("triceps")} style={{transition:"fill .5s ease"}}/>
      <ellipse cx={59} cy={184} rx={14} ry={12} fill={mc("legs")} style={{transition:"fill .5s ease"}}/>
      <ellipse cx={101} cy={184} rx={14} ry={12} fill={mc("legs")} style={{transition:"fill .5s ease"}}/>
      <rect x={46} y={196} width={26} height={58} rx={13} fill={mc("legs")} style={{transition:"fill .5s ease"}}/>
      <rect x={88} y={196} width={26} height={58} rx={13} fill={mc("legs")} style={{transition:"fill .5s ease"}}/>
      <rect x={47} y={260} width={24} height={46} rx={12} fill={mc("legs")} style={{transition:"fill .5s ease"}}/>
      <rect x={89} y={260} width={24} height={46} rx={12} fill={mc("legs")} style={{transition:"fill .5s ease"}}/>
    </svg>
  );
}

/* ══════════ EXERCISE CARD ══════════════════════════════════════════════════ */
function ExerciseCard({ exercise, accentColor, onAddSet, onRemoveSet, onRemove }){
  const [reps,setReps]=useState("10");
  const [weight,setWeight]=useState("");
  const [adding,setAdding]=useState(false);
  return (
    <Card className="hover-lift" style={{marginBottom:12, borderColor:C.borderHi}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:exercise.sets.length>0?12:0}}>
        <div>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:18,fontWeight:600,letterSpacing:0.5}}>{exercise.name}</div>
          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:accentColor,marginTop:2}}>{exercise.sets.length} SET{exercise.sets.length!==1?"S":""}</div>
        </div>
        <button onClick={onRemove} style={{background:"transparent",border:"none",color:C.muted,fontSize:22,cursor:"pointer",padding:"0 4px",lineHeight:1,transition:"color .2s"}} onMouseEnter={e=>e.target.style.color=C.danger} onMouseLeave={e=>e.target.style.color=C.muted}>×</button>
      </div>
      {exercise.sets.length>0&&(
        <div style={{marginBottom:12}}>
          <div style={{display:"grid",gridTemplateColumns:"28px 1fr 1fr 24px",gap:"4px 10px",marginBottom:6}}>
            {["#","REPS","KG",""].map((h,i)=><div key={i} style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:C.muted,letterSpacing:1}}>{h}</div>)}
          </div>
          {exercise.sets.map((s,i)=>(
            <div key={s.id} style={{display:"grid",gridTemplateColumns:"28px 1fr 1fr 24px",gap:"4px 10px",padding:"8px 0",borderTop:`1px solid ${C.border}`}}>
              <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:C.muted}}>{i+1}</div>
              <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:14,color:C.text}}>{s.reps}</div>
              <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:14,color:C.text}}>{s.weight||"–"}</div>
              <button onClick={()=>onRemoveSet(s.id)} className="btn-press" style={{background:"transparent",border:"none",color:C.muted,fontSize:16,cursor:"pointer",padding:0,lineHeight:1,transition:"color .2s"}} onMouseEnter={e=>e.target.style.color=C.danger} onMouseLeave={e=>e.target.style.color=C.muted}>×</button>
            </div>
          ))}
        </div>
      )}
      {adding?(
        <div style={{display:"flex",gap:8,alignItems:"center",marginTop:exercise.sets.length>0?0:12}}>
          <input value={reps} onChange={e=>setReps(e.target.value)} placeholder="Reps" type="number" style={{width:60,padding:"10px",background:C.faint,border:`1px solid ${C.borderHi}`,borderRadius:8,color:C.text,fontFamily:"'JetBrains Mono',monospace",fontSize:14,outline:"none",textAlign:"center",transition:"border-color .2s"}} onFocus={e=>e.target.style.borderColor=accentColor} onBlur={e=>e.target.style.borderColor=C.borderHi}/>
          <input value={weight} onChange={e=>setWeight(e.target.value)} placeholder="kg" type="number" style={{width:60,padding:"10px",background:C.faint,border:`1px solid ${C.borderHi}`,borderRadius:8,color:C.text,fontFamily:"'JetBrains Mono',monospace",fontSize:14,outline:"none",textAlign:"center",transition:"border-color .2s"}} onFocus={e=>e.target.style.borderColor=accentColor} onBlur={e=>e.target.style.borderColor=C.borderHi}/>
          <button onClick={()=>{onAddSet(Number(reps)||0,Number(weight)||0);setAdding(false);}} className="btn-press" style={{flex:1,background:accentColor,border:"none",borderRadius:8,padding:"10px 0",color:C.bg,fontFamily:"'Barlow Condensed',sans-serif",fontSize:15,fontWeight:700,cursor:"pointer",letterSpacing:1,boxShadow:`0 4px 12px ${accentColor}44`}}>LOG</button>
          <button onClick={()=>setAdding(false)} className="btn-press" style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 12px",color:C.muted,fontFamily:"'Barlow Condensed',sans-serif",fontSize:15,cursor:"pointer"}}>✕</button>
        </div>
      ):(
        <button onClick={()=>setAdding(true)} className="btn-press" style={{width:"100%",marginTop:exercise.sets.length>0?0:10,padding:"10px",background:C.faint,border:`1px dashed ${C.borderHi}`,borderRadius:8,cursor:"pointer",fontFamily:"'Barlow Condensed',sans-serif",fontSize:14,letterSpacing:1,color:C.muted,transition:"all .2s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=accentColor;e.currentTarget.style.color=accentColor;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=C.borderHi;e.currentTarget.style.color=C.muted;}}>
          + ADD SET
        </button>
      )}
    </Card>
  );
}

/* ══════════ GYM PAGE ════════════════════════════════════════════════════════ */
function GymPage(){
  const today=todayKey();
  const [bodyView,setBodyView]=useState("front");
  const [muscleTotals,setMuscleTotals]=useState({});
  const [selectedDay,setSelectedDay]=useState(null);
  const [workout,setWorkout]=useState(null);
  const [showAddEx,setShowAddEx]=useState(false);
  const [customExName,setCustomExName]=useState("");
  const [ready,setReady]=useState(false);
  const exInputRef=useRef(null);

  useEffect(()=>{
    dbGet("muscleTotals").then(v=>{ setMuscleTotals(v||{}); setReady(true); });
  },[]);

  const progress=calcMuscleProgress(muscleTotals);
  const selectDay=async(dayId)=>{
    setSelectedDay(dayId);
    const saved=await dbGet("workout:"+today+":"+dayId);
    setWorkout(saved||{dayType:dayId,exercises:[]});
    setShowAddEx(false);
  };
  const saveW=async(updated)=>{ setWorkout(updated); await dbSet("workout:"+today+":"+updated.dayType,updated); };
  const addExercise=async(name,muscleGroups)=>{ if(!workout)return; await saveW({...workout,exercises:[...workout.exercises,{id:uid(),name,muscleGroups,sets:[]}]}); setShowAddEx(false); setCustomExName(""); };
  const removeExercise=async(exId)=>{
    if(!workout)return;
    const ex=workout.exercises.find(e=>e.id===exId);
    if(ex){ const t={...muscleTotals}; ex.sets.forEach(()=>ex.muscleGroups.forEach(mg=>{ t[mg]=Math.max(0,(t[mg]||0)-1); })); setMuscleTotals(t); await dbSet("muscleTotals",t); }
    await saveW({...workout,exercises:workout.exercises.filter(e=>e.id!==exId)});
  };
  const addSet=async(exId,reps,weight)=>{
    if(!workout)return;
    const ex=workout.exercises.find(e=>e.id===exId);
    const updated={...workout,exercises:workout.exercises.map(e=>e.id===exId?{...e,sets:[...e.sets,{id:uid(),reps,weight}]}:e)};
    await saveW(updated);
    if(ex){ const t={...muscleTotals}; ex.muscleGroups.forEach(mg=>{ t[mg]=(t[mg]||0)+1; }); setMuscleTotals(t); await dbSet("muscleTotals",t); }
  };
  const removeSet=async(exId,setId)=>{
    if(!workout)return;
    const ex=workout.exercises.find(e=>e.id===exId);
    if(ex&&ex.sets.find(s=>s.id===setId)){ const t={...muscleTotals}; ex.muscleGroups.forEach(mg=>{ t[mg]=Math.max(0,(t[mg]||0)-1); }); setMuscleTotals(t); await dbSet("muscleTotals",t); }
    await saveW({...workout,exercises:workout.exercises.map(e=>e.id===exId?{...e,sets:e.sets.filter(s=>s.id!==setId)}:e)});
  };
  const curDef=PPL_DAYS.find(d=>d.id===selectedDay);
  if(!ready)return <div style={{textAlign:"center",padding:40,fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.muted}}>INITIALIZING LINK...</div>;

  return (
    <div>
      <div style={{marginBottom:28}}>
        <SectionLabel action={
          <div style={{display:"flex",gap:6, background:C.surface, padding:4, borderRadius:8, border:`1px solid ${C.border}`}}>
            {["front","back"].map(v=>(
              <button key={v} onClick={()=>setBodyView(v)} className="btn-press" style={{background:bodyView===v?C.borderHi:"transparent",borderRadius:6,padding:"6px 12px",color:bodyView===v?C.text:C.muted,fontFamily:"'Barlow Condensed',sans-serif",fontSize:12,fontWeight:600,letterSpacing:1,cursor:"pointer",transition:"all .2s",border:"none"}}>
                {v.toUpperCase()}
              </button>
            ))}
          </div>
        }>Muscle Link</SectionLabel>
        <Card className="hover-lift">
          <div style={{display:"flex",gap:20,alignItems:"center"}}>
            <div style={{width:130,flexShrink:0}}><BodyMapSVG progress={progress} view={bodyView}/></div>
            <div style={{flex:1}}>
              {(bodyView==="front"?["chest","shoulders","biceps","abs","legs"]:["back","triceps","legs"]).map(m=>{
                const pct=Math.round(progress[m]||0);
                return (
                  <div key={m} style={{marginBottom:12}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                      <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:14,letterSpacing:0.5,textTransform:"capitalize"}}>{m}</span>
                      <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:pct>0?C.accent:C.muted}}>{muscleTotals[m]||0} sets</span>
                    </div>
                    <div style={{background:C.border,borderRadius:4,height:6,overflow:"hidden",boxShadow:"inset 0 1px 3px rgba(0,0,0,0.5)"}}>
                      <div style={{width:`${pct}%`,height:"100%",borderRadius:4,background:muscleColor(pct),boxShadow:`0 0 10px ${muscleColor(pct)}`,transition:"width .6s cubic-bezier(0.4, 0, 0.2, 1), background-color .6s"}}/>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      </div>
      <div style={{marginBottom:24}}>
        <SectionLabel>Select Protocol</SectionLabel>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          {PPL_DAYS.map(day=>(
            <button key={day.id} onClick={()=>selectDay(day.id)} className="hover-lift btn-press" style={{background:selectedDay===day.id?`${day.color}15`:C.surface,border:`1px solid ${selectedDay===day.id?day.color:C.border}`,boxShadow:selectedDay===day.id?`0 4px 16px ${day.color}22`:"none",borderRadius:12,padding:"14px 16px",textAlign:"left",cursor:"pointer",transition:"all .2s ease"}}>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:13,fontWeight:700,letterSpacing:1.5,color:selectedDay===day.id?day.color:C.muted,marginBottom:4}}>DAY {day.day}</div>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:17,fontWeight:600,letterSpacing:0.5,color:selectedDay===day.id?C.text:C.muted}}>{day.short}</div>
            </button>
          ))}
        </div>
      </div>
      {selectedDay&&workout&&curDef&&(
        <div style={{animation:"slideIn .4s cubic-bezier(0.175, 0.885, 0.32, 1.275)"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,paddingBottom:12,borderBottom:`1px solid ${C.border}`}}>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:24,fontWeight:700,color:curDef.color,letterSpacing:1,textShadow:`0 0 16px ${curDef.color}66`}}>{curDef.label.toUpperCase()}</div>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.text,background:C.borderHi,padding:"4px 8px",borderRadius:6,letterSpacing:1}}>{workout.exercises.reduce((n,e)=>n+e.sets.length,0)} SETS</div>
          </div>
          {workout.exercises.map(ex=>(
            <ExerciseCard key={ex.id} exercise={ex} accentColor={curDef.color} onAddSet={(r,w)=>addSet(ex.id,r,w)} onRemoveSet={sid=>removeSet(ex.id,sid)} onRemove={()=>removeExercise(ex.id)}/>
          ))}
          {showAddEx?(
            <Card style={{marginBottom:10,border:`1px solid ${curDef.color}55`,boxShadow:`0 8px 24px rgba(0,0,0,0.4)`}}>
              <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.muted,letterSpacing:1.5,marginBottom:12}}>RECOMMENDED MODULES</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:16}}>
                {curDef.suggestions.filter(s=>!workout.exercises.find(e=>e.name===s)).map(s=>(
                  <button key={s} onClick={()=>addExercise(s,curDef.muscles)} className="btn-press" style={{background:C.faint,border:`1px solid ${C.borderHi}`,borderRadius:8,padding:"8px 12px",fontFamily:"'Barlow Condensed',sans-serif",fontSize:14,color:C.text,cursor:"pointer",transition:"all .2s"}} onMouseEnter={e=>{e.target.style.borderColor=curDef.color;e.target.style.color=curDef.color;e.target.style.boxShadow=`0 0 10px ${curDef.color}33`;}} onMouseLeave={e=>{e.target.style.borderColor=C.borderHi;e.target.style.color=C.text;e.target.style.boxShadow="none";}}>{s}</button>
                ))}
              </div>
              <div style={{display:"flex",gap:8}}>
                <input ref={exInputRef} value={customExName} onChange={e=>setCustomExName(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&customExName.trim())addExercise(customExName.trim(),curDef.muscles);}} placeholder="Custom exercise..." style={{flex:1,padding:"12px 14px",background:C.bg,border:`1px solid ${C.borderHi}`,borderRadius:8,color:C.text,fontFamily:"'Barlow Condensed',sans-serif",fontSize:15,outline:"none",transition:"border-color .2s"}} onFocus={e=>e.target.style.borderColor=curDef.color} onBlur={e=>e.target.style.borderColor=C.borderHi}/>
                <button onClick={()=>{if(customExName.trim())addExercise(customExName.trim(),curDef.muscles);}} className="btn-press" style={{background:curDef.color,border:"none",borderRadius:8,padding:"0 20px",color:C.bg,fontFamily:"'Barlow Condensed',sans-serif",fontSize:15,fontWeight:700,cursor:"pointer",letterSpacing:1}}>ADD</button>
                <button onClick={()=>{setShowAddEx(false);setCustomExName("");}} className="btn-press" style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:8,padding:"0 16px",color:C.muted,fontFamily:"'Barlow Condensed',sans-serif",fontSize:15,cursor:"pointer"}}>✕</button>
              </div>
            </Card>
          ):(
            <button onClick={()=>{setShowAddEx(true);setTimeout(()=>exInputRef.current?.focus(),50);}} className="btn-press hover-lift" style={{width:"100%",padding:"14px",background:C.surface,border:`1px dashed ${C.borderHi}`,borderRadius:12,cursor:"pointer",fontFamily:"'Barlow Condensed',sans-serif",fontSize:15,fontWeight:600,letterSpacing:1.5,color:C.text,transition:"all .2s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=curDef.color;e.currentTarget.style.color=curDef.color;e.currentTarget.style.background=`${curDef.color}11`;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=C.borderHi;e.currentTarget.style.color=C.text;e.currentTarget.style.background=C.surface;}}>
              + INITIALIZE NEW EXERCISE
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ══════════ HABIT ROW ══════════════════════════════════════════════════════ */
function HabitRow({ label, cat, done, onToggle, onCalendar, onRemove, index }){
  return (
    <div className="hover-lift" style={{display:"flex",alignItems:"stretch",marginBottom:8,animation:`slideIn .4s cubic-bezier(0.175, 0.885, 0.32, 1.275) ${index*.05}s both`, borderRadius:12, overflow:"hidden", boxShadow:done?`0 4px 12px ${C.accentGlow}`:"0 4px 6px rgba(0,0,0,0.2)"}}>
      <div onClick={onToggle} style={{flex:1,display:"flex",alignItems:"center",gap:14,padding:"14px 16px",background:done?`${C.accent}15`:C.surface,border:`1px solid ${done?C.accentDim:C.border}`,borderRight:"none",cursor:"pointer",transition:"all .3s ease"}}>
        <div style={{width:22,height:22,borderRadius:6,flexShrink:0,background:done?C.accent:C.bg,border:`1.5px solid ${done?C.accent:C.borderHi}`,boxShadow:done?`0 0 10px ${C.accent}`:"inset 0 2px 4px rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .3s cubic-bezier(0.4, 0, 0.2, 1)"}}>
          <svg width="12" height="10" viewBox="0 0 12 10" fill="none" style={{opacity:done?1:0, transform:done?"scale(1)":"scale(0.5)", transition:"all .3s cubic-bezier(0.175, 0.885, 0.32, 1.275)"}}><path d="M1 5L4.5 8.5L11 1" stroke={C.bg} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <div style={{minWidth:0}}>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:18,fontWeight:500,letterSpacing:0.5,color:done?C.accent:C.text,textShadow:done?`0 0 8px ${C.accentGlow}`:"none",transition:"color .3s"}}>{label}</div>
          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:C.muted,marginTop:3,letterSpacing:1.5}}>{cat}</div>
        </div>
      </div>
      {onCalendar&&(
        <button onClick={onCalendar} className="btn-press" style={{padding:"0 14px",background:done?`${C.accent}15`:C.surface,border:`1px solid ${done?C.accentDim:C.border}`,borderLeft:`1px solid ${done?C.accentDim:C.borderHi}`,cursor:"pointer",color:C.muted,fontSize:16,transition:"all .2s",display:"flex",alignItems:"center",borderRight:onRemove?"none":undefined}} onMouseEnter={e=>{e.currentTarget.style.color=C.accent;}} onMouseLeave={e=>{e.currentTarget.style.color=C.muted;}}>📅</button>
      )}
      {onRemove&&(
        <button onClick={onRemove} className="btn-press" style={{padding:"0 12px",background:C.surface,border:`1px solid ${C.border}`,borderLeft:"none",cursor:"pointer",color:C.muted,fontSize:18,transition:"color .2s",display:"flex",alignItems:"center"}} onMouseEnter={e=>{e.currentTarget.style.color=C.danger;}} onMouseLeave={e=>{e.currentTarget.style.color=C.muted;}}>×</button>
      )}
    </div>
  );
}

/* ══════════ HABITS PAGE ════════════════════════════════════════════════════ */
function HabitsPage(){
  const today=todayKey(),week=weekKey();
  const [habits,setHabits]=useState({});
  const [customHabits,setCustomHabits]=useState([]);
  const [runs,setRuns]=useState(0);
  const [gymCount,setGymCount]=useState(0);
  const [sleepDone,setSleepDone]=useState(false);
  const [streak,setStreak]=useState(0);
  const [chart,setChart]=useState([]);
  const [ready,setReady]=useState(false);
  const [calHabit,setCalHabit]=useState(null);
  const [showComplete,setShowComplete]=useState(false);
  const [addingTask,setAddingTask]=useState(false);
  const [newTask,setNewTask]=useState("");
  const inputRef=useRef(null);
  const allHabits=[...CORE_HABITS,...customHabits.map(c=>({...c,cat:"CUSTOM"}))];

  useEffect(()=>{
    (async()=>{
      const [day,wk,gymWk,cust]=await Promise.all([
        dbGet("day:"+today),dbGet("week:"+week),dbGet("gymWeek:"+week),dbGet("customHabits")
      ]);
      setHabits((day||{}).habits||{});
      setSleepDone((day||{}).sleep===true);
      setRuns((wk||{}).runs||0);
      setGymCount((gymWk||{}).count||0);
      setCustomHabits(cust||[]);
      let s=0; const chk=new Date(); chk.setDate(chk.getDate()-1);
      for(let i=0;i<90;i++){
        const d=await dbGet("day:"+chk.toISOString().slice(0,10));
        if(d&&Object.values(d.habits||{}).filter(Boolean).length>=CORE_HABITS.length)s++;
        else break;
        chk.setDate(chk.getDate()-1);
      }
      setStreak(s);
      const bars=[];
      for(let i=6;i>=0;i--){
        const dt=new Date(); dt.setDate(dt.getDate()-i);
        const ds=dt.toISOString().slice(0,10);
        const dd=ds===today?day:await dbGet("day:"+ds);
        const cnt=dd?Object.values(dd.habits||{}).filter(Boolean).length:0;
        bars.push({day:["Su","Mo","Tu","We","Th","Fr","Sa"][dt.getDay()],cnt,isToday:ds===today});
      }
      setChart(bars);
      setReady(true);
    })();
  },[]);

  const persistDay=useCallback(async(h,sl)=>{ await dbSet("day:"+today,{habits:h,sleep:sl}); },[today]);
  const toggleHabit=useCallback(async(id)=>{
    setHabits(prev=>{
      const next={...prev,[id]:!prev[id]};
      persistDay(next,sleepDone);
      const cnt=Object.values(next).filter(Boolean).length;
      setChart(c=>c.map(b=>b.isToday?{...b,cnt}:b));
      if(cnt>=CORE_HABITS.length+customHabits.length)setTimeout(()=>setShowComplete(true),300);
      return next;
    });
  },[sleepDone,customHabits.length,persistDay]);
  const toggleSleep=async()=>{ const n=!sleepDone; setSleepDone(n); await persistDay(habits,n); };
  const addRun=async()=>{ const n=runs<RUN_TARGET?runs+1:0; setRuns(n); await dbSet("week:"+week,{runs:n}); };
  const addGym=async()=>{ const n=gymCount<GYM_TARGET?gymCount+1:0; setGymCount(n); await dbSet("gymWeek:"+week,{count:n}); };
  const submitCustom=async()=>{
    const label=newTask.trim(); if(!label)return;
    const id="custom_"+Date.now(),next=[...customHabits,{id,label}];
    setCustomHabits(next); await dbSet("customHabits",next);
    setNewTask(""); setAddingTask(false);
  };
  const removeCustom=async(id)=>{
    const next=customHabits.filter(c=>c.id!==id);
    setCustomHabits(next); await dbSet("customHabits",next);
    setHabits(prev=>{ const n={...prev}; delete n[id]; persistDay(n,sleepDone); return n; });
  };

  const done=Object.values(habits).filter(Boolean).length,total=allHabits.length,allDone=done>=total;
  const displayStreak=allDone?streak+1:streak;
  const dayLabel=new Date().toLocaleDateString("en-US",{weekday:"long",month:"short",day:"numeric"});

  if(!ready)return <div style={{textAlign:"center",padding:60,fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:C.accent,letterSpacing:3,animation:"pulse 1.5s infinite ease-in-out"}}>ESTABLISHING LINK...</div>;

  return (
    <div>
      {showComplete&&(
        <div onClick={()=>setShowComplete(false)} style={{position:"fixed",inset:0,background:"rgba(5,11,20,0.95)",backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:300,cursor:"pointer",animation:"fadeIn .3s ease"}}>
          <div style={{textAlign:"center",animation:"popIn .5s cubic-bezier(0.175, 0.885, 0.32, 1.275)"}}>
            <div style={{fontSize:96,lineHeight:1,filter:`drop-shadow(0 0 20px ${C.accent})`}}>❄️</div>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:56,fontWeight:700,color:C.accent,letterSpacing:8,marginTop:16,textShadow:`0 0 20px ${C.accentGlow}`}}>LOCKED IN</div>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.text,marginTop:14,letterSpacing:3,background:C.borderHi,padding:"6px 12px",borderRadius:20,display:"inline-block"}}>SYSTEM OPTIMAL</div>
          </div>
        </div>
      )}
      {calHabit&&<CalendarModal habitId={calHabit.id} habitLabel={calHabit.label} onClose={()=>setCalHabit(null)}/>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:32,animation:"slideIn .5s cubic-bezier(0.175, 0.885, 0.32, 1.275)"}}>
        <div>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:64,fontWeight:700,lineHeight:0.85,letterSpacing:2,color:C.accent,textShadow:`0 0 16px ${C.accentGlow}`}}>LOCK</div>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:64,fontWeight:700,lineHeight:0.85,letterSpacing:2,color:C.text}}>IN.</div>
          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.muted,letterSpacing:2,marginTop:12,background:C.border,padding:"4px 8px",borderRadius:4,display:"inline-block"}}>{dayLabel.toUpperCase()}</div>
        </div>
        <div style={{textAlign:"right",paddingTop:4}}>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:76,fontWeight:300,lineHeight:0.9,color:C.accent,letterSpacing:-2,textShadow:`0 0 16px ${C.accentGlow}`}}>{daysLeft()}</div>
          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.muted,letterSpacing:1.5,lineHeight:1.6,marginTop:4}}>DAYS TO<br/>JUNE 1ST</div>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:28,animation:"slideIn .5s cubic-bezier(0.175, 0.885, 0.32, 1.275) .05s both"}}>
        <Card highlight={displayStreak>0} style={{display:"flex",flexDirection:"column",justifyContent:"center"}}>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:48,fontWeight:700,lineHeight:1,color:displayStreak>0?C.accent:C.text,textShadow:displayStreak>0?`0 0 12px ${C.accentGlow}`:"none"}}>{displayStreak} <span style={{fontSize:26}}>🔥</span></div>
          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.muted,marginTop:8,letterSpacing:1.5}}>DAY STREAK</div>
        </Card>
        <Card highlight={allDone} style={{display:"flex",flexDirection:"column",justifyContent:"center"}}>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:48,fontWeight:700,lineHeight:1,color:allDone?C.accent:C.text,textShadow:allDone?`0 0 12px ${C.accentGlow}`:"none"}}>{done}<span style={{fontSize:24,color:C.muted,fontWeight:400}}>/{total}</span></div>
          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.muted,marginTop:8,letterSpacing:1.5}}>TASKS CLEAR</div>
        </Card>
      </div>
      <div style={{marginBottom:28,animation:"slideIn .5s cubic-bezier(0.175, 0.885, 0.32, 1.275) .1s both"}}>
        <SectionLabel>Core Directives</SectionLabel>
        {CORE_HABITS.map((h,i)=>(
          <HabitRow key={h.id} label={h.label} cat={h.cat} done={!!habits[h.id]} onToggle={()=>toggleHabit(h.id)} onCalendar={()=>setCalHabit({id:h.id,label:h.label})} index={i}/>
        ))}
      </div>
      <div style={{marginBottom:28,animation:"slideIn .5s cubic-bezier(0.175, 0.885, 0.32, 1.275) .15s both"}}>
        <SectionLabel action={
          <button onClick={()=>{setAddingTask(true);setTimeout(()=>inputRef.current?.focus(),50);}} className="btn-press" style={{background:C.border,border:`1px solid ${C.borderHi}`,borderRadius:6,padding:"4px 12px",color:C.text,fontFamily:"'Barlow Condensed',sans-serif",fontSize:12,fontWeight:600,letterSpacing:1,cursor:"pointer",transition:"all .2s"}} onMouseEnter={e=>{e.target.style.borderColor=C.accent;e.target.style.color=C.accent;}} onMouseLeave={e=>{e.target.style.borderColor=C.borderHi;e.target.style.color=C.text;}}>+ ADD</button>
        }>Auxiliary Modules</SectionLabel>
        {customHabits.length===0&&!addingTask&&(
          <div style={{padding:"20px 14px",background:C.surface,border:`1px dashed ${C.borderHi}`,borderRadius:12,textAlign:"center",fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.muted,lineHeight:1.8}}>
            No auxiliary tasks initialized.<br/><span style={{color:C.accent,cursor:"pointer",textDecoration:"underline",textUnderlineOffset:4}} onClick={()=>{setAddingTask(true);setTimeout(()=>inputRef.current?.focus(),50);}}>+ Initialize module</span>
          </div>
        )}
        {customHabits.map((h,i)=>(
          <HabitRow key={h.id} label={h.label} cat="CUSTOM" done={!!habits[h.id]} onToggle={()=>toggleHabit(h.id)} onCalendar={()=>setCalHabit({id:h.id,label:h.label})} onRemove={()=>removeCustom(h.id)} index={i}/>
        ))}
        {addingTask&&(
          <div style={{display:"flex",gap:8,marginTop:8,animation:"slideIn .2s ease"}}>
            <input ref={inputRef} value={newTask} onChange={e=>setNewTask(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")submitCustom();if(e.key==="Escape"){setAddingTask(false);setNewTask("");}}} placeholder="e.g. Meditate 10 min" style={{flex:1,padding:"12px 16px",background:C.bg,border:`1px solid ${C.accent}`,borderRadius:10,color:C.text,fontFamily:"'Barlow Condensed',sans-serif",fontSize:16,letterSpacing:0.5,outline:"none",boxShadow:`0 0 10px ${C.accentGlow}`}}/>
            <button onClick={submitCustom} className="btn-press" style={{background:C.accent,border:"none",borderRadius:10,padding:"0 20px",color:C.bg,fontFamily:"'Barlow Condensed',sans-serif",fontSize:16,fontWeight:700,letterSpacing:1,cursor:"pointer",boxShadow:`0 4px 12px ${C.accent}44`}}>ADD</button>
            <button onClick={()=>{setAddingTask(false);setNewTask("");}} className="btn-press" style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:10,padding:"0 16px",color:C.muted,fontFamily:"'Barlow Condensed',sans-serif",fontSize:16,cursor:"pointer"}}>✕</button>
          </div>
        )}
      </div>
      <div style={{marginBottom:28,animation:"slideIn .5s cubic-bezier(0.175, 0.885, 0.32, 1.275) .2s both"}}>
        <SectionLabel>Recovery System</SectionLabel>
        <div onClick={toggleSleep} className="hover-lift" style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 18px",background:sleepDone?`${C.green}15`:C.surface,border:`1px solid ${sleepDone?C.green:C.border}`,borderRadius:12,cursor:"pointer",transition:"all .3s ease",boxShadow:sleepDone?`0 4px 16px ${C.green}22`:"0 4px 6px rgba(0,0,0,0.2)"}}>
          <div>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:18,fontWeight:600,letterSpacing:0.5,color:sleepDone?C.green:C.text,textShadow:sleepDone?`0 0 8px ${C.green}55`:"none"}}>Got 8+ hours of sleep</div>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.muted,marginTop:4,letterSpacing:1.5}}>MINIMUM 8 HRS / NIGHT</div>
          </div>
          <div style={{width:48,height:26,borderRadius:13,background:sleepDone?C.green:C.bg,border:`1.5px solid ${sleepDone?C.green:C.borderHi}`,position:"relative",transition:"all .3s cubic-bezier(0.4, 0, 0.2, 1)",flexShrink:0,boxShadow:sleepDone?`0 0 10px ${C.green}`:"inset 0 2px 4px rgba(0,0,0,0.5)"}}>
            <div style={{position:"absolute",top:2,left:sleepDone?24:2,width:18,height:18,borderRadius:9,background:C.text,transition:"left .3s cubic-bezier(0.175, 0.885, 0.32, 1.275)",boxShadow:"0 2px 4px rgba(0,0,0,0.4)"}}/>
          </div>
        </div>
      </div>
      <div style={{marginBottom:28,animation:"slideIn .5s cubic-bezier(0.175, 0.885, 0.32, 1.275) .25s both"}}>
        <SectionLabel>Gym Protocols</SectionLabel>
        <Card highlight={gymCount>=GYM_TARGET}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <div>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:22,fontWeight:600,letterSpacing:1}}>Sessions logged</div>
              <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.muted,marginTop:4,letterSpacing:1}}>5× MINIMUM — PPL SPLIT</div>
            </div>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:56,fontWeight:300,lineHeight:1,color:gymCount>=GYM_TARGET?C.accent:C.text,textShadow:gymCount>=GYM_TARGET?`0 0 16px ${C.accentGlow}`:"none"}}>{gymCount}<span style={{fontSize:24,color:C.muted}}>/{GYM_TARGET}</span></div>
          </div>
          <div style={{display:"flex",gap:6,marginBottom:16}}>
            {Array.from({length:GYM_TARGET},(_,i)=><div key={i} style={{flex:1,height:6,borderRadius:3,background:i<gymCount?C.accent:C.bg,boxShadow:i<gymCount?`0 0 8px ${C.accent}`:"inset 0 1px 3px rgba(0,0,0,0.5)",transition:"all .4s cubic-bezier(0.4, 0, 0.2, 1)"}}/>)}
          </div>
          <button onClick={addGym} className="btn-press" style={{width:"100%",padding:"14px",background:gymCount>=GYM_TARGET?C.accentDim:C.accent,border:"none",borderRadius:10,color:gymCount>=GYM_TARGET?C.text:C.bg,fontFamily:"'Barlow Condensed',sans-serif",fontSize:16,fontWeight:700,letterSpacing:2,cursor:"pointer",transition:"all .2s",boxShadow:gymCount>=GYM_TARGET?"none":`0 4px 16px ${C.accent}44`}}>
            {gymCount>=GYM_TARGET?"✓ DIRECTIVE COMPLETE — TAP RESET":"+ LOG GYM SESSION"}
          </button>
        </Card>
      </div>
      <div style={{marginBottom:28,animation:"slideIn .5s cubic-bezier(0.175, 0.885, 0.32, 1.275) .3s both"}}>
        <SectionLabel>Running Protocols</SectionLabel>
        <Card highlight={runs>=RUN_TARGET}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <div>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:22,fontWeight:600,letterSpacing:1}}>Runs logged</div>
              <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.muted,marginTop:4,letterSpacing:1}}>3× MINIMUM</div>
            </div>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:56,fontWeight:300,lineHeight:1,color:runs>=RUN_TARGET?C.accent:C.text,textShadow:runs>=RUN_TARGET?`0 0 16px ${C.accentGlow}`:"none"}}>{runs}<span style={{fontSize:24,color:C.muted}}>/{RUN_TARGET}</span></div>
          </div>
          <div style={{display:"flex",gap:6,marginBottom:16}}>
            {[0,1,2].map(i=><div key={i} style={{flex:1,height:6,borderRadius:3,background:i<runs?C.accent:C.bg,boxShadow:i<runs?`0 0 8px ${C.accent}`:"inset 0 1px 3px rgba(0,0,0,0.5)",transition:"all .4s cubic-bezier(0.4, 0, 0.2, 1)"}}/>)}
          </div>
          <button onClick={addRun} className="btn-press" style={{width:"100%",padding:"14px",background:runs>=RUN_TARGET?C.accentDim:C.accent,border:"none",borderRadius:10,color:runs>=RUN_TARGET?C.text:C.bg,fontFamily:"'Barlow Condensed',sans-serif",fontSize:16,fontWeight:700,letterSpacing:2,cursor:"pointer",transition:"all .2s",boxShadow:runs>=RUN_TARGET?"none":`0 4px 16px ${C.accent}44`}}>
            {runs>=RUN_TARGET?"✓ DIRECTIVE COMPLETE — TAP RESET":"+ LOG A RUN"}
          </button>
        </Card>
      </div>
      <div style={{marginBottom:24,animation:"slideIn .5s cubic-bezier(0.175, 0.885, 0.32, 1.275) .35s both"}}>
        <SectionLabel>Telemetry (Last 7 Days)</SectionLabel>
        <Card className="hover-lift">
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={chart} barCategoryGap="30%">
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill:C.muted,fontFamily:"JetBrains Mono,monospace",fontSize:10}}/>
              <Bar dataKey="cnt" maxBarSize={32} radius={[6,6,2,2]}>
                {chart.map((c,i)=><Cell key={i} fill={c.isToday?C.accent:c.cnt>0?C.accentDim:C.bg} stroke={c.cnt>0?C.accentDim:C.borderHi} strokeWidth={1} style={{filter:c.isToday?`drop-shadow(0 0 8px ${C.accentGlow})`:"none", transition:"all .3s"}}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{display:"flex",gap:16,paddingLeft:4,marginTop:10}}>
            {[[C.accent,"Active Node"],[C.accentDim,"Logged"],[C.bg,"Offline"]].map(([col,lbl])=>(
              <div key={lbl} style={{display:"flex",alignItems:"center",gap:6}}>
                <div style={{width:10,height:10,background:col,borderRadius:3,border:`1px solid ${col===C.bg?C.borderHi:C.accentDim}`}}/>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.muted,letterSpacing:0.5}}>{lbl}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <div style={{textAlign:"center",paddingTop:20,borderTop:`1px solid ${C.border}`}}>
        <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.muted,letterSpacing:2}}>T-MINUS {daysLeft()} DAYS</div>
      </div>
    </div>
  );
}

/* ══════════ ROOT ═══════════════════════════════════════════════════════════ */
export default function LockIn(){
  const [session,setSession]=useState(undefined);
  const [page,setPage]=useState("habits");

  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>setSession(session));
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_,s)=>setSession(s));
    return ()=>subscription.unsubscribe();
  },[]);

  if(session===undefined) return (
    <div style={{background:C.bg,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:14,letterSpacing:6,color:C.accent,animation:"pulse 1.5s infinite ease-in-out"}}>INITIALIZING...</div>
    </div>
  );

  if(!session) return <Auth/>;

  return (
    <div style={{background:C.bg,minHeight:"100vh",color:C.text}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@300;400;500;600;700&family=JetBrains+Mono:wght@300;400;500;600&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        body{background:${C.bg}!important;-webkit-font-smoothing:antialiased;}
        input{outline:none;} button{cursor:pointer;}
        
        /* Custom UI Animations */
        .hover-lift { transition: all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        .hover-lift:hover { transform: translateY(-3px); box-shadow: 0 12px 24px rgba(0,0,0,0.4); border-color: ${C.borderHi} !important; }
        .btn-press:active { transform: scale(0.96); }
        
        @keyframes slideIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes popIn{0%{opacity:0;transform:scale(.86)}65%{transform:scale(1.04)}100%{opacity:1;transform:scale(1)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
      `}</style>
      <div style={{maxWidth:480,margin:"0 auto",padding:"24px 16px 100px"}}>
        {page==="habits"&&<HabitsPage/>}
        {page==="gym"&&<GymPage/>}
      </div>
      <div style={{position:"fixed",bottom:0,left:0,right:0,background:"rgba(5,11,20,0.85)",backdropFilter:"blur(16px)",WebkitBackdropFilter:"blur(16px)",borderTop:`1px solid ${C.border}`,padding:"12px 0 max(env(safe-area-inset-bottom),12px)",zIndex:100}}>
        <div style={{maxWidth:480,margin:"0 auto",display:"flex",justifyContent:"center",gap:12,padding:"0 16px"}}>
          {[{id:"habits",icon:"✓",label:"Habits"},{id:"gym",icon:"💪",label:"Gym"}].map(tab=>(
            <button key={tab.id} onClick={()=>setPage(tab.id)} className="btn-press" style={{flex:1,padding:"12px 0",background:page===tab.id?`${C.accent}15`:"transparent",border:`1px solid ${page===tab.id?C.accentDim:"transparent"}`,boxShadow:page===tab.id?`0 0 12px ${C.accentGlow}`:"none",borderRadius:12,display:"flex",flexDirection:"column",alignItems:"center",gap:4,cursor:"pointer",transition:"all .2s cubic-bezier(0.4, 0, 0.2, 1)"}}>
              <span style={{fontSize:20,lineHeight:1,filter:page===tab.id?`drop-shadow(0 0 6px ${C.accent})`:"grayscale(100%)",opacity:page===tab.id?1:0.6}}>{tab.icon}</span>
              <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:13,letterSpacing:1.5,color:page===tab.id?C.accent:C.muted,fontWeight:700}}>{tab.label.toUpperCase()}</span>
            </button>
          ))}
          <button onClick={()=>supabase.auth.signOut()} className="btn-press" style={{flex:1,padding:"12px 0",background:"transparent",border:"1px solid transparent",borderRadius:12,display:"flex",flexDirection:"column",alignItems:"center",gap:4,cursor:"pointer",transition:"all .2s ease"}} onMouseEnter={e=>e.currentTarget.querySelector("span:last-child").style.color=C.danger} onMouseLeave={e=>e.currentTarget.querySelector("span:last-child").style.color=C.muted}>
            <span style={{fontSize:20,lineHeight:1,opacity:0.6}}>↩</span>
            <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:13,letterSpacing:1.5,color:C.muted,fontWeight:700,transition:"color .2s"}}>LOG OUT</span>
          </button>
        </div>
      </div>
    </div>
  );
}
