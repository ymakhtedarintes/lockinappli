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
  {id:"pushups",   label:"Pushups",              cat:"FITNESS"},
  {id:"pullups",   label:"Pullups",              cat:"FITNESS"},
  {id:"run",       label:"Go for a run",         cat:"FITNESS"},
  {id:"steps",     label:"Hit 10,000 steps",     cat:"FITNESS"},
  {id:"stretch",   label:"Stretch / mobility",   cat:"FITNESS"},
  {id:"workout",   label:"Complete a workout",   cat:"FITNESS"},
  {id:"read",      label:"Read 30 min",          cat:"MIND"},
  {id:"meditate",  label:"Meditate 10 min",      cat:"MIND"},
  {id:"journal",   label:"Write in journal",     cat:"MIND"},
  {id:"learn",     label:"Learn something new",  cat:"MIND"},
  {id:"nosocial",  label:"No social media",      cat:"MIND"},
  {id:"study",     label:"Study 1 hr",           cat:"WORK"},
  {id:"hw",        label:"Homework 1 hr",        cat:"WORK"},
  {id:"projects",  label:"Side project 1 hr",    cat:"WORK"},
  {id:"deepwork",  label:"Deep work session",    cat:"WORK"},
  {id:"water",     label:"Drink 2L water",       cat:"HEALTH"},
  {id:"eatclean",  label:"Eat clean all day",    cat:"HEALTH"},
  {id:"nojunk",    label:"No junk food",         cat:"HEALTH"},
  {id:"vitamins",  label:"Take vitamins",        cat:"HEALTH"},
  {id:"noalcohol", label:"No alcohol",           cat:"HEALTH"},
  {id:"outside",   label:"Go outside",           cat:"DAILY"},
  {id:"tidy",      label:"Tidy your space",      cat:"DAILY"},
  {id:"cook",      label:"Cook at home",         cat:"DAILY"},
  {id:"connect",   label:"Connect with someone", cat:"DAILY"},
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
const BODY_FRONT_B64 = "data:image/png;base64,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";
const BODY_BACK_B64 = "data:image/png;base64,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";

