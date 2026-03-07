"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { BarChart, Bar, XAxis, Cell, ResponsiveContainer } from "recharts";

/* ══════════════════════ PALETTE ════════════════════════════════════════════ */
const C = {
  bg:"#08090a", surface:"#0f1012", border:"#1c1e22", borderHi:"#2a2d33",
  accent:"#f97316", accentDim:"#7c3010", accentGlow:"rgba(249,115,22,0.1)",
  text:"#e8e9eb", muted:"#454850", faint:"#14161a",
  danger:"#ef4444", green:"#22c55e", blue:"#3b82f6",
};

/* ══════════════════════ DATA ═══════════════════════════════════════════════ */
const CORE_HABITS = [
  { id:"pushups",  label:"Pushups",         cat:"FITNESS" },
  { id:"pullups",  label:"Pullups",          cat:"FITNESS" },
  { id:"read",     label:"Read 15 min",      cat:"MIND"    },
  { id:"study",    label:"Study 1 hr",       cat:"SCHOOL"  },
  { id:"hw",       label:"Homework 1 hr",    cat:"SCHOOL"  },
  { id:"projects", label:"Projects 1 hr",    cat:"SCHOOL"  },
];
const RUN_TARGET = 3;
const GYM_TARGET = 5;
const JUNE_1 = new Date("2026-06-01T00:00:00");

const PPL_DAYS = [
  { id:"chest_tri",      label:"Chest & Triceps",  short:"Chest / Tri",  day:1, muscles:["chest","triceps"],  color:"#f97316",
    suggestions:["Bench Press","Incline DB Press","Cable Fly","Tricep Pushdown","Overhead Extension","Skull Crusher"] },
  { id:"back_bi",        label:"Back & Biceps",     short:"Back / Bi",    day:2, muscles:["back","biceps"],    color:"#3b82f6",
    suggestions:["Lat Pulldown","Barbell Row","Seated Row","Bicep Curl","Hammer Curl","Face Pull"] },
  { id:"legs_shoulders", label:"Legs & Shoulders",  short:"Legs / Shld",  day:3, muscles:["legs","shoulders"], color:"#22c55e",
    suggestions:["Squat","Leg Press","Romanian Deadlift","Leg Curl","Shoulder Press","Lateral Raise","Calf Raise"] },
  { id:"chest_back",     label:"Chest & Back",       short:"Chest / Back", day:4, muscles:["chest","back"],    color:"#a855f7",
    suggestions:["Incline DB Press","Pull-ups","Dips","Cable Row","Pec Deck","T-Bar Row"] },
  { id:"abs_flex",       label:"Abs & Flex",          short:"Abs / Flex",   day:5, muscles:["abs"],             color:"#ec4899",
    suggestions:["Crunches","Plank","Leg Raise","Cable Crunch","Russian Twist","Mountain Climbers"] },
];
const MUSCLE_GROUPS = ["chest","back","biceps","triceps","shoulders","legs","abs"];

/* ══════════════════════ HELPERS ════════════════════════════════════════════ */
const PFX = "li3:";
function lget(k){ try{ const r=localStorage.getItem(PFX+k); return r?JSON.parse(r):null; }catch{ return null; } }
function lset(k,v){ try{ localStorage.setItem(PFX+k,JSON.stringify(v)); }catch{} }
function todayKey(){ return new Date().toISOString().slice(0,10); }
function weekKey(){ const d=new Date(),day=d.getDay(),m=new Date(d); m.setDate(d.getDate()-day+(day===0?-6:1)); return m.toISOString().slice(0,10); }
function daysLeft(){ return Math.max(0,Math.ceil((JUNE_1-new Date())/86400000)); }
function mkDate(y,m,d){ return `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`; }
function fmtMonth(y,m){ return new Date(y,m,1).toLocaleDateString("en-US",{month:"long",year:"numeric"}); }
function uid(){ return Math.random().toString(36).slice(2,9); }
function muscleColor(progress){
  const p=Math.min(1,Math.max(0,progress/100));
  if(p<0.02) return C.faint;
  const r=Math.round(232+(59-232)*p),g=Math.round(233+(130-233)*p),b=Math.round(235+(246-235)*p);
  return `rgb(${r},${g},${b})`;
}
function calcMuscleProgress(totals){
  const MAX=300,out={};
  MUSCLE_GROUPS.forEach(m=>{ out[m]=Math.min(100,((totals[m]||0)/MAX)*100); });
  return out;
}

/* ══════════════════════ SHARED UI ══════════════════════════════════════════ */
function SectionLabel({ children, action }){
  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
      <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,letterSpacing:3,color:C.muted,textTransform:"uppercase"}}>{children}</div>
      {action}
    </div>
  );
}
function Card({ children, highlight, style={} }){
  return (
    <div style={{background:highlight?C.accentGlow:C.surface,border:`1px solid ${highlight?C.accentDim:C.border}`,borderRadius:12,padding:16,transition:"border-color .25s,background .25s",...style}}>
      {children}
    </div>
  );
}

