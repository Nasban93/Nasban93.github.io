/* ── Helpers ── */
const toNum=v=>parseFloat(String(v??"").replace(/,/g,""))||0;
const fmt=(n,d=2)=>n==null?"–":Number(n).toLocaleString("en",{minimumFractionDigits:d,maximumFractionDigits:d});
const today=()=>new Date().toISOString().slice(0,10);
const trunc=(s,n=20)=>s&&s.length>n?s.slice(0,n)+"…":s||"";

/* ── parseHourOfDay ───────────────────────────────────────────────────────────
   Opera's per-transaction BUSINESS_TIME and per-event INS_CHAR_TIME aren't in
   one consistent format across exports — some are 12-hour with AM/PM
   ("04:54 PM"), some are already 24-hour ("22:20:00"). Both need to resolve
   to the same 0–23 hour bucket for the Production-KPI hourly coverage model
   (helpers.js so both app.js's buildPayload and production-view.js's
   activity-log parser can share one parser instead of two copies). Returns
   null when the string doesn't match either shape, so callers can skip an
   unparseable time instead of miscounting it into hour 0. */
function parseHourOfDay(t){
  if(!t)return null;
  const s=String(t).trim();
  const ampm=s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if(ampm){
    let h=parseInt(ampm[1],10)%12;
    if(/PM/i.test(ampm[3]))h+=12;
    return h;
  }
  const h24=s.match(/^(\d{1,2}):(\d{2})/);
  if(h24){
    const h=parseInt(h24[1],10);
    return h>=0&&h<=23?h:null;
  }
  return null;
}

/* ── cashStatus ───────────────────────────────────────────────────────────────
   Classifies a cash-drop variance (physical count minus Opera drop) into one
   of four buckets. Anything within CASH_TOLERANCE (±SAR 2, see constants.js)
   is normal handling/rounding slack — not a real discrepancy — so it gets its
   own "tolerance" bucket distinct from both an exact match and a genuine
   over/short. has===false means nothing has been counted yet ("pending").
─────────────────────────────────────────────────────────────────────────── */
function cashStatus(v,has=true){
  if(!has||v==null)return"pending";
  const av=Math.abs(v);
  if(av<0.01)return"match";
  if(av<=CASH_TOLERANCE)return"tolerance";
  return v<0?"short":"over";
}
/* badgeLabel intentionally NOT baked in here — text needs to follow the
   current language at render time, so call sites use cashStatusLabel(st)
   (strings.js keys) instead of a static label on this object. */
const CASH_STATUS_META={
  pending:{color:"var(--t3)",badgeClass:"bgray"},
  match:{color:"var(--green-t)",badgeClass:"bgreen"},
  tolerance:{color:"var(--blue-t)",badgeClass:"bblue"},
  short:{color:"var(--red-t)",badgeClass:"bred"},
  over:{color:"var(--amber-t)",badgeClass:"bamber"},
  /* BRIEF-NIGHT-AUDIT-2-FIXES §2 — sanctioned "no cash-drop slip" exception */
  exception:{color:"var(--amber-t)",badgeClass:"bamber"}
};
function cashStatusLabel(status){
  if(status==="pending")return t("common.pending");
  if(status==="match")return "✓ "+t("cash.matchWord");
  if(status==="tolerance")return "≈ "+t("cash.withinTolerance",CASH_TOLERANCE);
  if(status==="short")return t("cash.shortWord");
  if(status==="over")return t("cash.overWord");
  if(status==="exception")return t("cash.exceptionWord");
  return "";
}

