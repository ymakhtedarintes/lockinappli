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

const ALL_HABITS = [
  {id:"pushups",    label:"Pushups",            cat:"FITNESS"},
  {id:"pullups",    label:"Pullups",             cat:"FITNESS"},
  {id:"run",        label:"Go for a run",        cat:"FITNESS"},
  {id:"walk",       label:"Walk 10k steps",      cat:"FITNESS"},
  {id:"stretch",    label:"Stretch / mobility",  cat:"FITNESS"},
  {id:"cold",       label:"Cold shower",         cat:"FITNESS"},
  {id:"read",       label:"Read 15 min",         cat:"MIND"},
  {id:"meditate",   label:"Meditate",            cat:"MIND"},
  {id:"journal",    label:"Journal",             cat:"MIND"},
  {id:"nophone",    label:"No phone after 10pm", cat:"MIND"},
  {id:"gratitude",  label:"Gratitude practice",  cat:"MIND"},
  {id:"study",      label:"Study 1 hr",          cat:"SCHOOL"},
  {id:"hw",         label:"Homework 1 hr",       cat:"SCHOOL"},
  {id:"projects",   label:"Projects 1 hr",       cat:"SCHOOL"},
  {id:"water",      label:"Drink 2L water",      cat:"HEALTH"},
  {id:"nojunk",     label:"No junk food",        cat:"HEALTH"},
  {id:"noalcohol",  label:"No alcohol",          cat:"HEALTH"},
  {id:"vitamins",   label:"Take vitamins",       cat:"HEALTH"},
  {id:"sleep",      label:"Sleep by 11pm",       cat:"HEALTH"},
  {id:"wakeup",     label:"Wake up before 7am",  cat:"HEALTH"},
];

const DEFAULT_HABITS = ["pushups","pullups","read","study","hw","projects"];
const STREAK_MILESTONES = [7,14,21,30,60,90,180,365];
const MUSCLE_GROUPS = ["chest","back","biceps","triceps","shoulders","legs","abs"];
const DAY_COLORS = ["#00f0ff","#818cf8","#34d399","#c084fc","#f472b6","#fb923c","#38bdf8"];
const RUN_TARGET = 3;

function todayKey(){ return new Date().toISOString().slice(0,10); }
function weekKey(){ const d=new Date(),day=d.getDay(),m=new Date(d); m.setDate(d.getDate()-day+(day===0?-6:1)); return m.toISOString().slice(0,10); }
function mkDate(y,mo,d){ return `${y}-${String(mo+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`; }
function fmtMonth(y,m){ return new Date(y,m,1).toLocaleDateString("en-US",{month:"long",year:"numeric"}); }
function uid(){ return Math.random().toString(36).slice(2,9); }
function getSuggestions(muscles){ return EXERCISE_DB.filter(ex=>muscles.includes(ex.primary)); }
function daysUntil(dateStr){ if(!dateStr)return null; const d=new Date(dateStr+"T00:00:00"); return Math.max(0,Math.ceil((d-new Date())/86400000)); }
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
  input,button,textarea{outline:none;cursor:pointer;}
  .hover-lift{transition:all .25s cubic-bezier(.175,.885,.32,1.275);}
  .hover-lift:hover{transform:translateY(-2px);box-shadow:0 8px 20px rgba(0,0,0,0.4);}
  .btn-press:active{transform:scale(.96);}
  @keyframes slideIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
  @keyframes fadeIn{from{opacity:0}to{opacity:1}}
  @keyframes popIn{0%{opacity:0;transform:scale(.86)}65%{transform:scale(1.04)}100%{opacity:1;transform:scale(1)}}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
  @keyframes glow{0%,100%{box-shadow:0 0 20px rgba(0,240,255,0.2)}50%{box-shadow:0 0 40px rgba(0,240,255,0.5)}}
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

/* ══════════ STREAK MILESTONE MODAL ════════════════════════════════════════ */
function MilestoneModal({streak,onClose}){
  const emojis={7:"🔥",14:"⚡",21:"💎",30:"🌙",60:"🚀",90:"👑",180:"🌟",365:"🏆"};
  const labels={7:"One Week",14:"Two Weeks",21:"Three Weeks",30:"One Month",60:"Two Months",90:"Three Months",180:"Six Months",365:"One Year"};
  const e=emojis[streak]||"🔥";
  const l=labels[streak]||`${streak} Days`;
  return(
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(5,11,20,0.96)",backdropFilter:"blur(10px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:600,cursor:"pointer",animation:"fadeIn .3s ease"}}>
      <div style={{textAlign:"center",animation:"popIn .5s cubic-bezier(.175,.885,.32,1.275)",padding:"0 32px"}}>
        <div style={{fontSize:100,lineHeight:1,filter:`drop-shadow(0 0 30px ${C.accent})`,animation:"glow 2s infinite"}}>{e}</div>
        <div style={{fontFamily:"'Outfit',sans-serif",fontSize:14,fontWeight:700,color:C.muted,letterSpacing:6,marginTop:20,textTransform:"uppercase"}}>Streak Milestone</div>
        <div style={{fontFamily:"'Outfit',sans-serif",fontSize:64,fontWeight:700,color:C.accent,letterSpacing:4,lineHeight:1,marginTop:8,textShadow:`0 0 30px ${C.accentGlow}`}}>{streak}</div>
        <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:16,color:C.text,letterSpacing:4,marginTop:4}}>{l.toUpperCase()}</div>
        <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.muted,marginTop:24,letterSpacing:2,background:C.borderHi,padding:"8px 16px",borderRadius:20,display:"inline-block"}}>TAP TO CONTINUE</div>
      </div>
    </div>
  );
}