/* ══════════════════════ CALENDAR MODAL ═════════════════════════════════════ */
function CalendarModal({ habitId, habitLabel, onClose }){
  const todayStr=todayKey(),now=new Date();
  const [yr,setYr]=useState(now.getFullYear());
  const [mo,setMo]=useState(now.getMonth());
  const [data,setData]=useState({});
  useEffect(()=>{
    const days=new Date(yr,mo+1,0).getDate(),d={};
    for(let i=1;i<=days;i++){ const ds=mkDate(yr,mo,i),raw=lget("day:"+ds); d[ds]=raw?.habits?.[habitId]??null; }
    setData(d);
  },[yr,mo,habitId]);
  const daysInMonth=new Date(yr,mo+1,0).getDate(),firstDow=new Date(yr,mo,1).getDay(),cells=[];
  for(let i=0;i<firstDow;i++) cells.push(null);
  for(let d=1;d<=daysInMonth;d++) cells.push(d);
  const canNext=yr<now.getFullYear()||(yr===now.getFullYear()&&mo<now.getMonth());
  const prevMo=()=>{ if(mo===0){setMo(11);setYr(y=>y-1);}else setMo(m=>m-1); };
  const nextMo=()=>{ if(!canNext)return; if(mo===11){setMo(0);setYr(y=>y+1);}else setMo(m=>m+1); };
  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(8,9,10,0.9)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:400,padding:"0 16px",animation:"fadeIn .2s ease"}}>
      <div onClick={e=>e.stopPropagation()} style={{background:C.surface,border:`1px solid ${C.borderHi}`,borderRadius:16,padding:"20px 16px",width:"100%",maxWidth:340,animation:"popIn .25s ease"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:18,fontWeight:600,letterSpacing:1}}>{habitLabel}</div>
          <button onClick={onClose} style={{background:"transparent",border:"none",color:C.muted,fontSize:22,lineHeight:1,cursor:"pointer",padding:"0 4px"}}>×</button>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <button onClick={prevMo} style={{background:C.faint,border:"none",color:C.text,width:32,height:32,borderRadius:7,fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>‹</button>
          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.muted,letterSpacing:1}}>{fmtMonth(yr,mo).toUpperCase()}</div>
          <button onClick={nextMo} style={{background:C.faint,border:"none",color:canNext?C.text:"#222",width:32,height:32,borderRadius:7,fontSize:18,cursor:canNext?"pointer":"default",display:"flex",alignItems:"center",justifyContent:"center"}}>›</button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3,marginBottom:5}}>
          {["S","M","T","W","T","F","S"].map((d,i)=><div key={i} style={{textAlign:"center",fontFamily:"'JetBrains Mono',monospace",fontSize:8,color:C.muted,paddingBottom:2}}>{d}</div>)}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3}}>
          {cells.map((day,i)=>{
            if(!day) return <div key={i}/>;
            const ds=mkDate(yr,mo,day),isToday=ds===todayStr,isPast=ds<todayStr,status=data[ds];
            let bg=C.faint,tc=C.muted;
            if(status===true){ bg="rgba(34,197,94,0.18)"; tc=C.green; }
            else if(isPast){ bg="rgba(239,68,68,0.13)"; tc="#ef444477"; }
            return <div key={i} style={{aspectRatio:"1",display:"flex",alignItems:"center",justifyContent:"center",background:bg,borderRadius:5,border:isToday?`1.5px solid ${C.accent}`:"1px solid transparent",fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:tc}}>{day}</div>;
          })}
        </div>
        <div style={{display:"flex",gap:12,marginTop:14,justifyContent:"center"}}>
          {[[C.green,"Done"],["#ef4444","Missed"],[C.muted,"Future"]].map(([col,lbl])=>(
            <div key={lbl} style={{display:"flex",alignItems:"center",gap:5}}>
              <div style={{width:8,height:8,background:col,borderRadius:2,opacity:.8}}/>
              <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:C.muted}}>{lbl}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════ BODY MAP SVG ═══════════════════════════════════════ */
function BodyMapSVG({ progress, view }){
  const mc=(m)=>muscleColor(progress[m]||0);
  const base="#161820",outline=C.border;
  const Sil=()=>(
    <>
      <circle cx={80} cy={22} r={17} fill="#1e2025" stroke={outline} strokeWidth={0.8}/>
      <rect x={73} y={38} width={14} height={14} rx={4} fill="#1e2025" stroke={outline} strokeWidth={0.5}/>
      <path d="M44,52 C32,54 26,68 26,80 L26,162 C26,168 32,172 40,172 L120,172 C128,172 134,168 134,162 L134,80 C134,68 128,54 116,52 Z" fill={base} stroke={outline} strokeWidth={0.8}/>
      <rect x={18} y={68} width={18} height={62} rx={9} fill={base} stroke={outline} strokeWidth={0.5}/>
      <rect x={124} y={68} width={18} height={62} rx={9} fill={base} stroke={outline} strokeWidth={0.5}/>
      <rect x={16} y={134} width={16} height={44} rx={8} fill={base} stroke={outline} strokeWidth={0.5}/>
      <rect x={128} y={134} width={16} height={44} rx={8} fill={base} stroke={outline} strokeWidth={0.5}/>
      <rect x={44} y={170} width={72} height={18} rx={4} fill={base} stroke={outline} strokeWidth={0.5}/>
      <rect x={44} y={186} width={30} height={70} rx={15} fill={base} stroke={outline} strokeWidth={0.5}/>
      <rect x={86} y={186} width={30} height={70} rx={15} fill={base} stroke={outline} strokeWidth={0.5}/>
      <rect x={47} y={260} width={24} height={50} rx={12} fill={base} stroke={outline} strokeWidth={0.5}/>
      <rect x={89} y={260} width={24} height={50} rx={12} fill={base} stroke={outline} strokeWidth={0.5}/>
    </>
  );
  if(view==="front") return (
    <svg viewBox="0 0 160 318" style={{width:"100%",height:"100%"}}>
      <Sil/>
      <ellipse cx={38} cy={76} rx={16} ry={15} fill={mc("shoulders")} opacity={0.85}/>
      <ellipse cx={122} cy={76} rx={16} ry={15} fill={mc("shoulders")} opacity={0.85}/>
      <ellipse cx={64} cy={90} rx={18} ry={19} fill={mc("chest")} opacity={0.9}/>
      <ellipse cx={96} cy={90} rx={18} ry={19} fill={mc("chest")} opacity={0.9}/>
      <rect x={20} y={86} width={16} height={32} rx={8} fill={mc("biceps")} opacity={0.88}/>
      <rect x={124} y={86} width={16} height={32} rx={8} fill={mc("biceps")} opacity={0.88}/>
      {[0,1,2].map(row=>[0,1].map(col=>(
        <rect key={`${row}-${col}`} x={63+col*18} y={114+row*19} width={14} height={15} rx={4} fill={mc("abs")} opacity={0.88}/>
      )))}
      <rect x={46} y={190} width={26} height={60} rx={13} fill={mc("legs")} opacity={0.88}/>
      <rect x={88} y={190} width={26} height={60} rx={13} fill={mc("legs")} opacity={0.88}/>
    </svg>
  );
  return (
    <svg viewBox="0 0 160 318" style={{width:"100%",height:"100%"}}>
      <Sil/>
      <path d="M74,50 L86,50 L120,68 L80,80 L40,68 Z" fill={mc("back")} opacity={0.8}/>
      <path d="M42,72 C30,82 26,105 28,130 L44,138 L44,90 Z" fill={mc("back")} opacity={0.85}/>
      <path d="M118,72 C130,82 134,105 132,130 L116,138 L116,90 Z" fill={mc("back")} opacity={0.85}/>
      <rect x={20} y={86} width={16} height={32} rx={8} fill={mc("triceps")} opacity={0.88}/>
      <rect x={124} y={86} width={16} height={32} rx={8} fill={mc("triceps")} opacity={0.88}/>
      <ellipse cx={59} cy={184} rx={14} ry={12} fill={mc("legs")} opacity={0.85}/>
      <ellipse cx={101} cy={184} rx={14} ry={12} fill={mc("legs")} opacity={0.85}/>
      <rect x={46} y={196} width={26} height={58} rx={13} fill={mc("legs")} opacity={0.85}/>
      <rect x={88} y={196} width={26} height={58} rx={13} fill={mc("legs")} opacity={0.85}/>
      <rect x={47} y={260} width={24} height={46} rx={12} fill={mc("legs")} opacity={0.7}/>
      <rect x={89} y={260} width={24} height={46} rx={12} fill={mc("legs")} opacity={0.7}/>
    </svg>
  );
}

/* ══════════════════════ EXERCISE CARD ══════════════════════════════════════ */
function ExerciseCard({ exercise, accentColor, onAddSet, onRemoveSet, onRemove }){
  const [reps,setReps]=useState("10");
  const [weight,setWeight]=useState("");
  const [adding,setAdding]=useState(false);
  return (
    <Card style={{marginBottom:10}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:exercise.sets.length>0?10:0}}>
        <div>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:17,fontWeight:600,letterSpacing:0.5}}>{exercise.name}</div>
          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:C.muted,marginTop:2}}>{exercise.sets.length} SET{exercise.sets.length!==1?"S":""}</div>
        </div>
        <button onClick={onRemove} style={{background:"transparent",border:"none",color:C.muted,fontSize:18,cursor:"pointer",padding:"0 4px",lineHeight:1,transition:"color .15s"}} onMouseEnter={e=>e.target.style.color=C.danger} onMouseLeave={e=>e.target.style.color=C.muted}>×</button>
      </div>
      {exercise.sets.length>0&&(
        <div style={{marginBottom:10}}>
          <div style={{display:"grid",gridTemplateColumns:"28px 1fr 1fr 24px",gap:"3px 8px",marginBottom:4}}>
            {["#","REPS","KG",""].map((h,i)=><div key={i} style={{fontFamily:"'JetBrains Mono',monospace",fontSize:8,color:C.muted,letterSpacing:1}}>{h}</div>)}
          </div>
          {exercise.sets.map((s,i)=>(
            <div key={s.id} style={{display:"grid",gridTemplateColumns:"28px 1fr 1fr 24px",gap:"3px 8px",padding:"5px 0",borderTop:`1px solid ${C.border}`}}>
              <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.muted}}>{i+1}</div>
              <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:13,color:C.text}}>{s.reps}</div>
              <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:13,color:C.text}}>{s.weight||"–"}</div>
              <button onClick={()=>onRemoveSet(s.id)} style={{background:"transparent",border:"none",color:C.muted,fontSize:14,cursor:"pointer",padding:0,lineHeight:1,transition:"color .15s"}} onMouseEnter={e=>e.target.style.color=C.danger} onMouseLeave={e=>e.target.style.color=C.muted}>×</button>
            </div>
          ))}
        </div>
      )}
      {adding?(
        <div style={{display:"flex",gap:6,alignItems:"center",marginTop:exercise.sets.length>0?0:10}}>
          <input value={reps} onChange={e=>setReps(e.target.value)} placeholder="Reps" type="number" style={{width:60,padding:"8px",background:C.faint,border:`1px solid ${C.borderHi}`,borderRadius:7,color:C.text,fontFamily:"'JetBrains Mono',monospace",fontSize:13,outline:"none",textAlign:"center"}}/>
          <input value={weight} onChange={e=>setWeight(e.target.value)} placeholder="kg" type="number" style={{width:60,padding:"8px",background:C.faint,border:`1px solid ${C.borderHi}`,borderRadius:7,color:C.text,fontFamily:"'JetBrains Mono',monospace",fontSize:13,outline:"none",textAlign:"center"}}/>
          <button onClick={()=>{onAddSet(Number(reps)||0,Number(weight)||0);setAdding(false);}} style={{flex:1,background:accentColor,border:"none",borderRadius:7,padding:"8px 0",color:"#fff",fontFamily:"'Barlow Condensed',sans-serif",fontSize:14,fontWeight:600,cursor:"pointer",letterSpacing:1}}>LOG</button>
          <button onClick={()=>setAdding(false)} style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:7,padding:"8px 10px",color:C.muted,fontFamily:"'Barlow Condensed',sans-serif",fontSize:14,cursor:"pointer"}}>✕</button>
        </div>
      ):(
        <button onClick={()=>setAdding(true)} style={{width:"100%",marginTop:exercise.sets.length>0?0:10,padding:"9px",background:"transparent",border:`1px dashed ${C.border}`,borderRadius:8,cursor:"pointer",fontFamily:"'Barlow Condensed',sans-serif",fontSize:13,letterSpacing:1,color:C.muted,transition:"all .15s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=accentColor;e.currentTarget.style.color=accentColor;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.muted;}}>
          + ADD SET
        </button>
      )}
    </Card>
  );
}