function BodyMapSVG({worked,view}){
  const on=(m)=>worked[m]?"rgba(0,240,255,0.55)":"rgba(0,240,255,0)";
  const outline=(m)=>worked[m]?"rgba(0,240,255,0.9)":"rgba(0,240,255,0)";
  const gf=`url(#mg)`;
  const Defs=()=>(
    <defs>
      <filter id="mg" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="6" result="b"/>
        <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
  );
  if(view==="front")return(
    <div style={{position:"relative",width:"100%",aspectRatio:"180/368"}}>
      <img src={BODY_FRONT_B64} alt="" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"fill"}}/>
      <svg viewBox="0 0 180 368" style={{position:"absolute",inset:0,width:"100%",height:"100%"}} xmlns="http://www.w3.org/2000/svg">
        <Defs/>
        <polygon points="12,86 50,78 54,130 18,136" fill={on("shoulders")} stroke={outline("shoulders")} strokeWidth="1" filter={gf} style={{transition:"fill .4s,stroke .4s"}}/>
        <polygon points="168,86 130,78 126,130 162,136" fill={on("shoulders")} stroke={outline("shoulders")} strokeWidth="1" filter={gf} style={{transition:"fill .4s,stroke .4s"}}/>
        <polygon points="52,90 90,86 92,148 56,150" fill={on("chest")} stroke={outline("chest")} strokeWidth="1" filter={gf} style={{transition:"fill .4s,stroke .4s"}}/>
        <polygon points="128,90 90,86 88,148 124,150" fill={on("chest")} stroke={outline("chest")} strokeWidth="1" filter={gf} style={{transition:"fill .4s,stroke .4s"}}/>
        <polygon points="4,132 40,124 42,204 6,208" fill={on("biceps")} stroke={outline("biceps")} strokeWidth="1" filter={gf} style={{transition:"fill .4s,stroke .4s"}}/>
        <polygon points="176,132 140,124 138,204 174,208" fill={on("biceps")} stroke={outline("biceps")} strokeWidth="1" filter={gf} style={{transition:"fill .4s,stroke .4s"}}/>
        <polygon points="58,150 122,150 124,238 56,238" fill={on("abs")} stroke={outline("abs")} strokeWidth="1" filter={gf} style={{transition:"fill .4s,stroke .4s"}}/>
        <polygon points="44,252 86,250 88,334 46,336" fill={on("legs")} stroke={outline("legs")} strokeWidth="1" filter={gf} style={{transition:"fill .4s,stroke .4s"}}/>
        <polygon points="136,252 94,250 92,334 134,336" fill={on("legs")} stroke={outline("legs")} strokeWidth="1" filter={gf} style={{transition:"fill .4s,stroke .4s"}}/>
        <polygon points="50,336 82,336 80,366 52,366" fill={on("legs")} stroke={outline("legs")} strokeWidth="1" filter={gf} style={{transition:"fill .4s,stroke .4s"}}/>
        <polygon points="130,336 98,336 100,366 128,366" fill={on("legs")} stroke={outline("legs")} strokeWidth="1" filter={gf} style={{transition:"fill .4s,stroke .4s"}}/>
      </svg>
    </div>
  );
  return(
    <div style={{position:"relative",width:"100%",aspectRatio:"180/368"}}>
      <img src={BODY_BACK_B64} alt="" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"fill"}}/>
      <svg viewBox="0 0 180 368" style={{position:"absolute",inset:0,width:"100%",height:"100%"}} xmlns="http://www.w3.org/2000/svg">
        <Defs/>
        <polygon points="50,70 130,70 132,118 48,118" fill={on("back")} stroke={outline("back")} strokeWidth="1" filter={gf} style={{transition:"fill .4s,stroke .4s"}}/>
        <polygon points="20,115 72,115 70,205 18,198" fill={on("back")} stroke={outline("back")} strokeWidth="1" filter={gf} style={{transition:"fill .4s,stroke .4s"}}/>
        <polygon points="160,115 108,115 110,205 162,198" fill={on("back")} stroke={outline("back")} strokeWidth="1" filter={gf} style={{transition:"fill .4s,stroke .4s"}}/>
        <polygon points="14,84 50,78 52,130 12,134" fill={on("shoulders")} stroke={outline("shoulders")} strokeWidth="1" filter={gf} style={{transition:"fill .4s,stroke .4s"}}/>
        <polygon points="166,84 130,78 128,130 168,134" fill={on("shoulders")} stroke={outline("shoulders")} strokeWidth="1" filter={gf} style={{transition:"fill .4s,stroke .4s"}}/>
        <polygon points="4,132 40,126 42,205 6,210" fill={on("triceps")} stroke={outline("triceps")} strokeWidth="1" filter={gf} style={{transition:"fill .4s,stroke .4s"}}/>
        <polygon points="176,132 140,126 138,205 174,210" fill={on("triceps")} stroke={outline("triceps")} strokeWidth="1" filter={gf} style={{transition:"fill .4s,stroke .4s"}}/>
        <polygon points="44,218 136,218 138,268 42,268" fill={on("legs")} stroke={outline("legs")} strokeWidth="1" filter={gf} style={{transition:"fill .4s,stroke .4s"}}/>
        <polygon points="44,268 86,268 84,336 46,336" fill={on("legs")} stroke={outline("legs")} strokeWidth="1" filter={gf} style={{transition:"fill .4s,stroke .4s"}}/>
        <polygon points="136,268 94,268 96,336 134,336" fill={on("legs")} stroke={outline("legs")} strokeWidth="1" filter={gf} style={{transition:"fill .4s,stroke .4s"}}/>
      </svg>
    </div>
  );
}