/* ══════════ ONBOARDING ════════════════════════════════════════════════════ */
function Onboarding({onComplete}){
  const [step,setStep]=useState(0);
  const [selectedHabits,setSelectedHabits]=useState(DEFAULT_HABITS);
  const [useGym,setUseGym]=useState(null);
  const [splitPreset,setSplitPreset]=useState("ppl");
  const [gymDaysTarget,setGymDaysTarget]=useState(5);
  const [goalName,setGoalName]=useState("");
  const [goalDate,setGoalDate]=useState("");

  const toggleHabit=(id)=>setSelectedHabits(prev=>prev.includes(id)?prev.filter(x=>x!==id):[...prev,id]);

  const finish=async()=>{
    const split=useGym?SPLIT_PRESETS[splitPreset].days.slice(0,gymDaysTarget):[];
    const config={
      habitsEnabled:selectedHabits,
      split,
      useGym:!!useGym,
      goalName:goalName.trim()||"My Goal",
      goalDate:goalDate||"",
    };
    await dbSet("userConfig",config);
    onComplete(config);
  };

  const catGroups=[...new Set(ALL_HABITS.map(h=>h.cat))];

  const steps=[
    {
      title:"What are you locking in for?",
      sub:"Set a goal name and target date. You can always update this later.",
      canNext:true,
      content:(
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.muted,letterSpacing:1.5,marginBottom:8}}>GOAL NAME</div>
            <input value={goalName} onChange={e=>setGoalName(e.target.value)} placeholder='e.g. "Get shredded by summer"' style={{width:"100%",padding:"14px 16px",background:C.surface,border:`1px solid ${C.borderHi}`,borderRadius:12,color:C.text,fontFamily:"'Outfit',sans-serif",fontSize:16}} onFocus={e=>e.target.style.borderColor=C.accent} onBlur={e=>e.target.style.borderColor=C.borderHi}/>
          </div>
          <div>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.muted,letterSpacing:1.5,marginBottom:8}}>TARGET DATE <span style={{opacity:.5}}>(optional)</span></div>
            <input type="date" value={goalDate} onChange={e=>setGoalDate(e.target.value)} style={{width:"100%",padding:"14px 16px",background:C.surface,border:`1px solid ${C.borderHi}`,borderRadius:12,color:goalDate?C.text:C.muted,fontFamily:"'Outfit',sans-serif",fontSize:16,colorScheme:"dark"}} onFocus={e=>e.target.style.borderColor=C.accent} onBlur={e=>e.target.style.borderColor=C.borderHi}/>
          </div>
          <div style={{padding:"14px 16px",background:`${C.accent}08`,border:`1px solid ${C.accentDim}`,borderRadius:12}}>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.accent,letterSpacing:1.5,marginBottom:4}}>EXAMPLE GOALS</div>
            <div style={{fontFamily:"'Outfit',sans-serif",fontSize:13,color:C.muted,lineHeight:1.7}}>Get gym fit by June 1st · Study for finals · Build a habit streak · Run a 5k</div>
          </div>
        </div>
      ),
    },
    {
      title:"Pick your daily habits.",
      sub:"Choose everything you want to track. Select as many as you want.",
      canNext:selectedHabits.length>0,
      content:(
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          {catGroups.map(cat=>(
            <div key={cat}>
              <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.muted,letterSpacing:2,marginBottom:8}}>{cat}</div>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {ALL_HABITS.filter(h=>h.cat===cat).map(h=>{
                  const on=selectedHabits.includes(h.id);
                  return(
                    <div key={h.id} onClick={()=>toggleHabit(h.id)} style={{display:"flex",alignItems:"center",gap:14,padding:"12px 14px",background:on?`${C.accent}15`:C.surface,border:`1px solid ${on?C.accentDim:C.border}`,borderRadius:10,cursor:"pointer",transition:"all .15s"}}>
                      <div style={{width:20,height:20,borderRadius:5,flexShrink:0,background:on?C.accent:C.bg,border:`1.5px solid ${on?C.accent:C.borderHi}`,display:"flex",alignItems:"center",justifyContent:"center",transition:"all .15s"}}>
                        {on&&<svg width="11" height="9" viewBox="0 0 12 10" fill="none"><path d="M1 5L4.5 8.5L11 1" stroke={C.bg} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                      </div>
                      <div style={{fontFamily:"'Outfit',sans-serif",fontSize:16,fontWeight:500,color:on?C.accent:C.text}}>{h.label}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ),
    },
    {
      title:"Do you go to the gym?",
      sub:"This enables the gym tracker and split planner.",
      canNext:useGym!==null,
      content:(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {[{val:true,icon:"💪",label:"Yes, I train at the gym",sub:"I want workout logging and split tracking"},{val:false,icon:"🏃",label:"No, I don't use the gym",sub:"I'll track habits and runs only"}].map(opt=>{
            const on=useGym===opt.val;
            return(
              <div key={String(opt.val)} onClick={()=>setUseGym(opt.val)} style={{display:"flex",alignItems:"center",gap:16,padding:"18px 16px",background:on?`${C.accent}15`:C.surface,border:`1px solid ${on?C.accentDim:C.border}`,borderRadius:12,cursor:"pointer",transition:"all .2s"}}>
                <div style={{fontSize:32,lineHeight:1}}>{opt.icon}</div>
                <div>
                  <div style={{fontFamily:"'Outfit',sans-serif",fontSize:17,fontWeight:600,color:on?C.accent:C.text}}>{opt.label}</div>
                  <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.muted,marginTop:3,letterSpacing:.5}}>{opt.sub}</div>
                </div>
              </div>
            );
          })}
        </div>
      ),
    },
    ...(useGym?[{
      title:"Pick your training split.",
      sub:"You can customize it fully after setup.",
      canNext:true,
      content:(
        <div>
          <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:20}}>
            {Object.entries(SPLIT_PRESETS).map(([key,preset])=>{
              const on=splitPreset===key;
              return(
                <div key={key} onClick={()=>setSplitPreset(key)} style={{padding:"13px 16px",background:on?`${C.accent}15`:C.surface,border:`1px solid ${on?C.accentDim:C.border}`,borderRadius:12,cursor:"pointer",transition:"all .15s"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                    <div style={{fontFamily:"'Outfit',sans-serif",fontSize:16,fontWeight:600,color:on?C.accent:C.text}}>{preset.label}</div>
                    <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.muted,letterSpacing:1}}>{preset.days.length} DAYS</div>
                  </div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                    {preset.days.map(d=><span key={d.id} style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:C.muted,background:C.borderHi,padding:"2px 6px",borderRadius:4}}>{d.label}</span>)}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{padding:"14px 16px",background:C.surface,border:`1px solid ${C.border}`,borderRadius:12}}>
            <div style={{fontFamily:"'Outfit',sans-serif",fontSize:15,fontWeight:600,marginBottom:10}}>Sessions per week</div>
            <div style={{display:"flex",gap:8}}>
              {[2,3,4,5,6,7].map(n=>(
                <button key={n} onClick={()=>setGymDaysTarget(n)} className="btn-press" style={{flex:1,padding:"10px 0",background:gymDaysTarget===n?C.accent:C.faint,border:`1px solid ${gymDaysTarget===n?C.accent:C.border}`,borderRadius:8,color:gymDaysTarget===n?C.bg:C.muted,fontFamily:"'JetBrains Mono',monospace",fontSize:14,fontWeight:700,cursor:"pointer",transition:"all .15s"}}>{n}</button>
              ))}
            </div>
          </div>
        </div>
      ),
    }]:[]),
  ];

  const s=steps[step];
  const isLast=step===steps.length-1;

  return(
    <div style={{background:C.bg,minHeight:"100vh",padding:"32px 16px 40px",fontFamily:"'Outfit',sans-serif",color:C.text,overflowY:"auto"}}>
      <style>{CSS}</style>
      <div style={{width:"100%",maxWidth:440,margin:"0 auto",animation:"slideIn .4s ease"}}>
        <div style={{marginBottom:28}}>
          <div style={{fontFamily:"'Outfit',sans-serif",fontSize:48,fontWeight:700,lineHeight:.88,letterSpacing:2,color:C.accent,textShadow:`0 0 16px ${C.accentGlow}`}}>LOCK</div>
          <div style={{fontFamily:"'Outfit',sans-serif",fontSize:48,fontWeight:700,lineHeight:.88,letterSpacing:2,color:C.text,marginBottom:16}}>IN.</div>
          <div style={{display:"flex",gap:5}}>
            {steps.map((_,i)=><div key={i} style={{height:3,flex:1,borderRadius:2,background:i<=step?C.accent:C.border,transition:"background .3s"}}/>)}
          </div>
        </div>
        <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.muted,letterSpacing:2,marginBottom:6}}>STEP {step+1} OF {steps.length}</div>
        <div style={{fontFamily:"'Outfit',sans-serif",fontSize:22,fontWeight:700,marginBottom:5}}>{s.title}</div>
        <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.muted,letterSpacing:1,marginBottom:20}}>{s.sub}</div>
        <div style={{marginBottom:28}}>{s.content}</div>
        <div style={{display:"flex",gap:10}}>
          {step>0&&<button onClick={()=>setStep(s=>s-1)} className="btn-press" style={{flex:1,padding:"14px",background:"transparent",border:`1px solid ${C.border}`,borderRadius:12,color:C.muted,fontFamily:"'Outfit',sans-serif",fontSize:16,fontWeight:600,cursor:"pointer"}}>← Back</button>}
          <button onClick={isLast?finish:()=>setStep(s=>s+1)} disabled={!s.canNext} className="btn-press" style={{flex:2,padding:"14px",background:s.canNext?C.accent:C.borderHi,border:"none",borderRadius:12,color:C.bg,fontFamily:"'Outfit',sans-serif",fontSize:16,fontWeight:700,letterSpacing:2,cursor:s.canNext?"pointer":"default",transition:"all .2s",boxShadow:s.canNext?`0 4px 16px ${C.accent}44`:"none"}}>
            {isLast?"LET'S GO →":"NEXT →"}
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
        <button onClick={onRemove} style={{background:"transparent",border:"none",color:C.muted,fontSize:22,cursor:"pointer",padding:"0 0 0 8px",lineHeight:1,flexShrink:0}} onMouseEnter={e=>e.target.style.color=C.danger} onMouseLeave={e=>e.target.style.color=C.muted}>×</button>
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
  const applyPreset=(key)=>setDays(SPLIT_PRESETS[key].days.map(d=>({...d,muscles:[...d.muscles]})));
  const toggleMuscle=(id,m)=>setDays(d=>d.map(x=>x.id===id?{...x,muscles:x.muscles.includes(m)?x.muscles.filter(v=>v!==m):[...x.muscles,m]}:x));
  return(
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(5,11,20,0.97)",backdropFilter:"blur(6px)",display:"flex",alignItems:"flex-start",justifyContent:"center",zIndex:500,padding:"16px",overflowY:"auto",animation:"fadeIn .2s ease"}}>
      <div onClick={e=>e.stopPropagation()} style={{background:C.surface,border:`1px solid ${C.borderHi}`,borderRadius:16,padding:"20px 16px",width:"100%",maxWidth:400,animation:"popIn .25s cubic-bezier(.175,.885,.32,1.275)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <div style={{fontFamily:"'Outfit',sans-serif",fontSize:20,fontWeight:700,color:C.accent}}>Edit Split</div>
          <button onClick={onClose} className="btn-press" style={{background:"transparent",border:"none",color:C.muted,fontSize:24,lineHeight:1}}>×</button>
        </div>
        <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.muted,letterSpacing:1.5,marginBottom:8}}>LOAD PRESET</div>
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
              <button onClick={()=>setDays(d=>d.filter(x=>x.id!==day.id))} className="btn-press" style={{background:"transparent",border:"none",color:C.muted,fontSize:16,cursor:"pointer",lineHeight:1}} onMouseEnter={e=>e.target.style.color=C.danger} onMouseLeave={e=>e.target.style.color=C.muted}>×</button>
            </div>
            {editingName===day.id?(
              <input autoFocus value={day.label} onChange={e=>setDays(d=>d.map(x=>x.id===day.id?{...x,label:e.target.value}:x))} onBlur={()=>setEditingName(null)} onKeyDown={e=>e.key==="Enter"&&setEditingName(null)} style={{width:"100%",padding:"8px 10px",background:C.faint,border:`1px solid ${C.accent}`,borderRadius:7,color:C.text,fontFamily:"'Outfit',sans-serif",fontSize:15,fontWeight:600,marginBottom:8}}/>
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
        <button onClick={()=>setDays(d=>[...d,{id:"d"+Date.now(),label:"New Day",muscles:[]}])} className="btn-press" style={{width:"100%",padding:"11px",background:"transparent",border:`1px dashed ${C.borderHi}`,borderRadius:10,color:C.muted,fontFamily:"'Outfit',sans-serif",fontSize:14,fontWeight:600,cursor:"pointer",marginBottom:12,transition:"all .2s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=C.accent;e.currentTarget.style.color=C.accent;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=C.borderHi;e.currentTarget.style.color=C.muted;}}>+ ADD DAY</button>
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
    dbGet("workout:"+today+":"+dayConfig.id).then(saved=>{setWorkout(saved||{dayId:dayConfig.id,exercises:[]});setReady(true);});
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
        <button onClick={()=>{setShowAddEx(true);setTimeout(()=>exInputRef.current?.focus(),50);}} className="btn-press hover-lift" style={{width:"100%",padding:"14px",background:C.surface,border:`1px dashed ${C.borderHi}`,borderRadius:12,cursor:"pointer",fontFamily:"'Outfit',sans-serif",fontSize:15,fontWeight:600,letterSpacing:1.5,color:C.text,transition:"all .2s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=dayColor;e.currentTarget.style.color=dayColor;e.currentTarget.style.background=`${dayColor}11`;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=C.borderHi;e.currentTarget.style.color=C.text;e.currentTarget.style.background=C.surface;}}>+ ADD EXERCISE</button>
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
      setMuscleTotals(mt||{});setGymCount((gw||{}).count||0);setReady(true);
    });
  },[]);
  const addGym=async()=>{ const n=gymCount<gymTarget?gymCount+1:0; setGymCount(n); await dbSet("gymWeek:"+week,{count:n}); };
  const saveSplit=async(newDays)=>{
    const updated={...userConfig,split:newDays};
    await dbSet("userConfig",updated); onUpdateConfig(updated); setShowSplitEditor(false);
  };
  const progress=calcMuscleProgress(muscleTotals);
  if(!ready)return<div style={{textAlign:"center",padding:40,fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.muted,letterSpacing:2,animation:"pulse 1.5s infinite"}}>INITIALIZING...</div>;
  if(activeDay){ const dwc=split.find(d=>d.id===activeDay.id)||{...activeDay,color:C.accent}; return<WorkoutLogger dayConfig={dwc} muscleTotals={muscleTotals} setMuscleTotals={setMuscleTotals} onBack={()=>setActiveDay(null)}/>; }
  return(
    <div>
      {showSplitEditor&&<SplitEditor split={split} onSave={saveSplit} onClose={()=>setShowSplitEditor(false)}/>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:24,animation:"slideIn .4s ease"}}>
        <div>
          <div style={{fontFamily:"'Outfit',sans-serif",fontSize:54,fontWeight:700,lineHeight:.88,letterSpacing:2,color:C.accent,textShadow:`0 0 16px ${C.accentGlow}`}}>GYM</div>
          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.muted,letterSpacing:2,marginTop:10}}>WEEKLY TRACKER</div>
        </div>
        <button onClick={()=>setShowSplitEditor(true)} className="btn-press" style={{background:C.surface,border:`1px solid ${C.borderHi}`,borderRadius:10,padding:"10px 14px",color:C.muted,fontFamily:"'Outfit',sans-serif",fontSize:13,fontWeight:600,cursor:"pointer",transition:"all .2s",marginTop:6}} onMouseEnter={e=>{e.currentTarget.style.borderColor=C.accent;e.currentTarget.style.color=C.accent;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=C.borderHi;e.currentTarget.style.color=C.muted;}}>⚙ EDIT SPLIT</button>
      </div>
      <div style={{marginBottom:24,animation:"slideIn .4s ease .05s both"}}>
        <Card highlight={gymCount>=gymTarget}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div><div style={{fontFamily:"'Outfit',sans-serif",fontSize:22,fontWeight:600,letterSpacing:1}}>This Week</div><div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.muted,marginTop:4,letterSpacing:1}}>{gymTarget}× TARGET</div></div>
            <div style={{fontFamily:"'Outfit',sans-serif",fontSize:64,fontWeight:300,lineHeight:1,color:gymCount>=gymTarget?C.accent:C.text,textShadow:gymCount>=gymTarget?`0 0 16px ${C.accentGlow}`:"none"}}>{gymCount}<span style={{fontSize:28,color:C.muted}}>/{gymTarget}</span></div>
          </div>
          <div style={{display:"flex",gap:5,marginBottom:14}}>{Array.from({length:gymTarget},(_,i)=><div key={i} style={{flex:1,height:6,borderRadius:3,background:i<gymCount?C.accent:C.bg,boxShadow:i<gymCount?`0 0 8px ${C.accent}`:"inset 0 1px 3px rgba(0,0,0,.5)",transition:"all .4s"}}/>)}</div>
          <button onClick={addGym} className="btn-press" style={{width:"100%",padding:"13px",background:gymCount>=gymTarget?C.accentDim:C.accent,border:"none",borderRadius:10,color:gymCount>=gymTarget?C.text:C.bg,fontFamily:"'Outfit',sans-serif",fontSize:16,fontWeight:700,letterSpacing:2,cursor:"pointer",transition:"all .2s",boxShadow:gymCount>=gymTarget?"none":`0 4px 16px ${C.accent}44`}}>
            {gymCount>=gymTarget?"✓ WEEK COMPLETE — TAP TO RESET":"+ LOG SESSION"}
          </button>
        </Card>
      </div>
      <div style={{marginBottom:24,animation:"slideIn .4s ease .1s both"}}>
        <SectionLabel action={<div style={{display:"flex",gap:5,background:C.surface,padding:4,borderRadius:8,border:`1px solid ${C.border}`}}>{["front","back"].map(v=>(<button key={v} onClick={()=>setBodyView(v)} className="btn-press" style={{background:bodyView===v?C.borderHi:"transparent",borderRadius:6,padding:"5px 12px",color:bodyView===v?C.text:C.muted,fontFamily:"'Outfit',sans-serif",fontSize:12,fontWeight:600,letterSpacing:1,cursor:"pointer",transition:"all .2s",border:"none"}}>{v.toUpperCase()}</button>))}</div>}>Muscle Progress</SectionLabel>
        <Card>
          <div style={{display:"flex",gap:18,alignItems:"center"}}>
            <div style={{width:120,flexShrink:0}}><BodyMapSVG progress={progress} view={bodyView}/></div>
            <div style={{flex:1}}>
              {(bodyView==="front"?["chest","shoulders","biceps","abs","legs"]:["back","triceps","legs"]).map(m=>{
                const pct=Math.round(progress[m]||0);
                return(<div key={m} style={{marginBottom:11}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontFamily:"'Outfit',sans-serif",fontSize:13,textTransform:"capitalize"}}>{m}</span><span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:pct>0?C.accent:C.muted}}>{muscleTotals[m]||0} sets</span></div>
                  <div style={{background:C.border,borderRadius:4,height:5,overflow:"hidden"}}><div style={{width:`${pct}%`,height:"100%",borderRadius:4,background:muscleColor(pct),transition:"width .6s cubic-bezier(.4,0,.2,1)"}}/></div>
                </div>);
              })}
            </div>
          </div>
        </Card>
      </div>
      <div style={{animation:"slideIn .4s ease .15s both"}}>
        <SectionLabel>Today's Workout</SectionLabel>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          {split.map(day=>(
            <button key={day.id} onClick={()=>setActiveDay(day)} className="hover-lift btn-press" style={{background:`${day.color}12`,border:`1px solid ${day.color}55`,borderRadius:12,padding:"14px 16px",textAlign:"left",cursor:"pointer",transition:"all .2s"}}>
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

