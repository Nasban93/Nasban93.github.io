/* ── Production View — KPI 02: weekly Production KPI per agent ──────────────
   Joins two data sources that already exist:
     - Journal transactions + auditor-chased corrections: from `history` (saved
       night audits), via the txByAgent/corrByAgent fields buildPayload()
       writes on every save (see app.js). Correction attribution already
       excludes self-corrections correctly (see helpers.js isSelfCorrection).
     - Check-ins/check-outs: from Opera's user_activity_log XML, parsed here —
       nothing else in the app reads this export.
   A small identity-mapping table joins Opera's two separate identities
   (cashier _agentId ↔ Opera username) to one staffId per person, since
   staffId is the join key RECORDS.md requires for the future cross-KPI staff
   review. Everything here is local state (localStorage cache + folder sync
   on save, same pattern as the rest of the app) — App only hands this view
   `history`, `dirHandle`, `theme`, and `notify`; no new App-level state was
   needed beyond `theme` (for chart theming). ──────────────────────────────
   Dashboard charts use Chart.js (loaded via CDN in index.html, same pattern
   as html2pdf) — canvases are imperative (new Chart()/destroy()) inside
   useEffect, the only non-React-owned DOM in this app. ────────────────────*/

const PROD_ACTIVITY_KEY="na_prod_activity_v1";   /* {refId: {user,actionType,date,week}} */
const PROD_MAP_KEY="na_prod_staffmap_v1";        /* [{_key,staffId,name,agentIds:[],usernames:[]}] */
const PROD_ATTN_FOLDER_NAME_KEY="na_prod_attn_folder_name"; /* display name only — the handle itself lives in IndexedDB (key "attendanceFolder"), same pattern as app.js's own dirHandle */
const PROD_WEIGHTS_KEY="na_prod_weights_v1";     /* {volumePct,accuracyPct,wTx,wCheckIn,wCheckOut} */
const PROD_TARGETS_KEY="na_prod_targets_v1";     /* {volThresholdRatio,volTargetRatio,volStretchRatio,accThreshold,accTarget,accStretch} — KPI-STANDARD.md reference points */
const PROD_DEFAULT_WEIGHTS={volumePct:70,accuracyPct:30,wTx:1,wCheckIn:1,wCheckOut:1,wCourtesyCall:1,wDepartureCall:1};
/* wCourtesyCall/wDepartureCall — BRIEF-PROD-FAIRNESS.md: default 1 call = 1 check-in = 1 unit,
   editable. Credits Guest Care's courtesy/departure-call events (Records/Guest Portal/
   call-events/, unencrypted counts-only feed) as Production volume, so an agent on call duty
   isn't dragged down for logging fewer check-ins/outs (the cross-KPI fairness principle). */
/* KPI-STANDARD.md §1 defaults for Production. Volume's threshold/target/
   stretch are RATIOS of the team's "fair share" (100 ÷ mapped staff that
   week), not fixed percentages — so they auto-adjust as staff are added or
   removed instead of a number someone has to remember to retune. Accuracy's
   are already a natural percentage (correction-rate-derived), so they're
   absolute. All six are editable in Settings. */
/* volThreshold/Target/StretchRatio + acc* are the FALLBACK model (used only
   for staff with no Attendance shift-feed coverage that week). hourly* are
   the PRIMARY model's own reference points and knobs — see
   computeHourlyCoverage/scoreForWeek. */
const PROD_DEFAULT_TARGETS={volThresholdRatio:0.6,volTargetRatio:1.0,volStretchRatio:1.3,accThreshold:90,accTarget:97,accStretch:100,
  hourlyMargin:1.5,hourlyBonusPerFlag:5,hourlyThreshold:50,hourlyTarget:85,hourlyStretch:130};
const PROD_EMPTY={};
const PROD_CHART_PALETTE=["#2563eb","#16a34a","#d97706","#dc2626","#8b5cf6","#ec4899","#0d9488","#f97316"];

/* Opera's two exports spell the same person's username with and without a
   hyphen (HB4X1AALNASSER@ACCOREN vs HB4X1-AALNASSER@ACCOREN) — strip hyphens
   and the @ACCOREN domain suffix so both forms match one identity. */
function normUser(u){
  return String(u||"").toUpperCase().replace(/-/g,"").replace(/@ACCOREN\b/,"").trim();
}
/* INS_CHAR_DATE is "DD/MM/YY" (e.g. "30/06/26") — convert to ISO so it sorts
   and buckets into weeks the same way every other date in this app does. */
function operaDateToISO(d){
  const m=String(d||"").trim().match(/^(\d{2})\/(\d{2})\/(\d{2})$/);
  if(!m)return null;
  const[,dd,mm,yy]=m;
  return `20${yy}-${mm}-${dd}`;
}
/* weekKey is the Saturday ISO date (RECORDS.md/Attendance's own convention —
   toKey(week), a week runs Saturday→Friday). Label as "Jul 4 – Jul 10, 2026"
   rather than trying to force a month-style label onto a 7-day span. */
function weekLabel(weekKey){
  if(!weekKey)return"";
  const endKey=addDaysISO(weekKey,6);
  const fmtDay=iso=>{
    const[y,mo,d]=iso.split("-").map(Number);
    return new Date(Date.UTC(y,mo-1,d)).toLocaleDateString("en",{month:"short",day:"numeric",timeZone:"UTC"});
  };
  return `${fmtDay(weekKey)} – ${fmtDay(endKey)}, ${weekKey.slice(0,4)}`;
}
function round2(n){return Math.round(n*100)/100;}
function splitList(s){return String(s||"").split(",").map(x=>x.trim()).filter(Boolean);}
function genKey(){return(window.crypto&&crypto.randomUUID)?crypto.randomUUID():"k"+Date.now()+Math.random().toString(36).slice(2);}
function cssVar(name){return getComputedStyle(document.documentElement).getPropertyValue(name).trim();}

/* ── scoreThresholdTarget ─────────────────────────────────────────────────
   KPI-STANDARD.md §1: one generic engine for every KPI's sub-metrics —
   CONTINUOUS linear interpolation between threshold (→0) and target (→100),
   never step tiers (no unfair jump between 0.79 and 0.80 of target); above
   target, a capped bonus up to 110 for exceeding it. Below threshold → 0.
   Assumes higher-is-better; a lower-is-better metric (e.g. a correction
   RATE) should be converted to its higher-is-better complement (accuracy =
   1 − rate) before calling this, which is what scoreForWeek below does. */
function scoreThresholdTarget(value,{threshold,target,stretch}){
  if(value==null)return null;
  if(target<=threshold)return value>=target?100:0; /* guards a misconfigured pair */
  if(value<=threshold)return 0;
  if(value<target)return(value-threshold)/(target-threshold)*100;
  if(stretch<=target)return 100;
  return 100+Math.min(1,(value-target)/(stretch-target))*10;
}

/* ── readShiftFeedFolder / aggregateDutyHours ────────────────────────────────
   Reads Attendance's unencrypted shift-feed (PMS/Records/Attendance/
   shift-feed/shift_<weekKey>.json — see Code/Attendance/fo-pms/src/data/
   folderSync.ts's writeShiftFeedFile) and turns it into a per-week, per-
   staffId lookup of duty hours actually worked, keyed by the SAME staffId
   Production's own mapping table uses. This is what unblocks normalizing
   volume by hours worked instead of just a raw weekly count. */
async function readShiftFeedFolder(handle){
  const entries=[];
  for await(const[name,fh]of handle.entries()){
    if(!name.startsWith("shift_")||!name.endsWith(".json"))continue;
    try{
      const f=await fh.getFile();
      const env=JSON.parse(await f.text());
      if(Array.isArray(env.payload))entries.push(...env.payload);
    }catch{}
  }
  return entries;
}
/* BRIEF-SCORING-FAIRNESS-2.md Part B — an explicit nonWork:true (when the feed provides it,
   post-resync) always excludes the day, even in the edge case where a leave code was ALSO
   accidentally given real display hours in Attendance's shift-times settings (dutyHours>0 for
   a code that's still logically OFF/AL/SCL/etc.). Older feed entries with no nonWork field
   keep relying on the dutyHours/start-end null check below, which already covers every
   NON_WORK_CODES entry today (Attendance's resolveShiftTime never resolves a leave code to real
   clock times unless it's misconfigured) — so this is a belt-and-suspenders guard, not a
   behavior change for the common case. */
function isWorkedShiftEntry(e){ return e.nonWork!==true; }

/* ── readCallEventsFolder ─────────────────────────────────────────────────
   BRIEF-PROD-FAIRNESS.md Part A/B — reads Guest Care's UNENCRYPTED call-event feed
   (Records/Guest Portal/call-events/callevents_<day>.json — counts only, no guest PII: per
   staffId per day {courtesyCalls,departureCalls}) off the SAME shared PMS root identity.js
   already holds for the cross-app staff registry (identity.pmsRoot) — no separate folder
   picker needed, unlike the Attendance shift-feed link above (a genuinely different app's own
   Records branch). Gracefully returns {} when Guest Care hasn't synced yet or the shared root
   isn't connected — Production KPI must never error or phantom-zero someone for a missing feed
   (BUSINESS-DATE.md gap handling). */
async function readCallEventsFolder(pmsRoot){
  const byDate={};
  if(!pmsRoot)return byDate;
  try{
    const records=await pmsRoot.getDirectoryHandle("Records");
    const gp=await records.getDirectoryHandle("Guest Portal");
    const dir=await gp.getDirectoryHandle("call-events");
    for await(const[name,fh]of dir.entries()){
      if(!name.startsWith("callevents_")||!name.endsWith(".json"))continue;
      try{
        const f=await fh.getFile();
        const env=JSON.parse(await f.text());
        const date=env.periodStart||name.slice("callevents_".length,name.length-".json".length);
        if(env.payload&&typeof env.payload==="object"){
          if(!byDate[date])byDate[date]={};
          Object.entries(env.payload).forEach(([staffId,c])=>{
            byDate[date][staffId]={courtesyCalls:Number(c?.courtesyCalls)||0,departureCalls:Number(c?.departureCalls)||0};
          });
        }
      }catch{}
    }
  }catch{
    /* Records/Guest Portal/call-events/ doesn't exist yet (Guest Care hasn't synced), or the
       shared root isn't connected — degrade to {}, never throw. */
  }
  return byDate;
}

