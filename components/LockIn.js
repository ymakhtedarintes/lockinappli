"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { BarChart, Bar, XAxis, Cell, ResponsiveContainer } from "recharts";
import { supabase } from "../lib/supabase";
import { dbGet, dbSet } from "../lib/db";
import Auth from "./Auth";

const C = {
  bg:"#050b14", surface:"#0b1221", border:"#1a2436", borderHi:"#2a3b59",
  accent:"#00f0ff", accentDim:"#008c99", accentGlow:"rgba(0,240,255,0.04)",
  text:"#f8fafc", muted:"#64748b", faint:"#0f172a",
  danger:"#fb7185", green:"#10b981",
};

const EXERCISE_DB = [
  {name:"Bench Press",           primary:"chest",     detail:"Mid Chest",              secondary:["Triceps","Front Delts"]},
  {name:"Incline DB Press",      primary:"chest",     detail:"Upper Chest",             secondary:["Triceps","Front Delts"]},
  {name:"Decline Press",         primary:"chest",     detail:"Lower Chest",             secondary:["Triceps"]},
  {name:"Cable Fly",             primary:"chest",     detail:"Inner Chest",             secondary:[]},
  {name:"Pec Deck",              primary:"chest",     detail:"Inner / Mid Chest",       secondary:[]},
  {name:"Dips",                  primary:"chest",     detail:"Lower Chest",             secondary:["Triceps","Front Delts"]},
  {name:"Push-ups",              primary:"chest",     detail:"Mid Chest",               secondary:["Triceps","Front Delts"]},
  {name:"Tricep Pushdown",       primary:"triceps",   detail:"Lateral Head",            secondary:[]},
  {name:"Overhead Extension",    primary:"triceps",   detail:"Long Head",               secondary:[]},
  {name:"Skull Crusher",         primary:"triceps",   detail:"All Heads",               secondary:[]},
  {name:"Close Grip Bench",      primary:"triceps",   detail:"All Heads",               secondary:["Chest"]},
  {name:"Tricep Kickback",       primary:"triceps",   detail:"Lateral Head",            secondary:[]},
  {name:"Lat Pulldown",          primary:"back",      detail:"Lats",                    secondary:["Biceps"]},
  {name:"Barbell Row",           primary:"back",      detail:"Mid Back / Lats",         secondary:["Biceps","Rear Delts"]},
  {name:"Seated Cable Row",      primary:"back",      detail:"Mid Back",                secondary:["Biceps"]},
  {name:"Pull-ups",              primary:"back",      detail:"Lats",                    secondary:["Biceps"]},
  {name:"T-Bar Row",             primary:"back",      detail:"Mid Back / Thickness",    secondary:["Biceps"]},
  {name:"Deadlift",              primary:"back",      detail:"Lower Back / Traps",      secondary:["Legs","Glutes"]},
  {name:"Face Pull",             primary:"back",      detail:"Rear Delts / Traps",      secondary:[]},
  {name:"Single Arm Row",        primary:"back",      detail:"Lats / Mid Back",         secondary:["Biceps"]},
  {name:"Barbell Curl",          primary:"biceps",    detail:"Both Heads",              secondary:["Forearms"]},
  {name:"Dumbbell Curl",         primary:"biceps",    detail:"Both Heads",              secondary:["Forearms"]},
  {name:"Hammer Curl",           primary:"biceps",    detail:"Brachioradialis",         secondary:["Forearms","Brachialis"]},
  {name:"Preacher Curl",         primary:"biceps",    detail:"Short Head",              secondary:[]},
  {name:"Incline Curl",          primary:"biceps",    detail:"Long Head Stretch",       secondary:[]},
  {name:"Concentration Curl",    primary:"biceps",    detail:"Short Head / Peak",       secondary:[]},
  {name:"Shoulder Press",        primary:"shoulders", detail:"Front / Mid Delt",        secondary:["Triceps"]},
  {name:"Lateral Raise",         primary:"shoulders", detail:"Lateral Delt",            secondary:[]},
  {name:"Front Raise",           primary:"shoulders", detail:"Front Delt",              secondary:[]},
  {name:"Arnold Press",          primary:"shoulders", detail:"All Three Heads",         secondary:["Triceps"]},
  {name:"Reverse Fly",           primary:"shoulders", detail:"Rear Delt",               secondary:["Traps"]},
  {name:"Upright Row",           primary:"shoulders", detail:"Mid Delt / Traps",        secondary:["Biceps"]},
  {name:"Cable Lateral Raise",   primary:"shoulders", detail:"Lateral Delt",            secondary:[]},
  {name:"Shrugs",                primary:"shoulders", detail:"Upper Traps",             secondary:[]},
  {name:"Squat",                 primary:"legs",      detail:"Quads / Glutes",          secondary:["Lower Back"]},
  {name:"Leg Press",             primary:"legs",      detail:"Quads",                   secondary:["Glutes"]},
  {name:"Romanian Deadlift",     primary:"legs",      detail:"Hamstrings / Glutes",     secondary:["Lower Back"]},
  {name:"Leg Curl",              primary:"legs",      detail:"Hamstrings",              secondary:[]},
  {name:"Leg Extension",         primary:"legs",      detail:"Quads",                   secondary:[]},
  {name:"Calf Raise",            primary:"legs",      detail:"Calves",                  secondary:[]},
  {name:"Hip Thrust",            primary:"legs",      detail:"Glutes",                  secondary:["Hamstrings"]},
  {name:"Lunges",                primary:"legs",      detail:"Quads / Glutes",          secondary:[]},
  {name:"Bulgarian Split Squat", primary:"legs",      detail:"Quads / Glutes",          secondary:[]},
  {name:"Hack Squat",            primary:"legs",      detail:"Quads",                   secondary:["Glutes"]},
  {name:"Crunches",              primary:"abs",       detail:"Upper Abs",               secondary:[]},
  {name:"Plank",                 primary:"abs",       detail:"Full Core",               secondary:["Lower Back"]},
  {name:"Leg Raise",             primary:"abs",       detail:"Lower Abs",               secondary:[]},
  {name:"Cable Crunch",          primary:"abs",       detail:"Upper Abs",               secondary:[]},
  {name:"Russian Twist",         primary:"abs",       detail:"Obliques",                secondary:[]},
  {name:"Mountain Climbers",     primary:"abs",       detail:"Full Core",               secondary:[]},
  {name:"Ab Wheel",              primary:"abs",       detail:"Full Core",               secondary:["Lower Back"]},
  {name:"Hanging Leg Raise",     primary:"abs",       detail:"Lower Abs",               secondary:[]},
  {name:"Bicycle Crunch",        primary:"abs",       detail:"Obliques / Upper Abs",    secondary:[]},
];

const SPLIT_PRESETS = {
  ppl:        {label:"PPL (5 day)",    days:[{id:"d1",label:"Chest & Triceps",muscles:["chest","triceps"]},{id:"d2",label:"Back & Biceps",muscles:["back","biceps"]},{id:"d3",label:"Legs & Shoulders",muscles:["legs","shoulders"]},{id:"d4",label:"Chest & Back",muscles:["chest","back"]},{id:"d5",label:"Abs & Flex",muscles:["abs"]}]},
  arnold:     {label:"Arnold (6 day)", days:[{id:"d1",label:"Chest & Back",muscles:["chest","back"]},{id:"d2",label:"Shoulders & Arms",muscles:["shoulders","biceps","triceps"]},{id:"d3",label:"Legs",muscles:["legs","abs"]},{id:"d4",label:"Chest & Back",muscles:["chest","back"]},{id:"d5",label:"Shoulders & Arms",muscles:["shoulders","biceps","triceps"]},{id:"d6",label:"Legs",muscles:["legs","abs"]}]},
  upper_lower:{label:"Upper/Lower",    days:[{id:"d1",label:"Upper A",muscles:["chest","back","shoulders"]},{id:"d2",label:"Lower A",muscles:["legs","abs"]},{id:"d3",label:"Upper B",muscles:["chest","back","biceps","triceps"]},{id:"d4",label:"Lower B",muscles:["legs","abs"]}]},
  bro:        {label:"Bro Split",      days:[{id:"d1",label:"Chest Day",muscles:["chest"]},{id:"d2",label:"Back Day",muscles:["back"]},{id:"d3",label:"Shoulder Day",muscles:["shoulders"]},{id:"d4",label:"Arms Day",muscles:["biceps","triceps"]},{id:"d5",label:"Leg Day",muscles:["legs","abs"]}]},
  full_body:  {label:"Full Body",      days:[{id:"d1",label:"Full Body A",muscles:["chest","back","legs","shoulders"]},{id:"d2",label:"Full Body B",muscles:["chest","back","legs","biceps","triceps"]},{id:"d3",label:"Full Body C",muscles:["chest","back","legs","abs"]}]},
};