/* ══════════ SETTINGS PAGE ══════════════════════════════════════════════════ */
function SettingsPage({userConfig,onUpdateConfig,userEmail}){
  const [goalName,setGoalName]=useState(userConfig.goalName||"");
  const [goalDate,setGoalDate]=useState(userConfig.goalDate||"");
  const [editingHabits,setEditingHabits]=useState(false);
  const [selectedHabits,setSelectedHabits]=useState(userConfig.habitsEnabled||DEFAULT_HABITS);
  const [saving,setSaving]=useState(false);
  const [toast,setToast]=useState("");
  const [confirmReset,setConfirmReset]=useState(null);

  const showToast=(msg)=>{ setToast(msg); setTimeout(()=>setToast(""),2500); };

  const saveGoal=async()=>{
    setSaving(true);
    const updated={...userConfig,goalName:goalName.trim()||"My Goal",goalDate};
    await dbSet("userConfig",updated); onUpdateConfig(updated); setSaving(false); showToast("Goal saved");
  };

  const saveHabits=async()=>{
    const updated={...userConfig,habitsEnabled:selectedHabits};
    await dbSet("userConfig",updated); onUpdateConfig(updated); setEditingHabits(false); showToast("Habits updated");
  };

  const handleReset=async(type)=>{
    setConfirmReset(null);
    if(type==="streak"){
      // Reset today and streak by just clearing today's habits won't fully reset streak
      // We clear a sentinel key instead
      await dbSet("streakOverride",{reset:true,date:todayKey()});
      showToast("Streak reset");
    } else if(type==="muscle"){
      await dbSet("muscleTotals",{});
      showToast("Muscle progress reset");
    } else if(type==="gym_week"){
      await dbSet("gymWeek:"+weekKey(),{count:0});
      showToast("Gym week reset");
    } else if(type==="all"){
      const keys=["muscleTotals","customHabits","gymWeek:"+weekKey(),"week:"+weekKey()];
      await Promise.all(keys.map(k=>dbSet(k,{})));
      showToast("Progress reset — habits and config kept");
    }
  };

  const catGroups=[...new Set(ALL_HABITS.map(h=>h.cat))];

  return(
    <div>
      {toast&&(
        <div style={{position:"fixed",top:24,left:"50%",transform:"translateX(-50%)",background:C.accent,color:C.bg,fontFamily:"'JetBrains Mono',monospace",fontSize:12,letterSpacing:2,padding:"10px 20px",borderRadius:20,zIndex:999,animation:"popIn .3s ease",whiteSpace:"nowrap"}}>{toast.toUpperCase()}</div>
      )}
      {confirmReset&&(
        <div onClick={()=>setConfirmReset(null)} style={{position:"fixed",inset:0,background:"rgba(5,11,20,0.95)",backdropFilter:"blur(6px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:700,padding:"0 24px",animation:"fadeIn .2s ease"}}>
          <div onClick={e=>e.stopPropagation()} style={{background:C.surface,border:`1px solid ${C.danger}`,borderRadius:16,padding:"24px 20px",width:"100%",maxWidth:360,animation:"popIn .25s ease"}}>
            <div style={{fontFamily:"'Outfit',sans-serif",fontSize:20,fontWeight:700,color:C.danger,marginBottom:8}}>Are you sure?</div>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.muted,letterSpacing:.5,marginBottom:20,lineHeight:1.7}}>{confirmReset.warning}</div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setConfirmReset(null)} className="btn-press" style={{flex:1,padding:"12px",background:"transparent",border:`1px solid ${C.border}`,borderRadius:10,color:C.muted,fontFamily:"'Outfit',sans-serif",fontSize:15,fontWeight:600,cursor:"pointer"}}>Cancel</button>
              <button onClick={()=>handleReset(confirmReset.type)} className="btn-press" style={{flex:1,padding:"12px",background:C.danger,border:"none",borderRadius:10,color:"#fff",fontFamily:"'Outfit',sans-serif",fontSize:15,fontWeight:700,cursor:"pointer"}}>Reset</button>
            </div>
          </div>
        </div>
      )}

      <div style={{fontFamily:"'Outfit',sans-serif",fontSize:54,fontWeight:700,lineHeight:.88,letterSpacing:2,color:C.accent,marginBottom:6,textShadow:`0 0 16px ${C.accentGlow}`,animation:"slideIn .4s ease"}}>SET</div>
      <div style={{fontFamily:"'Outfit',sans-serif",fontSize:54,fontWeight:700,lineHeight:.88,letterSpacing:2,color:C.text,marginBottom:28,animation:"slideIn .4s ease"}}>TINGS.</div>

      {/* Goal */}
      <div style={{marginBottom:28,animation:"slideIn .4s ease .05s both"}}>
        <SectionLabel>Your Goal</SectionLabel>
        <Card>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div>
              <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.muted,letterSpacing:1.5,marginBottom:7}}>GOAL NAME</div>
              <input value={goalName} onChange={e=>setGoalName(e.target.value)} placeholder="e.g. Get shredded by summer" style={{width:"100%",padding:"12px 14px",background:C.faint,border:`1px solid ${C.borderHi}`,borderRadius:10,color:C.text,fontFamily:"'Outfit',sans-serif",fontSize:15}} onFocus={e=>e.target.style.borderColor=C.accent} onBlur={e=>e.target.style.borderColor=C.borderHi}/>
            </div>
            <div>
              <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.muted,letterSpacing:1.5,marginBottom:7}}>TARGET DATE <span style={{opacity:.5}}>(optional)</span></div>
              <input type="date" value={goalDate} onChange={e=>setGoalDate(e.target.value)} style={{width:"100%",padding:"12px 14px",background:C.faint,border:`1px solid ${C.borderHi}`,borderRadius:10,color:goalDate?C.text:C.muted,fontFamily:"'Outfit',sans-serif",fontSize:15,colorScheme:"dark"}} onFocus={e=>e.target.style.borderColor=C.accent} onBlur={e=>e.target.style.borderColor=C.borderHi}/>
              {goalDate&&<div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.accent,marginTop:6,letterSpacing:1}}>{daysUntil(goalDate)} DAYS REMAINING</div>}
            </div>
            <button onClick={saveGoal} disabled={saving} className="btn-press" style={{width:"100%",padding:"12px",background:C.accent,border:"none",borderRadius:10,color:C.bg,fontFamily:"'Outfit',sans-serif",fontSize:15,fontWeight:700,letterSpacing:1,cursor:"pointer",boxShadow:`0 4px 12px ${C.accent}44`}}>
              {saving?"SAVING...":"SAVE GOAL"}
            </button>
          </div>
        </Card>
      </div>

      {/* Habits */}
      <div style={{marginBottom:28,animation:"slideIn .4s ease .1s both"}}>
        <SectionLabel action={<button onClick={()=>setEditingHabits(!editingHabits)} className="btn-press" style={{background:editingHabits?`${C.accent}18`:C.border,border:`1px solid ${editingHabits?C.accentDim:C.borderHi}`,borderRadius:6,padding:"4px 12px",color:editingHabits?C.accent:C.text,fontFamily:"'Outfit',sans-serif",fontSize:12,fontWeight:600,letterSpacing:1,cursor:"pointer",transition:"all .2s"}}>{editingHabits?"CANCEL":"EDIT"}</button>}>Daily Habits</SectionLabel>
        {editingHabits?(
          <Card>
            {catGroups.map(cat=>(
              <div key={cat} style={{marginBottom:16}}>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.muted,letterSpacing:2,marginBottom:8}}>{cat}</div>
                {ALL_HABITS.filter(h=>h.cat===cat).map(h=>{
                  const on=selectedHabits.includes(h.id);
                  return(
                    <div key={h.id} onClick={()=>setSelectedHabits(prev=>prev.includes(h.id)?prev.filter(x=>x!==h.id):[...prev,h.id])} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 12px",background:on?`${C.accent}15`:C.faint,border:`1px solid ${on?C.accentDim:C.border}`,borderRadius:9,cursor:"pointer",transition:"all .15s",marginBottom:6}}>
                      <div style={{width:18,height:18,borderRadius:4,flexShrink:0,background:on?C.accent:C.bg,border:`1.5px solid ${on?C.accent:C.borderHi}`,display:"flex",alignItems:"center",justifyContent:"center",transition:"all .15s"}}>
                        {on&&<svg width="10" height="8" viewBox="0 0 12 10" fill="none"><path d="M1 5L4.5 8.5L11 1" stroke={C.bg} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                      </div>
                      <div style={{fontFamily:"'Outfit',sans-serif",fontSize:15,color:on?C.accent:C.text}}>{h.label}</div>
                    </div>
                  );
                })}
              </div>
            ))}
            <button onClick={saveHabits} className="btn-press" style={{width:"100%",padding:"12px",background:C.accent,border:"none",borderRadius:10,color:C.bg,fontFamily:"'Outfit',sans-serif",fontSize:15,fontWeight:700,letterSpacing:1,cursor:"pointer",boxShadow:`0 4px 12px ${C.accent}44`}}>SAVE HABITS</button>
          </Card>
        ):(
          <Card>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {(userConfig.habitsEnabled||DEFAULT_HABITS).map(id=>{ const h=ALL_HABITS.find(x=>x.id===id); return h?<span key={id} style={{fontFamily:"'Outfit',sans-serif",fontSize:13,fontWeight:500,color:C.text,background:C.borderHi,padding:"5px 10px",borderRadius:7}}>{h.label}</span>:null; })}
            </div>
          </Card>
        )}
      </div>

      {/* Features */}
      <div style={{marginBottom:28,animation:"slideIn .4s ease .13s both"}}>
        <SectionLabel>Features</SectionLabel>
        <Card>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
            <div>
              <div style={{fontFamily:"'Outfit',sans-serif",fontSize:16,fontWeight:600,marginBottom:3}}>Gym Tracker</div>
              <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.muted,letterSpacing:.5}}>Workout logging, split planner, body map</div>
            </div>
            <div onClick={async()=>{
              const updated={...userConfig,useGym:!userConfig.useGym};
              await dbSet("userConfig",updated); onUpdateConfig(updated); showToast(updated.useGym?"Gym tab enabled":"Gym tab hidden");
            }} style={{width:48,height:26,borderRadius:13,background:userConfig.useGym?C.accent:C.borderHi,border:`1px solid ${userConfig.useGym?C.accentDim:C.border}`,position:"relative",cursor:"pointer",transition:"all .25s",flexShrink:0,boxShadow:userConfig.useGym?`0 0 10px ${C.accent}55`:"none"}}>
              <div style={{position:"absolute",top:3,left:userConfig.useGym?24:3,width:18,height:18,borderRadius:9,background:userConfig.useGym?C.bg:C.muted,transition:"left .25s",boxShadow:"0 1px 4px rgba(0,0,0,.4)"}}/>
            </div>
          </div>
        </Card>
      </div>

      {/* Account */}
      <div style={{marginBottom:28,animation:"slideIn .4s ease .15s both"}}>
        <SectionLabel>Account</SectionLabel>
        <Card>
          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.muted,letterSpacing:1,marginBottom:14}}>{userEmail}</div>
          <button onClick={()=>supabase.auth.signOut()} className="btn-press" style={{width:"100%",padding:"12px",background:"transparent",border:`1px solid ${C.danger}`,borderRadius:10,color:C.danger,fontFamily:"'Outfit',sans-serif",fontSize:15,fontWeight:700,letterSpacing:1,cursor:"pointer",transition:"all .2s"}} onMouseEnter={e=>{e.currentTarget.style.background=`${C.danger}18`;}} onMouseLeave={e=>{e.currentTarget.style.background="transparent";}}>LOG OUT</button>
        </Card>
      </div>

      {/* Danger zone */}
      <div style={{marginBottom:28,animation:"slideIn .4s ease .2s both"}}>
        <SectionLabel>Reset Options</SectionLabel>
        <Card style={{border:`1px solid ${C.danger}44`}}>
          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.muted,letterSpacing:1,marginBottom:14,lineHeight:1.7}}>These actions cannot be undone. Your account and habits config will be kept unless noted.</div>
          {[
            {type:"streak",label:"Reset streak counter",warning:"This will reset your current streak to 0. Past data stays intact."},
            {type:"gym_week",label:"Reset gym week count",warning:"Sets this week's gym session count back to 0."},
            {type:"muscle",label:"Reset muscle progress",warning:"Clears all muscle set totals from the body map. Cannot be undone."},
            {type:"all",label:"Reset all progress data",warning:"Resets streaks, muscle totals, and weekly counters. Your habits and goal are kept."},
          ].map(item=>(
            <button key={item.type} onClick={()=>setConfirmReset(item)} className="btn-press" style={{width:"100%",padding:"12px 14px",background:"transparent",border:`1px solid ${C.border}`,borderRadius:10,color:C.danger,fontFamily:"'Outfit',sans-serif",fontSize:14,fontWeight:600,cursor:"pointer",marginBottom:8,textAlign:"left",transition:"all .15s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=C.danger;e.currentTarget.style.background=`${C.danger}0a`;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.background="transparent";}}>
              {item.label}
            </button>
          ))}
        </Card>
      </div>
    </div>
  );
}