/* ══════════════════════ GYM PAGE ═══════════════════════════════════════════ */
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
  useEffect(()=>{ setMuscleTotals(lget("muscleTotals")||{}); setReady(true); },[]);
  const progress=calcMuscleProgress(muscleTotals);
  const selectDay=(dayId)=>{ setSelectedDay(dayId); const saved=lget("workout:"+today+":"+dayId); setWorkout(saved||{dayType:dayId,exercises:[]}); setShowAddEx(false); };
  const saveW=(updated)=>{ setWorkout(updated); lset("workout:"+today+":"+updated.dayType,updated); };
  const addExercise=(name,muscleGroups)=>{ if(!workout)return; saveW({...workout,exercises:[...workout.exercises,{id:uid(),name,muscleGroups,sets:[]}]}); setShowAddEx(false); setCustomExName(""); };
  const removeExercise=(exId)=>{
    if(!workout)return;
    const ex=workout.exercises.find(e=>e.id===exId);
    if(ex){ const t={...muscleTotals}; ex.sets.forEach(()=>ex.muscleGroups.forEach(mg=>{ t[mg]=Math.max(0,(t[mg]||0)-1); })); setMuscleTotals(t); lset("muscleTotals",t); }
    saveW({...workout,exercises:workout.exercises.filter(e=>e.id!==exId)});
  };
  const addSet=(exId,reps,weight)=>{
    if(!workout)return;
    const ex=workout.exercises.find(e=>e.id===exId);
    saveW({...workout,exercises:workout.exercises.map(e=>e.id===exId?{...e,sets:[...e.sets,{id:uid(),reps,weight}]}:e)});
    if(ex){ const t={...muscleTotals}; ex.muscleGroups.forEach(mg=>{ t[mg]=(t[mg]||0)+1; }); setMuscleTotals(t); lset("muscleTotals",t); }
  };
  const removeSet=(exId,setId)=>{
    if(!workout)return;
    const ex=workout.exercises.find(e=>e.id===exId);
    if(ex&&ex.sets.find(s=>s.id===setId)){ const t={...muscleTotals}; ex.muscleGroups.forEach(mg=>{ t[mg]=Math.max(0,(t[mg]||0)-1); }); setMuscleTotals(t); lset("muscleTotals",t); }
    saveW({...workout,exercises:workout.exercises.map(e=>e.id===exId?{...e,sets:e.sets.filter(s=>s.id!==setId)}:e)});
  };
  const curDef=PPL_DAYS.find(d=>d.id===selectedDay);
  if(!ready)return null;
  return (
    <div>
      <div style={{marginBottom:24}}>
        <SectionLabel action={
          <div style={{display:"flex",gap:5}}>
            {["front","back"].map(v=>(
              <button key={v} onClick={()=>setBodyView(v)} style={{background:bodyView===v?C.accent:C.faint,border:`1px solid ${bodyView===v?C.accent:C.border}`,borderRadius:6,padding:"4px 10px",color:bodyView===v?"#fff":C.muted,fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,letterSpacing:1,cursor:"pointer",transition:"all .2s"}}>
                {v.toUpperCase()}
              </button>
            ))}
          </div>
        }>Muscle Progress</SectionLabel>
        <Card>
          <div style={{display:"flex",gap:16,alignItems:"flex-start"}}>
            <div style={{width:120,flexShrink:0}}><BodyMapSVG progress={progress} view={bodyView}/></div>
            <div style={{flex:1,paddingTop:4}}>
              {(bodyView==="front"?["chest","shoulders","biceps","abs","legs"]:["back","triceps","legs"]).map(m=>{
                const pct=Math.round(progress[m]||0);
                return (
                  <div key={m} style={{marginBottom:9}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                      <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:13,letterSpacing:0.5,textTransform:"capitalize"}}>{m}</span>
                      <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:C.muted}}>{muscleTotals[m]||0} sets</span>
                    </div>
                    <div style={{background:C.faint,borderRadius:2,height:4,overflow:"hidden"}}>
                      <div style={{width:`${pct}%`,height:"100%",borderRadius:2,background:muscleColor(pct),transition:"width .5s ease"}}/>
                    </div>
                  </div>
                );
              })}
              <div style={{marginTop:10,display:"flex",alignItems:"center",gap:6}}>
                <div style={{flex:1,height:3,borderRadius:2,background:`linear-gradient(to right,${C.faint},rgb(59,130,246))`}}/>
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:8,color:C.muted}}>0 → MAX</span>
              </div>
            </div>
          </div>
        </Card>
      </div>
      <div style={{marginBottom:20}}>
        <SectionLabel>Today's Workout</SectionLabel>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
          {PPL_DAYS.map(day=>(
            <button key={day.id} onClick={()=>selectDay(day.id)} style={{background:selectedDay===day.id?`${day.color}18`:C.faint,border:`1px solid ${selectedDay===day.id?day.color:C.border}`,borderRadius:9,padding:"10px 12px",textAlign:"left",cursor:"pointer",transition:"all .2s ease"}}>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:12,fontWeight:700,letterSpacing:1,color:selectedDay===day.id?day.color:C.muted,marginBottom:2}}>DAY {day.day}</div>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:15,fontWeight:600,letterSpacing:0.3,color:selectedDay===day.id?C.text:C.muted}}>{day.short}</div>
            </button>
          ))}
        </div>
      </div>
      {selectedDay&&workout&&curDef&&(
        <div style={{animation:"slideIn .3s ease"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:20,fontWeight:700,color:curDef.color,letterSpacing:0.5}}>{curDef.label}</div>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:C.muted}}>{workout.exercises.reduce((n,e)=>n+e.sets.length,0)} SETS</div>
          </div>
          {workout.exercises.map(ex=>(
            <ExerciseCard key={ex.id} exercise={ex} accentColor={curDef.color} onAddSet={(r,w)=>addSet(ex.id,r,w)} onRemoveSet={sid=>removeSet(ex.id,sid)} onRemove={()=>removeExercise(ex.id)}/>
          ))}
          {showAddEx?(
            <Card style={{marginBottom:10,border:`1px solid ${curDef.color}44`}}>
              <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:C.muted,letterSpacing:1,marginBottom:10}}>QUICK ADD</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:12}}>
                {curDef.suggestions.filter(s=>!workout.exercises.find(e=>e.name===s)).map(s=>(
                  <button key={s} onClick={()=>addExercise(s,curDef.muscles)} style={{background:C.faint,border:`1px solid ${C.border}`,borderRadius:6,padding:"6px 10px",fontFamily:"'Barlow Condensed',sans-serif",fontSize:13,color:C.text,cursor:"pointer",transition:"all .15s"}} onMouseEnter={e=>{e.target.style.borderColor=curDef.color;e.target.style.color=curDef.color;}} onMouseLeave={e=>{e.target.style.borderColor=C.border;e.target.style.color=C.text;}}>{s}</button>
                ))}
              </div>
              <div style={{display:"flex",gap:8}}>
                <input ref={exInputRef} value={customExName} onChange={e=>setCustomExName(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&customExName.trim())addExercise(customExName.trim(),curDef.muscles);}} placeholder="Custom exercise..." style={{flex:1,padding:"10px 12px",background:C.faint,border:`1px solid ${C.borderHi}`,borderRadius:8,color:C.text,fontFamily:"'Barlow Condensed',sans-serif",fontSize:14,outline:"none"}}/>
                <button onClick={()=>{if(customExName.trim())addExercise(customExName.trim(),curDef.muscles);}} style={{background:curDef.color,border:"none",borderRadius:8,padding:"10px 16px",color:"#fff",fontFamily:"'Barlow Condensed',sans-serif",fontSize:14,fontWeight:600,cursor:"pointer"}}>ADD</button>
                <button onClick={()=>{setShowAddEx(false);setCustomExName("");}} style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 12px",color:C.muted,fontFamily:"'Barlow Condensed',sans-serif",fontSize:14,cursor:"pointer"}}>✕</button>
              </div>
            </Card>
          ):(
            <button onClick={()=>{setShowAddEx(true);setTimeout(()=>exInputRef.current?.focus(),50);}} style={{width:"100%",padding:"12px",background:C.faint,border:`1px dashed ${C.borderHi}`,borderRadius:10,cursor:"pointer",fontFamily:"'Barlow Condensed',sans-serif",fontSize:14,letterSpacing:1,color:C.muted,transition:"all .2s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=curDef.color;e.currentTarget.style.color=curDef.color;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=C.borderHi;e.currentTarget.style.color=C.muted;}}>
              + ADD EXERCISE
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════ HABIT ROW ══════════════════════════════════════════ */
function HabitRow({ label, cat, done, onToggle, onCalendar, onRemove, index }){
  return (
    <div style={{display:"flex",alignItems:"stretch",marginBottom:6,animation:`slideIn .3s ease ${index*.04}s both`}}>
      <div onClick={onToggle} style={{flex:1,display:"flex",alignItems:"center",gap:12,padding:"12px 14px",background:done?C.accentGlow:C.surface,border:`1px solid ${done?C.accentDim:C.border}`,borderRadius:onCalendar||onRemove?"10px 0 0 10px":"10px",cursor:"pointer",transition:"all .2s ease",borderRight:"none"}}>
        <div style={{width:20,height:20,borderRadius:6,flexShrink:0,background:done?C.accent:"transparent",border:`1.5px solid ${done?C.accent:C.borderHi}`,display:"flex",alignItems:"center",justifyContent:"center",transition:"all .2s ease"}}>
          {done&&<svg width="11" height="9" viewBox="0 0 11 9" fill="none"><path d="M1 4L4 7.5L10 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
        </div>
        <div style={{minWidth:0}}>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:16,letterSpacing:0.5,color:done?C.accent:C.text,transition:"color .2s"}}>{label}</div>
          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:C.muted,marginTop:2,letterSpacing:1}}>{cat}</div>
        </div>
      </div>
      {onCalendar&&(
        <button onClick={onCalendar} style={{padding:"0 12px",background:done?C.accentGlow:C.surface,border:`1px solid ${done?C.accentDim:C.border}`,borderLeft:`1px solid ${C.borderHi}`,borderRadius:onRemove?"0":"0 10px 10px 0",cursor:"pointer",color:C.muted,fontSize:15,transition:"all .2s",display:"flex",alignItems:"center",borderRight:onRemove?"none":undefined}} onMouseEnter={e=>{e.currentTarget.style.color=C.accent;}} onMouseLeave={e=>{e.currentTarget.style.color=C.muted;}}>📅</button>
      )}
      {onRemove&&(
        <button onClick={onRemove} style={{padding:"0 10px",background:C.surface,border:`1px solid ${C.border}`,borderLeft:"none",borderRadius:"0 10px 10px 0",cursor:"pointer",color:C.muted,fontSize:16,transition:"color .15s",display:"flex",alignItems:"center"}} onMouseEnter={e=>{e.currentTarget.style.color=C.danger;}} onMouseLeave={e=>{e.currentTarget.style.color=C.muted;}}>×</button>
      )}
    </div>
  );
}