const ALL_MUSCLES = ["chest","back","biceps","triceps","shoulders","legs","abs"];
const MUSCLE_LABELS = {chest:"Chest",back:"Back",biceps:"Biceps",triceps:"Triceps",shoulders:"Shoulders",legs:"Legs",abs:"Abs"};
const CORE_HABITS = [
  {id:"pushups",  label:"Pushups",       cat:"FITNESS"},
  {id:"pullups",  label:"Pullups",        cat:"FITNESS"},
  {id:"read",     label:"Read 15 min",    cat:"MIND"},
  {id:"study",    label:"Study 1 hr",     cat:"SCHOOL"},
  {id:"hw",       label:"Homework 1 hr",  cat:"SCHOOL"},
  {id:"projects", label:"Projects 1 hr",  cat:"SCHOOL"},
];
const JUNE_1 = new Date("2026-06-01T00:00:00");
const RUN_TARGET = 3;
const MUSCLE_GROUPS = ["chest","back","biceps","triceps","shoulders","legs","abs"];
const DAY_COLORS = ["#00f0ff","#818cf8","#34d399","#c084fc","#f472b6","#fb923c","#38bdf8"];

function todayKey(){ return new Date().toISOString().slice(0,10); }
function weekKey(){ const d=new Date(),day=d.getDay(),m=new Date(d); m.setDate(d.getDate()-day+(day===0?-6:1)); return m.toISOString().slice(0,10); }
function daysLeft(){ return Math.max(0,Math.ceil((JUNE_1-new Date())/86400000)); }
function mkDate(y,mo,d){ return `${y}-${String(mo+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`; }
function fmtMonth(y,m){ return new Date(y,m,1).toLocaleDateString("en-US",{month:"long",year:"numeric"}); }
function uid(){ return Math.random().toString(36).slice(2,9); }
function getSuggestions(muscles){ return EXERCISE_DB.filter(ex=>muscles.includes(ex.primary)); }
function muscleColor(p){
  const t=Math.min(1,Math.max(0,p/100));
  if(t<0.02)return C.borderHi;
  return `rgb(${Math.round(26+(0-26)*t)},${Math.round(36+(240-36)*t)},${Math.round(54+(255-54)*t)})`;
}
function calcMuscleProgress(totals){
  const MAX=300,out={};
  MUSCLE_GROUPS.forEach(m=>{ out[m]=Math.min(100,((totals[m]||0)/MAX)*100); });
  return out;
}

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=JetBrains+Mono:wght@300;400;500;600&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  body{background:#050b14!important;-webkit-font-smoothing:antialiased;}
  input,button{outline:none;cursor:pointer;}
  .hover-lift{transition:all .25s cubic-bezier(.175,.885,.32,1.275);}
  .hover-lift:hover{transform:translateY(-2px);box-shadow:0 8px 20px rgba(0,0,0,0.4);}
  .btn-press:active{transform:scale(.96);}
  @keyframes slideIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
  @keyframes fadeIn{from{opacity:0}to{opacity:1}}
  @keyframes popIn{0%{opacity:0;transform:scale(.86)}65%{transform:scale(1.04)}100%{opacity:1;transform:scale(1)}}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
`;

function SectionLabel({children,action}){
  return(
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
      <div style={{fontFamily:"'Outfit',sans-serif",fontSize:12,letterSpacing:3,color:C.muted,textTransform:"uppercase"}}>{children}</div>
      {action}
    </div>
  );
}
function Card({children,highlight,style={},className=""}){
  return(
    <div className={`hover-lift ${className}`} style={{background:highlight?`${C.accent}0a`:C.surface,border:`1px solid ${highlight?C.accentDim:C.border}`,boxShadow:highlight?`0 0 20px ${C.accentGlow}`:"none",borderRadius:14,padding:18,...style}}>
      {children}
    </div>
  );
}
function MusclePill({label,primary}){
  return(
    <span style={{display:"inline-block",padding:"2px 7px",borderRadius:4,fontSize:9,fontFamily:"'JetBrains Mono',monospace",letterSpacing:0.5,background:primary?`${C.accent}18`:C.borderHi,color:primary?C.accent:C.muted,border:`1px solid ${primary?C.accentDim:C.border}`,marginRight:3,marginBottom:3,whiteSpace:"nowrap"}}>{label}</span>
  );
}

/* ══════════ ONBOARDING ════════════════════════════════════════════════════ */
function Onboarding({onComplete}){
  const [step,setStep]=useState(0);
  const [selectedHabits,setSelectedHabits]=useState(CORE_HABITS.map(h=>h.id));
  const [splitPreset,setSplitPreset]=useState("ppl");
  const [gymDaysTarget,setGymDaysTarget]=useState(5);

  const toggleHabit=(id)=>setSelectedHabits(prev=>prev.includes(id)?prev.filter(x=>x!==id):[...prev,id]);

  const finish=async()=>{
    const split=SPLIT_PRESETS[splitPreset].days.slice(0,gymDaysTarget);
    const config={habitsEnabled:selectedHabits,split,gymDaysTarget};
    await dbSet("userConfig",config);
    onComplete(config);
  };

  const steps=[
    {
      title:"Which habits do you want to track daily?",
      sub:"You can always change these later.",
      content:(
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {CORE_HABITS.map(h=>{
            const on=selectedHabits.includes(h.id);
            return(
              <div key={h.id} onClick={()=>toggleHabit(h.id)} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px",background:on?`${C.accent}15`:C.surface,border:`1px solid ${on?C.accentDim:C.border}`,borderRadius:12,cursor:"pointer",transition:"all .2s"}}>
                <div style={{width:22,height:22,borderRadius:6,flexShrink:0,background:on?C.accent:C.bg,border:`1.5px solid ${on?C.accent:C.borderHi}`,display:"flex",alignItems:"center",justifyContent:"center",transition:"all .2s"}}>
                  {on&&<svg width="12" height="10" viewBox="0 0 12 10" fill="none"><path d="M1 5L4.5 8.5L11 1" stroke={C.bg} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </div>
                <div>
                  <div style={{fontFamily:"'Outfit',sans-serif",fontSize:17,fontWeight:500,color:on?C.accent:C.text}}>{h.label}</div>
                  <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:C.muted,marginTop:2,letterSpacing:1}}>{h.cat}</div>
                </div>
              </div>
            );
          })}
        </div>
      ),
      canNext:selectedHabits.length>0,
    },
    {
      title:"Pick your training split.",
      sub:"How do you want to structure your gym sessions?",
      content:(
        <div>
          <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:20}}>
            {Object.entries(SPLIT_PRESETS).map(([key,preset])=>{
              const on=splitPreset===key;
              return(
                <div key={key} onClick={()=>setSplitPreset(key)} style={{padding:"14px 16px",background:on?`${C.accent}15`:C.surface,border:`1px solid ${on?C.accentDim:C.border}`,borderRadius:12,cursor:"pointer",transition:"all .2s"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div style={{fontFamily:"'Outfit',sans-serif",fontSize:17,fontWeight:600,color:on?C.accent:C.text}}>{preset.label}</div>
                    <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.muted,letterSpacing:1}}>{preset.days.length} DAYS</div>
                  </div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:8}}>
                    {preset.days.map(d=><span key={d.id} style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:C.muted,background:C.borderHi,padding:"2px 6px",borderRadius:4}}>{d.label}</span>)}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{padding:"14px 16px",background:C.surface,border:`1px solid ${C.border}`,borderRadius:12}}>
            <div style={{fontFamily:"'Outfit',sans-serif",fontSize:15,fontWeight:600,marginBottom:12}}>How many days/week?</div>
            <div style={{display:"flex",gap:8}}>
              {[2,3,4,5,6,7].map(n=>(
                <button key={n} onClick={()=>setGymDaysTarget(n)} className="btn-press" style={{flex:1,padding:"10px 0",background:gymDaysTarget===n?C.accent:C.faint,border:`1px solid ${gymDaysTarget===n?C.accent:C.border}`,borderRadius:8,color:gymDaysTarget===n?C.bg:C.muted,fontFamily:"'JetBrains Mono',monospace",fontSize:14,fontWeight:700,cursor:"pointer",transition:"all .2s"}}>{n}</button>
              ))}
            </div>
          </div>
        </div>
      ),
      canNext:true,
    },
  ];

  const s=steps[step];
  return(
    <div style={{background:C.bg,minHeight:"100vh",display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"40px 16px 40px",fontFamily:"'Outfit',sans-serif",color:C.text}}>
      <style>{CSS}</style>
      <div style={{width:"100%",maxWidth:440,animation:"slideIn .4s ease"}}>
        <div style={{marginBottom:32}}>
          <div style={{fontFamily:"'Outfit',sans-serif",fontSize:52,fontWeight:700,lineHeight:0.88,letterSpacing:2,color:C.accent,textShadow:`0 0 16px ${C.accentGlow}`}}>LOCK</div>
          <div style={{fontFamily:"'Outfit',sans-serif",fontSize:52,fontWeight:700,lineHeight:0.88,letterSpacing:2,color:C.text}}>IN.</div>
          <div style={{marginTop:16,display:"flex",gap:6}}>
            {steps.map((_,i)=><div key={i} style={{height:3,flex:1,borderRadius:2,background:i<=step?C.accent:C.border,transition:"background .3s"}}/>)}
          </div>
        </div>
        <div style={{marginBottom:8,fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.muted,letterSpacing:2}}>STEP {step+1} OF {steps.length}</div>
        <div style={{fontFamily:"'Outfit',sans-serif",fontSize:24,fontWeight:700,marginBottom:6}}>{s.title}</div>
        <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.muted,letterSpacing:1,marginBottom:20}}>{s.sub}</div>
        <div style={{marginBottom:28}}>{s.content}</div>
        <div style={{display:"flex",gap:10}}>
          {step>0&&<button onClick={()=>setStep(s=>s-1)} className="btn-press" style={{flex:1,padding:"14px",background:"transparent",border:`1px solid ${C.border}`,borderRadius:12,color:C.muted,fontFamily:"'Outfit',sans-serif",fontSize:16,fontWeight:600,cursor:"pointer"}}>← Back</button>}
          <button onClick={step<steps.length-1?()=>setStep(s=>s+1):finish} disabled={!s.canNext} className="btn-press" style={{flex:2,padding:"14px",background:s.canNext?C.accent:C.borderHi,border:"none",borderRadius:12,color:C.bg,fontFamily:"'Outfit',sans-serif",fontSize:16,fontWeight:700,letterSpacing:2,cursor:s.canNext?"pointer":"default",transition:"all .2s",boxShadow:s.canNext?`0 4px 16px ${C.accent}44`:"none"}}>
            {step<steps.length-1?"NEXT →":"LET'S GO →"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════ CALENDAR MODAL ════════════════════════════════════════════════ */
function CalendarModal({habitId,habitLabel,onClose}){
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
      for(let i=1;i<=days;i++){const ds=mkDate(yr,mo,i),raw=await dbGet("day:"+ds); d[ds]=raw?.habits?.[habitId]??null;}
      if(!cancelled){setData(d);setLoading(false);}
    })();
    return()=>{cancelled=true;};
  },[yr,mo,habitId]);
  const daysInMonth=new Date(yr,mo+1,0).getDate(),firstDow=new Date(yr,mo,1).getDay(),cells=[];
  for(let i=0;i<firstDow;i++)cells.push(null);
  for(let d=1;d<=daysInMonth;d++)cells.push(d);
  const canNext=yr<now.getFullYear()||(yr===now.getFullYear()&&mo<now.getMonth());
  return(
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(5,11,20,0.95)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:400,padding:"0 16px",animation:"fadeIn .2s ease"}}>
      <div onClick={e=>e.stopPropagation()} style={{background:C.surface,border:`1px solid ${C.borderHi}`,boxShadow:"0 20px 40px rgba(0,0,0,.5)",borderRadius:16,padding:"20px 16px",width:"100%",maxWidth:340,animation:"popIn .25s cubic-bezier(.175,.885,.32,1.275)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div style={{fontFamily:"'Outfit',sans-serif",fontSize:20,fontWeight:600,color:C.text}}>{habitLabel}</div>
          <button onClick={onClose} className="btn-press" style={{background:"transparent",border:"none",color:C.muted,fontSize:26,lineHeight:1}}>×</button>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <button onClick={()=>{if(mo===0){setMo(11);setYr(y=>y-1);}else setMo(m=>m-1);}} className="btn-press" style={{background:C.faint,border:`1px solid ${C.border}`,color:C.text,width:36,height:36,borderRadius:10,fontSize:18,display:"flex",alignItems:"center",justifyContent:"center"}}>‹</button>
          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.accent,letterSpacing:2}}>{fmtMonth(yr,mo).toUpperCase()}</div>
          <button onClick={()=>{if(!canNext)return;if(mo===11){setMo(0);setYr(y=>y+1);}else setMo(m=>m+1);}} className="btn-press" style={{background:C.faint,border:`1px solid ${canNext?C.border:"transparent"}`,color:canNext?C.text:C.faint,width:36,height:36,borderRadius:10,fontSize:18,display:"flex",alignItems:"center",justifyContent:"center"}}>›</button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4,marginBottom:8}}>
          {["S","M","T","W","T","F","S"].map((d,i)=><div key={i} style={{textAlign:"center",fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:C.muted,paddingBottom:4}}>{d}</div>)}
        </div>
        {loading?<div style={{textAlign:"center",padding:"24px 0",fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.muted}}>loading...</div>:(
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4}}>
            {cells.map((day,i)=>{
              if(!day)return<div key={i}/>;
              const ds=mkDate(yr,mo,day),isToday=ds===todayStr,isPast=ds<todayStr,status=data[ds];
              let bg=C.faint,tc=C.muted,bc="transparent";
              if(status===true){bg=`${C.accent}18`;tc=C.accent;bc=C.accentDim;}
              else if(isPast){bg="rgba(251,113,133,0.08)";tc="#fb718560";}
              return<div key={i} style={{aspectRatio:"1",display:"flex",alignItems:"center",justifyContent:"center",background:bg,borderRadius:8,border:isToday?`1.5px solid ${C.text}`:`1px solid ${bc}`,fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:tc}}>{day}</div>;
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════ BODY MAP ═══════════════════════════════════════════════════════ */
function BodyMapSVG({progress,view}){
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
  if(view==="front")return(
    <svg viewBox="0 0 160 318" style={{width:"100%",height:"100%",filter:"drop-shadow(0 4px 12px rgba(0,0,0,.5))"}}>
      <Sil/>
      <ellipse cx={38} cy={76} rx={16} ry={15} fill={mc("shoulders")} style={{transition:"fill .5s"}}/>
      <ellipse cx={122} cy={76} rx={16} ry={15} fill={mc("shoulders")} style={{transition:"fill .5s"}}/>
      <ellipse cx={64} cy={90} rx={18} ry={19} fill={mc("chest")} style={{transition:"fill .5s"}}/>
      <ellipse cx={96} cy={90} rx={18} ry={19} fill={mc("chest")} style={{transition:"fill .5s"}}/>
      <rect x={20} y={86} width={16} height={32} rx={8} fill={mc("biceps")} style={{transition:"fill .5s"}}/>
      <rect x={124} y={86} width={16} height={32} rx={8} fill={mc("biceps")} style={{transition:"fill .5s"}}/>
      {[0,1,2].map(row=>[0,1].map(col=>(<rect key={`${row}-${col}`} x={63+col*18} y={114+row*19} width={14} height={15} rx={4} fill={mc("abs")} style={{transition:"fill .5s"}}/>)))}
      <rect x={46} y={190} width={26} height={60} rx={13} fill={mc("legs")} style={{transition:"fill .5s"}}/>
      <rect x={88} y={190} width={26} height={60} rx={13} fill={mc("legs")} style={{transition:"fill .5s"}}/>
    </svg>
  );
  return(
    <svg viewBox="0 0 160 318" style={{width:"100%",height:"100%",filter:"drop-shadow(0 4px 12px rgba(0,0,0,.5))"}}>
      <Sil/>
      <path d="M74,50 L86,50 L120,68 L80,80 L40,68 Z" fill={mc("back")} style={{transition:"fill .5s"}}/>
      <path d="M42,72 C30,82 26,105 28,130 L44,138 L44,90 Z" fill={mc("back")} style={{transition:"fill .5s"}}/>
      <path d="M118,72 C130,82 134,105 132,130 L116,138 L116,90 Z" fill={mc("back")} style={{transition:"fill .5s"}}/>
      <rect x={20} y={86} width={16} height={32} rx={8} fill={mc("triceps")} style={{transition:"fill .5s"}}/>
      <rect x={124} y={86} width={16} height={32} rx={8} fill={mc("triceps")} style={{transition:"fill .5s"}}/>
      <ellipse cx={59} cy={184} rx={14} ry={12} fill={mc("legs")} style={{transition:"fill .5s"}}/>
      <ellipse cx={101} cy={184} rx={14} ry={12} fill={mc("legs")} style={{transition:"fill .5s"}}/>
      <rect x={46} y={196} width={26} height={58} rx={13} fill={mc("legs")} style={{transition:"fill .5s"}}/>
      <rect x={88} y={196} width={26} height={58} rx={13} fill={mc("legs")} style={{transition:"fill .5s"}}/>
    </svg>
  );
}

/* ══════════ EXERCISE CARD ══════════════════════════════════════════════════ */
function ExerciseCard({exercise,accentColor,onAddSet,onRemoveSet,onRemove}){
  const [reps,setReps]=useState("10");
  const [weight,setWeight]=useState("");
  const [adding,setAdding]=useState(false);
  const exData=EXERCISE_DB.find(e=>e.name===exercise.name);
  return(
    <Card style={{marginBottom:12,borderColor:C.borderHi}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontFamily:"'Outfit',sans-serif",fontSize:17,fontWeight:600}}>{exercise.name}</div>
          {exData&&<div style={{marginTop:5,display:"flex",flexWrap:"wrap"}}><MusclePill label={exData.detail} primary={true}/>{exData.secondary.map(s=><MusclePill key={s} label={s} primary={false}/>)}</div>}
          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:accentColor,marginTop:4}}>{exercise.sets.length} SET{exercise.sets.length!==1?"S":""}</div>
        </div>
        <button onClick={onRemove} style={{background:"transparent",border:"none",color:C.muted,fontSize:22,cursor:"pointer",padding:"0 0 0 8px",lineHeight:1,transition:"color .2s",flexShrink:0}} onMouseEnter={e=>e.target.style.color=C.danger} onMouseLeave={e=>e.target.style.color=C.muted}>×</button>
      </div>
      {exercise.sets.length>0&&(
        <div style={{marginBottom:10}}>
          <div style={{display:"grid",gridTemplateColumns:"28px 1fr 1fr 24px",gap:"4px 10px",marginBottom:6}}>
            {["#","REPS","KG",""].map((h,i)=><div key={i} style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:C.muted,letterSpacing:1}}>{h}</div>)}
          </div>
          {exercise.sets.map((s,i)=>(
            <div key={s.id} style={{display:"grid",gridTemplateColumns:"28px 1fr 1fr 24px",gap:"4px 10px",padding:"7px 0",borderTop:`1px solid ${C.border}`}}>
              <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:C.muted}}>{i+1}</div>
              <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:14,color:C.text}}>{s.reps}</div>
              <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:14,color:C.text}}>{s.weight||"–"}</div>
              <button onClick={()=>onRemoveSet(s.id)} className="btn-press" style={{background:"transparent",border:"none",color:C.muted,fontSize:16,cursor:"pointer",padding:0,lineHeight:1}} onMouseEnter={e=>e.target.style.color=C.danger} onMouseLeave={e=>e.target.style.color=C.muted}>×</button>
            </div>
          ))}
        </div>
      )}
      {adding?(
        <div style={{display:"flex",gap:8,alignItems:"center",marginTop:8}}>
          <input value={reps} onChange={e=>setReps(e.target.value)} placeholder="Reps" type="number" style={{width:64,padding:"10px 8px",background:C.faint,border:`1px solid ${C.borderHi}`,borderRadius:8,color:C.text,fontFamily:"'JetBrains Mono',monospace",fontSize:14,textAlign:"center"}} onFocus={e=>e.target.style.borderColor=accentColor} onBlur={e=>e.target.style.borderColor=C.borderHi}/>
          <input value={weight} onChange={e=>setWeight(e.target.value)} placeholder="kg" type="number" style={{width:64,padding:"10px 8px",background:C.faint,border:`1px solid ${C.borderHi}`,borderRadius:8,color:C.text,fontFamily:"'JetBrains Mono',monospace",fontSize:14,textAlign:"center"}} onFocus={e=>e.target.style.borderColor=accentColor} onBlur={e=>e.target.style.borderColor=C.borderHi}/>
          <button onClick={()=>{onAddSet(Number(reps)||0,Number(weight)||0);setAdding(false);}} className="btn-press" style={{flex:1,background:accentColor,border:"none",borderRadius:8,padding:"10px 0",color:C.bg,fontFamily:"'Outfit',sans-serif",fontSize:15,fontWeight:700,letterSpacing:1}}>LOG</button>
          <button onClick={()=>setAdding(false)} className="btn-press" style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 12px",color:C.muted,fontFamily:"'Outfit',sans-serif",fontSize:15}}>✕</button>
        </div>
      ):(
        <button onClick={()=>setAdding(true)} className="btn-press" style={{width:"100%",marginTop:8,padding:"10px",background:C.faint,border:`1px dashed ${C.borderHi}`,borderRadius:8,cursor:"pointer",fontFamily:"'Outfit',sans-serif",fontSize:14,letterSpacing:1,color:C.muted,transition:"all .2s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=accentColor;e.currentTarget.style.color=accentColor;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=C.borderHi;e.currentTarget.style.color=C.muted;}}>+ ADD SET</button>
      )}
    </Card>
  );
}

/* ══════════ SPLIT EDITOR ═══════════════════════════════════════════════════ */
function SplitEditor({split,onSave,onClose}){
  const [days,setDays]=useState(split.map(d=>({...d,muscles:[...d.muscles]})));
  const [editingName,setEditingName]=useState(null);
  const addDay=()=>setDays(d=>[...d,{id:"d"+Date.now(),label:"New Day",muscles:[]}]);
  const removeDay=(id)=>setDays(d=>d.filter(x=>x.id!==id));
  const updateName=(id,val)=>setDays(d=>d.map(x=>x.id===id?{...x,label:val}:x));
  const toggleMuscle=(id,m)=>setDays(d=>d.map(x=>x.id===id?{...x,muscles:x.muscles.includes(m)?x.muscles.filter(v=>v!==m):[...x.muscles,m]}:x));
  const applyPreset=(key)=>setDays(SPLIT_PRESETS[key].days.map(d=>({...d,muscles:[...d.muscles]})));
  return(
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(5,11,20,0.97)",backdropFilter:"blur(6px)",display:"flex",alignItems:"flex-start",justifyContent:"center",zIndex:500,padding:"16px",overflowY:"auto",animation:"fadeIn .2s ease"}}>
      <div onClick={e=>e.stopPropagation()} style={{background:C.surface,border:`1px solid ${C.borderHi}`,borderRadius:16,padding:"20px 16px",width:"100%",maxWidth:400,animation:"popIn .25s cubic-bezier(.175,.885,.32,1.275)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <div style={{fontFamily:"'Outfit',sans-serif",fontSize:20,fontWeight:700,color:C.accent}}>Edit Split</div>
          <button onClick={onClose} className="btn-press" style={{background:"transparent",border:"none",color:C.muted,fontSize:24,lineHeight:1}}>×</button>
        </div>
        <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.muted,letterSpacing:1.5,marginBottom:8}}>PRESETS</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:20}}>
          {Object.entries(SPLIT_PRESETS).map(([key,preset])=>(
            <button key={key} onClick={()=>applyPreset(key)} className="btn-press" style={{background:C.faint,border:`1px solid ${C.borderHi}`,borderRadius:7,padding:"6px 12px",fontFamily:"'Outfit',sans-serif",fontSize:13,fontWeight:600,color:C.text,cursor:"pointer",transition:"all .2s"}} onMouseEnter={e=>{e.target.style.borderColor=C.accent;e.target.style.color=C.accent;}} onMouseLeave={e=>{e.target.style.borderColor=C.borderHi;e.target.style.color=C.text;}}>{preset.label}</button>
          ))}
        </div>
        <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.muted,letterSpacing:1.5,marginBottom:8}}>YOUR DAYS ({days.length})</div>
        {days.map((day,idx)=>(
          <div key={day.id} style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:10,padding:"12px 14px",marginBottom:10}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:C.muted,letterSpacing:1}}>DAY {idx+1}</div>
              <button onClick={()=>removeDay(day.id)} className="btn-press" style={{background:"transparent",border:"none",color:C.muted,fontSize:16,cursor:"pointer",lineHeight:1}} onMouseEnter={e=>e.target.style.color=C.danger} onMouseLeave={e=>e.target.style.color=C.muted}>×</button>
            </div>
            {editingName===day.id?(
              <input autoFocus value={day.label} onChange={e=>updateName(day.id,e.target.value)} onBlur={()=>setEditingName(null)} onKeyDown={e=>e.key==="Enter"&&setEditingName(null)} style={{width:"100%",padding:"8px 10px",background:C.faint,border:`1px solid ${C.accent}`,borderRadius:7,color:C.text,fontFamily:"'Outfit',sans-serif",fontSize:15,fontWeight:600,marginBottom:8}}/>
            ):(
              <div onClick={()=>setEditingName(day.id)} style={{fontFamily:"'Outfit',sans-serif",fontSize:15,fontWeight:600,color:C.text,marginBottom:8,cursor:"text",padding:"4px 0",borderBottom:`1px dashed ${C.borderHi}`}}>{day.label} <span style={{fontSize:10,color:C.muted}}>✎</span></div>
            )}
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {ALL_MUSCLES.map(m=>(
                <button key={m} onClick={()=>toggleMuscle(day.id,m)} className="btn-press" style={{padding:"5px 10px",borderRadius:6,border:`1px solid ${day.muscles.includes(m)?C.accent:C.border}`,background:day.muscles.includes(m)?`${C.accent}18`:C.faint,color:day.muscles.includes(m)?C.accent:C.muted,fontFamily:"'Outfit',sans-serif",fontSize:12,fontWeight:600,cursor:"pointer",transition:"all .15s"}}>{MUSCLE_LABELS[m]}</button>
              ))}
            </div>
          </div>
        ))}
        <button onClick={addDay} className="btn-press" style={{width:"100%",padding:"11px",background:"transparent",border:`1px dashed ${C.borderHi}`,borderRadius:10,color:C.muted,fontFamily:"'Outfit',sans-serif",fontSize:14,fontWeight:600,cursor:"pointer",marginBottom:12,transition:"all .2s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=C.accent;e.currentTarget.style.color=C.accent;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=C.borderHi;e.currentTarget.style.color=C.muted;}}>+ ADD DAY</button>
        <button onClick={()=>onSave(days)} className="btn-press" style={{width:"100%",padding:"14px",background:C.accent,border:"none",borderRadius:10,color:C.bg,fontFamily:"'Outfit',sans-serif",fontSize:16,fontWeight:700,letterSpacing:2,cursor:"pointer",boxShadow:`0 4px 16px ${C.accent}44`}}>SAVE SPLIT</button>
      </div>
    </div>
  );
}

/* ══════════ WORKOUT LOGGER ═════════════════════════════════════════════════ */
function WorkoutLogger({dayConfig,muscleTotals,setMuscleTotals,onBack}){
  const today=todayKey();
  const [workout,setWorkout]=useState(null);
  const [showAddEx,setShowAddEx]=useState(false);
  const [customExName,setCustomExName]=useState("");
  const [ready,setReady]=useState(false);
  const exInputRef=useRef(null);
  const suggestions=getSuggestions(dayConfig.muscles);
  const dayColor=dayConfig.color||C.accent;

  useEffect(()=>{
    dbGet("workout:"+today+":"+dayConfig.id).then(saved=>{
      setWorkout(saved||{dayId:dayConfig.id,exercises:[]});
      setReady(true);
    });
  },[dayConfig.id]);

  const saveW=async(updated)=>{ setWorkout(updated); await dbSet("workout:"+today+":"+updated.dayId,updated); };
  const addExercise=async(name,muscles)=>{ if(!workout)return; await saveW({...workout,exercises:[...workout.exercises,{id:uid(),name,muscleGroups:muscles,sets:[]}]}); setShowAddEx(false); setCustomExName(""); };
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

  if(!ready)return<div style={{textAlign:"center",padding:40,fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.muted,letterSpacing:2}}>LOADING...</div>;

  return(
    <div style={{animation:"slideIn .3s ease"}}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:24}}>
        <button onClick={onBack} className="btn-press" style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:9,padding:"9px 14px",color:C.muted,fontFamily:"'Outfit',sans-serif",fontSize:14,fontWeight:600,cursor:"pointer",transition:"all .2s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=C.accent;e.currentTarget.style.color=C.accent;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.muted;}}>← Back</button>
        <div style={{flex:1}}>
          <div style={{fontFamily:"'Outfit',sans-serif",fontSize:22,fontWeight:700,color:dayColor,letterSpacing:1,textShadow:`0 0 16px ${dayColor}55`}}>{dayConfig.label.toUpperCase()}</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:3,marginTop:5}}>{dayConfig.muscles.map(m=><MusclePill key={m} label={MUSCLE_LABELS[m]} primary={true}/>)}</div>
        </div>
        <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.text,background:C.borderHi,padding:"5px 9px",borderRadius:6,letterSpacing:1,flexShrink:0}}>{workout?.exercises.reduce((n,e)=>n+e.sets.length,0)||0} SETS</div>
      </div>
      {workout?.exercises.map(ex=>(
        <ExerciseCard key={ex.id} exercise={ex} accentColor={dayColor} onAddSet={(r,w)=>addSet(ex.id,r,w)} onRemoveSet={sid=>removeSet(ex.id,sid)} onRemove={()=>removeExercise(ex.id)}/>
      ))}
      {showAddEx?(
        <Card style={{marginBottom:12,border:`1px solid ${dayColor}55`}}>
          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.muted,letterSpacing:1.5,marginBottom:12}}>RECOMMENDED EXERCISES</div>
          <div style={{display:"flex",flexDirection:"column",gap:7,marginBottom:14,maxHeight:280,overflowY:"auto"}}>
            {suggestions.filter(s=>!workout?.exercises.find(e=>e.name===s.name)).map(s=>(
              <button key={s.name} onClick={()=>addExercise(s.name,dayConfig.muscles)} className="btn-press" style={{background:C.faint,border:`1px solid ${C.border}`,borderRadius:9,padding:"10px 14px",textAlign:"left",cursor:"pointer",transition:"all .2s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=dayColor;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;}}>
                <div style={{fontFamily:"'Outfit',sans-serif",fontSize:15,fontWeight:600,color:C.text,marginBottom:5}}>{s.name}</div>
                <div style={{display:"flex",flexWrap:"wrap"}}><MusclePill label={s.detail} primary={true}/>{s.secondary.map(sec=><MusclePill key={sec} label={sec} primary={false}/>)}</div>
              </button>
            ))}
          </div>
          <div style={{display:"flex",gap:8}}>
            <input ref={exInputRef} value={customExName} onChange={e=>setCustomExName(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&customExName.trim())addExercise(customExName.trim(),dayConfig.muscles);}} placeholder="Custom exercise..." style={{flex:1,padding:"11px 14px",background:C.bg,border:`1px solid ${C.borderHi}`,borderRadius:8,color:C.text,fontFamily:"'Outfit',sans-serif",fontSize:15}} onFocus={e=>e.target.style.borderColor=dayColor} onBlur={e=>e.target.style.borderColor=C.borderHi}/>
            <button onClick={()=>{if(customExName.trim())addExercise(customExName.trim(),dayConfig.muscles);}} className="btn-press" style={{background:dayColor,border:"none",borderRadius:8,padding:"0 18px",color:C.bg,fontFamily:"'Outfit',sans-serif",fontSize:15,fontWeight:700,cursor:"pointer"}}>ADD</button>
            <button onClick={()=>{setShowAddEx(false);setCustomExName("");}} className="btn-press" style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:8,padding:"0 14px",color:C.muted,fontFamily:"'Outfit',sans-serif",fontSize:15,cursor:"pointer"}}>✕</button>
          </div>
        </Card>
      ):(
        <button onClick={()=>{setShowAddEx(true);setTimeout(()=>exInputRef.current?.focus(),50);}} className="btn-press hover-lift" style={{width:"100%",padding:"14px",background:C.surface,border:`1px dashed ${C.borderHi}`,borderRadius:12,cursor:"pointer",fontFamily:"'Outfit',sans-serif",fontSize:15,fontWeight:600,letterSpacing:1.5,color:C.text,transition:"all .2s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=dayColor;e.currentTarget.style.color=dayColor;e.currentTarget.style.background=`${dayColor}11`;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=C.borderHi;e.currentTarget.style.color=C.text;e.currentTarget.style.background=C.surface;}}>
          + ADD EXERCISE
        </button>
      )}
    </div>
  );
}

/* ══════════ GYM PAGE ════════════════════════════════════════════════════════ */
function GymPage({userConfig,onUpdateConfig}){
  const week=weekKey();
  const [muscleTotals,setMuscleTotals]=useState({});
  const [gymCount,setGymCount]=useState(0);
  const [bodyView,setBodyView]=useState("front");
  const [activeDay,setActiveDay]=useState(null);
  const [showSplitEditor,setShowSplitEditor]=useState(false);
  const [ready,setReady]=useState(false);
  const split=(userConfig.split||[]).map((d,i)=>({...d,color:DAY_COLORS[i%DAY_COLORS.length]}));
  const gymTarget=split.length;

  useEffect(()=>{
    Promise.all([dbGet("muscleTotals"),dbGet("gymWeek:"+week)]).then(([mt,gw])=>{
      setMuscleTotals(mt||{});
      setGymCount((gw||{}).count||0);
      setReady(true);
    });
  },[]);

  const addGym=async()=>{ const n=gymCount<gymTarget?gymCount+1:0; setGymCount(n); await dbSet("gymWeek:"+week,{count:n}); };
  const saveSplit=async(newDays)=>{
    const updated={...userConfig,split:newDays};
    await dbSet("userConfig",updated);
    onUpdateConfig(updated);
    setShowSplitEditor(false);
  };
  const progress=calcMuscleProgress(muscleTotals);

  if(!ready)return<div style={{textAlign:"center",padding:40,fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.muted,letterSpacing:2,animation:"pulse 1.5s infinite"}}>INITIALIZING...</div>;
  if(activeDay){
    const dayWithColor=split.find(d=>d.id===activeDay.id)||{...activeDay,color:C.accent};
    return<WorkoutLogger dayConfig={dayWithColor} muscleTotals={muscleTotals} setMuscleTotals={setMuscleTotals} onBack={()=>setActiveDay(null)}/>;
  }

  return(
    <div>
      {showSplitEditor&&<SplitEditor split={split} onSave={saveSplit} onClose={()=>setShowSplitEditor(false)}/>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:24,animation:"slideIn .4s ease"}}>
        <div>
          <div style={{fontFamily:"'Outfit',sans-serif",fontSize:54,fontWeight:700,lineHeight:.88,letterSpacing:2,color:C.accent,textShadow:`0 0 16px ${C.accentGlow}`}}>GYM</div>
          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.muted,letterSpacing:2,marginTop:10}}>WEEKLY TRACKER</div>
        </div>
        <button onClick={()=>setShowSplitEditor(true)} className="btn-press" style={{background:C.surface,border:`1px solid ${C.borderHi}`,borderRadius:10,padding:"10px 14px",color:C.muted,fontFamily:"'Outfit',sans-serif",fontSize:13,fontWeight:600,cursor:"pointer",transition:"all .2s",marginTop:6,letterSpacing:1}} onMouseEnter={e=>{e.currentTarget.style.borderColor=C.accent;e.currentTarget.style.color=C.accent;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=C.borderHi;e.currentTarget.style.color=C.muted;}}>⚙ EDIT SPLIT</button>
      </div>
      <div style={{marginBottom:24,animation:"slideIn .4s ease .05s both"}}>
        <Card highlight={gymCount>=gymTarget}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div>
              <div style={{fontFamily:"'Outfit',sans-serif",fontSize:22,fontWeight:600,letterSpacing:1}}>This Week</div>
              <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.muted,marginTop:4,letterSpacing:1}}>{gymTarget}× TARGET</div>
            </div>
            <div style={{fontFamily:"'Outfit',sans-serif",fontSize:64,fontWeight:300,lineHeight:1,color:gymCount>=gymTarget?C.accent:C.text,textShadow:gymCount>=gymTarget?`0 0 16px ${C.accentGlow}`:"none"}}>{gymCount}<span style={{fontSize:28,color:C.muted}}>/{gymTarget}</span></div>
          </div>
          <div style={{display:"flex",gap:5,marginBottom:14}}>
            {Array.from({length:gymTarget},(_,i)=><div key={i} style={{flex:1,height:6,borderRadius:3,background:i<gymCount?C.accent:C.bg,boxShadow:i<gymCount?`0 0 8px ${C.accent}`:"inset 0 1px 3px rgba(0,0,0,.5)",transition:"all .4s cubic-bezier(.4,0,.2,1)"}}/>)}
          </div>
          <button onClick={addGym} className="btn-press" style={{width:"100%",padding:"13px",background:gymCount>=gymTarget?C.accentDim:C.accent,border:"none",borderRadius:10,color:gymCount>=gymTarget?C.text:C.bg,fontFamily:"'Outfit',sans-serif",fontSize:16,fontWeight:700,letterSpacing:2,cursor:"pointer",transition:"all .2s",boxShadow:gymCount>=gymTarget?"none":`0 4px 16px ${C.accent}44`}}>
            {gymCount>=gymTarget?"✓ WEEK COMPLETE — TAP TO RESET":"+ LOG SESSION"}
          </button>
        </Card>
      </div>
      <div style={{marginBottom:24,animation:"slideIn .4s ease .1s both"}}>
        <SectionLabel action={
          <div style={{display:"flex",gap:5,background:C.surface,padding:4,borderRadius:8,border:`1px solid ${C.border}`}}>
            {["front","back"].map(v=>(
              <button key={v} onClick={()=>setBodyView(v)} className="btn-press" style={{background:bodyView===v?C.borderHi:"transparent",borderRadius:6,padding:"5px 12px",color:bodyView===v?C.text:C.muted,fontFamily:"'Outfit',sans-serif",fontSize:12,fontWeight:600,letterSpacing:1,cursor:"pointer",transition:"all .2s",border:"none"}}>{v.toUpperCase()}</button>
            ))}
          </div>
        }>Muscle Progress</SectionLabel>
        <Card>
          <div style={{display:"flex",gap:18,alignItems:"center"}}>
            <div style={{width:120,flexShrink:0}}><BodyMapSVG progress={progress} view={bodyView}/></div>
            <div style={{flex:1}}>
              {(bodyView==="front"?["chest","shoulders","biceps","abs","legs"]:["back","triceps","legs"]).map(m=>{
                const pct=Math.round(progress[m]||0);
                return(
                  <div key={m} style={{marginBottom:11}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                      <span style={{fontFamily:"'Outfit',sans-serif",fontSize:13,textTransform:"capitalize"}}>{m}</span>
                      <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:pct>0?C.accent:C.muted}}>{muscleTotals[m]||0} sets</span>
                    </div>
                    <div style={{background:C.border,borderRadius:4,height:5,overflow:"hidden"}}>
                      <div style={{width:`${pct}%`,height:"100%",borderRadius:4,background:muscleColor(pct),transition:"width .6s cubic-bezier(.4,0,.2,1)"}}/>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      </div>
      <div style={{animation:"slideIn .4s ease .15s both"}}>
        <SectionLabel>Today's Workout</SectionLabel>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          {split.map(day=>(
            <button key={day.id} onClick={()=>setActiveDay(day)} className="hover-lift btn-press" style={{background:`${day.color}12`,border:`1px solid ${day.color}55`,borderRadius:12,padding:"14px 16px",textAlign:"left",cursor:"pointer",transition:"all .2s ease"}}>
              <div style={{fontFamily:"'Outfit',sans-serif",fontSize:12,fontWeight:700,letterSpacing:1.5,color:day.color,marginBottom:4,opacity:.8}}>LOG WORKOUT</div>
              <div style={{fontFamily:"'Outfit',sans-serif",fontSize:17,fontWeight:700,color:C.text,marginBottom:8}}>{day.label}</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:3}}>{day.muscles.map(m=><MusclePill key={m} label={MUSCLE_LABELS[m]} primary={false}/>)}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ══════════ HABIT ROW ══════════════════════════════════════════════════════ */
function HabitRow({label,cat,done,onToggle,onCalendar,onRemove,index}){
  return(
    <div className="hover-lift" style={{display:"flex",alignItems:"stretch",marginBottom:8,animation:`slideIn .4s cubic-bezier(.175,.885,.32,1.275) ${index*.05}s both`,borderRadius:12,overflow:"hidden",boxShadow:done?`0 4px 12px ${C.accentGlow}`:"0 4px 6px rgba(0,0,0,.2)"}}>
      <div onClick={onToggle} style={{flex:1,display:"flex",alignItems:"center",gap:14,padding:"14px 16px",background:done?`${C.accent}15`:C.surface,border:`1px solid ${done?C.accentDim:C.border}`,borderRight:"none",cursor:"pointer",transition:"all .3s ease"}}>
        <div style={{width:22,height:22,borderRadius:6,flexShrink:0,background:done?C.accent:C.bg,border:`1.5px solid ${done?C.accent:C.borderHi}`,boxShadow:done?`0 0 10px ${C.accent}`:"inset 0 2px 4px rgba(0,0,0,.5)",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .3s cubic-bezier(.4,0,.2,1)"}}>
          <svg width="12" height="10" viewBox="0 0 12 10" fill="none" style={{opacity:done?1:0,transform:done?"scale(1)":"scale(.5)",transition:"all .3s cubic-bezier(.175,.885,.32,1.275)"}}><path d="M1 5L4.5 8.5L11 1" stroke={C.bg} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <div style={{minWidth:0}}>
          <div style={{fontFamily:"'Outfit',sans-serif",fontSize:18,fontWeight:500,color:done?C.accent:C.text,transition:"color .3s"}}>{label}</div>
          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:C.muted,marginTop:3,letterSpacing:1.5}}>{cat}</div>
        </div>
      </div>
      {onCalendar&&<button onClick={onCalendar} className="btn-press" style={{padding:"0 14px",background:done?`${C.accent}15`:C.surface,border:`1px solid ${done?C.accentDim:C.border}`,borderLeft:`1px solid ${done?C.accentDim:C.borderHi}`,cursor:"pointer",color:C.muted,fontSize:16,display:"flex",alignItems:"center",borderRight:onRemove?"none":undefined,transition:"all .2s"}} onMouseEnter={e=>{e.currentTarget.style.color=C.accent;}} onMouseLeave={e=>{e.currentTarget.style.color=C.muted;}}>📅</button>}
      {onRemove&&<button onClick={onRemove} className="btn-press" style={{padding:"0 12px",background:C.surface,border:`1px solid ${C.border}`,borderLeft:"none",cursor:"pointer",color:C.muted,fontSize:18,display:"flex",alignItems:"center",transition:"color .2s"}} onMouseEnter={e=>{e.currentTarget.style.color=C.danger;}} onMouseLeave={e=>{e.currentTarget.style.color=C.muted;}}>×</button>}
    </div>
  );
}

/* ══════════ HABITS PAGE ════════════════════════════════════════════════════ */
function HabitsPage({userConfig}){
  const today=todayKey(),week=weekKey();
  const enabledHabits=CORE_HABITS.filter(h=>(userConfig.habitsEnabled||CORE_HABITS.map(h=>h.id)).includes(h.id));
  const [habits,setHabits]=useState({});
  const [customHabits,setCustomHabits]=useState([]);
  const [runs,setRuns]=useState(0);
  const [sleepDone,setSleepDone]=useState(false);
  const [streak,setStreak]=useState(0);
  const [chart,setChart]=useState([]);
  const [ready,setReady]=useState(false);
  const [calHabit,setCalHabit]=useState(null);
  const [showComplete,setShowComplete]=useState(false);
  const [addingTask,setAddingTask]=useState(false);
  const [newTask,setNewTask]=useState("");
  const inputRef=useRef(null);
  const allHabits=[...enabledHabits,...customHabits.map(c=>({...c,cat:"CUSTOM"}))];

  useEffect(()=>{
    (async()=>{
      const [day,wk,cust]=await Promise.all([dbGet("day:"+today),dbGet("week:"+week),dbGet("customHabits")]);
      setHabits((day||{}).habits||{});
      setSleepDone((day||{}).sleep===true);
      setRuns((wk||{}).runs||0);
      setCustomHabits(cust||[]);
      let s=0; const chk=new Date(); chk.setDate(chk.getDate()-1);
      for(let i=0;i<90;i++){
        const d=await dbGet("day:"+chk.toISOString().slice(0,10));
        if(d&&Object.values(d.habits||{}).filter(Boolean).length>=enabledHabits.length)s++;
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
      if(cnt>=allHabits.length)setTimeout(()=>setShowComplete(true),300);
      return next;
    });
  },[sleepDone,allHabits.length,persistDay]);
  const toggleSleep=async()=>{ const n=!sleepDone; setSleepDone(n); await persistDay(habits,n); };
  const addRun=async()=>{ const n=runs<RUN_TARGET?runs+1:0; setRuns(n); await dbSet("week:"+week,{runs:n}); };
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

  if(!ready)return<div style={{textAlign:"center",padding:60,fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:C.accent,letterSpacing:3,animation:"pulse 1.5s infinite"}}>ESTABLISHING LINK...</div>;

  return(
    <div>
      {showComplete&&(
        <div onClick={()=>setShowComplete(false)} style={{position:"fixed",inset:0,background:"rgba(5,11,20,0.95)",backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:300,cursor:"pointer",animation:"fadeIn .3s ease"}}>
          <div style={{textAlign:"center",animation:"popIn .5s cubic-bezier(.175,.885,.32,1.275)"}}>
            <div style={{fontSize:96,lineHeight:1,filter:`drop-shadow(0 0 20px ${C.accent})`}}>❄️</div>
            <div style={{fontFamily:"'Outfit',sans-serif",fontSize:56,fontWeight:700,color:C.accent,letterSpacing:8,marginTop:16,textShadow:`0 0 20px ${C.accentGlow}`}}>LOCKED IN</div>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.text,marginTop:14,letterSpacing:3,background:C.borderHi,padding:"6px 12px",borderRadius:20,display:"inline-block"}}>SYSTEM OPTIMAL</div>
          </div>
        </div>
      )}
      {calHabit&&<CalendarModal habitId={calHabit.id} habitLabel={calHabit.label} onClose={()=>setCalHabit(null)}/>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:32,animation:"slideIn .5s cubic-bezier(.175,.885,.32,1.275)"}}>
        <div>
          <div style={{fontFamily:"'Outfit',sans-serif",fontSize:64,fontWeight:700,lineHeight:.85,letterSpacing:2,color:C.accent,textShadow:`0 0 16px ${C.accentGlow}`}}>LOCK</div>
          <div style={{fontFamily:"'Outfit',sans-serif",fontSize:64,fontWeight:700,lineHeight:.85,letterSpacing:2,color:C.text}}>IN.</div>
          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.muted,letterSpacing:2,marginTop:12,background:C.border,padding:"4px 8px",borderRadius:4,display:"inline-block"}}>{dayLabel.toUpperCase()}</div>
        </div>
        <div style={{textAlign:"right",paddingTop:4}}>
          <div style={{fontFamily:"'Outfit',sans-serif",fontSize:76,fontWeight:300,lineHeight:.9,color:C.accent,letterSpacing:-2,textShadow:`0 0 16px ${C.accentGlow}`}}>{daysLeft()}</div>
          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.muted,letterSpacing:1.5,lineHeight:1.6,marginTop:4}}>DAYS TO<br/>JUNE 1ST</div>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:28,animation:"slideIn .5s cubic-bezier(.175,.885,.32,1.275) .05s both"}}>
        <Card highlight={displayStreak>0}><div style={{fontFamily:"'Outfit',sans-serif",fontSize:48,fontWeight:700,lineHeight:1,color:displayStreak>0?C.accent:C.text}}>{displayStreak} <span style={{fontSize:26}}>🔥</span></div><div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.muted,marginTop:8,letterSpacing:1.5}}>DAY STREAK</div></Card>
        <Card highlight={allDone}><div style={{fontFamily:"'Outfit',sans-serif",fontSize:48,fontWeight:700,lineHeight:1,color:allDone?C.accent:C.text}}>{done}<span style={{fontSize:24,color:C.muted,fontWeight:400}}>/{total}</span></div><div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.muted,marginTop:8,letterSpacing:1.5}}>TASKS CLEAR</div></Card>
      </div>
      <div style={{marginBottom:28}}><SectionLabel>Core Directives</SectionLabel>{enabledHabits.map((h,i)=>(<HabitRow key={h.id} label={h.label} cat={h.cat} done={!!habits[h.id]} onToggle={()=>toggleHabit(h.id)} onCalendar={()=>setCalHabit({id:h.id,label:h.label})} index={i}/>))}</div>
      <div style={{marginBottom:28}}>
        <SectionLabel action={<button onClick={()=>{setAddingTask(true);setTimeout(()=>inputRef.current?.focus(),50);}} className="btn-press" style={{background:C.border,border:`1px solid ${C.borderHi}`,borderRadius:6,padding:"4px 12px",color:C.text,fontFamily:"'Outfit',sans-serif",fontSize:12,fontWeight:600,letterSpacing:1,cursor:"pointer",transition:"all .2s"}} onMouseEnter={e=>{e.target.style.borderColor=C.accent;e.target.style.color=C.accent;}} onMouseLeave={e=>{e.target.style.borderColor=C.borderHi;e.target.style.color=C.text;}}>+ ADD</button>}>Auxiliary Modules</SectionLabel>
        {customHabits.length===0&&!addingTask&&<div style={{padding:"20px 14px",background:C.surface,border:`1px dashed ${C.borderHi}`,borderRadius:12,textAlign:"center",fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.muted,lineHeight:1.8}}>No custom tasks.<br/><span style={{color:C.accent,cursor:"pointer"}} onClick={()=>{setAddingTask(true);setTimeout(()=>inputRef.current?.focus(),50);}}>+ Initialize module</span></div>}
        {customHabits.map((h,i)=>(<HabitRow key={h.id} label={h.label} cat="CUSTOM" done={!!habits[h.id]} onToggle={()=>toggleHabit(h.id)} onCalendar={()=>setCalHabit({id:h.id,label:h.label})} onRemove={()=>removeCustom(h.id)} index={i}/>))}
        {addingTask&&<div style={{display:"flex",gap:8,marginTop:8,animation:"slideIn .2s ease"}}><input ref={inputRef} value={newTask} onChange={e=>setNewTask(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")submitCustom();if(e.key==="Escape"){setAddingTask(false);setNewTask("");}}} placeholder="e.g. Meditate 10 min" style={{flex:1,padding:"12px 16px",background:C.bg,border:`1px solid ${C.accent}`,borderRadius:10,color:C.text,fontFamily:"'Outfit',sans-serif",fontSize:16,boxShadow:`0 0 10px ${C.accentGlow}`}}/><button onClick={submitCustom} className="btn-press" style={{background:C.accent,border:"none",borderRadius:10,padding:"0 20px",color:C.bg,fontFamily:"'Outfit',sans-serif",fontSize:16,fontWeight:700,letterSpacing:1,cursor:"pointer",boxShadow:`0 4px 12px ${C.accent}44`}}>ADD</button><button onClick={()=>{setAddingTask(false);setNewTask("");}} className="btn-press" style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:10,padding:"0 16px",color:C.muted,fontFamily:"'Outfit',sans-serif",fontSize:16,cursor:"pointer"}}>✕</button></div>}
      </div>
      <div style={{marginBottom:28}}>
        <SectionLabel>Recovery System</SectionLabel>
        <div onClick={toggleSleep} className="hover-lift" style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 18px",background:sleepDone?`${C.green}15`:C.surface,border:`1px solid ${sleepDone?C.green:C.border}`,borderRadius:12,cursor:"pointer",transition:"all .3s ease",boxShadow:sleepDone?`0 4px 16px ${C.green}22`:"0 4px 6px rgba(0,0,0,.2)"}}>
          <div><div style={{fontFamily:"'Outfit',sans-serif",fontSize:18,fontWeight:600,color:sleepDone?C.green:C.text}}>Got 8+ hours of sleep</div><div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.muted,marginTop:4,letterSpacing:1.5}}>MINIMUM 8 HRS / NIGHT</div></div>
          <div style={{width:48,height:26,borderRadius:13,background:sleepDone?C.green:C.bg,border:`1.5px solid ${sleepDone?C.green:C.borderHi}`,position:"relative",transition:"all .3s cubic-bezier(.4,0,.2,1)",flexShrink:0,boxShadow:sleepDone?`0 0 10px ${C.green}`:"inset 0 2px 4px rgba(0,0,0,.5)"}}>
            <div style={{position:"absolute",top:2,left:sleepDone?24:2,width:18,height:18,borderRadius:9,background:C.text,transition:"left .3s cubic-bezier(.175,.885,.32,1.275)",boxShadow:"0 2px 4px rgba(0,0,0,.4)"}}/>
          </div>
        </div>
      </div>
      <div style={{marginBottom:28}}>
        <SectionLabel>Running Protocols</SectionLabel>
        <Card highlight={runs>=RUN_TARGET}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><div><div style={{fontFamily:"'Outfit',sans-serif",fontSize:22,fontWeight:600,letterSpacing:1}}>Runs logged</div><div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.muted,marginTop:4,letterSpacing:1}}>3× MINIMUM</div></div><div style={{fontFamily:"'Outfit',sans-serif",fontSize:56,fontWeight:300,lineHeight:1,color:runs>=RUN_TARGET?C.accent:C.text,textShadow:runs>=RUN_TARGET?`0 0 16px ${C.accentGlow}`:"none"}}>{runs}<span style={{fontSize:24,color:C.muted}}>/{RUN_TARGET}</span></div></div>
          <div style={{display:"flex",gap:6,marginBottom:16}}>{[0,1,2].map(i=><div key={i} style={{flex:1,height:6,borderRadius:3,background:i<runs?C.accent:C.bg,boxShadow:i<runs?`0 0 8px ${C.accent}`:"inset 0 1px 3px rgba(0,0,0,.5)",transition:"all .4s cubic-bezier(.4,0,.2,1)"}}/>)}</div>
          <button onClick={addRun} className="btn-press" style={{width:"100%",padding:"14px",background:runs>=RUN_TARGET?C.accentDim:C.accent,border:"none",borderRadius:10,color:runs>=RUN_TARGET?C.text:C.bg,fontFamily:"'Outfit',sans-serif",fontSize:16,fontWeight:700,letterSpacing:2,cursor:"pointer",transition:"all .2s",boxShadow:runs>=RUN_TARGET?"none":`0 4px 16px ${C.accent}44`}}>{runs>=RUN_TARGET?"✓ DIRECTIVE COMPLETE — TAP RESET":"+ LOG A RUN"}</button>
        </Card>
      </div>
      <div style={{marginBottom:24}}>
        <SectionLabel>Telemetry (Last 7 Days)</SectionLabel>
        <Card>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={chart} barCategoryGap="30%">
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill:C.muted,fontFamily:"JetBrains Mono,monospace",fontSize:10}}/>
              <Bar dataKey="cnt" maxBarSize={32} radius={[6,6,2,2]}>
                {chart.map((c,i)=><Cell key={i} fill={c.isToday?C.accent:c.cnt>0?C.accentDim:C.bg} stroke={c.cnt>0?C.accentDim:C.borderHi} strokeWidth={1}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{display:"flex",gap:16,paddingLeft:4,marginTop:10}}>
            {[[C.accent,"Active Node"],[C.accentDim,"Logged"],[C.bg,"Offline"]].map(([col,lbl])=>(
              <div key={lbl} style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:10,height:10,background:col,borderRadius:3,border:`1px solid ${col===C.bg?C.borderHi:C.accentDim}`}}/><div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.muted,letterSpacing:.5}}>{lbl}</div></div>
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
  const [userConfig,setUserConfig]=useState(undefined);

  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>setSession(session));
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_,s)=>setSession(s));
    return()=>subscription.unsubscribe();
  },[]);

  useEffect(()=>{
    if(!session){ return; }
    dbGet("userConfig").then(cfg=>{
      // cfg is null if never set — treat as new user needing onboarding
      setUserConfig(cfg || {});
    });
  },[session]);

  if(session===undefined || (session && userConfig===undefined))return(
    <div style={{background:C.bg,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:14,letterSpacing:6,color:C.accent,animation:"pulse 1.5s infinite"}}>INITIALIZING...</div>
      <style>{CSS}</style>
    </div>
  );

  if(!session)return<Auth/>;

  if(userConfig && Object.keys(userConfig).length===0)return<Onboarding onComplete={cfg=>setUserConfig(cfg)}/>;

  return(
    <div style={{background:C.bg,minHeight:"100vh",color:C.text}}>
      <style>{CSS}</style>
      <div style={{maxWidth:480,margin:"0 auto",padding:"24px 16px 100px"}}>
        {page==="habits"&&<HabitsPage userConfig={userConfig}/>}
        {page==="gym"&&<GymPage userConfig={userConfig} onUpdateConfig={setUserConfig}/>}
      </div>
      <div style={{position:"fixed",bottom:0,left:0,right:0,background:"rgba(5,11,20,0.85)",backdropFilter:"blur(16px)",WebkitBackdropFilter:"blur(16px)",borderTop:`1px solid ${C.border}`,padding:"12px 0 max(env(safe-area-inset-bottom),12px)",zIndex:100}}>
        <div style={{maxWidth:480,margin:"0 auto",display:"flex",justifyContent:"center",gap:12,padding:"0 16px"}}>
          {[{id:"habits",icon:"✓",label:"Habits"},{id:"gym",icon:"💪",label:"Gym"}].map(tab=>(
            <button key={tab.id} onClick={()=>setPage(tab.id)} className="btn-press" style={{flex:1,padding:"12px 0",background:page===tab.id?`${C.accent}15`:"transparent",border:`1px solid ${page===tab.id?C.accentDim:"transparent"}`,boxShadow:page===tab.id?`0 0 12px ${C.accentGlow}`:"none",borderRadius:12,display:"flex",flexDirection:"column",alignItems:"center",gap:4,cursor:"pointer",transition:"all .2s cubic-bezier(.4,0,.2,1)"}}>
              <span style={{fontSize:20,lineHeight:1,filter:page===tab.id?`drop-shadow(0 0 6px ${C.accent})`:"grayscale(100%)",opacity:page===tab.id?1:0.6}}>{tab.icon}</span>
              <span style={{fontFamily:"'Outfit',sans-serif",fontSize:13,letterSpacing:1.5,color:page===tab.id?C.accent:C.muted,fontWeight:700}}>{tab.label.toUpperCase()}</span>
            </button>
          ))}
          <button onClick={()=>supabase.auth.signOut()} className="btn-press" style={{flex:1,padding:"12px 0",background:"transparent",border:"1px solid transparent",borderRadius:12,display:"flex",flexDirection:"column",alignItems:"center",gap:4,cursor:"pointer",transition:"all .2s"}} onMouseEnter={e=>e.currentTarget.querySelector("span:last-child").style.color=C.danger} onMouseLeave={e=>e.currentTarget.querySelector("span:last-child").style.color=C.muted}>
            <span style={{fontSize:20,lineHeight:1,opacity:.6}}>↩</span>
            <span style={{fontFamily:"'Outfit',sans-serif",fontSize:13,letterSpacing:1.5,color:C.muted,fontWeight:700,transition:"color .2s"}}>LOG OUT</span>
          </button>
        </div>
      </div>
    </div>
  );
}