/* Spreads a day's call-event units (weighted courtesy+departure counts — the feed carries no
   hour-of-day, only a day total) evenly across the staff member's on-duty hours that SAME day
   (from the Attendance shift-feed's onDutyIndex), so a call-duty agent's output is visible to
   the PRIMARY hourly-coverage model exactly like journal tx / check-in/out events are — not
   just the fallback team-fair-share formula, which alone wouldn't fix the fairness scenario for
   anyone Attendance already covers (the common case). */
function buildCallUnitsPerHour(onDutyIndex,callEventsByDate,wCourtesyCall,wDepartureCall){
  const hoursByDateStaff={};
  Object.keys(onDutyIndex).forEach(date=>{
    hoursByDateStaff[date]={};
    Object.values(onDutyIndex[date]).forEach(set=>{
      set.forEach(staffId=>{hoursByDateStaff[date][staffId]=(hoursByDateStaff[date][staffId]||0)+1;});
    });
  });
  const perHour={};
  Object.keys(callEventsByDate||{}).forEach(date=>{
    perHour[date]={};
    Object.entries(callEventsByDate[date]).forEach(([staffId,c])=>{
      const dayUnits=(c.courtesyCalls||0)*wCourtesyCall+(c.departureCalls||0)*wDepartureCall;
      const hrs=hoursByDateStaff[date]?.[staffId]||0;
      if(dayUnits>0&&hrs>0)perHour[date][staffId]=dayUnits/hrs;
    });
  });
  return perHour;
}

function aggregateDutyHours(entries){
  const out={};
  entries.forEach(e=>{
    const dh=Number(e.dutyHours)||0;
    if(!e.date||!e.staffId||dh<=0||!isWorkedShiftEntry(e))return; /* dutyHours<=0 covers OFF/AL/SCL/ABS/PH — not a worked day */
    const wk=weekKeyForISO(String(e.date));
    if(!out[wk])out[wk]={};
    if(!out[wk][e.staffId])out[wk][e.staffId]={dutyHours:0,days:0};
    out[wk][e.staffId].dutyHours+=dh;
    out[wk][e.staffId].days+=1;
  });
  return out;
}

/* Pure UTC date math — deliberately avoids the browser's local timezone.
   Mixing a local-time Date (new Date(iso+"T00:00:00")) with UTC
   serialization (.toISOString()) shifts the result by a day whenever the
   local offset isn't 0 (verified: it silently attributed an overnight
   shift's early-morning hours to the WRONG calendar date under UTC+3,
   Riyadh's own timezone). Building and mutating the Date in UTC from the
   start makes the ISO string round-trip exactly, regardless of where the
   browser is running. */
function addDaysISO(iso,n){
  const[y,mo,d]=iso.split("-").map(Number);
  const dt=new Date(Date.UTC(y,mo-1,d));
  dt.setUTCDate(dt.getUTCDate()+n);
  return dt.toISOString().slice(0,10);
}

/* Production KPI cycles are now weekly, in sync with the Attendance roster's
   own week — RECORDS.md/Attendance key a week by its SATURDAY date
   (toKey(week)), Saturday→Friday. Given any ISO date, walk back to that
   week's Saturday: JS getUTCDay() is 0=Sun..6=Sat, so days-since-Saturday =
   (day+1) % 7 (Sat itself → 0, Sun → 1, ... Fri → 6). Pure UTC, same
   reasoning as addDaysISO above. */
function weekKeyForISO(iso){
  const[y,mo,d]=iso.split("-").map(Number);
  const dt=new Date(Date.UTC(y,mo-1,d));
  const back=(dt.getUTCDay()+1)%7;
  dt.setUTCDate(dt.getUTCDate()-back);
  return dt.toISOString().slice(0,10);
}

/* ── buildOnDutyIndex ─────────────────────────────────────────────────────
   Resolves each shift-feed entry's start/end ("HH:MM", or null for a
   no-work day) into the set of hour-of-day buckets that staffId was
   actually on duty, per calendar date — end EXCLUSIVE (08:00–17:00 covers
   hours 8..16, not 17: they clock out AT 17:00, they're not on duty during
   the 17:00 hour). Handles overnight shifts (end <= start, e.g. 23:00–08:00)
   by spanning into the next calendar date. This is the "how many people
   were actually on shift this hour" denominator the hourly coverage model
   below needs — the real headcount from the roster, not just whoever
   happens to be mapped in Production KPI. */
function buildOnDutyIndex(entries){
  const idx={};
  const add=(date,hour,staffId)=>{
    if(!idx[date])idx[date]={};
    if(!idx[date][hour])idx[date][hour]=new Set();
    idx[date][hour].add(staffId);
  };
  entries.forEach(e=>{
    if(!e.date||!e.staffId||!e.start||!e.end||!isWorkedShiftEntry(e))return; /* no concrete times → OFF/AL/SCL/ABS/PH, not on duty */
    const sh=parseHourOfDay(e.start),eh=parseHourOfDay(e.end);
    if(sh==null||eh==null)return;
    if(eh<=sh){
      for(let h=sh;h<24;h++)add(e.date,h,e.staffId);
      const nextDate=addDaysISO(e.date,1);
      for(let h=0;h<eh;h++)add(nextDate,h,e.staffId);
    }else{
      for(let h=sh;h<eh;h++)add(e.date,h,e.staffId);
    }
  });
  return idx;
}

/* ── computeHourlyCoverage ────────────────────────────────────────────────
   The "flag + bonus" model: for every hour a mapped staff member was
   actually on duty (per the Attendance shift-feed) that week, compare
   their share of that hour's attributable journal/check-in/out activity
   against their EXPECTED share (100% ÷ however many people were on duty
   that same hour — 5 on the desk at 14:00–15:00 means ~20% each is "even").
   Hours with zero attributable activity are skipped entirely (nothing
   happened, nothing to judge fairness on). An hour where someone's actual
   share clears `margin`× their expected share (default 1.5×) is FLAGGED —
   e.g. one person covering half the check-ins while 5 people are on the
   desk. Returns one entry per staff `_key`: hoursOnDuty (hours judged),
   hoursMet (share was at least their expected share), flaggedHours, and
   basePct (hoursMet ÷ hoursOnDuty × 100 — the baseline "pulled your
   weight" rate feeding the volume score, before the flagged-hour bonus). */
function computeHourlyCoverage(week,staffMap,journalByDateHour,activityByDateHour,onDutyIndex,margin,callUnitsPerHour){
  const staffByStaffId={};
  staffMap.forEach(s=>{if(s.staffId)staffByStaffId[s.staffId]=s;});
  const out={};
  staffMap.forEach(s=>{out[s._key]={hoursOnDuty:0,hoursMet:0,flaggedHours:0};});

  Object.keys(onDutyIndex).forEach(date=>{
    if(weekKeyForISO(date)!==week)return;
    const hours=onDutyIndex[date];
    const cHour=callUnitsPerHour?.[date]||PROD_EMPTY; /* BRIEF-PROD-FAIRNESS.md — per-hour spread of that day's call-event units, keyed directly by staffId (Guest Care's doneBy is already a registry staffId) */
    Object.keys(hours).forEach(hr=>{
      const onDutySet=hours[hr];
      const onDutyCount=onDutySet.size;
      if(onDutyCount===0)return;
      const expectedSharePct=100/onDutyCount;
      const jHour=journalByDateHour[date]?.[hr]||PROD_EMPTY;
      const aHour=activityByDateHour[date]?.[hr]||PROD_EMPTY;
      const eventsByStaffId={};
      let totalEvents=0;
      onDutySet.forEach(staffId=>{
        const s=staffByStaffId[staffId];
        if(!s)return; /* on duty per the roster but not mapped in Production — still counted in onDutyCount, just can't attribute events to them */
        let n=0;
        (s.agentIds||[]).forEach(id=>{n+=jHour[id]||0;});
        (s.usernames||[]).forEach(u=>{n+=aHour[normUser(u)]||0;});
        n+=cHour[staffId]||0;
        eventsByStaffId[staffId]=n;
        totalEvents+=n;
      });
      if(totalEvents===0)return; /* quiet hour — nothing to judge fairness on */
      onDutySet.forEach(staffId=>{
        const s=staffByStaffId[staffId];
        if(!s)return;
        const actualSharePct=(eventsByStaffId[staffId]||0)/totalEvents*100;
        const rec=out[s._key];
        rec.hoursOnDuty++;
        if(actualSharePct>=expectedSharePct)rec.hoursMet++;
        if(actualSharePct>=expectedSharePct*margin)rec.flaggedHours++;
      });
    });
  });

  Object.values(out).forEach(rec=>{rec.basePct=rec.hoursOnDuty>0?100*rec.hoursMet/rec.hoursOnDuty:0;});
  return out;
}

/* ── scoreForWeek ─────────────────────────────────────────────────────────
   Pure function (not a hook) so it can be called once for the selected week
   AND once per week for the trend chart without hook-order issues.
   KPI-STANDARD.md compliant:
   - Volume's PRIMARY model is hourly coverage (computeHourlyCoverage above):
     for every hour a staff member was actually on duty per the Attendance
     shift-feed, did their share of that hour's activity meet (or, flagged,
     substantially exceed) their expected share given how many colleagues
     were on duty that same hour. Falls back to the OLD fair-share-of-team-
     total-units model (agent units ÷ team total, scored against the team's
     fair share = 100 ÷ mapped staff) for anyone with zero on-duty hours
     that week — e.g. the Attendance link isn't connected, or this
     particular person isn't in Attendance's roster yet. Whichever model
     applies, it's scored via threshold/target/stretch (continuous, no step
     tiers) — never literally "how did you do vs. the single best colleague"
     (the anti-pattern §1 explicitly calls out).
   - Accuracy = 1 − corrections ÷ own journal tx, scored via its own
     threshold/target/stretch on the resulting percentage.
   - Composite = weighted combination of the two THRESHOLD-SCORED values
     (each already 0–110), not the raw share/ratio.
   - `rank` is computed AFTER sorting by score, for LEADERBOARD DISPLAY ONLY
     — it is never read back into the score calculation for anyone. */