/* ══════════════════════ HABITS PAGE ════════════════════════════════════════ */
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
    const day=lget("day:"+today)||{habits:{},sleep:false};
    const wk=lget("week:"+week)||{runs:0};
    const gymWk=lget("gymWeek:"+week)||{count:0};
    const cust=lget("customHabits")||[];
    setHabits(day.habits||{});
    setSleepDone(day.sleep===true);
    setRuns(wk.runs||0);
    setGymCount(gymWk.count||0);
    setCustomHabits(cust);
    let s=0; const chk=new Date(); chk.setDate(chk.getDate()-1);
    for(let i=0;i<90;i++){
      const d=lget("day:"+chk.toISOString().slice(0,10));
      if(d&&Object.values(d.habits||{}).filter(Boolean).length>=CORE_HABITS.length)s++;
      else break;
      chk.setDate(chk.getDate()-1);
    }
    setStreak(s);
    const bars=[];
    for(let i=6;i>=0;i--){
      const dt=new Date(); dt.setDate(dt.getDate()-i);
      const ds=dt.toISOString().slice(0,10);
      const dd=ds===today?day:lget("day:"+ds);
      const cnt=dd?Object.values(dd.habits||{}).filter(Boolean).length:0;
      bars.push({day:["Su","Mo","Tu","We","Th","Fr","Sa"][dt.getDay()],cnt,isToday:ds===today});
    }
    setChart(bars);
    setReady(true);
  },[]);
  const persistDay=useCallback((h,sl)=>{ lset("day:"+today,{habits:h,sleep:sl}); },[today]);
  const toggleHabit=useCallback((id)=>{
    setHabits(prev=>{
      const next={...prev,[id]:!prev[id]};
      persistDay(next,sleepDone);
      const cnt=Object.values(next).filter(Boolean).length;
      setChart(c=>c.map(b=>b.isToday?{...b,cnt}:b));
      if(cnt>=CORE_HABITS.length+customHabits.length) setTimeout(()=>setShowComplete(true),200);
      return next;
    });
  },[sleepDone,customHabits.length,persistDay]);
  const toggleSleep=()=>{ const n=!sleepDone; setSleepDone(n); persistDay(habits,n); };
  const addRun=()=>{ const n=runs<RUN_TARGET?runs+1:0; setRuns(n); lset("week:"+week,{runs:n}); };
  const addGym=()=>{ const n=gymCount<GYM_TARGET?gymCount+1:0; setGymCount(n); lset("gymWeek:"+week,{count:n}); };
  const submitCustom=()=>{
    const label=newTask.trim(); if(!label)return;
    const id="custom_"+Date.now(),next=[...customHabits,{id,label}];
    setCustomHabits(next); lset("customHabits",next);
    setNewTask(""); setAddingTask(false);
  };
  const removeCustom=(id)=>{
    const next=customHabits.filter(c=>c.id!==id);
    setCustomHabits(next); lset("customHabits",next);
    setHabits(prev=>{ const n={...prev}; delete n[id]; persistDay(n,sleepDone); return n; });
  };
  const done=Object.values(habits).filter(Boolean).length,total=allHabits.length,allDone=done>=total;
  const displayStreak=allDone?streak+1:streak;
  const dayLabel=new Date().toLocaleDateString("en-US",{weekday:"long",month:"short",day:"numeric"});
  if(!ready)return null;
  return (
    <div>
      {showComplete&&(
        <div onClick={()=>setShowComplete(false)} style={{position:"fixed",inset:0,background:"rgba(8,9,10,0.9)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:300,cursor:"pointer",animation:"fadeIn .2s ease"}}>
          <div style={{textAlign:"center",animation:"popIn .35s ease"}}>
            <div style={{fontSize:88,lineHeight:1}}>🔥</div>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:50,fontWeight:700,color:C.accent,letterSpacing:6,marginTop:14}}>ALL DONE</div>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.muted,marginTop:10,letterSpacing:2}}>TAP TO CLOSE</div>
          </div>
        </div>
      )}
      {calHabit&&<CalendarModal habitId={calHabit.id} habitLabel={calHabit.label} onClose={()=>setCalHabit(null)}/>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:28,animation:"slideIn .4s ease"}}>
        <div>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:60,fontWeight:700,lineHeight:0.88,letterSpacing:2,color:C.accent}}>LOCK</div>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:60,fontWeight:700,lineHeight:0.88,letterSpacing:2,color:C.text}}>IN.</div>
          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.muted,letterSpacing:1.5,marginTop:10}}>{dayLabel.toUpperCase()}</div>
        </div>
        <div style={{textAlign:"right",paddingTop:4}}>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:70,fontWeight:300,lineHeight:1,color:C.accent,letterSpacing:-2}}>{daysLeft()}</div>
          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:C.muted,letterSpacing:1,lineHeight:1.7}}>DAYS TO<br/>JUNE 1ST</div>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:24,animation:"slideIn .4s ease .05s both"}}>
        <Card highlight={displayStreak>0}>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:46,fontWeight:700,lineHeight:1,color:displayStreak>0?C.accent:C.text}}>{displayStreak} <span style={{fontSize:26}}>🔥</span></div>
          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:C.muted,marginTop:6,letterSpacing:1}}>DAY STREAK</div>
        </Card>
        <Card highlight={allDone}>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:46,fontWeight:700,lineHeight:1,color:allDone?C.accent:C.text}}>{done}<span style={{fontSize:22,color:C.muted,fontWeight:400}}>/{total}</span></div>
          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:C.muted,marginTop:6,letterSpacing:1}}>TODAY DONE</div>
        </Card>
      </div>
      <div style={{marginBottom:24,animation:"slideIn .4s ease .1s both"}}>
        <SectionLabel>Daily Grind</SectionLabel>
        {CORE_HABITS.map((h,i)=>(
          <HabitRow key={h.id} label={h.label} cat={h.cat} done={!!habits[h.id]} onToggle={()=>toggleHabit(h.id)} onCalendar={()=>setCalHabit({id:h.id,label:h.label})} index={i}/>
        ))}
      </div>
      <div style={{marginBottom:24,animation:"slideIn .4s ease .13s both"}}>
        <SectionLabel action={
          <button onClick={()=>{setAddingTask(true);setTimeout(()=>inputRef.current?.focus(),50);}} style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:6,padding:"4px 10px",color:C.muted,fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,letterSpacing:1,cursor:"pointer",transition:"all .2s"}} onMouseEnter={e=>{e.target.style.borderColor=C.accent;e.target.style.color=C.accent;}} onMouseLeave={e=>{e.target.style.borderColor=C.border;e.target.style.color=C.muted;}}>+ ADD</button>
        }>Custom Tasks</SectionLabel>
        {customHabits.length===0&&!addingTask&&(
          <div style={{padding:"18px 14px",border:`1px dashed ${C.border}`,borderRadius:10,textAlign:"center",fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.muted,lineHeight:1.8}}>
            No custom tasks yet.<br/><span style={{color:C.accent,cursor:"pointer"}} onClick={()=>{setAddingTask(true);setTimeout(()=>inputRef.current?.focus(),50);}}>+ Add one</span>
          </div>
        )}
        {customHabits.map((h,i)=>(
          <HabitRow key={h.id} label={h.label} cat="CUSTOM" done={!!habits[h.id]} onToggle={()=>toggleHabit(h.id)} onCalendar={()=>setCalHabit({id:h.id,label:h.label})} onRemove={()=>removeCustom(h.id)} index={i}/>
        ))}
        {addingTask&&(
          <div style={{display:"flex",gap:8,marginTop:8,animation:"slideIn .2s ease"}}>
            <input ref={inputRef} value={newTask} onChange={e=>setNewTask(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")submitCustom();if(e.key==="Escape"){setAddingTask(false);setNewTask("");}}} placeholder="e.g. Meditate 10 min" style={{flex:1,padding:"11px 14px",background:C.surface,border:`1px solid ${C.accent}`,borderRadius:10,color:C.text,fontFamily:"'Barlow Condensed',sans-serif",fontSize:15,letterSpacing:0.5,outline:"none"}}/>
            <button onClick={submitCustom} style={{background:C.accent,border:"none",borderRadius:10,padding:"11px 18px",color:"#fff",fontFamily:"'Barlow Condensed',sans-serif",fontSize:15,fontWeight:600,letterSpacing:1,cursor:"pointer"}}>ADD</button>
            <button onClick={()=>{setAddingTask(false);setNewTask("");}} style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:10,padding:"11px 14px",color:C.muted,fontFamily:"'Barlow Condensed',sans-serif",fontSize:15,cursor:"pointer"}}>✕</button>
          </div>
        )}
      </div>
      <div style={{marginBottom:24,animation:"slideIn .4s ease .16s both"}}>
        <SectionLabel>Sleep</SectionLabel>
        <div onClick={toggleSleep} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 16px",background:sleepDone?"rgba(34,197,94,0.1)":C.surface,border:`1px solid ${sleepDone?"rgba(34,197,94,0.4)":C.border}`,borderRadius:12,cursor:"pointer",transition:"all .25s ease"}}>
          <div>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:17,fontWeight:600,letterSpacing:0.5,color:sleepDone?C.green:C.text}}>Got 8+ hours of sleep</div>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:C.muted,marginTop:3,letterSpacing:1}}>MINIMUM 8 HRS / NIGHT</div>
          </div>
          <div style={{width:44,height:24,borderRadius:12,background:sleepDone?C.green:C.faint,border:`1.5px solid ${sleepDone?C.green:C.borderHi}`,position:"relative",transition:"all .3s ease",flexShrink:0}}>
            <div style={{position:"absolute",top:2,left:sleepDone?22:2,width:16,height:16,borderRadius:8,background:"#fff",transition:"left .3s ease",boxShadow:"0 1px 3px rgba(0,0,0,0.4)"}}/>
          </div>
        </div>
      </div>
      <div style={{marginBottom:24,animation:"slideIn .4s ease .19s both"}}>
        <SectionLabel>Gym This Week</SectionLabel>
        <Card highlight={gymCount>=GYM_TARGET}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:20,fontWeight:600,letterSpacing:1}}>Gym sessions</div>
              <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:C.muted,marginTop:4}}>5× MINIMUM — PPL SPLIT</div>
            </div>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:52,fontWeight:300,lineHeight:1,color:gymCount>=GYM_TARGET?C.accent:C.text}}>{gymCount}<span style={{fontSize:24,color:C.muted}}>/{GYM_TARGET}</span></div>
          </div>
          <div style={{display:"flex",gap:5,marginBottom:12}}>
            {Array.from({length:GYM_TARGET},(_,i)=><div key={i} style={{flex:1,height:5,borderRadius:3,background:i<gymCount?C.accent:C.faint,transition:"background .3s ease"}}/>)}
          </div>
          <button onClick={addGym} style={{width:"100%",padding:"12px",background:gymCount>=GYM_TARGET?C.accentDim:C.accent,border:"none",borderRadius:9,color:"#fff",fontFamily:"'Barlow Condensed',sans-serif",fontSize:15,fontWeight:600,letterSpacing:2,cursor:"pointer",transition:"background .2s"}}>
            {gymCount>=GYM_TARGET?"✓ WEEK COMPLETE — TAP TO RESET":"+ LOG GYM SESSION"}
          </button>
        </Card>
      </div>
      <div style={{marginBottom:24,animation:"slideIn .4s ease .22s both"}}>
        <SectionLabel>Weekly Runs</SectionLabel>
        <Card highlight={runs>=RUN_TARGET}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:20,fontWeight:600,letterSpacing:1}}>Runs this week</div>
              <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:C.muted,marginTop:4}}>3× MINIMUM</div>
            </div>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:52,fontWeight:300,lineHeight:1,color:runs>=RUN_TARGET?C.accent:C.text}}>{runs}<span style={{fontSize:24,color:C.muted}}>/{RUN_TARGET}</span></div>
          </div>
          <div style={{display:"flex",gap:5,marginBottom:12}}>
            {[0,1,2].map(i=><div key={i} style={{flex:1,height:5,borderRadius:3,background:i<runs?C.accent:C.faint,transition:"background .3s ease"}}/>)}
          </div>
          <button onClick={addRun} style={{width:"100%",padding:"12px",background:runs>=RUN_TARGET?C.accentDim:C.accent,border:"none",borderRadius:9,color:"#fff",fontFamily:"'Barlow Condensed',sans-serif",fontSize:15,fontWeight:600,letterSpacing:2,cursor:"pointer",transition:"background .2s"}}>
            {runs>=RUN_TARGET?"✓ WEEK COMPLETE — TAP TO RESET":"+ LOG A RUN"}
          </button>
        </Card>
      </div>
      <div style={{marginBottom:16,animation:"slideIn .4s ease .25s both"}}>
        <SectionLabel>Last 7 Days</SectionLabel>
        <Card>
          <ResponsiveContainer width="100%" height={100}>
            <BarChart data={chart} barCategoryGap="38%">
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill:C.muted,fontFamily:"JetBrains Mono,monospace",fontSize:10}}/>
              <Bar dataKey="cnt" maxBarSize={28} radius={[4,4,0,0]}>
                {chart.map((c,i)=><Cell key={i} fill={c.isToday?C.accent:c.cnt>0?C.accentDim:C.faint}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{display:"flex",gap:14,paddingLeft:4,marginTop:6}}>
            {[[C.accent,"Today"],[C.accentDim,"Done"],[C.faint,"Missed"]].map(([col,lbl])=>(
              <div key={lbl} style={{display:"flex",alignItems:"center",gap:5}}>
                <div style={{width:8,height:8,background:col,borderRadius:2,border:col===C.faint?`1px solid ${C.border}`:""}}/>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:C.muted,letterSpacing:0.5}}>{lbl}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <div style={{textAlign:"center",paddingTop:16,borderTop:`1px solid ${C.border}`}}>
        <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.faint,letterSpacing:1.5}}>{daysLeft()} days to gym fit</div>
      </div>
    </div>
  );
}