function enrich(r){
  const code=String(r.TRX_CODE??"");
  const cc=(r.CC_CODE??"").toUpperCase();
  const desc=(r.TRX_DESC??"").toLowerCase();
  const ref=(r.REFERENCE??"").toLowerCase();
  const rawCredit=toNum(r.CASHIER_CREDIT);
  const rawDebit=toNum(r.CASHIER_DEBIT);

  /* ── Foreign currency cash ────────────────────────────────────────────────
     CURRENCY1 is "SAR" for normal postings, or "USD(3.75)" / "AED(1.02)" etc.
     when the cash was tendered in a foreign currency. Confirmed against a real
     export (room 331, two $26.67 postings + a same-cashier reversal): the
     rounding only works out if CASHIER_CREDIT holds the FOREIGN face value,
     not the SAR equivalent — 26.67 × 3.75 = 100.0125, vs. a clean SAR 100.00
     divided by 3.75 and rounded to 2dp = 26.67 USD exactly. So Opera is
     storing what was physically in the drawer (foreign banknotes), and we
     need the SAR equivalent for every total in this app to stay correct.
     The original foreign face amount is kept separately (_fxFaceCredit/Debit)
     purely for display, so the auditor can see what was actually tendered. */
  const curr1=String(r.CURRENCY1??"SAR").trim().toUpperCase();
  const fxMatch=curr1.match(/^([A-Z]{3})\(([\d.]+)\)$/);
  const fxCode=fxMatch?fxMatch[1]:null;
  const fxRate=fxMatch?parseFloat(fxMatch[2]):null;
  const credit=fxMatch?Math.round(rawCredit*fxRate*100)/100:rawCredit;
  const debit=fxMatch?Math.round(rawDebit*fxRate*100)/100:rawDebit;

  /* TRX_CODE is the reliable signal (see TAX_CODES in constants.js) — description text
     varies too much across properties and configs to trust alone ("Municipality Fee 5% -
     Room" matches neither "vat" nor "tax"). Keep a narrow description fallback only for
     codes we haven't seen yet. */
  const isTax=TAX_CODES.includes(code)||/\b(vat|municipality)\b/.test(desc);
  
  const cardCode=BY_CODE[code]?code:desc.includes("master")?"9104":desc.includes("amex")||desc.includes("american express")?"9102":desc.includes("visa")?"9100":desc.includes("span")||desc.includes("mada")?"9090":CC_MAP[cc]??null;
  const supplement=String(r.CREDIT_CARD_SUPPLEMENT??"");
  const chequeNum=String(r.CHEQUE_NUMBER??"");
  /* Strip raw PCI-adjacent fields before the row ever reaches state or localStorage.
     _last4 and _chequeRef below are the safe, redacted versions for display. */
  const {CREDIT_CARD_SUPPLEMENT:_omitCC,CHEQUE_NUMBER:_omitCH,...safeR}=r;
  return{
    ...safeR,_code:code,_cardCode:cardCode,
    _isCard:!!BY_CODE[code],_isCash:CASH_CODES.includes(code),_isCL:code==="9003",_isReward:code==="9035"||code==="9083",
    _isOTA:code==="9239",
    _isTax:isTax,
    _isCorr:ref.includes("correct")||credit<0||debit<0,
    _credit:credit,_debit:debit,
    _fxCode:fxCode,_fxRate:fxRate,
    _fxFaceCredit:fxMatch?rawCredit:null,_fxFaceDebit:fxMatch?rawDebit:null,
    _agent:r.CASHIER_NAME??String(r.CASHIER_ID??""),
    _agentId:String(r.CASHIER_ID??""),
    _userName:r.USER_NAME??r.CASHIER_NAME??String(r.CASHIER_ID??""),
    _trxNo:String(r.TRX_NO??r.RECEIPT_NO??`x-${Math.random()}`),
    _receipt:String(r.RECEIPT_NO??""),
    _chequeRef:chequeNum||supplement,
    _last4:supplement.replace(/\D/g,"").slice(-4),
    _date:r.BUSINESS_FORMAT_DATE??r.BUSINESS_DATE??"",
    _time:r.BUSINESS_TIME??"",
    _room:String(r.ROOM??""),
    _guest:r.GUEST_FULL_NAME??"",
    _desc:r.TRX_DESC??"",
    _ref:r.REFERENCE??""
  };
}

const initMach=()=>{const m={};MACHINES.forEach(mac=>{m[mac]={};CARDS.forEach(c=>{m[mac][c.code]="";});});return m;};

const isXmlFile=file=>/\.xml$/i.test(file.name);

/* ── parseOperaXML ────────────────────────────────────────────────────────────
   Opera's raw XML export ("Generated by Oracle Reports") nests each transaction
   several levels deep under report-grouping wrappers (LIST_G_FIRST/G_FIRST/
   LIST_SECOND/SECOND/...) that exist only to group cashiers/dates for print
   layout — every field enrich() needs lives as flat leaf elements one level
   under the repeating record tag (G_TRX_CHAR_DATE for finjrnlbytrans). The
   grouping depth isn't meaningful here, so just collect every record tag
   anywhere in the document and flatten its children into a plain object —
   the same shape XLSX.utils.sheet_to_json produces for the .xlsx export, so
   enrich()/dedupeKeys() need zero changes. ───────────────────────────────── */
function parseOperaXML(xmlText,recordTag){
  const doc=new DOMParser().parseFromString(xmlText,"text/xml");
  if(doc.querySelector("parsererror"))throw new Error("Malformed XML file");
  return Array.from(doc.getElementsByTagName(recordTag)).map(rec=>{
    const o={};
    Array.from(rec.children).forEach(child=>{o[child.tagName]=(child.textContent||"").trim();});
    return o;
  });
}