function scoreForWeek(m,journalByWeek,activityByWeek,staffMap,weights,targets,dutyHoursByWeek,journalByDateHour,activityByDateHour,onDutyIndex,callEventsByWeek,callUnitsPerHour){
  const journal=journalByWeek[m]||PROD_EMPTY;
  const activityM=activityByWeek[m]||PROD_EMPTY;
  const weekDutyHours=dutyHoursByWeek?.[m]||PROD_EMPTY;
  const weekCalls=callEventsByWeek?.[m]||PROD_EMPTY;
  const hourly=computeHourlyCoverage(m,staffMap,journalByDateHour||PROD_EMPTY,activityByDateHour||PROD_EMPTY,onDutyIndex||PROD_EMPTY,targets.hourlyMargin,callUnitsPerHour||PROD_EMPTY);
  const rows=staffMap.map(s=>{
    const tx=(s.agentIds||[]).reduce((sum,id)=>sum+(journal[id]?.tx||0),0);
    const corr=(s.agentIds||[]).reduce((sum,id)=>sum+(journal[id]?.corr||0),0);
    const byType={};
    (s.usernames||[]).forEach(u=>{
      const rec=activityM[normUser(u)];
      if(!rec)return;
      Object.entries(rec.byType).forEach(([t,c])=>{byType[t]=(byType[t]||0)+c;});
    });
    const checkIns=byType["CHECK IN"]||0,checkOuts=byType["CHECK OUT"]||0;
    /* BRIEF-PROD-FAIRNESS.md — Guest Care's call-events feed is already keyed by shared
       registry staffId (Guest Care's doneBy IS a registry staffId), so no agentIds/usernames
       join is needed here, unlike journal tx / activity-log check-ins/outs above. */
    const callsRec=s.staffId?weekCalls[s.staffId]:null;
    const courtesyCalls=callsRec?.courtesyCalls||0,departureCalls=callsRec?.departureCalls||0;
    const units=tx*weights.wTx+checkIns*weights.wCheckIn+checkOuts*weights.wCheckOut
      +courtesyCalls*weights.wCourtesyCall+departureCalls*weights.wDepartureCall;
    const dutyRec=s.staffId?weekDutyHours[s.staffId]:null;
    const dutyHours=dutyRec?.dutyHours||0;
    const daysWorked=dutyRec?.days||0;
    const cov=hourly[s._key]||{hoursOnDuty:0,hoursMet:0,flaggedHours:0,basePct:0};
    /* Clamped at 0 defensively — structurally corr should never exceed tx
       (every chased correction maps to one of this agent's own tx that same
       week), but a future data-shape change shouldn't be able to push
       accuracy negative. */
    const accuracy=tx>0?Math.max(0,1-corr/tx):null;
    return{_key:s._key,staffId:s.staffId,name:s.name,tx,corr,checkIns,checkOuts,courtesyCalls,departureCalls,byType,units,dutyHours,daysWorked,
      hoursOnDuty:cov.hoursOnDuty,hoursMet:cov.hoursMet,flaggedHours:cov.flaggedHours,basePct:cov.basePct,accuracy};
  });

  const teamTotalUnits=rows.reduce((s,r)=>s+r.units,0); /* fallback-model basis only */
  const fairSharePct=rows.length>0?100/rows.length:0;
  const fallbackVolumeTT={threshold:fairSharePct*targets.volThresholdRatio,target:fairSharePct*targets.volTargetRatio,stretch:fairSharePct*targets.volStretchRatio};
  const hourlyVolumeTT={threshold:targets.hourlyThreshold,target:targets.hourlyTarget,stretch:targets.hourlyStretch};
  const accuracyTT={threshold:targets.accThreshold,target:targets.accTarget,stretch:targets.accStretch};
  const totalWeight=(weights.volumePct||0)+(weights.accuracyPct||0);

  const scored=rows.map(r=>{
    let volumeSharePct,volumeScorePct,usedHourlyModel;
    if(r.hoursOnDuty>0){
      usedHourlyModel=true;
      volumeSharePct=r.basePct;
      const volumeMetric=r.basePct+r.flaggedHours*targets.hourlyBonusPerFlag;
      volumeScorePct=scoreThresholdTarget(volumeMetric,hourlyVolumeTT)??0;
    }else{
      usedHourlyModel=false;
      volumeSharePct=teamTotalUnits>0?r.units/teamTotalUnits*100:0;
      volumeScorePct=scoreThresholdTarget(volumeSharePct,fallbackVolumeTT)??0;
    }
    const accuracyScorePct=r.accuracy==null?null:scoreThresholdTarget(r.accuracy*100,accuracyTT);
    const scorePct=totalWeight>0
      ?(weights.volumePct*volumeScorePct+weights.accuracyPct*(accuracyScorePct??0))/totalWeight
      :0;
    /* Kept on the same 0–1.10 fraction scale as the pre-existing `score`
       field (display code does `r.score*100`+"%") so nothing downstream had
       to change its formatting. */
    return{...r,usedHourlyModel,volumeSharePct,volumeScore:volumeScorePct/100,
      accuracyScore:accuracyScorePct==null?null:accuracyScorePct/100,score:scorePct/100};
  }).sort((a,b)=>b.score-a.score);
  scored.forEach((r,i)=>{r.rank=i+1;});
  return scored;
}

function periodForWeek(weekKey){
  return{first:weekKey,last:addDaysISO(weekKey,6)};
}