/* ══════════════════════ ROOT ═══════════════════════════════════════════════ */
export default function LockIn(){
  const [page,setPage]=useState("habits");
  const [ready,setReady]=useState(false);
  useEffect(()=>{ setReady(true); },[]);
  if(!ready) return (
    <div style={{background:C.bg,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:22,letterSpacing:5,color:C.muted}}>LOADING</div>
    </div>
  );
  return (
    <div style={{background:C.bg,minHeight:"100vh",color:C.text}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@300;400;500;600;700&family=JetBrains+Mono:wght@300;400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        body{background:${C.bg}!important;-webkit-font-smoothing:antialiased;}
        input{outline:none;} button{cursor:pointer;}
        @keyframes slideIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes popIn{0%{opacity:0;transform:scale(.86)}65%{transform:scale(1.04)}100%{opacity:1;transform:scale(1)}}
      `}</style>
      <div style={{maxWidth:460,margin:"0 auto",padding:"24px 16px 88px"}}>
        {page==="habits"&&<HabitsPage/>}
        {page==="gym"&&<GymPage/>}
      </div>
      <div style={{position:"fixed",bottom:0,left:0,right:0,background:"rgba(8,9,10,0.96)",backdropFilter:"blur(12px)",borderTop:`1px solid ${C.border}`,padding:"10px 0 max(env(safe-area-inset-bottom),10px)",zIndex:100}}>
        <div style={{maxWidth:460,margin:"0 auto",display:"flex",justifyContent:"center",gap:8,padding:"0 16px"}}>
          {[{id:"habits",icon:"✓",label:"Habits"},{id:"gym",icon:"💪",label:"Gym"}].map(tab=>(
            <button key={tab.id} onClick={()=>setPage(tab.id)} style={{flex:1,padding:"10px 0",background:page===tab.id?C.accentGlow:"transparent",border:`1px solid ${page===tab.id?C.accentDim:"transparent"}`,borderRadius:10,display:"flex",flexDirection:"column",alignItems:"center",gap:3,cursor:"pointer",transition:"all .2s ease"}}>
              <span style={{fontSize:18,lineHeight:1}}>{tab.icon}</span>
              <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:12,letterSpacing:1.5,color:page===tab.id?C.accent:C.muted,fontWeight:600}}>{tab.label.toUpperCase()}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