/* ── readRawRows ──────────────────────────────────────────────────────────────
   Single entry point for both the initial upload and re-sync: accepts the
   Opera cashier journal as either the raw .xml export (finjrnlbytrans) or the
   .xlsx/.xls/.csv export, and always resolves to the same flat row-object
   array so the rest of the pipeline never needs to know which one it got. ── */
function readRawRows(file){
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onerror=()=>reject(new Error("File read failed"));
    if(isXmlFile(file)){
      reader.onload=e=>{
        try{resolve(parseOperaXML(e.target.result,"G_TRX_CHAR_DATE"));}
        catch(err){reject(err);}
      };
      reader.readAsText(file);
    }else{
      reader.onload=e=>{
        try{
          const wb=XLSX.read(new Uint8Array(e.target.result),{type:"array"});
          const ws=wb.Sheets[wb.SheetNames[0]];
          resolve(XLSX.utils.sheet_to_json(ws,{defval:""}));
        }catch(err){reject(err);}
      };
      reader.readAsArrayBuffer(file);
    }
  });
}

function idbOp(mode,key,value){
  return new Promise((res,rej)=>{
    const req=indexedDB.open("NightAudit",1);
    req.onupgradeneeded=e=>e.target.result.createObjectStore("kv");
    req.onsuccess=e=>{
      const db=e.target.result;
      const tx=db.transaction("kv",mode);
      const store=tx.objectStore("kv");
      const r2=mode==="readwrite"?store.put(value,key):store.get(key);
      r2.onsuccess=()=>res(r2.result);
      r2.onerror=()=>rej(r2.error);
    };
    req.onerror=()=>rej(req.error);
  });
}

function mergeRows(existing,incoming){
  const exMap=new Map(existing.map(r=>[r._trxNo,r]));
  const newSet=new Set();
  const merged=incoming.map(r=>{
    if(exMap.has(r._trxNo))return exMap.get(r._trxNo);
    newSet.add(r._trxNo);
    return{...r,_isNew:true};
  });
  const inSet=new Set(incoming.map(r=>r._trxNo));
  existing.forEach(r=>{if(!inSet.has(r._trxNo))merged.push(r);});
  return{merged,newSet};
}

function dedupeKeys(rows){
  const seen=new Map();
  return rows.map(r=>{
    const base=r._trxNo;
    const n=seen.get(base)??0;
    seen.set(base,n+1);
    return n===0?r:{...r,_trxNo:`${base}:dup${n}`};
  });
}

/* ── sameType ─────────────────────────────────────────────────────────────────
   A correction is always posted as the exact opposite amount under the SAME
   payment type — a Visa overcharge gets reversed with another Visa line,
   never Mastercard. Same logic for cash, city ledger, reward, and any other
   charge code: match like-for-like, never across types. This is a hard
   filter below, not a scoring nudge — a same-amount candidate of the wrong
   type is excluded outright, never just scored lower.
─────────────────────────────────────────────────────────────────────────── */
function sameType(a,b){
  if(a._isCard)return b._isCard&&b._cardCode===a._cardCode;
  if(a._isCash)return b._isCash;
  if(a._isCL)return b._isCL;
  if(a._isReward)return b._isReward;
  if(a._isOTA)return b._isOTA;
  if(a._isTax)return b._isTax&&b._code===a._code;
  return !b._isCard&&!b._isCash&&!b._isCL&&!b._isReward&&!b._isOTA&&b._code===a._code;
}

/* ── isSelfCorrection ─────────────────────────────────────────────────────────
   Whether a linked correction should be excluded from the ORIGINAL agent's
   accuracy count. `link.source` ("direct" vs "flag") only records which UI
   button the auditor used to create the link — it says nothing about who
   actually posted the reversal. Classify by agent identity instead: it's a
   self-correction iff the reversal row was posted by the same agent as the
   original row. Falls back to the old source-based rule when the reversal
   row can't be found in this night's rows, or neither row carries usable
   identity (e.g. a manually-entered TRX_NO that doesn't match any row). ── */
function isSelfCorrection(link,origRow,rowsArr){
  if(!link?.reversalTrxNo)return false;
  const revRow=rowsArr.find(r=>r._trxNo===link.reversalTrxNo);
  if(!origRow||!revRow)return link.source==="direct";
  if(origRow._agentId&&revRow._agentId)return origRow._agentId===revRow._agentId;
  if(origRow._userName&&revRow._userName)return origRow._userName===revRow._userName;
  return link.source==="direct";
}