/* ══════════ EXERCISE CARD ══════════════════════════════════════════════════ */
function ExerciseCard({exercise,accentColor,unit,onAddSet,onRemoveSet,onRemove}){
  const [reps,setReps]=useState("10");
  const [weight,setWeight]=useState("");
  const [selectedUnit,setSelectedUnit]=useState(unit||"kg");
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
            {["#","REPS","WEIGHT",""].map((h,i)=><div key={i} style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:C.muted,letterSpacing:1}}>{h}</div>)}
          </div>
          {exercise.sets.map((s,i)=>(
            <div key={s.id} style={{display:"grid",gridTemplateColumns:"28px 1fr 1fr 24px",gap:"4px 10px",padding:"7px 0",borderTop:`1px solid ${C.border}`}}>
              <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:C.muted}}>{i+1}</div>
              <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:14,color:C.text}}>{s.reps}</div>
              <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:14,color:C.text}}>{s.weight?`${s.weight} ${s.unit||unit||"kg"}`:"–"}</div>
              <button onClick={()=>onRemoveSet(s.id)} className="btn-press" style={{background:"transparent",border:"none",color:C.muted,fontSize:16,cursor:"pointer",padding:0,lineHeight:1}} onMouseEnter={e=>e.target.style.color=C.danger} onMouseLeave={e=>e.target.style.color=C.muted}>×</button>
            </div>
          ))}
        </div>
      )}
      {adding?(
        <div style={{display:"flex",gap:8,alignItems:"center",marginTop:8,flexWrap:"wrap"}}>
          <input value={reps} onChange={e=>setReps(e.target.value)} placeholder="Reps" type="number" style={{width:60,padding:"10px 8px",background:C.faint,border:`1px solid ${C.borderHi}`,borderRadius:8,color:C.text,fontFamily:"'JetBrains Mono',monospace",fontSize:14,textAlign:"center"}} onFocus={e=>e.target.style.borderColor=accentColor} onBlur={e=>e.target.style.borderColor=C.borderHi}/>
          <input value={weight} onChange={e=>setWeight(e.target.value)} placeholder="Weight" type="number" style={{width:70,padding:"10px 8px",background:C.faint,border:`1px solid ${C.borderHi}`,borderRadius:8,color:C.text,fontFamily:"'JetBrains Mono',monospace",fontSize:14,textAlign:"center"}} onFocus={e=>e.target.style.borderColor=accentColor} onBlur={e=>e.target.style.borderColor=C.borderHi}/>
          <div style={{display:"flex",gap:0,background:C.faint,border:`1px solid ${C.borderHi}`,borderRadius:8,overflow:"hidden"}}>
            {["kg","lbs"].map(u=>(
              <button key={u} onClick={()=>setSelectedUnit(u)} style={{padding:"10px 10px",background:selectedUnit===u?accentColor:"transparent",border:"none",color:selectedUnit===u?C.bg:C.muted,fontFamily:"'JetBrains Mono',monospace",fontSize:11,fontWeight:700,cursor:"pointer",transition:"all .15s"}}>{u}</button>
            ))}
          </div>
          <button onClick={()=>{onAddSet(Number(reps)||0,Number(weight)||0);setWeight("");setAdding(false);}} className="btn-press" style={{flex:1,minWidth:60,background:accentColor,border:"none",borderRadius:8,padding:"10px 0",color:C.bg,fontFamily:"'Outfit',sans-serif",fontSize:15,fontWeight:700,letterSpacing:1}}>LOG</button>
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
        <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:8}}>
          {Object.entries(SPLIT_PRESETS).map(([key,preset])=>(
            <button key={key} onClick={()=>applyPreset(key)} className="btn-press" style={{background:C.faint,border:`1px solid ${C.borderHi}`,borderRadius:7,padding:"6px 12px",fontFamily:"'Outfit',sans-serif",fontSize:13,fontWeight:600,color:C.text,cursor:"pointer",transition:"all .2s"}} onMouseEnter={e=>{e.target.style.borderColor=C.accent;e.target.style.color=C.accent;}} onMouseLeave={e=>{e.target.style.borderColor=C.borderHi;e.target.style.color=C.text;}}>{preset.label}</button>
          ))}
        </div>
        <button onClick={()=>setDays([])} className="btn-press" style={{width:"100%",padding:"9px",background:"transparent",border:`1px dashed ${C.accent}66`,borderRadius:8,color:C.accent,fontFamily:"'Outfit',sans-serif",fontSize:13,fontWeight:700,letterSpacing:1.5,cursor:"pointer",marginBottom:20,transition:"all .2s"}} onMouseEnter={e=>{e.currentTarget.style.background=`${C.accent}0f`;}} onMouseLeave={e=>{e.currentTarget.style.background="transparent";}}>✦ BUILD CUSTOM FROM SCRATCH</button>
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
function WorkoutLogger({dayConfig,onBack,onSessionLogged,weightUnit}){
  const today=todayKey(),wk=weekKey();
  const [workout,setWorkout]=useState(null);
  const [showAddEx,setShowAddEx]=useState(false);
  const [customExName,setCustomExName]=useState("");
  const [ready,setReady]=useState(false);
  const [sessionCounted,setSessionCounted]=useState(false);
  const exInputRef=useRef(null);
  const suggestions=getSuggestions(dayConfig.muscles);
  const dayColor=dayConfig.color||C.accent;
  const unit=weightUnit||"kg";

  useEffect(()=>{
    (async()=>{
      const [saved,template,counted]=await Promise.all([
        dbGet("workout:"+today+":"+dayConfig.id),
        dbGet("workoutTemplate:"+dayConfig.id),
        dbGet("gymDayLogged:"+wk+":"+dayConfig.id),
      ]);
      if(saved){
        setWorkout(saved);
      } else if(template&&template.exercises&&template.exercises.length>0){
        // Pre-populate from template with empty sets
        const prefilled={dayId:dayConfig.id,exercises:template.exercises.map(e=>({...e,id:uid(),sets:[]})),fromTemplate:true};
        setWorkout(prefilled);
      } else {
        setWorkout({dayId:dayConfig.id,exercises:[]});
      }
      setSessionCounted(!!counted);
      setReady(true);
    })();
  },[dayConfig.id]);

  const saveW=async(updated)=>{
    setWorkout(updated);
    await dbSet("workout:"+today+":"+updated.dayId,updated);
    // Save template (exercise names only, no sets)
    const template={dayId:updated.dayId,exercises:updated.exercises.map(e=>({id:e.id,name:e.name,muscleGroups:e.muscleGroups}))};
    await dbSet("workoutTemplate:"+updated.dayId,template);
  };

  const maybeCountSession=async(updatedWorkout)=>{
    if(sessionCounted)return;
    const hasSets=updatedWorkout.exercises.some(e=>e.sets.length>0);
    if(hasSets){
      setSessionCounted(true);
      await dbSet("gymDayLogged:"+wk+":"+dayConfig.id,{logged:true});
      onSessionLogged&&onSessionLogged(dayConfig.muscles);
    }
  };

  const addExercise=async(name,muscles)=>{
    if(!workout)return;
    const updated={...workout,exercises:[...workout.exercises,{id:uid(),name,muscleGroups:muscles,sets:[]}]};
    await saveW(updated);
    setShowAddEx(false);setCustomExName("");
  };
  const removeExercise=async(exId)=>{
    if(!workout)return;
    await saveW({...workout,exercises:workout.exercises.filter(e=>e.id!==exId)});
  };
  const addSet=async(exId,reps,weight)=>{
    if(!workout)return;
    const updated={...workout,exercises:workout.exercises.map(e=>e.id===exId?{...e,sets:[...e.sets,{id:uid(),reps,weight,unit}]}:e)};
    await saveW(updated);
    await maybeCountSession(updated);
  };
  const removeSet=async(exId,setId)=>{
    if(!workout)return;
    await saveW({...workout,exercises:workout.exercises.map(e=>e.id===exId?{...e,sets:e.sets.filter(s=>s.id!==setId)}:e)});
  };

  if(!ready)return<div style={{textAlign:"center",padding:40,fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.muted,letterSpacing:2}}>LOADING...</div>;
  const totalSets=workout?.exercises.reduce((n,e)=>n+e.sets.length,0)||0;
  return(
    <div style={{animation:"slideIn .3s ease"}}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:24}}>
        <button onClick={onBack} className="btn-press" style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:9,padding:"9px 14px",color:C.muted,fontFamily:"'Outfit',sans-serif",fontSize:14,fontWeight:600,cursor:"pointer",transition:"all .2s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=C.accent;e.currentTarget.style.color=C.accent;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.muted;}}>← Back</button>
        <div style={{flex:1}}>
          <div style={{fontFamily:"'Outfit',sans-serif",fontSize:22,fontWeight:700,color:dayColor,letterSpacing:1,textShadow:`0 0 16px ${dayColor}55`}}>{dayConfig.label.toUpperCase()}</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:3,marginTop:5}}>{dayConfig.muscles.map(m=><MusclePill key={m} label={MUSCLE_LABELS[m]} primary={true}/>)}</div>
        </div>
        <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}}>
          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.text,background:C.borderHi,padding:"5px 9px",borderRadius:6,letterSpacing:1}}>{totalSets} SETS</div>
          {sessionCounted&&<div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:C.accent,letterSpacing:1}}>✓ COUNTED</div>}
        </div>
      </div>
      {workout?.fromTemplate&&workout.exercises.length>0&&(
        <div style={{padding:"10px 14px",background:`${C.accent}0a`,border:`1px solid ${C.accentDim}`,borderRadius:10,marginBottom:16,fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.accent,letterSpacing:1}}>
          ↺ SAME AS LAST TIME — JUST ADD YOUR SETS
        </div>
      )}
      {workout?.exercises.map(ex=>(
        <ExerciseCard key={ex.id} exercise={ex} accentColor={dayColor} unit={unit} onAddSet={(r,w)=>addSet(ex.id,r,w)} onRemoveSet={sid=>removeSet(ex.id,sid)} onRemove={()=>removeExercise(ex.id)}/>
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
  const [workedMuscles,setWorkedMuscles]=useState({});
  const [gymCount,setGymCount]=useState(0);
  const [bodyView,setBodyView]=useState("front");
  const [activeDay,setActiveDay]=useState(null);
  const [showSplitEditor,setShowSplitEditor]=useState(false);
  const [showDayPicker,setShowDayPicker]=useState(false);
  const [ready,setReady]=useState(false);
  const workoutSectionRef=useRef(null);
  const split=(userConfig.split||[]).map((d,i)=>({...d,color:DAY_COLORS[i%DAY_COLORS.length]}));
  const gymTarget=split.length||1;
  const weightUnit=userConfig.weightUnit||"kg";

  useEffect(()=>{
    Promise.all([dbGet("muscleWeek:"+week),dbGet("gymWeek:"+week)]).then(([mw,gw])=>{
      setWorkedMuscles(mw||{});setGymCount((gw||{}).count||0);setReady(true);
    });
  },[]);

  const adjustCount=async(delta)=>{
    const n=Math.max(0,gymCount+delta);
    setGymCount(n);
    await dbSet("gymWeek:"+week,{count:n});
  };

  const handleSessionLogged=async(muscles)=>{
    const updated={...workedMuscles};
    muscles.forEach(m=>{updated[m]=true;});
    setWorkedMuscles(updated);
    await dbSet("muscleWeek:"+week,updated);
    // Auto-increment session count if we're under target
    const newCount=gymCount+1;
    setGymCount(newCount);
    await dbSet("gymWeek:"+week,{count:newCount});
  };

  const handleLogSessionClick=()=>{
    setShowDayPicker(true);
    setTimeout(()=>workoutSectionRef.current?.scrollIntoView({behavior:"smooth",block:"start"}),80);
  };

  const openDay=(day)=>{
    setShowDayPicker(false);
    setActiveDay(day);
  };

  const saveSplit=async(newDays)=>{
    const updated={...userConfig,split:newDays};
    await dbSet("userConfig",updated);onUpdateConfig(updated);setShowSplitEditor(false);
  };

  if(!ready)return<div style={{textAlign:"center",padding:40,fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.muted,letterSpacing:2,animation:"pulse 1.5s infinite"}}>INITIALIZING...</div>;
  if(activeDay){
    const dwc=split.find(d=>d.id===activeDay.id)||{...activeDay,color:C.accent};
    return<WorkoutLogger dayConfig={dwc} onBack={()=>setActiveDay(null)} onSessionLogged={handleSessionLogged} weightUnit={weightUnit}/>;
  }
  return(
    <div>
      {showSplitEditor&&<SplitEditor split={split} onSave={saveSplit} onClose={()=>setShowSplitEditor(false)}/>}

      {/* Day picker modal */}
      {showDayPicker&&(
        <div onClick={()=>setShowDayPicker(false)} style={{position:"fixed",inset:0,background:"rgba(5,11,20,0.92)",backdropFilter:"blur(6px)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:500,animation:"fadeIn .2s ease",padding:"0 0 100px"}}>
          <div onClick={e=>e.stopPropagation()} style={{background:C.surface,border:`1px solid ${C.borderHi}`,borderRadius:"20px 20px 0 0",padding:"24px 16px 32px",width:"100%",maxWidth:480,animation:"slideIn .25s ease"}}>
            <div style={{fontFamily:"'Outfit',sans-serif",fontSize:20,fontWeight:700,color:C.text,marginBottom:5}}>What are you logging?</div>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.muted,letterSpacing:1.5,marginBottom:20}}>SELECT TODAY'S WORKOUT</div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {split.map(day=>(
                <button key={day.id} onClick={()=>openDay(day)} className="btn-press" style={{background:`${day.color}12`,border:`1px solid ${day.color}55`,borderRadius:12,padding:"14px 16px",textAlign:"left",cursor:"pointer",transition:"all .2s",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div>
                    <div style={{fontFamily:"'Outfit',sans-serif",fontSize:17,fontWeight:700,color:C.text,marginBottom:5}}>{day.label}</div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:3}}>{day.muscles.map(m=><MusclePill key={m} label={MUSCLE_LABELS[m]} primary={false}/>)}</div>
                  </div>
                  <span style={{color:day.color,fontSize:20}}>→</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:24,animation:"slideIn .4s ease"}}>
        <div>
          <div style={{fontFamily:"'Outfit',sans-serif",fontSize:54,fontWeight:700,lineHeight:.88,letterSpacing:2,color:C.accent,textShadow:`0 0 16px ${C.accentGlow}`}}>GYM</div>
          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.muted,letterSpacing:2,marginTop:10}}>WEEKLY TRACKER</div>
        </div>
        <button onClick={()=>setShowSplitEditor(true)} className="btn-press" style={{background:C.surface,border:`1px solid ${C.borderHi}`,borderRadius:10,padding:"10px 14px",color:C.muted,fontFamily:"'Outfit',sans-serif",fontSize:13,fontWeight:600,cursor:"pointer",transition:"all .2s",marginTop:6}} onMouseEnter={e=>{e.currentTarget.style.borderColor=C.accent;e.currentTarget.style.color=C.accent;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=C.borderHi;e.currentTarget.style.color=C.muted;}}>⚙ EDIT SPLIT</button>
      </div>

      {/* Session counter */}
      <div style={{marginBottom:24,animation:"slideIn .4s ease .05s both"}}>
        <Card highlight={gymCount>=gymTarget}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div><div style={{fontFamily:"'Outfit',sans-serif",fontSize:22,fontWeight:600,letterSpacing:1}}>This Week</div><div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.muted,marginTop:4,letterSpacing:1}}>{gymTarget}× TARGET</div></div>
            <div style={{fontFamily:"'Outfit',sans-serif",fontSize:64,fontWeight:300,lineHeight:1,color:gymCount>=gymTarget?C.accent:C.text,textShadow:gymCount>=gymTarget?`0 0 16px ${C.accentGlow}`:"none"}}>{gymCount}<span style={{fontSize:28,color:C.muted}}>/{gymTarget}</span></div>
          </div>
          <div style={{display:"flex",gap:5,marginBottom:14}}>{Array.from({length:gymTarget},(_,i)=><div key={i} style={{flex:1,height:6,borderRadius:3,background:i<gymCount?C.accent:C.bg,boxShadow:i<gymCount?`0 0 8px ${C.accent}`:"inset 0 1px 3px rgba(0,0,0,.5)",transition:"all .4s"}}/>)}</div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>adjustCount(-1)} disabled={gymCount===0} className="btn-press" style={{padding:"13px 16px",background:C.faint,border:`1px solid ${C.border}`,borderRadius:10,color:gymCount===0?C.border:C.danger,fontSize:20,lineHeight:1,cursor:gymCount===0?"default":"pointer",transition:"all .2s",flexShrink:0}}>−</button>
            <button onClick={handleLogSessionClick} className="btn-press" style={{flex:1,padding:"13px",background:C.accent,border:"none",borderRadius:10,color:C.bg,fontFamily:"'Outfit',sans-serif",fontSize:16,fontWeight:700,letterSpacing:2,cursor:"pointer",transition:"all .2s",boxShadow:`0 4px 16px ${C.accent}44`}}>
              + LOG SESSION
            </button>
          </div>
        </Card>
      </div>

      {/* Body map */}
      <div style={{marginBottom:24,animation:"slideIn .4s ease .1s both"}}>
        <SectionLabel action={<div style={{display:"flex",gap:5,background:C.surface,padding:4,borderRadius:8,border:`1px solid ${C.border}`}}>{["front","back"].map(v=>(<button key={v} onClick={()=>setBodyView(v)} className="btn-press" style={{background:bodyView===v?C.borderHi:"transparent",borderRadius:6,padding:"5px 12px",color:bodyView===v?C.text:C.muted,fontFamily:"'Outfit',sans-serif",fontSize:12,fontWeight:600,letterSpacing:1,cursor:"pointer",transition:"all .2s",border:"none"}}>{v.toUpperCase()}</button>))}</div>}>Muscle Progress</SectionLabel>
        <Card>
          <div style={{display:"flex",gap:18,alignItems:"flex-start"}}>
            <div style={{width:110,flexShrink:0}}><BodyMapSVG worked={workedMuscles} view={bodyView}/></div>
            <div style={{flex:1}}>
              {(bodyView==="front"?["chest","shoulders","biceps","abs","legs"]:["back","triceps","shoulders","legs"]).map(m=>(
                <div key={m} style={{marginBottom:11,display:"flex",alignItems:"center",gap:10}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:workedMuscles[m]?C.accent:C.border,boxShadow:workedMuscles[m]?`0 0 6px ${C.accent}`:"none",flexShrink:0,transition:"all .4s"}}/>
                  <span style={{fontFamily:"'Outfit',sans-serif",fontSize:13,textTransform:"capitalize",color:workedMuscles[m]?C.text:C.muted,transition:"color .4s",flex:1}}>{m==="legs"?"Legs / Glutes":m}</span>
                  <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,letterSpacing:1,color:workedMuscles[m]?C.accent:C.muted}}>{workedMuscles[m]?"✓ THIS WEEK":"—"}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Workout grid */}
      <div ref={workoutSectionRef} style={{animation:"slideIn .4s ease .15s both"}}>
        <SectionLabel>Today's Workout</SectionLabel>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          {split.map(day=>{
            const dayWorked=day.muscles.some(m=>workedMuscles[m]);
            return(
              <button key={day.id} onClick={()=>openDay(day)} className="hover-lift btn-press" style={{background:dayWorked?`${day.color}20`:`${day.color}10`,border:`1px solid ${dayWorked?day.color:day.color+"55"}`,borderRadius:12,padding:"14px 16px",textAlign:"left",cursor:"pointer",transition:"all .2s",boxShadow:dayWorked?`0 0 12px ${day.color}33`:"none"}}>
                <div style={{fontFamily:"'Outfit',sans-serif",fontSize:12,fontWeight:700,letterSpacing:1.5,color:day.color,marginBottom:4,opacity:.9}}>{dayWorked?"✓ LOGGED":"LOG WORKOUT"}</div>
                <div style={{fontFamily:"'Outfit',sans-serif",fontSize:17,fontWeight:700,color:C.text,marginBottom:8}}>{day.label}</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:3}}>{day.muscles.map(m=><MusclePill key={m} label={MUSCLE_LABELS[m]} primary={false}/>)}</div>
              </button>
            );
          })}
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
        <div style={{height:1,background:C.border,margin:"12px 0"}}/>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,padding:"4px 0"}}>
            <div>
              <div style={{fontFamily:"'Outfit',sans-serif",fontSize:16,fontWeight:600,marginBottom:3}}>Weight Unit</div>
              <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.muted,letterSpacing:.5}}>Used when logging sets</div>
            </div>
            <div style={{display:"flex",gap:0,background:C.faint,border:`1px solid ${C.borderHi}`,borderRadius:10,overflow:"hidden"}}>
              {["kg","lbs"].map(u=>(
                <button key={u} onClick={async()=>{const upd={...userConfig,weightUnit:u};await dbSet("userConfig",upd);onUpdateConfig(upd);showToast(`Weight: ${u}`);}} className="btn-press" style={{padding:"10px 18px",background:(userConfig.weightUnit||"kg")===u?C.accent:"transparent",border:"none",color:(userConfig.weightUnit||"kg")===u?C.bg:C.muted,fontFamily:"'JetBrains Mono',monospace",fontSize:13,fontWeight:700,cursor:"pointer",transition:"all .2s"}}>{u}</button>
              ))}
            </div>
          </div>
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