/* ══════════ HABITS PAGE ════════════════════════════════════════════════════ */
function HabitsPage({userConfig}){
  const today=todayKey(),week=weekKey();
  const enabledIds=userConfig.habitsEnabled||DEFAULT_HABITS;
  const habits=ALL_HABITS.filter(h=>enabledIds.includes(h.id));
  const [checks,setChecks]=useState({});
  const [sleep,setSleep]=useState(false);
  const [runs,setRuns]=useState(0);
  const [customHabits,setCustomHabits]=useState([]);
  const [customChecks,setCustomChecks]=useState({});
  const [newHabitLabel,setNewHabitLabel]=useState("");
  const [addingHabit,setAddingHabit]=useState(false);
  const [calModal,setCalModal]=useState(null);
  const [streak,setStreak]=useState(0);
  const [milestoneShown,setMilestoneShown]=useState(null);
  const [showMilestone,setShowMilestone]=useState(false);
  const [chartData,setChartData]=useState([]);
  const [ready,setReady]=useState(false);
  const newHabitRef=useRef(null);

  useEffect(()=>{
    (async()=>{
      const [day,wk,ch,cc,ml]=await Promise.all([
        dbGet("day:"+today),
        dbGet("week:"+week),
        dbGet("customHabits"),
        dbGet("customChecks:"+today),
        dbGet("milestoneShown"),
      ]);
      setChecks(day?.habits||{});
      setSleep(day?.sleep||false);
      setRuns((wk||{}).runs||0);
      setCustomHabits(ch||[]);
      setCustomChecks(cc||{});
      setMilestoneShown(ml||{});

      // build chart + streak
      const days=[];
      let s=0,prevDone=true;
      for(let i=6;i>=0;i--){
        const d=new Date(); d.setDate(d.getDate()-i);
        const dk=d.toISOString().slice(0,10);
        const raw=await dbGet("day:"+dk);
        const chk=raw?.habits||{},cch=raw?.customChecks||{};
        const n=habits.filter(h=>chk[h.id]).length;
        days.push({name:["S","M","T","W","T","F","S"][d.getDay()],done:n,total:habits.length,date:dk});
        if(dk<today){
          if(n===habits.length&&habits.length>0)prevDone&&s++;
          else{if(dk<today)s=0;}
        }
      }
      // today
      const todayRaw=await dbGet("day:"+today);
      const todayDone=habits.filter(h=>(todayRaw?.habits||{})[h.id]).length;
      if(todayDone===habits.length&&habits.length>0)s++;
      setStreak(s);
      setChartData(days);
      setReady(true);
    })();
  },[today,week,enabledIds.join(",")]);

  // check milestone
  useEffect(()=>{
    if(!ready)return;
    const hit=STREAK_MILESTONES.find(m=>streak>=m&&!(milestoneShown||{})[m]);
    if(hit){ setShowMilestone(hit); }
  },[streak,ready]);

  const dismissMilestone=async()=>{
    const updated={...milestoneShown,[showMilestone]:true};
    setMilestoneShown(updated);
    await dbSet("milestoneShown",updated);
    setShowMilestone(null);
  };

  const saveDay=async(newChecks,newSleep)=>{
    await dbSet("day:"+today,{habits:newChecks,sleep:newSleep});
  };
  const toggle=async(id)=>{
    const n={...checks,[id]:!checks[id]};
    setChecks(n); await saveDay(n,sleep);
    // recompute streak for today
    const done=habits.filter(h=>n[h.id]).length;
    if(done===habits.length){ const ns=streak<1?1:streak; setStreak(ns); }
  };
  const toggleCustom=async(id)=>{
    const n={...customChecks,[id]:!customChecks[id]};
    setCustomChecks(n); await dbSet("customChecks:"+today,n);
  };
  const toggleSleep=async()=>{ const n=!sleep; setSleep(n); await saveDay(checks,n); };
  const addRun=async()=>{ const n=runs<RUN_TARGET?runs+1:0; setRuns(n); await dbSet("week:"+week,{runs:n}); };
  const addCustom=async()=>{
    if(!newHabitLabel.trim())return;
    const nh={id:"c"+uid(),label:newHabitLabel.trim()};
    const updated=[...customHabits,nh];
    setCustomHabits(updated); await dbSet("customHabits",updated);
    setNewHabitLabel(""); setAddingHabit(false);
  };
  const removeCustom=async(id)=>{
    const updated=customHabits.filter(h=>h.id!==id);
    setCustomHabits(updated); await dbSet("customHabits",updated);
  };

  const coreDone=habits.filter(h=>checks[h.id]).length;
  const customDone=customHabits.filter(h=>customChecks[h.id]).length;
  const totalDone=coreDone+(sleep?1:0)+customDone;
  const totalAll=habits.length+1+customHabits.length;
  const allDone=totalDone>=totalAll&&totalAll>0;
  const goalName=userConfig.goalName||"My Goal";
  const goalDate=userConfig.goalDate||"";
  const daysLeft=daysUntil(goalDate);

  if(!ready)return<div style={{textAlign:"center",padding:40,fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.muted,letterSpacing:2,animation:"pulse 1.5s infinite"}}>INITIALIZING...</div>;

  return(
    <div>
      {showMilestone&&<MilestoneModal streak={showMilestone} onClose={dismissMilestone}/>}
      {calModal&&<CalendarModal habitId={calModal.id} habitLabel={calModal.label} onClose={()=>setCalModal(null)}/>}
      {allDone&&(
        <div style={{position:"fixed",inset:0,pointerEvents:"none",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200}}>
          <div style={{fontFamily:"'Outfit',sans-serif",fontSize:72,fontWeight:900,letterSpacing:6,color:C.accent,opacity:.06,textAlign:"center",lineHeight:1,userSelect:"none",textTransform:"uppercase"}}>LOCKED<br/>IN</div>
        </div>
      )}

      {/* Header */}
      <div style={{marginBottom:24,animation:"slideIn .4s ease"}}>
        <div style={{fontFamily:"'Outfit',sans-serif",fontSize:54,fontWeight:700,lineHeight:.88,letterSpacing:2,color:C.accent,textShadow:`0 0 16px ${C.accentGlow}`}}>LOCK</div>
        <div style={{fontFamily:"'Outfit',sans-serif",fontSize:54,fontWeight:700,lineHeight:.88,letterSpacing:2,color:C.text,marginBottom:14}}>IN.</div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 14px",background:C.surface,border:`1px solid ${C.border}`,borderRadius:10}}>
            <span style={{fontSize:18}}>🔥</span>
            <div><div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:20,fontWeight:600,color:C.accent,lineHeight:1}}>{streak}</div><div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:C.muted,letterSpacing:1}}>DAY STREAK</div></div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 14px",background:C.surface,border:`1px solid ${C.border}`,borderRadius:10}}>
            <span style={{fontSize:18}}>✓</span>
            <div><div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:20,fontWeight:600,color:allDone?C.accent:C.text,lineHeight:1}}>{totalDone}/{totalAll}</div><div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:C.muted,letterSpacing:1}}>TODAY DONE</div></div>
          </div>
          {goalDate&&daysLeft!==null&&(
            <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 14px",background:daysLeft<=7?`${C.danger}12`:C.surface,border:`1px solid ${daysLeft<=7?C.danger:C.border}`,borderRadius:10}}>
              <span style={{fontSize:18}}>🎯</span>
              <div><div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:20,fontWeight:600,color:daysLeft<=7?C.danger:C.text,lineHeight:1}}>{daysLeft}d</div><div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:C.muted,letterSpacing:1,maxWidth:80,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{goalName.toUpperCase().slice(0,12)}</div></div>
            </div>
          )}
        </div>
      </div>

      {/* Chart */}
      <div style={{marginBottom:24,animation:"slideIn .4s ease .05s both"}}>
        <SectionLabel>Telemetry — 7 Day</SectionLabel>
        <Card style={{padding:"16px 12px 10px"}}>
          <ResponsiveContainer width="100%" height={80}>
            <BarChart data={chartData} barSize={20}>
              <XAxis dataKey="name" tick={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,fill:C.muted,letterSpacing:1}} axisLine={false} tickLine={false}/>
              <Bar dataKey="done" radius={[4,4,0,0]}>
                {chartData.map((entry,i)=><Cell key={i} fill={entry.done===entry.total&&entry.total>0?C.accent:entry.done>0?C.accentDim:C.borderHi}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Core habits */}
      <div style={{marginBottom:20,animation:"slideIn .4s ease .1s both"}}>
        <SectionLabel>Daily Habits</SectionLabel>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {habits.map(h=>{
            const done=!!checks[h.id];
            return(
              <div key={h.id} style={{display:"flex",alignItems:"center",gap:0,background:done?`${C.accent}0e`:C.surface,border:`1px solid ${done?C.accentDim:C.border}`,borderRadius:12,overflow:"hidden",transition:"all .2s"}}>
                <div onClick={()=>toggle(h.id)} style={{flex:1,display:"flex",alignItems:"center",gap:14,padding:"15px 16px",cursor:"pointer"}}>
                  <div style={{width:24,height:24,borderRadius:6,flexShrink:0,background:done?C.accent:C.bg,border:`2px solid ${done?C.accent:C.borderHi}`,display:"flex",alignItems:"center",justifyContent:"center",transition:"all .2s",boxShadow:done?`0 0 10px ${C.accent}44`:"none"}}>
                    {done&&<svg width="13" height="11" viewBox="0 0 14 12" fill="none"><path d="M1 6L5 10L13 1" stroke={C.bg} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                  <span style={{fontFamily:"'Outfit',sans-serif",fontSize:17,fontWeight:500,color:done?C.accent:C.text,textDecoration:done?"line-through":"none",opacity:done?.7:1,transition:"all .2s"}}>{h.label}</span>
                </div>
                <button onClick={()=>setCalModal(h)} style={{background:"transparent",border:"none",color:C.muted,padding:"15px 16px",cursor:"pointer",fontSize:16,transition:"color .2s",lineHeight:1}} onMouseEnter={e=>e.currentTarget.style.color=C.accent} onMouseLeave={e=>e.currentTarget.style.color=C.muted}>📅</button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sleep */}
      <div style={{marginBottom:20,animation:"slideIn .4s ease .15s both"}}>
        <div onClick={toggleSleep} style={{display:"flex",alignItems:"center",gap:14,padding:"15px 16px",background:sleep?`${C.accent}0e`:C.surface,border:`1px solid ${sleep?C.accentDim:C.border}`,borderRadius:12,cursor:"pointer",transition:"all .2s"}}>
          <div style={{width:24,height:24,borderRadius:6,flexShrink:0,background:sleep?C.accent:C.bg,border:`2px solid ${sleep?C.accent:C.borderHi}`,display:"flex",alignItems:"center",justifyContent:"center",transition:"all .2s",boxShadow:sleep?`0 0 10px ${C.accent}44`:"none"}}>
            {sleep&&<svg width="13" height="11" viewBox="0 0 14 12" fill="none"><path d="M1 6L5 10L13 1" stroke={C.bg} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          </div>
          <span style={{fontFamily:"'Outfit',sans-serif",fontSize:17,fontWeight:500,color:sleep?C.accent:C.text,textDecoration:sleep?"line-through":"none",opacity:sleep?.7:1,transition:"all .2s"}}>Sleep 8+ hours</span>
        </div>
      </div>

      {/* Runs */}
      <div style={{marginBottom:20,animation:"slideIn .4s ease .2s both"}}>
        <SectionLabel>Weekly Runs</SectionLabel>
        <Card highlight={runs>=RUN_TARGET}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:28,fontWeight:600,color:runs>=RUN_TARGET?C.accent:C.text}}>{runs}<span style={{fontSize:13,color:C.muted}}>/{RUN_TARGET}</span></div>
            <button onClick={addRun} className="btn-press" style={{background:runs>=RUN_TARGET?C.accentDim:C.accent,border:"none",borderRadius:9,padding:"10px 18px",color:runs>=RUN_TARGET?C.text:C.bg,fontFamily:"'Outfit',sans-serif",fontSize:14,fontWeight:700,letterSpacing:1.5,cursor:"pointer",transition:"all .2s"}}>
              {runs>=RUN_TARGET?"✓ RESET":"+ LOG RUN"}
            </button>
          </div>
          <div style={{display:"flex",gap:5}}>
            {Array.from({length:RUN_TARGET},(_,i)=><div key={i} style={{flex:1,height:5,borderRadius:3,background:i<runs?C.accent:C.bg,transition:"all .4s",boxShadow:i<runs?`0 0 6px ${C.accent}`:"none"}}/>)}
          </div>
        </Card>
      </div>

      {/* Custom habits */}
      <div style={{marginBottom:20,animation:"slideIn .4s ease .25s both"}}>
        <SectionLabel action={<button onClick={()=>{setAddingHabit(true);setTimeout(()=>newHabitRef.current?.focus(),50);}} className="btn-press" style={{background:C.border,border:"none",borderRadius:6,padding:"4px 12px",color:C.text,fontFamily:"'Outfit',sans-serif",fontSize:12,fontWeight:600,letterSpacing:1,cursor:"pointer"}}>+ ADD</button>}>Custom Tasks</SectionLabel>
        {addingHabit&&(
          <div style={{display:"flex",gap:8,marginBottom:10}}>
            <input ref={newHabitRef} value={newHabitLabel} onChange={e=>setNewHabitLabel(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")addCustom();if(e.key==="Escape"){setAddingHabit(false);setNewHabitLabel("");}}} placeholder="Habit name..." style={{flex:1,padding:"12px 14px",background:C.surface,border:`1px solid ${C.accent}`,borderRadius:10,color:C.text,fontFamily:"'Outfit',sans-serif",fontSize:15}} autoFocus/>
            <button onClick={addCustom} className="btn-press" style={{background:C.accent,border:"none",borderRadius:10,padding:"0 18px",color:C.bg,fontFamily:"'Outfit',sans-serif",fontSize:16,fontWeight:700,cursor:"pointer"}}>+</button>
            <button onClick={()=>{setAddingHabit(false);setNewHabitLabel("");}} className="btn-press" style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:10,padding:"0 14px",color:C.muted,fontFamily:"'Outfit',sans-serif",fontSize:16,cursor:"pointer"}}>✕</button>
          </div>
        )}
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {customHabits.map(h=>{
            const done=!!customChecks[h.id];
            return(
              <div key={h.id} style={{display:"flex",alignItems:"center",background:done?`${C.accent}0e`:C.surface,border:`1px solid ${done?C.accentDim:C.border}`,borderRadius:12,overflow:"hidden",transition:"all .2s"}}>
                <div onClick={()=>toggleCustom(h.id)} style={{flex:1,display:"flex",alignItems:"center",gap:14,padding:"15px 16px",cursor:"pointer"}}>
                  <div style={{width:24,height:24,borderRadius:6,flexShrink:0,background:done?C.accent:C.bg,border:`2px solid ${done?C.accent:C.borderHi}`,display:"flex",alignItems:"center",justifyContent:"center",transition:"all .2s",boxShadow:done?`0 0 10px ${C.accent}44`:"none"}}>
                    {done&&<svg width="13" height="11" viewBox="0 0 14 12" fill="none"><path d="M1 6L5 10L13 1" stroke={C.bg} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                  <span style={{fontFamily:"'Outfit',sans-serif",fontSize:17,fontWeight:500,color:done?C.accent:C.text,textDecoration:done?"line-through":"none",opacity:done?.7:1}}>{h.label}</span>
                </div>
                <button onClick={()=>removeCustom(h.id)} style={{background:"transparent",border:"none",color:C.muted,padding:"15px 14px",cursor:"pointer",fontSize:18,transition:"color .2s"}} onMouseEnter={e=>e.currentTarget.style.color=C.danger} onMouseLeave={e=>e.currentTarget.style.color=C.muted}>×</button>
              </div>
            );
          })}
          {customHabits.length===0&&!addingHabit&&<div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.muted,letterSpacing:1.5,padding:"12px 0",textAlign:"center"}}>NO CUSTOM TASKS YET</div>}
        </div>
      </div>
    </div>
  );
}

/* ══════════ ROOT ════════════════════════════════════════════════════════════ */
export default function LockIn(){
  const [session,setSession]=useState(undefined);
  const [userConfig,setUserConfig]=useState(undefined);
  const [page,setPage]=useState("habits");
  const [userEmail,setUserEmail]=useState("");

  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>{
      setSession(session);
      setUserEmail(session?.user?.email||"");
    });
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_,s)=>{
      setSession(s);
      setUserEmail(s?.user?.email||"");
    });
    return()=>subscription.unsubscribe();
  },[]);

  useEffect(()=>{
    if(!session){ return; }
    dbGet("userConfig").then(cfg=>{
      setUserConfig(cfg||{});
    });
  },[session]);

  if(session===undefined||(session&&userConfig===undefined))return(
    <div style={{background:C.bg,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:14,letterSpacing:6,color:C.accent,animation:"pulse 1.5s infinite"}}>INITIALIZING...</div>
      <style>{CSS}</style>
    </div>
  );

  if(!session)return<Auth/>;

  if(userConfig&&Object.keys(userConfig).length===0)return<Onboarding onComplete={cfg=>setUserConfig(cfg)}/>;

  const tabs=[
    {id:"habits",icon:"✓",label:"Habits"},
    ...(userConfig?.useGym!==false?[{id:"gym",icon:"💪",label:"Gym"}]:[]),
    {id:"settings",icon:"⚙",label:"Settings"},
  ];

  return(
    <div style={{background:C.bg,minHeight:"100vh",color:C.text}}>
      <style>{CSS}</style>
      <div style={{maxWidth:480,margin:"0 auto",padding:"24px 16px 100px"}}>
        {page==="habits"&&<HabitsPage userConfig={userConfig}/>}
        {page==="gym"&&userConfig?.useGym!==false&&<GymPage userConfig={userConfig} onUpdateConfig={setUserConfig}/>}
        {page==="settings"&&<SettingsPage userConfig={userConfig} onUpdateConfig={setUserConfig} userEmail={userEmail}/>}
      </div>
      <div style={{position:"fixed",bottom:0,left:0,right:0,background:"rgba(5,11,20,0.88)",backdropFilter:"blur(16px)",WebkitBackdropFilter:"blur(16px)",borderTop:`1px solid ${C.border}`,padding:"12px 0 max(env(safe-area-inset-bottom),12px)",zIndex:100}}>
        <div style={{maxWidth:480,margin:"0 auto",display:"flex",justifyContent:"center",gap:8,padding:"0 12px"}}>
          {tabs.map(tab=>(
            <button key={tab.id} onClick={()=>setPage(tab.id)} className="btn-press" style={{flex:1,padding:"11px 0",background:page===tab.id?`${C.accent}15`:"transparent",border:`1px solid ${page===tab.id?C.accentDim:"transparent"}`,boxShadow:page===tab.id?`0 0 12px ${C.accentGlow}`:"none",borderRadius:12,display:"flex",flexDirection:"column",alignItems:"center",gap:4,cursor:"pointer",transition:"all .2s cubic-bezier(.4,0,.2,1)"}}>
              <span style={{fontSize:20,lineHeight:1,filter:page===tab.id?`drop-shadow(0 0 6px ${C.accent})`:"grayscale(100%)",opacity:page===tab.id?1:0.55}}>{tab.icon}</span>
              <span style={{fontFamily:"'Outfit',sans-serif",fontSize:12,letterSpacing:1.5,color:page===tab.id?C.accent:C.muted,fontWeight:700}}>{tab.label.toUpperCase()}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