/* ── businessDateGroups ───────────────────────────────────────────────────
   BUSINESS-DATE.md: "Night Audit: key each transaction by its own
   BUSINESS_DATE field... A single catch-up file that spans two business
   dates MUST split into two night records." Full auto-split into two
   independently-reconciled audits is a bigger architectural change than this
   phase's scope (see STATUS-NIGHT-AUDIT-2A) — this instead detects the
   condition so the app can warn honestly instead of silently assuming every
   row in the file belongs to the one manually-entered audit date. Compares
   the RAW field (no reformatting/parsing needed, so this works regardless of
   which of the several date-string shapes Opera exports use). ── */
function businessDateGroups(rows){
  const m=new Map();
  rows.forEach(r=>{
    const v=r.BUSINESS_DATE||r.BUSINESS_FORMAT_DATE||"";
    if(!v)return;
    m.set(v,(m.get(v)||0)+1);
  });
  return Array.from(m,([value,count])=>({value,count})).sort((a,b)=>b.count-a.count);
}

/* ── business-dates.json ──────────────────────────────────────────────────
   BRIEF-NIGHT-AUDIT-2 Phase N1 — the shared unencrypted feed every PMS app
   reads for the current business date (DATA-FLOW.md channel 1: Night Audit
   has no crypto, so this MUST be plain JSON in Records/_shared/, never the
   site-key bridge). Reuses identity.js's idGetSharedDir(root) — same
   Records/_shared/ directory the staff registry already lives in; that
   function is a plain global like everything else in this no-bundler app
   (see identity.js's own file header), so it's safe to call here even
   though identity.js loads after this file — by the time either of these
   functions actually RUNS (a user action, well after every <script> tag has
   executed), every global is already defined. ── */
/* BRIEF-NIGHT-AUDIT-2-FIXES §1 — single-sourced delayed/daysOverdue
   computation (BUSINESS-DATE.md: "delayed = a daily 07:00 deadline, not a
   duration"). `pendingSince` is the Approved timestamp; the first ROLL_DEADLINE
   after it is the expected roll. Still pending before that deadline; each
   ROLL_DEADLINE passed without closing (multi-day) increments daysOverdue. */
function computeBizDateDelay(pendingSince,now){
  now=now||new Date();
  if(!pendingSince)return{status:"pending",daysOverdue:0};
  const[rh,rm]=ROLL_DEADLINE.split(":").map(Number);
  const pend=new Date(pendingSince);
  let deadline=new Date(pend.getFullYear(),pend.getMonth(),pend.getDate(),rh,rm,0,0);
  if(deadline<=pend)deadline.setDate(deadline.getDate()+1);
  if(now<deadline)return{status:"pending",daysOverdue:0};
  let daysOverdue=0;
  while(deadline<=now&&daysOverdue<365){daysOverdue++;deadline.setDate(deadline.getDate()+1);}
  return{status:"delayed",daysOverdue};
}
const BIZDATE_FEED_FILENAME="business-dates.json";
async function readBusinessDatesFeed(root){
  if(!root)return null;
  try{
    const dir=await idGetSharedDir(root);
    const fh=await dir.getFileHandle(BIZDATE_FEED_FILENAME);
    const file=await fh.getFile();
    const envelope=JSON.parse(await file.text());
    return envelope.payload||null;
  }catch{return null;} /* not connected, file doesn't exist yet, or unreadable */
}
async function writeBusinessDatesFeed(root,payload){
  const dir=await idGetSharedDir(root);
  const envelope={schemaVersion:1,module:"_shared.business-dates",generatedAt:new Date().toISOString(),payload};
  const fh=await dir.getFileHandle(BIZDATE_FEED_FILENAME,{create:true});
  const w=await fh.createWritable();
  await w.write(JSON.stringify(envelope,null,2));
  await w.close();
}

function scoreCandidates(flaggedRow,candidateRows){
  return candidateRows
    .filter(c=>sameType(flaggedRow,c))
    /* Cash is special: only the SAME cashier can correct their own cash entry —
       it has to balance against THEIR physical drop, not a colleague's. Hard
       requirement for cash, not a bonus like it is for everything else. */
    .filter(c=>!flaggedRow._isCash||c._agentId===flaggedRow._agentId)
    .map(c=>{
      let score=0;
      const fc=flaggedRow._credit,fd=flaggedRow._debit;
      if(fc!==0&&Math.abs(c._credit+fc)<0.02)score+=6;
      if(fd!==0&&Math.abs(c._debit+fd)<0.02)score+=6;
      if(c._room&&c._room===flaggedRow._room)score+=3;
      if(c._agentId===flaggedRow._agentId)score+=2;
      const refStr=String(c._ref||"").toLowerCase();
      const rcpt=String(flaggedRow._receipt||"").toLowerCase();
      if(rcpt&&rcpt.length>1&&refStr.includes(rcpt))score+=3;
      return{row:c,score};
    }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,5);
}