function ProductionView(p){
  useLang();
  const{history,dirHandle,theme,notify,identity}=p;

  const[activity,setActivity]=useState(()=>{
    try{return JSON.parse(localStorage.getItem(PROD_ACTIVITY_KEY)||"{}");}catch{return{};}
  });
  /* ── Staff mapping — sourced from the shared registry (BRIEF-IDENTITY §6),
     not a private local list: operaUsernames[]/cashierId live on each
     registry entry, so Guest Portal/Attendance/Night Audit all read and
     write the SAME mapping. staffMap keeps the exact shape the scoring
     functions below already expect ({_key,staffId,name,agentIds,usernames})
     — _key is just staffId now (stable, registry already owns identity), and
     cashierId (singular, per the shared schema) is wrapped/unwrapped as a
     0-or-1-element agentIds array at this boundary only. ── */
  const staffMap=useMemo(()=>identity.allStaff.map(s=>({
    _key:s.staffId,staffId:s.staffId,name:s.displayName,
    agentIds:s.cashierId?[s.cashierId]:[],usernames:s.operaUsernames||[]
  })),[identity.allStaff]);

  /* One-time import of this app's OLD private mapping (PROD_MAP_KEY, from
     before the registry carried operaUsernames/cashierId) into the registry,
     matched by staffId, only where the registry doesn't already have a
     mapping — the registry is authoritative from here on. Waits for actual
     staff to exist (not just an empty bootstrap registry) so a fresh device
     that hasn't synced the shared folder yet doesn't burn its one shot on
     nothing to migrate into. */
  const migratedRef=useRef(false);
  useEffect(()=>{
    if(migratedRef.current||!identity.loaded||identity.allStaff.length===0)return;
    migratedRef.current=true;
    let legacy=[];
    try{legacy=JSON.parse(localStorage.getItem(PROD_MAP_KEY)||"[]");}catch{legacy=[];}
    legacy.forEach(old=>{
      const staffId=String(old.staffId||"").trim();
      if(!staffId)return;
      const entry=identity.findEntry(staffId);
      if(!entry||entry.cashierId||(entry.operaUsernames||[]).length)return;
      const patch={};
      if((old.agentIds||[]).length)patch.cashierId=old.agentIds[0];
      if((old.usernames||[]).length)patch.operaUsernames=old.usernames;
      if(Object.keys(patch).length)identity.setOperaMapping("system",entry.staffId,patch);
    });
  },[identity.loaded,identity.allStaff.length]);

  const[assigning,setAssigning]=useState(null); /* {type:"agent"|"user", value, label} — unmapped-identity quick-add */
  const[assignTarget,setAssignTarget]=useState("");

  const[weights,setWeights]=useState(()=>{
    try{return{...PROD_DEFAULT_WEIGHTS,...JSON.parse(localStorage.getItem(PROD_WEIGHTS_KEY)||"{}")};}catch{return PROD_DEFAULT_WEIGHTS;}
  });
  const[targets,setTargets]=useState(()=>{
    try{return{...PROD_DEFAULT_TARGETS,...JSON.parse(localStorage.getItem(PROD_TARGETS_KEY)||"{}")};}catch{return PROD_DEFAULT_TARGETS;}
  });
  const[week,setWeek]=useState(null);
  const[saving,setSaving]=useState(false);
  const[attendanceDirHandle,setAttendanceDirHandle]=useState(null);
  const[attendanceFolderName,setAttendanceFolderName]=useState(()=>{
    try{return localStorage.getItem(PROD_ATTN_FOLDER_NAME_KEY)||null;}catch{return null;}
  });
  const[shiftFeedEntries,setShiftFeedEntries]=useState([]);
  const[loadingShiftFeed,setLoadingShiftFeed]=useState(false);
  const[callEventsByDate,setCallEventsByDate]=useState({});
  const[loadingCallEvents,setLoadingCallEvents]=useState(false);
  const fileRef=useRef();
  const scoreChartRef=useRef();
  const volumeChartRef=useRef();
  const trendChartRef=useRef();
  const chartInstances=useRef({});

  useEffect(()=>{try{localStorage.setItem(PROD_ACTIVITY_KEY,JSON.stringify(activity));}catch{}},[activity]);
  useEffect(()=>{try{localStorage.setItem(PROD_TARGETS_KEY,JSON.stringify(targets));}catch{}},[targets]);
  useEffect(()=>{try{localStorage.setItem(PROD_WEIGHTS_KEY,JSON.stringify(weights));}catch{}},[weights]);

  /* Reads Attendance's shift-feed folder and rebuilds dutyHoursByWeek.
     Reusable for both the initial reconnect-on-mount below and the manual
     "Refresh" button — Attendance syncs on its own schedule, there's no
     live file-watching, so a re-read is how this stays current. */
  async function refreshShiftFeed(handle){
    const h=handle||attendanceDirHandle;
    if(!h)return;
    setLoadingShiftFeed(true);
    try{
      let feedDir;
      try{feedDir=await h.getDirectoryHandle("shift-feed");}
      catch{
        notify(t("production.noShiftFeedFolder"),"err");
        return;
      }
      const entries=await readShiftFeedFolder(feedDir);
      setShiftFeedEntries(entries);
      notify(t("production.loadedShiftHours",entries.length,pluralSuffix(entries.length)));
    }catch(e){notify(t("production.failedShiftFeed",e.message),"err");}
    finally{setLoadingShiftFeed(false);}
  }

  /* Restore the Attendance folder connection on mount, same pattern app.js
     uses for its own dirHandle — a SEPARATE folder connection from this
     app's own dirHandle, since the two apps' Records branches are siblings
     (Records/Night Audit/, Records/Attendance/), not nested, and the File
     System Access API can't navigate "up and over" from one to the other. */
  useEffect(()=>{
    if(!HAS_FS)return;
    idbOp("readonly","attendanceFolder").then(async h=>{
      if(!h)return;
      const perm=await h.queryPermission({mode:"read"});
      if(perm==="granted"){setAttendanceDirHandle(h);setAttendanceFolderName(h.name);refreshShiftFeed(h);}
    }).catch(()=>{});
  },[]);

  async function connectAttendanceFolder(){
    if(!HAS_FS){notify(t("production.useEdgeChrome"),"err");return;}
    try{
      const h=await window.showDirectoryPicker({mode:"read"});
      setAttendanceDirHandle(h);setAttendanceFolderName(h.name);
      try{localStorage.setItem(PROD_ATTN_FOLDER_NAME_KEY,h.name);}catch{}
      await idbOp("readwrite","attendanceFolder",h);
      await refreshShiftFeed(h);
    }catch(e){
      if(e.name==="AbortError")return;
      notify(t("production.folderAccessFailed",e.message),"err");
    }
  }

  /* BRIEF-PROD-FAIRNESS.md Part B — reads Guest Care's call-events off identity.pmsRoot (the
     shared cross-app connection identity.js already manages for the staff registry) — no
     separate folder picker, unlike connectAttendanceFolder above. Re-runs whenever the shared
     root becomes available, and on manual Refresh. */
  async function refreshCallEvents(){
    if(!identity.pmsRoot)return;
    setLoadingCallEvents(true);
    try{
      const byDate=await readCallEventsFolder(identity.pmsRoot);
      setCallEventsByDate(byDate);
      notify(t("production.callEventsLoaded",Object.keys(byDate).length,pluralSuffix(Object.keys(byDate).length)));
    }catch(e){notify(t("production.failedCallEvents",e.message),"err");}
    finally{setLoadingCallEvents(false);}
  }
  useEffect(()=>{if(identity.pmsRoot)refreshCallEvents();},[identity.pmsRoot]);

  /* Exports are often filtered to a single ACTION_TYPE (a June CHECK IN
     export needs a separate CHECK OUT export) — accept as many files as
     needed and merge. Dedup by REF_ACTION_ID so re-uploading the same or an
     overlapping export is harmless instead of double-counting. */
  function handleActivityFiles(files){
    Array.from(files||[]).forEach(file=>{
      if(!isXmlFile(file)){notify(t("production.expectedXml",file.name),"err");return;}
      const reader=new FileReader();
      reader.onload=e=>{
        try{
          const recs=parseOperaXML(e.target.result,"G_LOG_TIME");
          if(!recs.length){notify(t("production.noActivityRecords",file.name),"err");return;}
          let added=0;
          setActivity(prev=>{
            const next={...prev};
            recs.forEach(r=>{
              const refId=String(r.REF_ACTION_ID||"");
              const iso=operaDateToISO(r.INS_CHAR_DATE);
              if(!refId||!iso)return;
              if(!next[refId])added++;
              next[refId]={user:normUser(r.LOG_USER),actionType:String(r.ACTION_TYPE||"").toUpperCase().trim(),
                date:iso,week:weekKeyForISO(iso),hour:parseHourOfDay(r.INS_CHAR_TIME)};
            });
            return next;
          });
          notify(t("production.newEventsLoaded",file.name,added,pluralSuffix(added),recs.length));
        }catch(err){notify(t("production.fileError",file.name,err.message),"err");}
      };
      reader.readAsText(file);
    });
  }

  /* Per-week totals for every week in history/activity at once — powers
     the week selector, the selected week's table, AND the trend chart,
     without re-scanning `history`/`activity` per week. */
  const journalByWeek=useMemo(()=>{
    const out={};
    history.forEach(h=>{
      if(!h.date)return;
      const wk=weekKeyForISO(h.date);
      if(!out[wk])out[wk]={};
      const m=out[wk];
      (h.txByAgent||[]).forEach(a=>{
        if(!m[a.id])m[a.id]={id:a.id,name:a.name,tx:0,corr:0};
        m[a.id].tx+=a.count||0;if(a.name)m[a.id].name=a.name;
      });
      (h.corrByAgent||[]).forEach(a=>{
        if(!m[a.id])m[a.id]={id:a.id,name:a.name,tx:0,corr:0};
        m[a.id].corr+=a.count||0;if(a.name)m[a.id].name=a.name;
      });
    });
    return out;
  },[history]);

  const activityByWeek=useMemo(()=>{
    const out={};
    Object.values(activity).forEach(a=>{
      if(!a.week)return;
      if(!out[a.week])out[a.week]={};
      const m=out[a.week];
      if(!m[a.user])m[a.user]={user:a.user,byType:{}};
      m[a.user].byType[a.actionType]=(m[a.user].byType[a.actionType]||0)+1;
    });
    return out;
  },[activity]);

  /* Duty-hours summary (for the "Duty hrs" display column) and the on-duty
     index (who was actually on shift each hour — the hourly coverage
     model's real headcount), both derived from the same raw shift-feed
     entries so a single re-read of the Attendance folder feeds both. */
  const dutyHoursByWeek=useMemo(()=>aggregateDutyHours(shiftFeedEntries),[shiftFeedEntries]);
  const onDutyIndex=useMemo(()=>buildOnDutyIndex(shiftFeedEntries),[shiftFeedEntries]);

  /* BRIEF-PROD-FAIRNESS.md Part B — Guest Care's call-events, aggregated per week (fallback
     model's `units`) and spread per on-duty hour (primary hourly-coverage model). */
  const callEventsByWeek=useMemo(()=>{
    const out={};
    Object.entries(callEventsByDate).forEach(([date,byStaff])=>{
      const wk=weekKeyForISO(date);
      if(!out[wk])out[wk]={};
      Object.entries(byStaff).forEach(([staffId,c])=>{
        if(!out[wk][staffId])out[wk][staffId]={courtesyCalls:0,departureCalls:0};
        out[wk][staffId].courtesyCalls+=c.courtesyCalls||0;
        out[wk][staffId].departureCalls+=c.departureCalls||0;
      });
    });
    return out;
  },[callEventsByDate]);
  const callUnitsPerHour=useMemo(
    ()=>buildCallUnitsPerHour(onDutyIndex,callEventsByDate,weights.wCourtesyCall,weights.wDepartureCall),
    [onDutyIndex,callEventsByDate,weights.wCourtesyCall,weights.wDepartureCall]
  );

  /* Per-agent journal-transaction counts bucketed by exact date + hour-of-
     day (from txByAgentHour, which app.js's buildPayload computes per saved
     night) — the hourly coverage model's "who did what, and when" side for
     journal activity. */
  const journalByDateHour=useMemo(()=>{
    const out={};
    history.forEach(h=>{
      if(!h.date||!h.txByAgentHour)return;
      Object.entries(h.txByAgentHour).forEach(([agentId,hours])=>{
        Object.entries(hours).forEach(([hr,count])=>{
          if(!out[h.date])out[h.date]={};
          if(!out[h.date][hr])out[h.date][hr]={};
          out[h.date][hr][agentId]=(out[h.date][hr][agentId]||0)+count;
        });
      });
    });
    return out;
  },[history]);

  /* Same, for check-in/check-out activity-log events, keyed by normalized
     Opera username instead of cashier agentId. */
  const activityByDateHour=useMemo(()=>{
    const out={};
    Object.values(activity).forEach(a=>{
      if(!a.date||a.hour==null)return;
      if(!out[a.date])out[a.date]={};
      if(!out[a.date][a.hour])out[a.date][a.hour]={};
      out[a.date][a.hour][a.user]=(out[a.date][a.hour][a.user]||0)+1;
    });
    return out;
  },[activity]);

  /* Weeks available to score: union of journal-history weeks and
     activity-log weeks, so the selector never offers an empty week. */
  const weeks=useMemo(()=>{
    const s=new Set([...Object.keys(journalByWeek),...Object.keys(activityByWeek)]);
    return Array.from(s).sort().reverse();
  },[journalByWeek,activityByWeek]);
  useEffect(()=>{if(!week&&weeks.length)setWeek(weeks[0]);},[weeks,week]);

  const weekJournal=journalByWeek[week]||PROD_EMPTY;
  const weekActivity=activityByWeek[week]||PROD_EMPTY;

  /* Raw identities not covered by any mapping — flagged below, never
     silently dropped from view (they just can't be scored per-person yet). */
  const mappedAgentIds=useMemo(()=>new Set(staffMap.flatMap(s=>s.agentIds||[])),[staffMap]);
  const mappedUsers=useMemo(()=>new Set(staffMap.flatMap(s=>(s.usernames||[]).map(normUser))),[staffMap]);
  const unmappedAgents=useMemo(()=>Object.values(weekJournal).filter(a=>!mappedAgentIds.has(a.id)),[weekJournal,mappedAgentIds]);
  const unmappedUsers=useMemo(()=>Object.values(weekActivity).filter(a=>!mappedUsers.has(a.user)),[weekActivity,mappedUsers]);

  /* No "missing Employee ID" flag needed any more — every row here IS a
     registry staffId already (RECORDS.md's join-key requirement is met by
     construction now, not by typing it in afterward). */

  /* Since staffMap now derives from the WHOLE shared registry (every PMS
     app's staff, not just people explicitly added here before), the score
     table/dashboard/leaderboard scope down to staff who actually HAVE a
     cashier ID or Opera username mapped — otherwise every hotel employee
     from every department would show up as a permanent 0%/0-unit row. The
     Staff mapping table below still lists everyone (so there's somewhere to
     add the mapping); mappedAgentIds/mappedUsers above still derive from the
     full staffMap either way. */
  const mappedStaff=useMemo(()=>staffMap.filter(s=>(s.agentIds||[]).length||(s.usernames||[]).length),[staffMap]);

  /* Score table: one row per mapped staff member for the selected week. */
  const scoreRows=useMemo(()=>week?scoreForWeek(week,journalByWeek,activityByWeek,mappedStaff,weights,targets,dutyHoursByWeek,journalByDateHour,activityByDateHour,onDutyIndex,callEventsByWeek,callUnitsPerHour):[],
    [week,journalByWeek,activityByWeek,mappedStaff,weights,targets,dutyHoursByWeek,journalByDateHour,activityByDateHour,onDutyIndex,callEventsByWeek,callUnitsPerHour]);
  const teamUnits=useMemo(()=>scoreRows.reduce((s,r)=>s+r.units,0),[scoreRows]);
  const fairSharePct=scoreRows.length>0?100/scoreRows.length:0;
  const topPerformer=scoreRows[0];
  const avgAccuracy=useMemo(()=>{
    const vals=scoreRows.filter(r=>r.accuracy!=null).map(r=>r.accuracy);
    return vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:null;
  },[scoreRows]);

  /* Trend: last up to 12 weeks with any data (~1 quarter — a 6-week window
     read as barely more than a month, not worth much as a "trend" once
     weeks replaced months as the cycle), oldest → newest, one score row-set
     per week (same staff, same order every week via _key). */
  const trendWeeks=useMemo(()=>[...weeks].sort().slice(-12),[weeks]);
  const trendSeries=useMemo(()=>trendWeeks.map(m=>({week:m,rows:scoreForWeek(m,journalByWeek,activityByWeek,mappedStaff,weights,targets,dutyHoursByWeek,journalByDateHour,activityByDateHour,onDutyIndex,callEventsByWeek,callUnitsPerHour)})),
    [trendWeeks,journalByWeek,activityByWeek,mappedStaff,weights,targets,dutyHoursByWeek,journalByDateHour,activityByDateHour,onDutyIndex,callEventsByWeek,callUnitsPerHour]);

  /* Registry mapping actions (BRIEF-IDENTITY §6) — every row is a real
     registry staffId already, so there's no "add a blank row"/"remove a
     row" any more, only editing a real person's operaUsernames/cashierId,
     or clearing it. Gated by canEdit at the call sites below (the button/
     input controls themselves), not here. */
  function mappingActorId(){return identity.currentEntry?.staffId||"system";}
  function updateMapping(staffId,patch){identity.setOperaMapping(mappingActorId(),staffId,patch);}
  function clearMapping(staffId){identity.setOperaMapping(mappingActorId(),staffId,{cashierId:null,operaUsernames:[]});}
  function confirmAssign(staffId){
    if(!assigning||!staffId)return;
    if(assigning.type==="agent"){
      updateMapping(staffId,{cashierId:assigning.value});
    }else{
      const entry=identity.findEntry(staffId);
      const next=Array.from(new Set([...(entry?.operaUsernames||[]),assigning.value]));
      updateMapping(staffId,{operaUsernames:next});
    }
    setAssigning(null);setAssignTarget("");
  }

  /* ── Charts (Chart.js, imperative — the only non-React-owned DOM here).
     Each `ensure*Chart` destroys its previous instance before creating a new
     one (required by Chart.js when reusing a canvas) and re-reads the app's
     CSS variables every time so switching light/dark theme re-themes them.
     Called from BOTH a useEffect (re-run when the underlying data changes)
     AND the canvas's ref callback directly: the trend chart's canvas only
     enters the DOM once trendSeries has 2+ weeks, and on the render where
     that first becomes true, this build's effect scheduling can run before
     the ref is attached — calling ensureTrendChart() again from the ref
     callback the instant the node mounts closes that gap reliably, the same
     pattern rowRefsMap uses elsewhere in this app for DOM refs that must be
     correct exactly when they attach. */
  function ensureScoreChart(){
    if(!window.Chart||!scoreChartRef.current)return;
    const green=cssVar("--green"),amber=cssVar("--amber"),red=cssVar("--red"),
      tcol=cssVar("--t2"),grid=cssVar("--border");
    chartInstances.current.score?.destroy();
    chartInstances.current.score=new Chart(scoreChartRef.current,{
      type:"bar",
      data:{
        labels:scoreRows.map(r=>r.name||r.staffId||"—"),
        datasets:[{label:"Score",data:scoreRows.map(r=>round2(r.score*100)),
          backgroundColor:scoreRows.map(r=>r.score>=0.9?green:r.score>=0.6?amber:red),
          borderRadius:5,maxBarThickness:40}]
      },
      options:{
        responsive:true,maintainAspectRatio:false,
        plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>` ${ctx.parsed.y.toFixed(1)}%`}}},
        scales:{
          y:{beginAtZero:true,max:110,ticks:{color:tcol,callback:v=>v+"%"},grid:{color:grid}},
          x:{ticks:{color:tcol},grid:{display:false}}
        }
      }
    });
  }

  function ensureVolumeChart(){
    if(!window.Chart||!volumeChartRef.current)return;
    const blue=cssVar("--blue"),green=cssVar("--green"),amber=cssVar("--amber"),
      tcol=cssVar("--t2"),grid=cssVar("--border");
    chartInstances.current.volume?.destroy();
    chartInstances.current.volume=new Chart(volumeChartRef.current,{
      type:"bar",
      data:{
        labels:scoreRows.map(r=>r.name||r.staffId||"—"),
        datasets:[
          {label:"Journal tx",data:scoreRows.map(r=>r.tx),backgroundColor:blue,stack:"u",borderRadius:3},
          {label:"Check-ins",data:scoreRows.map(r=>r.checkIns),backgroundColor:green,stack:"u",borderRadius:3},
          {label:"Check-outs",data:scoreRows.map(r=>r.checkOuts),backgroundColor:amber,stack:"u",borderRadius:3},
          {label:"Calls",data:scoreRows.map(r=>r.courtesyCalls+r.departureCalls),backgroundColor:PROD_CHART_PALETTE[4],stack:"u",borderRadius:3}
        ]
      },
      options:{
        responsive:true,maintainAspectRatio:false,
        plugins:{legend:{position:"bottom",labels:{color:tcol,boxWidth:11,padding:12,font:{size:11}}}},
        scales:{
          y:{beginAtZero:true,stacked:true,ticks:{color:tcol},grid:{color:grid}},
          x:{stacked:true,ticks:{color:tcol},grid:{display:false}}
        }
      }
    });
  }

  function ensureTrendChart(){
    if(!window.Chart||!trendChartRef.current||trendSeries.length<2){
      chartInstances.current.trend?.destroy();chartInstances.current.trend=null;return;
    }
    const tcol=cssVar("--t2"),grid=cssVar("--border");
    chartInstances.current.trend?.destroy();
    chartInstances.current.trend=new Chart(trendChartRef.current,{
      type:"line",
      data:{
        labels:trendSeries.map(t=>weekLabel(t.week)),
        datasets:mappedStaff.map((s,i)=>({
          label:s.name||s.staffId||`Staff ${i+1}`,
          data:trendSeries.map(t=>{
            const row=t.rows.find(r=>r._key===s._key);
            return row&&row.units>0?round2(row.score*100):null;
          }),
          borderColor:PROD_CHART_PALETTE[i%PROD_CHART_PALETTE.length],
          backgroundColor:PROD_CHART_PALETTE[i%PROD_CHART_PALETTE.length],
          tension:.3,spanGaps:true,pointRadius:3,pointHoverRadius:5
        }))
      },
      options:{
        responsive:true,maintainAspectRatio:false,
        plugins:{legend:{position:"bottom",labels:{color:tcol,boxWidth:11,padding:12,font:{size:11}}},
          tooltip:{callbacks:{label:ctx=>` ${ctx.dataset.label}: ${ctx.parsed.y==null?"–":ctx.parsed.y.toFixed(1)+"%"}`}}},
        scales:{
          y:{beginAtZero:true,max:110,ticks:{color:tcol,callback:v=>v+"%"},grid:{color:grid}},
          x:{ticks:{color:tcol},grid:{display:false}}
        }
      }
    });
  }

  useEffect(()=>{ensureScoreChart();return()=>chartInstances.current.score?.destroy();},[scoreRows,theme]);
  useEffect(()=>{ensureVolumeChart();return()=>chartInstances.current.volume?.destroy();},[scoreRows,theme]);
  useEffect(()=>{ensureTrendChart();return()=>chartInstances.current.trend?.destroy();},[trendSeries,mappedStaff,theme]);

  /* Destroy every chart on unmount (switching tabs unmounts this view). */
  useEffect(()=>()=>{
    chartInstances.current.score?.destroy();
    chartInstances.current.volume?.destroy();
    chartInstances.current.trend?.destroy();
  },[]);

  /* RECORDS.md envelope, staffId-keyed payload — shared by both export
     paths below so the JSON and Excel exports can never disagree. */
  function buildEnvelope(){
    const{first,last}=periodForWeek(week);
    const envelope={
      schemaVersion:1,module:"night-audit.production-kpi",
      periodStart:first,periodEnd:last,generatedAt:new Date().toISOString(),
      payload:{
        weights,targets,teamUnits,fairSharePct:round2(fairSharePct),
        agents:scoreRows.map(r=>({staffId:r.staffId,name:r.name,rank:r.rank,journalTx:r.tx,corrections:r.corr,
          checkIns:r.checkIns,checkOuts:r.checkOuts,courtesyCalls:r.courtesyCalls,departureCalls:r.departureCalls,units:r.units,
          dutyHours:r.dutyHours>0?round2(r.dutyHours):null,
          volumeModel:r.usedHourlyModel?"hourly":"fallback",
          hoursOnDuty:r.hoursOnDuty,hoursMet:r.hoursMet,flaggedHours:r.flaggedHours,
          volumeSharePct:round2(r.volumeSharePct),volumeScorePct:round2(r.volumeScore*100),
          accuracyPct:r.accuracy==null?null:round2(r.accuracy*100),
          accuracyScorePct:r.accuracyScore==null?null:round2(r.accuracyScore*100),
          scorePct:round2(r.score*100)})),
        unmapped:{
          agentIds:unmappedAgents.map(a=>({id:a.id,name:a.name,journalTx:a.tx})),
          usernames:unmappedUsers.map(a=>a.user)
        }
      }
    };
    return{envelope,first,last};
  }

  /* Save the weekly record — written into this app's already-connected
     folder (dirHandle already IS this app's Records/Night Audit/ branch —
     see connectFolder in app.js) under a production-kpi/ subfolder so it
     doesn't mix with nightly audit_*.json files. Falls back to a plain
     browser download when no folder is connected — matching exportPDF/
     exportXLSX in app.js, this should never just be a dead end. */
  async function saveWeeklyRecord(){
    if(!week){notify(t("production.pickWeekFirst"),"err");return;}
    const{envelope,first,last}=buildEnvelope();
    const fname=`production_${first}_${last}.json`;
    setSaving(true);
    try{
      if(dirHandle){
        const prodDir=await dirHandle.getDirectoryHandle("production-kpi",{create:true});
        const fh=await prodDir.getFileHandle(fname,{create:true});
        const w=await fh.createWritable();
        await w.write(JSON.stringify(envelope,null,2));
        await w.close();
        notify(t("production.savedFile",fname));
      }else{
        const blob=new Blob([JSON.stringify(envelope,null,2)],{type:"application/json"});
        const a=document.createElement("a");
        a.href=URL.createObjectURL(blob);a.download=fname;a.click();
        URL.revokeObjectURL(a.href);
        notify(t("production.downloadedFile",fname));
      }
    }catch(e){notify(t("production.saveFailed",e.message),"err");}
    finally{setSaving(false);}
  }

  /* Plain spreadsheet export of the same data — the JSON record is for the
     future cross-KPI aggregator, this is for a manager who just wants to
     open the numbers in Excel. Uses the SheetJS build already bundled in
     vendor.js (same library app.js's exportXLSX uses) — no new dependency. */
  async function exportProductionExcel(){
    if(!week){notify(t("production.pickWeekFirst"),"err");return;}
    if(!window.XLSX){notify(t("production.excelLibUnavailable"),"err");return;}
    const{first,last}=periodForWeek(week);
    const U=XLSX.utils,wb=U.book_new();
    const hdr=[t("production.rank"),t("production.staffIdCol"),t("production.name"),t("production.journalTx"),t("production.checkIns"),t("production.checkOuts"),t("production.courtesyCalls"),t("production.departureCalls"),t("production.units"),t("production.dutyHrs"),
      t("production.volumeModel"),t("production.coverage")+" %",t("production.hrsMetOnDuty"),t("production.flaggedHrs"),t("production.corrections"),t("production.accuracy")+" %",t("production.score")+" %"];
    const aoa=[hdr,...scoreRows.map(r=>[r.rank,r.staffId,r.name,r.tx,r.checkIns,r.checkOuts,r.courtesyCalls,r.departureCalls,round2(r.units),
      r.dutyHours>0?round2(r.dutyHours):null,
      r.usedHourlyModel?"hourly":"fallback",round2(r.volumeSharePct),
      r.usedHourlyModel?`${r.hoursMet}/${r.hoursOnDuty}`:"",r.usedHourlyModel?r.flaggedHours:"",
      r.corr,r.accuracy==null?null:round2(r.accuracy*100),round2(r.score*100)])];
    const ws=U.aoa_to_sheet(aoa);
    ws["!cols"]=[{wch:6},{wch:10},{wch:22},{wch:11},{wch:10},{wch:11},{wch:11},{wch:12},{wch:8},{wch:9},{wch:11},{wch:11},{wch:14},{wch:11},{wch:11},{wch:11},{wch:8}];
    U.book_append_sheet(wb,ws,"Production KPI");
    if(unmappedAgents.length||unmappedUsers.length){
      const uAoa=[[t("production.unmappedAgents")],[t("production.id"),t("production.name"),t("production.journalTx")],
        ...unmappedAgents.map(a=>[a.id,a.name,a.tx]),
        [],[t("production.unmappedUsers")],
        ...unmappedUsers.map(a=>[a.user])];
      U.book_append_sheet(wb,U.aoa_to_sheet(uAoa),"Unmapped");
    }
    const fname=`production_${first}_${last}.xlsx`;
    try{
      if(dirHandle){
        const prodDir=await dirHandle.getDirectoryHandle("production-kpi",{create:true});
        const buf=XLSX.write(wb,{type:"array",bookType:"xlsx"});
        const fh=await prodDir.getFileHandle(fname,{create:true});
        const w=await fh.createWritable();
        await w.write(new Blob([buf]));
        await w.close();
        notify(t("production.savedFile",fname));
      }else{
        XLSX.writeFile(wb,fname);
        notify(t("toast.excelDownloaded"));
      }
    }catch(e){notify(t("production.excelExportFailed",e.message),"err");}
  }

  return E("div",null,
    E("div",{className:"card"},
      E("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}},
        E("div",null,
          E("div",{className:"inp-label"},t("production.week")),
          weeks.length
            ?E("select",{className:"inp",value:week||"",onChange:ev=>setWeek(ev.target.value)},
                weeks.map(mm=>E("option",{key:mm,value:mm},weekLabel(mm))))
            :E("div",{style:{fontSize:12,color:"var(--t3)"}},t("production.noHistoryYet"))),
        E("div",{style:{display:"flex",gap:8}},
          E("button",{className:"btn",disabled:!week,onClick:exportProductionExcel},
            E("i",{className:"ti ti-file-spreadsheet"}),t("production.exportExcel")),
          E("button",{className:"btn primary",disabled:saving||!week,onClick:saveWeeklyRecord},
            E("i",{className:"ti ti-device-floppy"}),saving?t("production.saving"):t("production.saveWeeklyRecord")))),
      !dirHandle&&E("div",{style:{fontSize:12,color:"var(--t3)",marginTop:8}},
        t("production.noFolderConnected"),
        t("production.connectFromUpload"))),

    /* ── Activity log upload ── */
    E("div",{className:"card-title"},E("i",{className:"ti ti-door-enter",style:{marginRight:6}}),t("production.checkInOutLog")),
    E("div",{className:"card"},
      E("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}},
        E("div",{style:{fontSize:12,color:"var(--t2)"}},
          t("production.eventsLoaded",Object.keys(activity).length,pluralSuffix(Object.keys(activity).length)),
          t("production.exportsFiltered")),
        E("div",null,
          E("button",{className:"btn sm",onClick:()=>fileRef.current?.click()},
            E("i",{className:"ti ti-upload"}),t("production.uploadActivityXml")),
          E("input",{ref:fileRef,type:"file",accept:".xml",multiple:true,style:{display:"none"},
            onChange:ev=>{handleActivityFiles(ev.target.files);ev.target.value="";}})))),

    /* ── Roster link (Attendance shift-feed) — optional; when connected,
       Volume is normalized per duty-hour instead of a raw weekly count. ── */
    E("div",{className:"card-title",style:{marginTop:18}},E("i",{className:"ti ti-link",style:{marginRight:6}}),t("production.rosterLink")),
    E("div",{className:"card"},
      E("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}},
        E("div",{style:{fontSize:12,color:"var(--t2)"}},
          attendanceDirHandle
            ?[t("production.connectedShiftHours",attendanceFolderName),
              Object.keys(dutyHoursByWeek).length
                ?t("production.shiftHoursLoaded",Object.keys(dutyHoursByWeek).length,pluralSuffix(Object.keys(dutyHoursByWeek).length))
                :t("production.noShiftHoursYet")]
            :t("production.connectAttendanceDesc")),
        E("div",{style:{display:"flex",gap:8}},
          attendanceDirHandle&&E("button",{className:"btn sm ghost",disabled:loadingShiftFeed,onClick:()=>refreshShiftFeed()},
            E("i",{className:"ti ti-refresh"}),loadingShiftFeed?t("production.loadingEllipsis"):t("production.refresh")),
          E("button",{className:"btn sm",onClick:connectAttendanceFolder},
            E("i",{className:"ti ti-folder-open"}),attendanceDirHandle?t("production.reconnect"):t("production.connectAttendanceFolder"))))),

    /* ── Guest Care link (call-events) — BRIEF-PROD-FAIRNESS.md Part B. Auto-connects off
       identity.pmsRoot (the shared cross-app root identity.js already manages), so unlike the
       Attendance link above there's no separate picker — just a status line + Refresh. ── */
    E("div",{className:"card-title",style:{marginTop:18}},E("i",{className:"ti ti-phone-outgoing",style:{marginRight:6}}),t("production.guestCareLink")),
    E("div",{className:"card"},
      E("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}},
        E("div",{style:{fontSize:12,color:"var(--t2)"}},
          identity.pmsRoot
            ?[t("production.connectedCallEvents"),
              Object.keys(callEventsByDate).length
                ?t("production.callEventsLoaded",Object.keys(callEventsByDate).length,pluralSuffix(Object.keys(callEventsByDate).length))
                :t("production.noCallEventsYet")]
            :t("production.connectGuestCareDesc")),
        identity.pmsRoot&&E("button",{className:"btn sm ghost",disabled:loadingCallEvents,onClick:refreshCallEvents},
          E("i",{className:"ti ti-refresh"}),loadingCallEvents?t("production.loadingEllipsis"):t("production.refresh")))),

    /* ── Dashboard ── */
    E("div",{className:"card-title",style:{marginTop:4}},E("i",{className:"ti ti-layout-dashboard",style:{marginRight:6}}),
      t("production.dashboard"),week?` — ${weekLabel(week)}`:""),
    scoreRows.length===0
      ?E("div",{className:"card",style:{textAlign:"center",padding:24,color:"var(--t3)"}},
          t("production.mapStaffFirst"))
      :E("div",null,
          E("div",{className:"grid"},
            E("div",{className:"metric"},E("div",{className:"mlabel"},t("production.leaderboard1")),
              E("div",{className:"mval sm",style:{color:"var(--green-t)"}},topPerformer?.name||topPerformer?.staffId||"—"),
              topPerformer&&E("div",{style:{fontSize:11,color:"var(--t3)",marginTop:2}},t("production.scorePct",(topPerformer.score*100).toFixed(1)))),
            E("div",{className:"metric"},E("div",{className:"mlabel"},t("production.teamAccuracy")),
              E("div",{className:"mval sm"},avgAccuracy==null?t("common.dash"):(avgAccuracy*100).toFixed(1)+"%")),
            E("div",{className:"metric"},E("div",{className:"mlabel"},t("production.totalUnits")),
              E("div",{className:"mval sm"},fmt(teamUnits,1))),
            E("div",{className:"metric"},E("div",{className:"mlabel"},t("production.fairShare")),
              E("div",{className:"mval sm"},fairSharePct.toFixed(1),"%")),
            E("div",{className:"metric"},E("div",{className:"mlabel"},t("production.mappedStaff")),
              E("div",{className:"mval sm"},scoreRows.length))),
          E("div",{style:{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(320px,1fr))",gap:14,marginBottom:14}},
            E("div",{className:"card"},
              E("div",{style:{fontSize:12,fontWeight:700,color:"var(--t2)",marginBottom:10}},t("production.scoreByStaff")),
              E("div",{style:{position:"relative",height:240}},
                E("canvas",{ref:el=>{scoreChartRef.current=el;if(el)ensureScoreChart();}}))),
            E("div",{className:"card"},
              E("div",{style:{fontSize:12,fontWeight:700,color:"var(--t2)",marginBottom:10}},t("production.volumeBreakdown")),
              E("div",{style:{position:"relative",height:240}},
                E("canvas",{ref:el=>{volumeChartRef.current=el;if(el)ensureVolumeChart();}})))),
          trendSeries.length>1&&E("div",{className:"card"},
            E("div",{style:{fontSize:12,fontWeight:700,color:"var(--t2)",marginBottom:10}},
              t("production.scoreTrend",trendSeries.length,pluralSuffix(trendSeries.length))),
            E("div",{style:{position:"relative",height:260}},
              E("canvas",{ref:el=>{trendChartRef.current=el;if(el)ensureTrendChart();}})))),

    /* ── Score table ── */
    E("div",{className:"card-title",style:{marginTop:18}},E("i",{className:"ti ti-table",style:{marginRight:6}}),t("production.detail")),
    E("div",{className:"card np",style:{overflowX:"auto"}},
      E("table",{className:"t"},
        E("thead",null,E("tr",null,
          E("th",{className:"r",title:t("production.rankTip")},t("production.rank")),
          E("th",null,t("production.staff")),E("th",null,t("production.id")),
          E("th",{className:"r"},t("production.journalTx")),E("th",{className:"r"},t("production.checkIns")),E("th",{className:"r"},t("production.checkOuts")),
          E("th",{className:"r"},t("production.units")),
          E("th",{className:"r",title:t("production.dutyHrsTip")},t("production.dutyHrs")),
          E("th",{className:"r",title:t("production.coverageTip")},t("production.coverage")),
          E("th",{className:"r",title:t("production.flaggedHrsTip")},t("production.flaggedHrs")),
          E("th",{className:"r"},t("production.corrections")),E("th",{className:"r"},t("production.accuracy")),
          E("th",{className:"r"},t("production.score")))),
        E("tbody",null,
          scoreRows.length===0
            ?E("tr",null,E("td",{colSpan:13,style:{textAlign:"center",padding:20,color:"var(--t3)"}},
                t("production.noMappedStaff")))
            :scoreRows.map(r=>E("tr",{key:r._key},
                E("td",{className:"r",style:{color:"var(--t3)"}},"#",r.rank),
                E("td",{style:{fontWeight:700}},r.name||"—"),
                E("td",{style:{fontFamily:"monospace",fontSize:11,color:r.staffId?"var(--t3)":"var(--red-t)"},
                  title:r.staffId?undefined:t("production.noEmployeeIdTip")},r.staffId||t("production.missing")),
                E("td",{className:"r"},r.tx),
                E("td",{className:"r"},r.checkIns),
                E("td",{className:"r"},r.checkOuts),
                E("td",{className:"r",style:{fontWeight:700}},fmt(r.units,1)),
                E("td",{className:"r"},r.dutyHours>0?fmt(r.dutyHours,1):t("common.dash")),
                E("td",{className:"r"},r.usedHourlyModel
                  ?[`${r.volumeSharePct.toFixed(1)}%`,E("div",{key:"hrs",style:{fontSize:10,color:"var(--t3)",fontWeight:400}},t("production.hrsMet",r.hoursMet,r.hoursOnDuty))]
                  :[E("span",{title:t("production.noAttendanceFallback")},"—"),
                    E("div",{key:"fb",style:{fontSize:10,color:"var(--amber-t)",fontWeight:400}},t("production.fallbackPct",r.volumeSharePct.toFixed(1)))]),
                E("td",{className:"r"},r.flaggedHours>0?E("span",{className:"bdg bgreen",title:t("production.flaggedHoursTip")},r.flaggedHours):t("common.dash")),
                E("td",{className:"r"},r.corr>0?E("span",{className:"bdg bamber"},r.corr):t("common.dash")),
                E("td",{className:"r"},r.accuracy==null?t("common.dash"):(r.accuracy*100).toFixed(1)+"%"),
                E("td",{className:"r",style:{fontWeight:700}},
                  E("span",{className:`bdg ${r.score>=0.9?"bgreen":r.score>=0.6?"bamber":"bred"}`},(r.score*100).toFixed(1),"%")))))),
      scoreRows.length>0&&E("div",{style:{padding:"8px 14px",fontSize:11,color:"var(--t3)",borderTop:"1px solid var(--border)"}},
        t("production.coverageFootnote"),
        t("production.scoreFootnote",weights.volumePct,weights.accuracyPct),
        scoreRows.some(r=>r.usedHourlyModel)
          ?t("production.fallbackNote",fairSharePct.toFixed(1),teamUnits.toFixed(1))
          :t("production.connectForHourly",fairSharePct.toFixed(1),teamUnits.toFixed(1)))),

    /* ── Unmapped identities — assign to an existing registry staff member
       (there's no more "create a blank row"; every possible person already
       has one, from the shared registry). ── */
    (unmappedAgents.length>0||unmappedUsers.length>0)&&E("div",null,
      E("div",{className:"card-title",style:{marginTop:18}},
        E("i",{className:"ti ti-alert-triangle",style:{marginRight:6,color:"var(--amber)"}}),
        t("production.unmappedTitle")),
      E("div",{className:"card"},
        unmappedAgents.length>0&&E("div",{style:{marginBottom:unmappedUsers.length?10:0}},
          E("div",{style:{fontSize:11,fontWeight:600,color:"var(--t2)",marginBottom:6}},t("production.unmappedAgents")),
          E("div",{style:{display:"flex",flexWrap:"wrap",gap:6}},
            unmappedAgents.map(a=>E("button",{key:a.id,className:"btn xs ghost",
              onClick:()=>setAssigning({type:"agent",value:a.id,label:`${a.name||"?"} (#${a.id})`})},
              E("i",{className:"ti ti-plus",style:{fontSize:11}}),`${a.name||"?"} (#${a.id}, ${a.tx} tx)`)))),
        unmappedUsers.length>0&&E("div",null,
          E("div",{style:{fontSize:11,fontWeight:600,color:"var(--t2)",marginBottom:6}},t("production.unmappedUsers")),
          E("div",{style:{display:"flex",flexWrap:"wrap",gap:6}},
            unmappedUsers.map(a=>E("button",{key:a.user,className:"btn xs ghost",
              onClick:()=>setAssigning({type:"user",value:a.user,label:a.user})},
              E("i",{className:"ti ti-plus",style:{fontSize:11}}),a.user)))),
        assigning&&E("div",{style:{marginTop:12,paddingTop:12,borderTop:"1px solid var(--border)",display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}},
          E("span",{style:{fontSize:12}},t("production.assignTo",assigning.label)),
          E("select",{className:"inp sm",value:assignTarget,onChange:ev=>setAssignTarget(ev.target.value)},
            E("option",{value:""},t("production.chooseStaff")),
            identity.allStaff.map(s=>E("option",{key:s.staffId,value:s.staffId},s.displayName))),
          E("button",{className:"btn sm primary",disabled:!assignTarget,onClick:()=>confirmAssign(assignTarget)},t("production.assign")),
          E("button",{className:"btn sm ghost",onClick:()=>{setAssigning(null);setAssignTarget("");}},t("production.cancel"))))),

    /* ── Staff mapping manager — one row per registry staff member; cashier
       ID / Opera usernames edit here write straight to the shared registry
       (identity.setOperaMapping). Name/Staff ID are read-only (membership is
       mastered by Attendance, per MASTER-PLAN). ── */
    E("div",{className:"card-title",style:{marginTop:18}},E("i",{className:"ti ti-users",style:{marginRight:6}}),t("production.staffMapping")),
    E("div",{className:"card np",style:{overflowX:"auto"}},
      E("table",{className:"t"},
        E("thead",null,E("tr",null,
          E("th",null,t("production.staffId")),E("th",null,t("production.name")),
          E("th",null,t("production.cashierId")),E("th",null,t("production.operaUsernames")),E("th"))),
        E("tbody",null,
          staffMap.length===0
            ?E("tr",null,E("td",{colSpan:5,style:{textAlign:"center",padding:20,color:"var(--t3)"}},
                t("production.noRegistryStaff")))
            :staffMap.map(s=>{
              const hasMapping=(s.agentIds||[]).length||(s.usernames||[]).length;
              return E("tr",{key:s._key},
                E("td",{style:{fontFamily:"monospace",fontSize:11,color:"var(--t3)"}},s.staffId),
                E("td",{style:{fontWeight:600}},s.name),
                E("td",null,E("input",{className:"inp xs",style:{width:100},defaultValue:s.agentIds[0]||"",
                  placeholder:t("production.cashierIdPh"),onBlur:ev=>{const v=ev.target.value.trim();if(v!==(s.agentIds[0]||""))updateMapping(s.staffId,{cashierId:v||null});}})),
                E("td",null,E("input",{className:"inp xs",style:{width:220},defaultValue:(s.usernames||[]).join(", "),
                  placeholder:t("production.usernamePh"),onBlur:ev=>{const next=splitList(ev.target.value);if(next.join(",")!==(s.usernames||[]).join(","))updateMapping(s.staffId,{operaUsernames:next});}})),
                E("td",null,hasMapping&&E("button",{className:"btn xs ghost",onClick:()=>clearMapping(s.staffId)},t("production.clear"))));
            })))),

    /* ── Settings — weights + KPI-STANDARD.md threshold/target/stretch ── */
    E("div",{className:"card-title",style:{marginTop:18}},E("i",{className:"ti ti-adjustments",style:{marginRight:6}}),t("production.scoringSettings")),
    E("div",{className:"card"},
      E("div",{style:{fontSize:11,fontWeight:600,color:"var(--t2)",marginBottom:6}},t("production.weights")),
      E("div",{className:"grid"},
        E("div",{className:"metric"},E("div",{className:"mlabel"},t("production.volumeWeight")),
          E("input",{className:"inp sm",type:"number",min:0,max:100,style:{width:"100%",marginTop:4},
            value:weights.volumePct,onChange:ev=>setWeights(w=>({...w,volumePct:toNum(ev.target.value)}))})),
        E("div",{className:"metric"},E("div",{className:"mlabel"},t("production.accuracyWeight")),
          E("input",{className:"inp sm",type:"number",min:0,max:100,style:{width:"100%",marginTop:4},
            value:weights.accuracyPct,onChange:ev=>setWeights(w=>({...w,accuracyPct:toNum(ev.target.value)}))})),
        E("div",{className:"metric"},E("div",{className:"mlabel"},t("production.ptsPerTx")),
          E("input",{className:"inp sm",type:"number",min:0,step:.1,style:{width:"100%",marginTop:4},
            value:weights.wTx,onChange:ev=>setWeights(w=>({...w,wTx:toNum(ev.target.value)}))})),
        E("div",{className:"metric"},E("div",{className:"mlabel"},t("production.ptsPerCheckIn")),
          E("input",{className:"inp sm",type:"number",min:0,step:.1,style:{width:"100%",marginTop:4},
            value:weights.wCheckIn,onChange:ev=>setWeights(w=>({...w,wCheckIn:toNum(ev.target.value)}))})),
        E("div",{className:"metric"},E("div",{className:"mlabel"},t("production.ptsPerCheckOut")),
          E("input",{className:"inp sm",type:"number",min:0,step:.1,style:{width:"100%",marginTop:4},
            value:weights.wCheckOut,onChange:ev=>setWeights(w=>({...w,wCheckOut:toNum(ev.target.value)}))})),
        E("div",{className:"metric"},E("div",{className:"mlabel"},t("production.ptsPerCourtesyCall")),
          E("input",{className:"inp sm",type:"number",min:0,step:.1,style:{width:"100%",marginTop:4},
            value:weights.wCourtesyCall,onChange:ev=>setWeights(w=>({...w,wCourtesyCall:toNum(ev.target.value)}))})),
        E("div",{className:"metric"},E("div",{className:"mlabel"},t("production.ptsPerDepartureCall")),
          E("input",{className:"inp sm",type:"number",min:0,step:.1,style:{width:"100%",marginTop:4},
            value:weights.wDepartureCall,onChange:ev=>setWeights(w=>({...w,wDepartureCall:toNum(ev.target.value)}))}))),

      E("div",{style:{fontSize:11,fontWeight:600,color:"var(--t2)",margin:"16px 0 6px"}},
        t("production.hourlyModelTitle")),
      E("div",{className:"grid"},
        E("div",{className:"metric"},E("div",{className:"mlabel"},t("production.flagMargin")),
          E("input",{className:"inp sm",type:"number",min:1,step:.1,style:{width:"100%",marginTop:4},
            value:targets.hourlyMargin,onChange:ev=>setTargets(t=>({...t,hourlyMargin:toNum(ev.target.value)}))})),
        E("div",{className:"metric"},E("div",{className:"mlabel"},t("production.bonusPerFlag")),
          E("input",{className:"inp sm",type:"number",min:0,step:.5,style:{width:"100%",marginTop:4},
            value:targets.hourlyBonusPerFlag,onChange:ev=>setTargets(t=>({...t,hourlyBonusPerFlag:toNum(ev.target.value)}))})),
        E("div",{className:"metric"},E("div",{className:"mlabel"},t("production.thresholdPct")),
          E("input",{className:"inp sm",type:"number",min:0,step:1,style:{width:"100%",marginTop:4},
            value:targets.hourlyThreshold,onChange:ev=>setTargets(t=>({...t,hourlyThreshold:toNum(ev.target.value)}))})),
        E("div",{className:"metric"},E("div",{className:"mlabel"},t("production.targetPct")),
          E("input",{className:"inp sm",type:"number",min:0,step:1,style:{width:"100%",marginTop:4},
            value:targets.hourlyTarget,onChange:ev=>setTargets(t=>({...t,hourlyTarget:toNum(ev.target.value)}))})),
        E("div",{className:"metric"},E("div",{className:"mlabel"},t("production.stretchPct")),
          E("input",{className:"inp sm",type:"number",min:0,step:1,style:{width:"100%",marginTop:4},
            value:targets.hourlyStretch,onChange:ev=>setTargets(t=>({...t,hourlyStretch:toNum(ev.target.value)}))}))),
      E("div",{style:{fontSize:11,color:"var(--t3)",marginBottom:14}},
        t("production.hourlyExplain",targets.hourlyMargin,targets.hourlyBonusPerFlag)),

      E("div",{style:{fontSize:11,fontWeight:600,color:"var(--t2)",margin:"16px 0 6px"}},
        t("production.fallbackTitle")),
      E("div",{className:"grid"},
        E("div",{className:"metric"},E("div",{className:"mlabel"},t("production.thresholdX")),
          E("input",{className:"inp sm",type:"number",min:0,step:.05,style:{width:"100%",marginTop:4},
            value:targets.volThresholdRatio,onChange:ev=>setTargets(t=>({...t,volThresholdRatio:toNum(ev.target.value)}))})),
        E("div",{className:"metric"},E("div",{className:"mlabel"},t("production.targetX")),
          E("input",{className:"inp sm",type:"number",min:0,step:.05,style:{width:"100%",marginTop:4},
            value:targets.volTargetRatio,onChange:ev=>setTargets(t=>({...t,volTargetRatio:toNum(ev.target.value)}))})),
        E("div",{className:"metric"},E("div",{className:"mlabel"},t("production.stretchX")),
          E("input",{className:"inp sm",type:"number",min:0,step:.05,style:{width:"100%",marginTop:4},
            value:targets.volStretchRatio,onChange:ev=>setTargets(t=>({...t,volStretchRatio:toNum(ev.target.value)}))})),
        E("div",{className:"metric",style:{background:"var(--blue-bg)"}},E("div",{className:"mlabel"},t("production.thisWeeksTts")),
          E("div",{style:{fontSize:12,marginTop:4}},
            (fairSharePct*targets.volThresholdRatio).toFixed(1),"% / ",
            (fairSharePct*targets.volTargetRatio).toFixed(1),"% / ",
            (fairSharePct*targets.volStretchRatio).toFixed(1),"%"))),

      E("div",{style:{fontSize:11,fontWeight:600,color:"var(--t2)",margin:"16px 0 6px"}},
        t("production.accuracyTitle")),
      E("div",{className:"grid"},
        E("div",{className:"metric"},E("div",{className:"mlabel"},t("production.thresholdPct")),
          E("input",{className:"inp sm",type:"number",min:0,max:100,step:1,style:{width:"100%",marginTop:4},
            value:targets.accThreshold,onChange:ev=>setTargets(t=>({...t,accThreshold:toNum(ev.target.value)}))})),
        E("div",{className:"metric"},E("div",{className:"mlabel"},t("production.targetPct")),
          E("input",{className:"inp sm",type:"number",min:0,max:100,step:1,style:{width:"100%",marginTop:4},
            value:targets.accTarget,onChange:ev=>setTargets(t=>({...t,accTarget:toNum(ev.target.value)}))})),
        E("div",{className:"metric"},E("div",{className:"mlabel"},t("production.stretchPct")),
          E("input",{className:"inp sm",type:"number",min:0,max:100,step:1,style:{width:"100%",marginTop:4},
            value:targets.accStretch,onChange:ev=>setTargets(t=>({...t,accStretch:toNum(ev.target.value)}))}))),

      E("div",{style:{fontSize:11,color:"var(--t3)",marginTop:14}},
        t("production.finalExplain"),
        weights.volumePct+weights.accuracyPct!==100
          ?t("production.finalExplainWeighted",round2(weights.volumePct/(weights.volumePct+weights.accuracyPct||1)*100),round2(weights.accuracyPct/(weights.volumePct+weights.accuracyPct||1)*100))
          :"",
        t("production.finalExplainEnd"))));
}
