/* ── App Component ── */
/* (state, effects, computed values, actions, App shell, ReactDOM.render) */

/* BRIEF-POLISH-1.md #3 (Khalid, 2026-07-08: "the app was dark uninvited — OS
   prefers-color-scheme leaked as the default"). Never auto-adopts the OS
   theme — default is always "light" until a person makes an explicit choice.
   This device-level value is what pre-identify screens (IdentityGate) show;
   once identified, the theme-sync effect below switches to the identified
   person's OWN registry preference (identity.updateTheme), same pattern
   app.js already uses for `language`/updateLanguage. */
function loadDeviceTheme(){
  try{
    const saved=localStorage.getItem(THEME_KEY);
    return(saved==="dark"||saved==="light")?saved:"light";
  }catch{return "light";}
}
function saveDeviceTheme(value){
  try{localStorage.setItem(THEME_KEY,value);}catch{}
}

function App(){
  const lang=useLang();
  const dir=lang==="ar"?"rtl":"ltr";
  const [view,setView]=useState("upload");
  const [rows,setRows]=useState([]);
  const [date,setDate]=useState(today());
  const [checks,setChecks]=useState({});
  const [cashPhys,setCashPhys]=useState({});
  /* BRIEF-NIGHT-AUDIT-2-FIXES §2 — "no cash-drop slip recorded" exception,
     per cashier: {[agentId]:{reason,byId,byName,at}}. A sanctioned exception
     (required reason, logged) satisfies the cash gate in place of a matching
     count — kept distinct from cashPhys (a matching count) and auditorNote
     (the freeform variance note), both of which stay as-is. */
  const [cashExceptions,setCashExceptions]=useState({});
  const [mach,setMach]=useState(initMach);
  const [machCnt,setMachCnt]=useState(initMach);
  const [auditStatus,setAuditStatus]=useState("Draft");
  const [auditorName,setAuditorName]=useState("");
  const [auditorId,setAuditorId]=useState("");
  const [submittedAt,setSubmittedAt]=useState(null);
  const [nightMgrName,setNightMgrName]=useState("");
  const [nightMgrId,setNightMgrId]=useState("");
  const [approvedAt,setApprovedAt]=useState(null);
  const [showSignOffModal,setShowSignOffModal]=useState(false);
  const [showChangePin,setShowChangePin]=useState(false);
  const [auditorNote,setAuditorNote]=useState("");
  const [nightMgrNote,setNightMgrNote]=useState("");
  const [openFlagsAck,setOpenFlagsAck]=useState([]);
  const [history,setHistory]=useState([]);
  const [dirHandle,setDirHandle]=useState(null);
  const [folderName,setFolderName]=useState(()=>localStorage.getItem(FNAME_KEY)||null);
  const [syncSt,setSyncSt]=useState("idle");
  const [lastSync,setLastSync]=useState(null);
  const [toast,setToast]=useState(null);
  const [resumeData,setResumeData]=useState(null);
  const [jFilter,setJFilter]=useState("all");
  const [ploPickFor,setPloPickFor]=useState(null);
  const [corrPickFor,setCorrPickFor]=useState(null);
  const [newTrxNos,setNewTrxNos]=useState(new Set());
  const [corrLinks,setCorrLinks]=useState({});
  const [focusedTrxNo,setFocusedTrxNo]=useState(null);
  const [expandedFlag,setExpandedFlag]=useState(null);
  const [reportType,setReportType]=useState("summary");
  const [showApproveModal,setShowApproveModal]=useState(false);
  const [pendingApproveAck,setPendingApproveAck]=useState([]);
  /* ── BRIEF-NIGHT-AUDIT-2 Phase N1 — guided "Submit the audit" flow ──
     Step 4 (Production KPI confirmed) and step 6 (close/commit — change
     business date). Steps 1-3 and 5 reuse existing state above (rows,
     checks, the disc/balanced computed values, auditorNote, auditStatus). */
  const [productionConfirmedAt,setProductionConfirmedAt]=useState(null);
  const [productionConfirmedById,setProductionConfirmedById]=useState(null);
  const [productionConfirmedByName,setProductionConfirmedByName]=useState("");
  const [showCloseModal,setShowCloseModal]=useState(false);
  const [newBusinessDate,setNewBusinessDate]=useState(null);
  const [closedAt,setClosedAt]=useState(null);
  const [closedById,setClosedById]=useState(null);
  const [closedByName,setClosedByName]=useState("");
  const [multiDateNotice,setMultiDateNotice]=useState(null);
  const [navCollapsed,setNavCollapsed]=useState(()=>{
    try{const v=localStorage.getItem(SIDEBAR_KEY);return v==null?true:v==="1";}catch{return true;}
  });
  const [theme,setTheme]=useState(loadDeviceTheme);
  const [showHelp,setShowHelp]=useState(()=>{
    try{return localStorage.getItem(HELP_KEY)==="1";}catch{return false;}
  });

  /* PIN identity (BRIEF-IDENTITY.md) — attribution layer, not a second lock;
     this app has no vault. dirHandle (this app's own Records/Night Audit/
     connection, below) is reused for the durable activity-log file; the
     shared staff registry uses its OWN separate PMS-root connection inside
     the hook (see identity.js's file header for why). */
  const identity=useIdentity({appId:"nightAudit",dirHandle,hostStaff:[]});
  const visibleTabIds=useMemo(()=>naVisibleTabs(identity.currentEntry,identity.registry?.appPermissions?.nightAudit),
    [identity.currentEntry,identity.registry]);

  const fileRef=useRef();
  const resyncRef=useRef();
  const reportRef=useRef();
  const syncTimer=useRef();
  const stateRef=useRef({});
  const jRowsRef=useRef([]);
  const checksRef=useRef({});
  const focusRef=useRef(null);
  const rowRefsMap=useRef({});   /* keyed by _trxNo → <tr> DOM element; owned here so the keyboard handler can scroll without waiting for a React render */

  /* focusRef is kept in sync directly in moveFocus() below (synchronous),
     so we don't need a useEffect round-trip for the arrow-key hot path.
     Other callers of setFocusedTrxNo (Tab, Escape, re-sync) still use the
     effect below so focusRef stays correct after those too. */
  useEffect(()=>{focusRef.current=focusedTrxNo;},[focusedTrxNo]);
  useEffect(()=>{checksRef.current=checks;},[checks]);

  /* Apply + persist UI theme. data-theme on <html> lets theme-dark.css re-skin
     the whole app (including modals/toasts) via token overrides. */
  useEffect(()=>{
    document.documentElement.setAttribute("data-theme",theme);
    saveDeviceTheme(theme);
  },[theme]);
  /* LANGUAGE.md rule 4: per-user preference lives on the registry entry
     (identity.currentEntry.language); apply it the moment identify resolves
     an entry, on every device. Pre-identify screens (IdentityGate) simply
     follow whatever setLang() last persisted to this device (na_lang). */
  useEffect(()=>{
    const entryLang=identity.currentEntry?.language;
    if(entryLang==="en"||entryLang==="ar")setLang(entryLang);
  },[identity.currentEntry]);
  useEffect(()=>{document.documentElement.setAttribute("lang",lang);},[lang]);
  /* Toggle updates this device's language immediately AND, once identified,
     persists the choice back to the shared registry so it follows the
     person to any other PC/app. */
  function toggleLanguage(){
    const next=lang==="ar"?"en":"ar";
    setLang(next);
    if(identity.currentEntry)identity.updateLanguage(identity.currentEntry.staffId,next);
  }
  /* BRIEF-POLISH-1.md #3 — same per-user-preference pattern as language just
     above: once identified, the person's OWN registry theme wins (default
     "light" — never the OS). */
  useEffect(()=>{
    const entryTheme=identity.currentEntry?.theme;
    if(entryTheme==="light"||entryTheme==="dark")setTheme(entryTheme);
  },[identity.currentEntry]);
  function toggleTheme(){
    const next=theme==="dark"?"light":"dark";
    setTheme(next);
    if(identity.currentEntry)identity.updateTheme(identity.currentEntry.staffId,next);
  }
  /* BRIEF-POLISH-1.md #1 — home button + Alt+Home, origin-absolute so it
     works from any folder depth on the served origin (file:// is unsupported
     anyway — the button is hidden there, see IS_FILE_PROTOCOL in identity.js). */
  const goHome=useCallback(()=>{window.location.href="../";},[]);
  useEffect(()=>{
    function onKey(e){if(e.altKey&&e.key==="Home"){e.preventDefault();goHome();}}
    window.addEventListener("keydown",onKey);
    return()=>window.removeEventListener("keydown",onKey);
  },[goHome]);
  /* Remember the sidebar collapsed/expanded choice across reloads. */
  useEffect(()=>{try{localStorage.setItem(SIDEBAR_KEY,navCollapsed?"1":"0");}catch{}},[navCollapsed]);

  /* Snap the active tab back into the visible set whenever role/permissions
     make the current one disappear (e.g. a fresh viewer landing on the
     default "upload" tab, or a role change while a hidden tab was open). */
  useEffect(()=>{
    if(!identity.currentStaffId)return;
    if(!visibleTabIds.has(view)){
      const first=VIEWS.find(v=>visibleTabIds.has(v.id));
      if(first)setView(first.id);
    }
  },[identity.currentStaffId,visibleTabIds]);

  useEffect(()=>{
    stateRef.current={date,rows,checks,cashPhys,cashExceptions,mach,machCnt,auditStatus,
      auditorName,auditorId,submittedAt,nightMgrName,nightMgrId,approvedAt,auditorNote,nightMgrNote,openFlagsAck,corrLinks,
      productionConfirmedAt,productionConfirmedById,productionConfirmedByName,
      newBusinessDate,closedAt,closedById,closedByName};
  });

  /* ── Computed values MUST be declared before useEffects that use them ── */
  const cardRows=useMemo(()=>rows.filter(r=>r._isCard),[rows]);
  const cashRows=useMemo(()=>rows.filter(r=>r._isCash),[rows]);
  const payRows=useMemo(()=>rows.filter(r=>r._isCard||r._isCash||r._isCL||r._isReward||r._isOTA),[rows]);
  const chargeRows=useMemo(()=>rows.filter(r=>!r._isCard&&!r._isCash&&!r._isCL&&!r._isReward&&!r._isOTA),[rows]);

  /* ── taxLinks: pairs each tax/fee row to its parent charge ─────────────────
     Opera groups a charge and its tax lines under the same ROOM + BUSINESS_TIME
     key. Verified by running this logic against all 30 real nights in the
     Sept-2025 export, one night at a time (as the app actually processes them):
     606 tax rows total, 543 paired (89.6%). The other 63 are intentionally left
     UNLINKED rather than guessed at — 54 because the row has no ROOM (e.g. some
     "VAT 15% - Room"/"Municipality Fee" lines genuinely come through blank), and
     9 because more than one charge shared the same ROOM+TIME and we'd rather
     show the tax line standalone than risk attaching it to the wrong charge.
     byCharge[chargeTrxNo] is an ARRAY so a charge with multiple tax lines (e.g.
     VAT 15% + Municipality Fee 5%, confirmed on 110 real charges this month) is
     handled correctly — the old byCharge-overwrite approach used a plain overwrite and lost all but the
     last one. byTax[taxTrxNo] → parent charge's trxNo, used by journal-view
     to skip rendering a tax row as standalone when its parent is visible. ── */
  const taxLinks=useMemo(()=>{
    const byCharge={},byTax={};
    const groups={};
    rows.forEach(r=>{
      if(!r._room||!r._time)return;
      const k=r._room+"|"+r._time;
      if(!groups[k])groups[k]={charges:[],taxes:[]};
      if(r._isTax)groups[k].taxes.push(r);
      else if(!r._isCard&&!r._isCash&&!r._isCL&&!r._isReward&&!r._isOTA)groups[k].charges.push(r);
    });
    Object.values(groups).forEach(({charges,taxes})=>{
      /* Only pair when there is exactly one charge in the group — if there are
         multiple charges at the same room/time (rare edge case) we skip rather
         than risk linking a tax line to the wrong charge. */
      if(charges.length!==1||!taxes.length)return;
      const charge=charges[0];
      byCharge[charge._trxNo]=taxes;
      taxes.forEach(t=>{byTax[t._trxNo]=charge._trxNo;});
    });
    return{byCharge,byTax};
  },[rows]);

  const allCorrCount=useMemo(()=>rows.filter(r=>r._isCorr).length,[rows]);
  const checkedCnt=useMemo(()=>Object.values(checks).filter(c=>c.state==="checked").length,[checks]);
  const flaggedCnt=useMemo(()=>Object.values(checks).filter(c=>c.state==="flagged").length,[checks]);
  /* BRIEF-NIGHT-AUDIT-2 Phase N2 — net, not gross: cash now includes 9235
     (Refund Payment, a debit) alongside 9000, so a gross-credit-only sum
     would overstate the drop once a refund is posted. cashByAgent below
     already computed net (cred-deb) per agent; this headline figure now
     matches that. */
  const totalCash=useMemo(()=>cashRows.reduce((s,r)=>s+r._credit-r._debit,0),[cashRows]);

  const operaTot=useMemo(()=>{
    const t={};CARDS.forEach(c=>{t[c.code]=0;});
    cardRows.forEach(r=>{if(r._code in t)t[r._code]+=r._credit;});
    return t;
  },[cardRows]);

  const operaCounts=useMemo(()=>{
    const t={};CARDS.forEach(c=>{t[c.code]=0;});
    cardRows.forEach(r=>{if(r._code in t)t[r._code]++;});
    return t;
  },[cardRows]);

  const cashByAgent=useMemo(()=>{
    const m={};
    cashRows.forEach(r=>{
      if(!m[r._agentId])m[r._agentId]={id:r._agentId,name:r._agent,deb:0,cred:0,corr:0,cnt:0};
      m[r._agentId].deb+=r._debit;m[r._agentId].cred+=r._credit;m[r._agentId].cnt++;
      if(r._isCorr)m[r._agentId].corr++;
    });
    return Object.values(m);
  },[cashRows]);

  const ploList=useMemo(()=>cardRows.filter(r=>checks[r._trxNo]?.plo).map(r=>({
    trxNo:r._trxNo,cardCode:r._code,amount:r._credit,
    ploType:checks[r._trxNo]?.ploType||"Other",
    room:r._room,guest:r._guest,receipt:r._receipt,date:r._date
  })),[cardRows,checks]);

  const ploSums=useMemo(()=>{
    const t={};CARDS.forEach(c=>{t[c.code]=0;});
    ploList.forEach(e=>{if(e.cardCode in t)t[e.cardCode]+=e.amount;});
    return t;
  },[ploList]);

  const ploCounts=useMemo(()=>{
    const t={};CARDS.forEach(c=>{t[c.code]=0;});
    ploList.forEach(e=>{if(e.cardCode in t)t[e.cardCode]++;});
    return t;
  },[ploList]);

  const machSums=useMemo(()=>{
    const t={};CARDS.forEach(c=>{t[c.code]=0;});
    MACHINES.forEach(mac=>CARDS.forEach(c=>{t[c.code]+=toNum(mach[mac]?.[c.code]);}));
    return t;
  },[mach]);

  /* Each terminal's Z-report gives a transaction count alongside its amount —
     tracked the same way as machSums so a count mismatch (two transactions
     cancelling out, looking "balanced" by amount alone) still gets caught. */
  const machCounts=useMemo(()=>{
    const t={};CARDS.forEach(c=>{t[c.code]=0;});
    MACHINES.forEach(mac=>CARDS.forEach(c=>{t[c.code]+=toNum(machCnt[mac]?.[c.code]);}));
    return t;
  },[machCnt]);

  const disc=useMemo(()=>{
    const d={};CARDS.forEach(c=>{d[c.code]=operaTot[c.code]-machSums[c.code]-ploSums[c.code];});
    return d;
  },[operaTot,machSums,ploSums]);

  const countDisc=useMemo(()=>{
    const d={};CARDS.forEach(c=>{d[c.code]=operaCounts[c.code]-machCounts[c.code]-ploCounts[c.code];});
    return d;
  },[operaCounts,machCounts,ploCounts]);

  const totalDisc=useMemo(()=>Object.values(disc).reduce((s,v)=>s+v,0),[disc]);
  const balanced=Math.abs(totalDisc)<0.01;
  const totalCountDisc=useMemo(()=>Object.values(countDisc).reduce((s,v)=>s+v,0),[countDisc]);
  const countsBalanced=totalCountDisc===0;

  /* ── BRIEF-NIGHT-AUDIT-2 Phase N2 — non-card settlements ──────────────────
     City Ledger/ALL Reward/Expedia settle the same night but have no
     terminal/PLO second source to check against — "listed for a complete
     total," not gated on a variance (unlike the card table above). Summed by
     raw _code, same pattern as operaTot/ploSums for CARDS. */
  const nonCardRows=useMemo(()=>rows.filter(r=>r._isCL||r._isReward||r._isOTA),[rows]);
  const nonCardSums=useMemo(()=>{
    const t={};SETTLEMENTS.forEach(s=>{t[s.code]=0;});
    nonCardRows.forEach(r=>{if(r._code in t)t[r._code]+=r._credit-r._debit;});
    return t;
  },[nonCardRows]);
  const nonCardCounts=useMemo(()=>{
    const t={};SETTLEMENTS.forEach(s=>{t[s.code]=0;});
    nonCardRows.forEach(r=>{if(r._code in t)t[r._code]++;});
    return t;
  },[nonCardRows]);

  /* "Total settled (all payment types)" — the reconciled 7-Jul workbook's
     Summary-tab headline (215,535.74 / 92 txns): every card + cash + non-card
     settlement row, net of any debit (e.g. a 9235 refund). payRows already
     covers exactly this set (cards, cash incl. CASH_CODES, CL, reward, OTA). */
  const totalSettled=useMemo(()=>payRows.reduce((s,r)=>s+r._credit-r._debit,0),[payRows]);
  const totalSettledCount=payRows.length;

  /* ── Cash per cashier reconciled? ───────────────────────────────────────
     BUSINESS-DATE.md/BRIEF-NIGHT-AUDIT-2 Phase N2 fold cash into "payments
     reconciled" (step 3) alongside the card/terminal/PLO check — there's no
     second source for cash, so "reconciled" means every cashier who posted a
     cash-code row this night has a physical count within CASH_TOLERANCE.
     Vacuously true when nobody posted cash rows tonight. */
  const cashCountedOf=useMemo(()=>cashByAgent.filter(a=>cashPhys[a.id]!=null&&cashPhys[a.id]!=="").length,[cashByAgent,cashPhys]);
  /* BRIEF-NIGHT-AUDIT-2-FIXES §2 — a cashier with a sanctioned "no cash-drop
     slip" exception (required reason, logged) satisfies the gate in place of
     a matching count; still gates normally when no exception is set. */
  const cashBalanced=useMemo(()=>cashByAgent.every(a=>{
    if(cashExceptions[a.id]?.reason)return true;
    const ph=cashPhys[a.id];
    if(ph==null||ph==="")return false;
    return Math.abs(toNum(ph)-(a.cred-a.deb))<=CASH_TOLERANCE;
  }),[cashByAgent,cashPhys,cashExceptions]);

  const jRows=useMemo(()=>{
    let base=rows;
    if(jFilter==="unchecked")base=base.filter(r=>checks[r._trxNo]?.state!=="checked");
    if(jFilter==="corrections")base=base.filter(r=>r._isCorr);
    if(jFilter==="cash")base=cashRows;
    if(jFilter==="cards")base=cardRows;
    if(jFilter==="payments")base=payRows;
    if(jFilter==="charges")base=chargeRows;
    if(jFilter==="plo")base=cardRows.filter(r=>checks[r._trxNo]?.plo);
    if(jFilter==="new")base=base.filter(r=>newTrxNos.has(r._trxNo));
    if(jFilter==="flagged")base=base.filter(r=>checks[r._trxNo]?.state==="flagged");
    return base;
  },[rows,jFilter,checks,cashRows,cardRows,payRows,chargeRows,newTrxNos]);

  /* ── navRows ─────────────────────────────────────────────────────────────
     The keyboard-nav list must mirror what journal-view.js actually renders:
     a tax/fee row whose parent charge is ALSO visible in the same cashier
     group renders as a compact sub-row with no <tr> ref registered in
     rowRefsMap (see journal-view.js's groupTrxSet skip). If jRowsRef still
     included that row, ArrowDown would land on it, moveFocus() would find no
     DOM ref, and the highlight/scroll would silently do nothing — the user
     had to press Down again. cashierGroups/rendering stay on the UNfiltered
     jRows below; only the nav list is filtered. */
  const navRows=useMemo(()=>{
    const byTrx={};
    jRows.forEach(r=>{byTrx[r._trxNo]=r;});
    return jRows.filter(r=>{
      const parentTrxNo=taxLinks.byTax[r._trxNo];
      if(!parentTrxNo)return true;
      const parent=byTrx[parentTrxNo];
      return !(parent&&parent._agentId===r._agentId);
    });
  },[jRows,taxLinks]);

  /* trxNo → index in navRows, rebuilt alongside it so the keydown hot path
     (arrow-key repeat, up to 30-50/sec) does a map lookup instead of an
     O(n) findIndex on every press. */
  const navIndex=useMemo(()=>{
    const idx={};
    navRows.forEach((r,i)=>{idx[r._trxNo]=i;});
    return idx;
  },[navRows]);
  const navIndexRef=useRef({});
  useEffect(()=>{navIndexRef.current=navIndex;},[navIndex]);

  useEffect(()=>{jRowsRef.current=navRows;},[navRows]);

  const cashierProgress=useMemo(()=>{
    const prog={};
    rows.forEach(r=>{
      if(!prog[r._agentId])prog[r._agentId]={checked:0,flagged:0,total:0};
      prog[r._agentId].total++;
      const s=checks[r._trxNo]?.state;
      if(s==="checked")prog[r._agentId].checked++;
      if(s==="flagged")prog[r._agentId].flagged++;
    });
    return prog;
  },[rows,checks]);

  const cashierGroups=useMemo(()=>{
    const byId={};
    jRows.forEach(r=>{
      if(!byId[r._agentId])byId[r._agentId]={id:r._agentId,name:r._agent,rows:[]};
      byId[r._agentId].rows.push(r);
    });
    return Object.values(byId).sort((a,b)=>Number(a.id)-Number(b.id));
  },[jRows]);

  const unresolvedFlags=useMemo(()=>
    rows.filter(r=>checks[r._trxNo]?.state==="flagged"&&!corrLinks[r._trxNo]?.reversalTrxNo),
  [rows,checks,corrLinks]);

  /* ── BRIEF-NIGHT-AUDIT-2 Phase N1/N2 — guided "Submit the audit" steps ──
     Steps 1-4 gate step 5 (Submit for Review → night-manager approval);
     step 6 (close) is its own separate, later action once Approved. Step 3
     ("payments reconciled") now covers the full terminal/PLO/cash model
     (Phase N2): card totals balanced by both amount and count, AND every
     cashier who posted a cash-code row this night counted within tolerance.
     A written variance note stays the acknowledgement path when either isn't
     clean — same mechanism Phase N1 built, now gating a fuller check. */
  const submitSteps=useMemo(()=>{
    const journalLoaded=rows.length>0;
    const reviewedCount=rows.filter(r=>checks[r._trxNo]?.state).length;
    const accuracyReviewed=journalLoaded&&reviewedCount>=rows.length;
    const paymentsReconciled=(balanced&&countsBalanced&&cashBalanced)||auditorNote.trim().length>0;
    const productionConfirmed=!!productionConfirmedAt;
    return{journalLoaded,reviewedCount,accuracyReviewed,paymentsReconciled,productionConfirmed,
      allDone:journalLoaded&&accuracyReviewed&&paymentsReconciled&&productionConfirmed};
  },[rows,checks,balanced,countsBalanced,cashBalanced,auditorNote,productionConfirmedAt]);

  /* BRIEF-NIGHT-AUDIT-2-FIXES §1 — a submitted-draft (Approved, not yet
     Closed) becomes "delayed" past today's ROLL_DEADLINE with no roll, with a
     daysOverdue count (computeBizDateDelay, helpers.js) — single-sourced,
     same computation feeds both this local chip and the shared feed below.
     bizTick forces a re-render every 15 min so the label keeps advancing
     purely from wall-clock time while the app is left open (Date.now() alone
     isn't reactive). */
  const [bizTick,setBizTick]=useState(0);
  useEffect(()=>{
    if(auditStatus!=="Approved"||!approvedAt)return;
    const id=setInterval(()=>setBizTick(x=>x+1),15*60*1000);
    return()=>clearInterval(id);
  },[auditStatus,approvedAt]);
  const bizDelayInfo=(auditStatus==="Approved"&&approvedAt)?computeBizDateDelay(approvedAt):{status:"pending",daysOverdue:0};

  /* Missed-run gap detection (BUSINESS-DATE.md): calendar-day gaps between
     consecutive CLOSED audits in this app's own history — "records for the
     6th and 8th but none for the 7th". Computed from local history (not a
     round-trip through the shared feed) so it works even when the shared PMS
     folder isn't connected. addDaysISO is production-view.js's UTC-safe
     helper — a plain global like everything in this no-bundler app, already
     loaded (script order in index.html) by the time this ever runs. */
  const closedDateGaps=useMemo(()=>{
    const closedDates=history.filter(h=>h.status==="Closed"&&h.date).map(h=>h.date).sort();
    if(closedDates.length<2)return[];
    const gaps=[];
    for(let i=0;i<closedDates.length-1;i++){
      let cursor=addDaysISO(closedDates[i],1);
      let guard=0;
      while(cursor<closedDates[i+1]&&guard<60){
        gaps.push(cursor);
        cursor=addDaysISO(cursor,1);
        guard++;
      }
    }
    return gaps;
  },[history]);

  const syncLabel=!dirHandle&&!folderName?rows.length?t("app.draftAutoSaved"):t("app.noFileLoaded")
    :!dirHandle?t("app.reconnectTo",folderName)
    :syncSt==="saving"?t("app.syncing")
    :syncSt==="error"?t("app.syncFailed")
    :lastSync?t("app.synced",lastSync.toLocaleTimeString()):t("app.folderConnected");
  const dotClass=!dirHandle?"dot-idle":syncSt==="saving"?"dot-saving":syncSt==="error"?"dot-err":"dot-ok";

  /* BRIEF-POLISH-1.md #2 — the compact footer's chip name/role + connection
     dot, computed once here instead of inline in the JSX below. */
  const identifiedName=identity.isUnattributed?t("identity.unattributedName"):(identity.currentEntry?.displayName||"—");
  const sidebarRoleLabel=identity.isUnattributed?undefined
    :identity.currentEntry?.isTopAdmin?t("identity.topAdminBadge")
    :identity.currentEntry?.roles?.[NA_APP_ID]==="night-manager"?t("identity.roleNightManager")
    :identity.currentEntry?.roles?.[NA_APP_ID]==="auditor"?t("identity.roleAuditor")
    :t("identity.viewer");
  /* Business-date chip (BUSINESS-DATE.md: "displayed on ALL six apps... Night
     Audit is the sole source"). Shows THIS loaded audit's own date + status —
     the honest, directly-visible-state reading; the shared feed (written on
     approve/close, above) is what OTHER apps read for the same information. */
  const bizChipClass=!rows.length?"":auditStatus==="Closed"?"bgreen"
    :auditStatus==="Approved"?(bizDelayInfo.status==="delayed"?"bred":"bblue")
    :auditStatus==="Submitted for Review"?"bamber":"bgray";
  const bizChipLabel=!rows.length?""
    :auditStatus==="Approved"?`${t("status.approved")} · ${bizDelayInfo.status==="delayed"?t("common.delayedDays",bizDelayInfo.daysOverdue,pluralSuffix(bizDelayInfo.daysOverdue)):t("common.pending")}`
    :statusLabel(auditStatus);

  const footerConnection=IS_FILE_PROTOCOL
    ?{tone:"error",label:t("identity.filesProtocolMsg")}
    :!HAS_FS
      ?{tone:"neutral",label:t("app.chromeEdgeOnly")}
      :{
          tone:!dirHandle?"neutral":syncSt==="saving"?"saving":syncSt==="error"?"error":"good",
          label:syncLabel,
          onClick:!dirHandle?connectFolder:undefined
        };


  /* ── UseEffects ── */
  useEffect(()=>{
    try{
      const raw=localStorage.getItem(DRAFT_KEY);
      if(raw){const d=JSON.parse(raw);if(d.rows?.length>0)setResumeData(d);}
    }catch{}
    try{const raw=localStorage.getItem(HIST_KEY);if(raw)setHistory(JSON.parse(raw));}catch{}
    if(HAS_FS){
      idbOp("readonly","folder").then(async h=>{
        if(!h)return;
        const perm=await h.queryPermission({mode:"readwrite"});
        if(perm==="granted"){setDirHandle(h);setFolderName(h.name);loadHistFromFolder(h);}
      }).catch(()=>{if(folderName)notify(t("toast.couldNotRestoreFolder"),"err");});
    }
  },[]);

  useEffect(()=>{
    if(!rows.length)return;
    const payload={date,rows,checks,cashPhys,cashExceptions,mach,machCnt,auditStatus,auditorName,auditorId,submittedAt,
      nightMgrName,nightMgrId,approvedAt,auditorNote,nightMgrNote,openFlagsAck,corrLinks,savedAt:Date.now(),
      productionConfirmedAt,productionConfirmedById,productionConfirmedByName,
      newBusinessDate,closedAt,closedById,closedByName};
    try{localStorage.setItem(DRAFT_KEY,JSON.stringify(payload));}catch{notify(t("toast.draftAutosaveFailed"),"err");}
  },[rows,checks,cashPhys,cashExceptions,mach,machCnt,date,auditStatus,auditorName,auditorId,submittedAt,nightMgrName,nightMgrId,approvedAt,auditorNote,nightMgrNote,openFlagsAck,corrLinks,
    productionConfirmedAt,productionConfirmedById,productionConfirmedByName,newBusinessDate,closedAt,closedById,closedByName]);

  useEffect(()=>{
    if(!dirHandle||!rows.length)return;
    if(syncTimer.current)clearInterval(syncTimer.current);
    syncTimer.current=setInterval(()=>syncToFolder(dirHandle),5*60*1000);
    return()=>clearInterval(syncTimer.current);
  },[dirHandle,rows,checks,cashPhys,cashExceptions,mach,machCnt]);

  /* ── moveFocus ───────────────────────────────────────────────────────────────
     Handles ↑/↓ arrow key navigation without triggering a full React re-render
     on every keypress.

     The problem: setFocusedTrxNo() → App re-render → JournalView rebuilds all
     148+ rows + sticky-layout recalculation. At key-repeat speed (30–50/sec)
     this freezes the UI completely.

     The fix: split the work into two tiers:
       1. IMMEDIATE (synchronous): update focusRef, scroll the row into view, and
          toggle the row-focused DOM class directly. Zero React involvement. This
          runs in microseconds and keeps up with any key-repeat rate.
       2. DEFERRED (React): wrap setFocusedTrxNo in React.startTransition so React
          knows this is a low-priority visual update. React 18's Concurrent Mode
          will: (a) yield to the browser between renders so input stays responsive,
          and (b) abort stale in-progress renders if another key fires before the
          previous render finishes — so the final render is always the latest row,
          not every intermediate one.

     Net result: scrolling feels instant; the row-focused highlight follows via
     React but never blocks input. ─────────────────────────────────────────── */
  function moveFocus(trxNo){
    /* ① immediate: direct DOM class toggle + scroll */
    const prev=focusRef.current;
    if(prev&&rowRefsMap.current[prev]){
      rowRefsMap.current[prev].classList.remove("row-focused");
    }
    focusRef.current=trxNo;   /* keep ref in sync immediately for next keydown */
    if(trxNo&&rowRefsMap.current[trxNo]){
      const el=rowRefsMap.current[trxNo];
      el.classList.add("row-focused");
      el.scrollIntoView({block:"nearest",behavior:"auto"});
    }
    /* ② deferred: React state update for the rest of the UI (flag panel etc.).
       startTransition marks this as non-urgent so React 18 won't block input. */
    React.startTransition(()=>setFocusedTrxNo(trxNo));
  }

  useEffect(()=>{
    function handleKey(e){
      if(view!=="journal")return;
      const tag=e.target.tagName;
      const isInput=tag==="INPUT"||tag==="TEXTAREA";
      const focused=focusRef.current;
      if(!isInput){
        /* PLO type picker open for the focused row (P key, below) — digits
           pick a type before the global 1-8 filter shortcut gets a turn. */
        if(focused&&ploPickFor===focused){
          const n=parseInt(e.key);
          if(n>=1&&n<=PLO_TYPES.length){e.preventDefault();tagPLO(focused,PLO_TYPES[n-1]);return;}
          if((e.key==="0"||e.key==="Backspace")&&checksRef.current[focused]?.plo){e.preventDefault();tagPLO(focused,null);return;}
          if(e.key==="Escape"){e.preventDefault();setPloPickFor(null);return;}
        }
        /* Correction-candidate list open — either the direct-link picker (L
           key, below) or the flag panel's "suggested matches" (opened by F/N,
           see scoreCandidates in journal-view.js) — digits pick a match by
           its position in that list, same candidates shown on screen. */
        const inFlagCandidates=expandedFlag===focused&&checksRef.current[focused]?.state==="flagged"&&!corrLinks[focused]?.reversalTrxNo;
        if(focused&&(corrPickFor===focused||inFlagCandidates)){
          const n=parseInt(e.key);
          if(n>=1&&n<=9){
            const row=rows.find(x=>x._trxNo===focused);
            const candidates=row?scoreCandidates(row,rows.filter(x=>x._trxNo!==focused)):[];
            if(candidates[n-1]){
              e.preventDefault();
              linkCorrection(focused,candidates[n-1].row._trxNo,corrPickFor===focused?"direct":"flag");
              return;
            }
          }
          if(e.key==="Escape"){
            e.preventDefault();
            if(corrPickFor===focused)setCorrPickFor(null);else setExpandedFlag(null);
            return;
          }
        }
        const n=parseInt(e.key);
        if(n>=1&&n<=8){e.preventDefault();setJFilter(FILTER_IDS[n-1]);return;}
        if(e.key==="9"&&newTrxNos.size>0){e.preventDefault();setJFilter("new");return;}
      }
      if(isInput){
        if(e.key==="Escape"){e.target.blur();setExpandedFlag(null);}
        return;
      }
      const visRows=jRowsRef.current;
      const idx=focused!=null?(navIndexRef.current[focused]??-1):-1;

      if(e.key==="ArrowDown"){e.preventDefault();if(idx<visRows.length-1)moveFocus(visRows[idx+1]._trxNo);return;}
      if(e.key==="ArrowUp"){e.preventDefault();if(idx>0)moveFocus(visRows[idx-1]._trxNo);return;}

      if(e.key==="Tab"&&focused){
        e.preventDefault();
        const start=e.shiftKey?idx-1:idx+1;
        const step=e.shiftKey?-1:1;
        for(let i=start;e.shiftKey?i>=0:i<visRows.length;i+=step){
          if(checksRef.current[visRows[i]._trxNo]?.state!=="checked"){
            moveFocus(visRows[i]._trxNo);break;
          }
        }
        return;
      }

      if(e.key==="Escape"){e.preventDefault();setExpandedFlag(null);setFocusedTrxNo(null);return;}

      if((e.key==="c"||e.key==="C"||e.key===" "||e.key==="Enter")&&focused){
        e.preventDefault();
        const curr=checksRef.current[focused]?.state;
        const next=curr==="checked"?undefined:"checked";
        const taxArr=taxLinks.byCharge[focused];
        const parentTrxNo=taxLinks.byTax[focused];
        setChecks(p=>{
          const n={...p,[focused]:{...p[focused],state:next}};
          if(taxArr?.length)taxArr.forEach(t=>{n[t._trxNo]={...n[t._trxNo],state:next};});
          if(parentTrxNo)n[parentTrxNo]={...n[parentTrxNo],state:next};
          return n;
        });
        if(next==="checked"){
          const ni=visRows.find((r,i)=>i>idx&&checksRef.current[r._trxNo]?.state!=="checked");
          if(ni)setTimeout(()=>moveFocus(ni._trxNo),0);
        }
        return;
      }
      if((e.key==="f"||e.key==="F")&&focused){
        e.preventDefault();
        const taxArr=taxLinks.byCharge[focused];
        const parentTrxNo=taxLinks.byTax[focused];
        setChecks(p=>{
          const n={...p,[focused]:{...p[focused],state:"flagged"}};
          if(taxArr?.length)taxArr.forEach(t=>{n[t._trxNo]={...n[t._trxNo],state:"flagged"};});
          if(parentTrxNo)n[parentTrxNo]={...n[parentTrxNo],state:"flagged"};
          return n;
        });
        setExpandedFlag(focused);
        return;
      }
      if((e.key==="n"||e.key==="N")&&focused){
        e.preventDefault();
        const curr=checksRef.current[focused]?.state;
        if(curr!=="flagged")setChecks(p=>({...p,[focused]:{...p[focused],state:"flagged"}}));
        setExpandedFlag(prev=>prev===focused?null:focused);
        return;
      }
      if((e.key==="p"||e.key==="P")&&focused){
        e.preventDefault();
        const row=rows.find(x=>x._trxNo===focused);
        if(!row||!row._isCard||row._isCorr){notify(t("toast.ploCardOnly"),"err");return;}
        setPloPickFor(prev=>prev===focused?null:focused);
        return;
      }
      if((e.key==="l"||e.key==="L")&&focused){
        e.preventDefault();
        const row=rows.find(x=>x._trxNo===focused);
        const link=corrLinks[focused];
        const state=checksRef.current[focused]?.state;
        const reversalOf=Object.keys(corrLinks).some(orig=>corrLinks[orig]?.reversalTrxNo===focused);
        const canDirectLink=row&&(row._isCard||row._isCorr)&&state!=="flagged"&&!link?.reversalTrxNo&&!reversalOf;
        if(!canDirectLink){notify(t("toast.nothingToLink"),"err");return;}
        setCorrPickFor(prev=>prev===focused?null:focused);
        return;
      }
    }
    window.addEventListener("keydown",handleKey);
    return()=>window.removeEventListener("keydown",handleKey);
  },[view,newTrxNos,taxLinks,ploPickFor,corrPickFor,expandedFlag,rows,corrLinks]);


  /* ── Actions ── */
  function notify(msg,type="ok"){setToast({msg,type});setTimeout(()=>setToast(null),3500);}

  function handleFile(file){
    if(!file)return;
    readRawRows(file).then(raw=>{
      if(!raw.length){notify(t("toast.fileEmpty"),"err");return;}

      /* Filter out 0 credit & 0 debit transactions completely */
      const allEnriched=dedupeKeys(raw.map(enrich));
      const enriched=allEnriched.filter(r=>r._credit!==0||r._debit!==0);
      if(!enriched.length){
        notify(raw.length>0
          ?t("toast.noRecognizableTx"):t("toast.fileEmpty"),"err");
        return;
      }
      setRows(enriched);
      setChecks({});setCashPhys({});setMach(initMach());setMachCnt(initMach());
      setAuditStatus("Draft");setAuditorName("");setAuditorId("");setSubmittedAt(null);
      setNightMgrName("");setNightMgrId("");setApprovedAt(null);setAuditorNote("");setNightMgrNote("");setOpenFlagsAck([]);
      setCorrLinks({});setNewTrxNos(new Set());setFocusedTrxNo(null);
      setProductionConfirmedAt(null);setProductionConfirmedById(null);setProductionConfirmedByName("");
      setNewBusinessDate(null);setClosedAt(null);setClosedById(null);setClosedByName("");
      /* BUSINESS-DATE.md: "a single catch-up file spanning two business dates
         MUST split into two night records" — full auto-split is out of this
         phase's scope (see businessDateGroups' header in helpers.js); detect
         and warn instead of silently assuming every row belongs to the one
         manually-entered audit date. */
      const dateGroups=businessDateGroups(enriched);
      setMultiDateNotice(dateGroups.length>1?dateGroups:null);
      notify(t("toast.loadedTx",enriched.length));
      setView("journal");
      if(dirHandle)setTimeout(()=>syncToFolder(dirHandle),1500);
    }).catch(err=>notify(t("toast.readError",err.message),"err"));
  }

  function handleResync(file){
    if(!file)return;
    readRawRows(file).then(raw=>{
      if(!raw.length){notify(t("toast.resyncFileEmpty"),"err");return;}

      /* Filter out 0 credit & 0 debit transactions from resync */
      const allIncoming=dedupeKeys(raw.map(enrich));
      const incoming=allIncoming.filter(r=>r._credit!==0||r._debit!==0);

      const{merged,newSet}=mergeRows(rows,incoming);
      setRows(merged);setNewTrxNos(newSet);
      if(newSet.size>0){
        if(Object.values(checksRef.current).some(c=>c.state==="flagged")){
          notify(t("toast.newRowsLinking",newSet.size));
        } else {
          notify(t("toast.resyncedNewRows",newSet.size,pluralSuffix(newSet.size)));
        }
        setJFilter("new");
        const firstNew=merged.find(r=>newSet.has(r._trxNo));
        if(firstNew)setTimeout(()=>setFocusedTrxNo(firstNew._trxNo),50);
      }else{notify(t("toast.resyncedNoNew"));}
    }).catch(err=>notify(t("toast.resyncError",err.message),"err"));
  }

  function cycleCheck(trxNo){
    const curr=checks[trxNo]?.state;
    const next=curr==="checked"?undefined:"checked";
    const taxArr=taxLinks.byCharge[trxNo];
    const parentTrxNo=taxLinks.byTax[trxNo];
    setChecks(p=>{
      const n={...p,[trxNo]:{...p[trxNo],state:next}};
      if(taxArr?.length)taxArr.forEach(t=>{n[t._trxNo]={...n[t._trxNo],state:next};});
      if(parentTrxNo)n[parentTrxNo]={...n[parentTrxNo],state:next};
      return n;
    });
    return next;
  }
  function setFlagComment(trxNo,comment){setChecks(p=>({...p,[trxNo]:{...p[trxNo],comment}}));}
  function tagPLO(trxNo,ploType){setChecks(p=>({...p,[trxNo]:{...p[trxNo],plo:!!ploType,ploType:ploType||null}}));setPloPickFor(null);}
  function linkCorrection(origTrxNo,reversalTrxNo,source="flag"){
    const link={reversalTrxNo,source,linkedAt:new Date().toISOString()};
    setCorrLinks(p=>({...p,[origTrxNo]:link}));
    const origRow=rows.find(r=>r._trxNo===origTrxNo);
    notify(isSelfCorrection(link,origRow,rows)?t("toast.linkedSelfCorrected"):t("toast.correctionLinked"));

    const visRows = jRowsRef.current;
    const currIdx = visRows.findIndex(r => r._trxNo === origTrxNo);
    
    let nextFlagged = null;
    if (currIdx >= 0) {
      nextFlagged = visRows.find((r, i) => i > currIdx && checksRef.current[r._trxNo]?.state === "flagged");
    }

    if (nextFlagged) {
      setTimeout(() => {
        moveFocus(nextFlagged._trxNo);
        setExpandedFlag(nextFlagged._trxNo);
      }, 50);
    } else {
      setExpandedFlag(null);
    }
    
    setCorrPickFor(null);
  }
  function checkAllVisible(){
    const u={...checks};
    jRows.forEach(r=>{
      u[r._trxNo]={...u[r._trxNo],state:"checked"};
      const taxArr=taxLinks.byCharge[r._trxNo];
      const parentTrxNo=taxLinks.byTax[r._trxNo];
      if(taxArr?.length)taxArr.forEach(t=>{u[t._trxNo]={...u[t._trxNo],state:"checked"};});
      if(parentTrxNo)u[parentTrxNo]={...u[parentTrxNo],state:"checked"};
    });
    setChecks(u);
  }

  /* Approval */
  function submitForReview(){
    if(!identity.currentEntry){notify(t("toast.identifyFirst"),"err");return;}
    /* BRIEF-NIGHT-AUDIT-2 Phase N1 — "each step gating the next... Submit is
       available only after 1-5": steps 1-4 (journal loaded, accuracy
       reviewed, payments reconciled, production KPI confirmed) must be done
       before this, the auditor's own half of step 5, can fire. */
    const missing=[];
    if(!submitSteps.accuracyReviewed)missing.push(t("reconcile.stepAccuracyReviewed"));
    if(!submitSteps.paymentsReconciled)missing.push(t("reconcile.stepPaymentsReconciled"));
    if(!submitSteps.productionConfirmed)missing.push(t("reconcile.stepProduction"));
    if(missing.length){notify(t("toast.stepsIncomplete",missing.join(" · ")),"err");return;}
    setAuditorId(identity.currentEntry.staffId);setAuditorName(identity.currentEntry.displayName);
    setAuditStatus("Submitted for Review");setSubmittedAt(new Date().toISOString());
    identity.logAction("submit-for-review",date);
    notify(t("toast.submittedForReview"));
  }
  function initiateApprove(){
    const unresolved=unresolvedFlags.filter(r=>!openFlagsAck.includes(r._trxNo));
    if(unresolved.length>0){setPendingApproveAck(unresolved);setShowApproveModal(true);}
    else{setPendingApproveAck([]);setShowSignOffModal(true);}
  }
  /* Night Manager sign-off (BRIEF-IDENTITY §1: re-prompt PIN at signing, like
     a signature) — `entry` comes from SignOffModal's onSuccess, already
     verified as a night-manager/top-admin PIN; nothing left to check here.
     This is BUSINESS-DATE.md's "submitted-draft" state (step 5 of 6) — still
     re-openable/amendable, NOT yet the immutable close (step 6, below). */
  function finalizeApprove(acked,entry){
    const approvedAtIso=new Date().toISOString();
    setAuditStatus("Approved");setApprovedAt(approvedAtIso);
    setNightMgrId(entry.staffId);setNightMgrName(entry.displayName);
    setOpenFlagsAck(prev=>[...new Set([...prev,...acked.map(r=>r._trxNo)])]);
    setShowSignOffModal(false);
    identity.logAction("approve-audit",date,entry.displayName);
    notify(t("toast.auditApproved"));
    /* Fire-and-forget: publish "this business date is now pending close" so
       other apps' chip shows pending/delayed correctly even before step 6.
       Best-effort — a missing shared folder just means other apps stay on
       whatever they last read (or the operational-date fallback). */
    syncBusinessDateFeed({current:date,status:"pending",pendingSince:approvedAtIso});
  }

  /* Production KPI confirmed (step 4) — any identified staff with edit
     rights may confirm (not a PIN "signature" moment like steps 5/6); just
     records who/when, same pattern as the existing note fields. */
  function confirmProduction(){
    if(!identity.currentEntry){notify(t("toast.identifyFirst"),"err");return;}
    setProductionConfirmedAt(new Date().toISOString());
    setProductionConfirmedById(identity.currentEntry.staffId);
    setProductionConfirmedByName(identity.currentEntry.displayName);
    identity.logAction("confirm-production-kpi",date);
    notify(t("toast.productionConfirmed"));
  }

  /* BRIEF-NIGHT-AUDIT-2-FIXES §2 — cash gate exception: "no cash-drop slip
     recorded" for a cashier who can't be matched to a count. Required reason,
     logged (identity activity log), satisfies the cash gate as a sanctioned
     exception distinct from a matching count. */
  function markCashException(agentId,reason){
    if(!identity.currentEntry){notify(t("toast.identifyFirst"),"err");return;}
    const trimmed=reason.trim();
    if(!trimmed){notify(t("toast.cashExceptionReasonRequired"),"err");return;}
    setCashExceptions(prev=>({...prev,[agentId]:{reason:trimmed,byId:identity.currentEntry.staffId,
      byName:identity.currentEntry.displayName,at:new Date().toISOString()}}));
    identity.logAction("cash-no-drop-slip-exception",date,`${agentId}: ${trimmed}`);
    notify(t("toast.cashExceptionSet"));
  }
  function clearCashException(agentId){
    if(!identity.currentEntry){notify(t("toast.identifyFirst"),"err");return;}
    setCashExceptions(prev=>{const{[agentId]:_,...rest}=prev;return rest;});
    identity.logAction("cash-exception-cleared",date,agentId);
  }

  /* ── BRIEF-NIGHT-AUDIT-2 Phase N1 — step 6: close / change business date ──
     BUSINESS-DATE.md: "the commit point... may be done later by whoever is
     on duty when the run actually completes... their own PIN sign-off; a
     separate, later action from the night-shift sign-off." Reuses
     SignOffModal/verifySignOff (same night-manager gate — this app has no
     separate "duty manager" role) with its own onSuccess handler, so a
     DIFFERENT night manager than step 5's can close. */
  async function finalizeClose(entry){
    const closedAtIso=new Date().toISOString();
    const bizDate=newBusinessDate||addDaysISO(date,1);
    /* buildPayload(s) takes an explicit snapshot — stateRef.current would
       still be stale here (its useEffect hasn't run for THIS render's
       setState calls yet), so merge the closing fields onto it by hand. */
    const s={...stateRef.current,auditStatus:"Closed",closedAt:closedAtIso,
      closedById:entry.staffId,closedByName:entry.displayName,newBusinessDate:bizDate};
    if(history.some(h=>h.date===s.date&&h.status==="Closed")){
      notify(t("toast.closedCannotOverwrite",s.date),"err");
      setShowCloseModal(false);
      return;
    }
    setAuditStatus("Closed");setClosedAt(closedAtIso);
    setClosedById(entry.staffId);setClosedByName(entry.displayName);
    setNewBusinessDate(bizDate);
    setShowCloseModal(false);
    identity.logAction("close-audit",date,entry.displayName);

    const payload=buildPayload(s);
    const newHist=[payload,...history.filter(h=>h.date!==s.date)].slice(0,90);
    setHistory(newHist);
    try{localStorage.setItem(HIST_KEY,JSON.stringify(newHist));}catch{}
    if(dirHandle){
      try{
        setSyncSt("saving");
        const fh=await dirHandle.getFileHandle(`audit_${s.date}.json`,{create:true});
        const w=await fh.createWritable();
        await w.write(JSON.stringify(payload,null,2));
        await w.close();
        try{await dirHandle.removeEntry(`audit_draft_${s.date}.json`);}catch{}
        setLastSync(new Date());setSyncSt("saved");
      }catch{setSyncSt("error");notify(t("toast.savedLocallySyncFailed"),"err");}
    }
    notify(t("toast.auditClosed",bizDate));

    await syncBusinessDateFeed({
      current:bizDate,status:"open",pendingSince:null,
      closedEntry:{closedBusinessDate:s.date,newBusinessDate:bizDate,closedAt:closedAtIso,
        closedBy:{staffId:entry.staffId,displayName:entry.displayName}}
    });
  }

  /* ── Shared business-dates feed (BRIEF-NIGHT-AUDIT-2 Phase N1) ──────────
     Records/_shared/business-dates.json — unencrypted (DATA-FLOW.md channel
     1; this app has no crypto). Night Audit is the SOLE writer; every other
     app only displays it. Best-effort: a missing/unconnected shared PMS
     folder degrades to "couldn't publish" rather than blocking the close
     action itself (RECORDS.md's "never silently pretend to save" cuts the
     other way here — the LOCAL audit record must still commit). */
  async function syncBusinessDateFeed({current,status,pendingSince,closedEntry}){
    if(!identity.pmsRoot){
      /* Silent skip is fine for the approve-step's best-effort "pending"
         publish, but a close/commit with nowhere to publish is exactly the
         "never silently pretend to save" case (RECORDS.md) — the auditor
         should know other apps won't see this business date yet. */
      if(closedEntry)notify(t("toast.bizFeedWriteFailed"),"err");
      return;
    }
    /* BRIEF-NIGHT-AUDIT-2-FIXES §1 — single-sourced here: callers pass the
       raw "pending"/"open" intent, this function is the one place that
       upgrades "pending" to "delayed"+daysOverdue (computeBizDateDelay,
       helpers.js) before writing, so every reader (incl. this app's own
       chip, above) sees the same status without re-deriving a threshold. */
    const delay=status==="pending"?computeBizDateDelay(pendingSince):{status,daysOverdue:0};
    try{
      const existing=await readBusinessDatesFeed(identity.pmsRoot)||{closed:[]};
      const next={
        current,status:delay.status,daysOverdue:delay.daysOverdue,pendingSince:pendingSince??null,
        closed:closedEntry?[closedEntry,...(existing.closed||[])].slice(0,90):(existing.closed||[]),
        updatedAt:new Date().toISOString()
      };
      await writeBusinessDatesFeed(identity.pmsRoot,next);
    }catch{
      if(closedEntry)notify(t("toast.bizFeedWriteFailed"),"err");
    }
  }

  /* BRIEF-NIGHT-AUDIT-2-FIXES §1 — republish the feed periodically while a
     draft sits Approved-but-not-closed, so other apps' chips see "delayed"/
     daysOverdue grow purely from wall-clock time (not just at the next local
     action). Best-effort, same as every other syncBusinessDateFeed call. */
  useEffect(()=>{
    if(auditStatus!=="Approved"||!approvedAt||!identity.pmsRoot)return;
    const id=setInterval(()=>{
      syncBusinessDateFeed({current:date,status:"pending",pendingSince:approvedAt});
    },30*60*1000);
    return()=>clearInterval(id);
  },[auditStatus,approvedAt,identity.pmsRoot,date]);

  /* Folder sync */
  async function connectFolder(){
    if(!HAS_FS){notify(t("toast.useEdgeChrome"),"err");return;}
    try{
      const h=await window.showDirectoryPicker({mode:"readwrite"});
      setDirHandle(h);setFolderName(h.name);
      localStorage.setItem(FNAME_KEY,h.name);
      await idbOp("readwrite","folder",h);
      notify(t("toast.connected",h.name));
      await loadHistFromFolder(h);
      if(rows.length)syncToFolder(h);
    }catch(e){
      if(e.name==="AbortError")return;
      if(e.name==="SecurityError"||e.name==="NotAllowedError")
        notify(t("toast.folderBlockedPolicy"),"err");
      else
        notify(t("toast.folderAccessFailedExport"),"err");
    }
  }

  async function syncToFolder(handle){
    if(!handle)return;
    const s=stateRef.current;
    if(!s.rows?.length)return;
    setSyncSt("saving");
    try{
      const payload=buildPayload(s);
      const fh=await handle.getFileHandle(`audit_draft_${s.date}.json`,{create:true});
      const w=await fh.createWritable();
      await w.write(JSON.stringify(payload,null,2));
      await w.close();
      setLastSync(new Date());setSyncSt("saved");
    }catch{setSyncSt("error");notify(t("toast.bgSyncFailed"),"err");}
  }

  async function loadHistFromFolder(handle){
    try{
      const items=[];
      for await(const[name,fh]of handle.entries()){
        if(name.startsWith("audit_")&&name.endsWith(".json")&&!name.includes("draft")){
          try{const f=await fh.getFile();items.push(JSON.parse(await f.text()));}catch{}
        }
      }
      if(items.length){
        const sorted=items.sort((a,b)=>new Date(b.date)-new Date(a.date));
        setHistory(sorted);
        try{localStorage.setItem(HIST_KEY,JSON.stringify(sorted));}catch{}
      }
    }catch{}
  }

  function buildPayload(s){
    const{date:d,rows:r,checks:ch,cashPhys:cp,cashExceptions:cex={},mach:ma,machCnt:mc,auditStatus:as,
      auditorName:an,auditorId:ai,submittedAt:sa,nightMgrName:nm,nightMgrId:ni,approvedAt:aa,
      auditorNote:nt,nightMgrNote:nt2,openFlagsAck:oa,corrLinks:cl,
      productionConfirmedAt:pca,productionConfirmedById:pcid,productionConfirmedByName:pcn,
      newBusinessDate:nbd,closedAt:cat,closedById:cbid,closedByName:cbn}=s;
    const cRows=r.filter(x=>x._isCard),cashR=r.filter(x=>x._isCash);
    const opTot={};CARDS.forEach(c=>{opTot[c.code]=0;});
    cRows.forEach(x=>{if(x._code in opTot)opTot[x._code]+=x._credit;});
    const opCounts={};CARDS.forEach(c=>{opCounts[c.code]=0;});
    cRows.forEach(x=>{if(x._code in opCounts)opCounts[x._code]++;});
    const mSums={};CARDS.forEach(c=>{mSums[c.code]=0;});
    MACHINES.forEach(mac=>CARDS.forEach(c=>{mSums[c.code]+=toNum(ma[mac]?.[c.code]);}));
    const mCounts={};CARDS.forEach(c=>{mCounts[c.code]=0;});
    MACHINES.forEach(mac=>CARDS.forEach(c=>{mCounts[c.code]+=toNum((mc||{})[mac]?.[c.code]);}));
    const pList=cRows.filter(x=>ch[x._trxNo]?.plo).map(x=>({cardCode:x._code,amount:x._credit,ploType:ch[x._trxNo]?.ploType||"Other"}));
    const pSums={};CARDS.forEach(c=>{pSums[c.code]=0;});
    pList.forEach(e=>{if(e.cardCode in pSums)pSums[e.cardCode]+=e.amount;});
    const pCounts={};CARDS.forEach(c=>{pCounts[c.code]=0;});
    pList.forEach(e=>{if(e.cardCode in pCounts)pCounts[e.cardCode]++;});
    const disc2={};CARDS.forEach(c=>{disc2[c.code]=opTot[c.code]-mSums[c.code]-pSums[c.code];});
    const totalD=Object.values(disc2).reduce((s,v)=>s+v,0);
    const countDisc2={};CARDS.forEach(c=>{countDisc2[c.code]=opCounts[c.code]-mCounts[c.code]-pCounts[c.code];});
    const totalCountD=Object.values(countDisc2).reduce((s,v)=>s+v,0);
    const agentMap={};
    cashR.forEach(x=>{
      if(!agentMap[x._agentId])agentMap[x._agentId]={id:x._agentId,name:x._agent,deb:0,cred:0};
      agentMap[x._agentId].deb+=x._debit;agentMap[x._agentId].cred+=x._credit;
    });
    /* BRIEF-NIGHT-AUDIT-2 Phase N2 — non-card settlements (no second source,
       "listed for a complete total") + the grand "total settled" figure, so
       both are part of the finalized record written on close, not just the
       live view. cashReconciled mirrors the live cashBalanced gate above,
       recomputed here since buildPayload works off an explicit snapshot. */
    const ncSums={};SETTLEMENTS.forEach(x=>{ncSums[x.code]=0;});
    const ncCounts={};SETTLEMENTS.forEach(x=>{ncCounts[x.code]=0;});
    r.forEach(x=>{
      if((x._isCL||x._isReward||x._isOTA)&&x._code in ncSums){ncSums[x._code]+=x._credit-x._debit;ncCounts[x._code]++;}
    });
    const allPayRows=r.filter(x=>x._isCard||x._isCash||x._isCL||x._isReward||x._isOTA);
    const totalSettledAmt=allPayRows.reduce((s,x)=>s+x._credit-x._debit,0);
    const cashAgentsList=Object.values(agentMap);
    /* BRIEF-NIGHT-AUDIT-2-FIXES §2 — a sanctioned exception (required reason,
       logged) satisfies reconciliation for that cashier in place of a match. */
    const cashReconciledFlag=cashAgentsList.every(a=>{
      if(cex[a.id]?.reason)return true;
      const ph=cp[a.id];
      if(ph==null||ph==="")return false;
      return Math.abs(toNum(ph)-(a.cred-a.deb))<=CASH_TOLERANCE;
    });
    /* Per-agent transaction count for the whole night — feeds Production KPI
       "volume" (journal-transaction share) and "accuracy" (own-tx denominator)
       in production-view.js. Not used anywhere in this file. */
    const txAgentMap={};
    /* Same, but bucketed by hour-of-day (0-23) — feeds Production KPI's
       hourly coverage model (compare each agent's share of activity in a
       given hour against how many staff were actually on duty that hour,
       via the Attendance shift-feed). BUSINESS_TIME isn't in one consistent
       format across exports (12h AM/PM vs 24h) — parseHourOfDay (helpers.js)
       handles both; a row whose time doesn't parse is simply left out of
       the hourly buckets (it still counts in txAgentMap above). */
    const txAgentHourMap={};
    r.forEach(x=>{
      if(!txAgentMap[x._agentId])txAgentMap[x._agentId]={id:x._agentId,name:x._agent,count:0};
      txAgentMap[x._agentId].count++;
      const hr=parseHourOfDay(x._time);
      if(hr==null)return;
      if(!txAgentHourMap[x._agentId])txAgentHourMap[x._agentId]={};
      txAgentHourMap[x._agentId][hr]=(txAgentHourMap[x._agentId][hr]||0)+1;
    });
    const corrAgentMap={};
    let selfCorrectedCount=0,flagCorrectedCount=0;
    Object.entries(cl||{}).forEach(([origTrxNo,link])=>{
      if(!link?.reversalTrxNo)return;
      const origRow=r.find(x=>x._trxNo===origTrxNo);
      if(isSelfCorrection(link,origRow,r)){selfCorrectedCount++;return;}
      flagCorrectedCount++;
      if(!origRow)return;
      if(!corrAgentMap[origRow._agentId])corrAgentMap[origRow._agentId]={id:origRow._agentId,name:origRow._agent,count:0};
      corrAgentMap[origRow._agentId].count++;
    });
    return{date:d,savedAt:new Date().toISOString(),status:as,
      auditorName:an||"",auditorId:ai||null,auditorNote:nt||"",submittedAt:sa||null,
      nightMgrName:nm||"",nightMgrId:ni||null,nightMgrNote:nt2||"",approvedAt:aa||null,
      productionConfirmedAt:pca||null,productionConfirmedById:pcid||null,productionConfirmedByName:pcn||"",
      newBusinessDate:nbd||null,closedAt:cat||null,closedById:cbid||null,closedByName:cbn||"",
      openFlagsAck:oa||[],txCount:r.length,corrCount:r.filter(x=>x._isCorr).length,
      selfCorrectedCount,flagCorrectedCount,corrByAgent:Object.values(corrAgentMap),
      txByAgent:Object.values(txAgentMap),txByAgentHour:txAgentHourMap,
      flaggedCount:Object.values(ch).filter(c=>c.state==="flagged").length,
      payCount:allPayRows.length,
      totalCash:cashR.reduce((s,x)=>s+x._credit-x._debit,0),cashByAgent:cashAgentsList,cashPhys:cp,
      cashExceptions:cex,cashReconciled:cashReconciledFlag,
      operaTot:opTot,operaCounts:opCounts,machSums:mSums,machCounts:mCounts,ploSums:pSums,ploCounts:pCounts,ploList:pList,
      disc:disc2,balanced:Math.abs(totalD)<0.01,totalDisc:totalD,
      countDisc:countDisc2,countsBalanced:totalCountD===0,totalCountDisc:totalCountD,
      nonCardSums:ncSums,nonCardCounts:ncCounts,totalSettled:totalSettledAmt,totalSettledCount:allPayRows.length};
  }

  async function exportPDF(){
    if(!window.html2pdf){notify(t("toast.pdfLibFailed"),"err");return;}
    const el=reportRef.current;
    if(!el){notify(t("toast.openReportsFirst"),"err");return;}
    const s=stateRef.current;
    const filename=`NightAudit_${s.date}_${s.auditStatus==="Closed"?"FINAL":"DRAFT"}.pdf`;
    notify(t("toast.generatingPdf"));
    const contentEl=document.querySelector(".content");
    const prevScrollTop=contentEl?contentEl.scrollTop:0;
    document.body.classList.add("exporting-pdf");
    if(contentEl)contentEl.scrollTop=0;
    window.scrollTo(0,0);
    try{
      await new Promise(r=>setTimeout(r,80));
      const worker=window.html2pdf().set({
        margin:10,filename,
        jsPDF:{format:"a4",orientation:"landscape"},
        html2canvas:{scale:2,useCORS:true,scrollX:0,scrollY:0},
        pagebreak:{mode:["css","legacy"],avoid:["tr","thead",".cashier-block"]}
      }).from(el);
      if(dirHandle){
        const blob=await worker.outputPdf("blob");
        const fh=await dirHandle.getFileHandle(filename,{create:true});
        const w=await fh.createWritable();
        await w.write(blob);
        await w.close();
        notify(t("toast.pdfSavedTo",dirHandle.name));
      }else{
        await worker.save();
        notify(t("toast.pdfDownloaded"));
      }
    }catch(e){notify(t("toast.pdfExportFailed",e.message),"err");
    }finally{
      document.body.classList.remove("exporting-pdf");
      if(contentEl)contentEl.scrollTop=prevScrollTop;
    }
  }

  /* ── exportXLSX ────────────────────────────────────────────────────────────
     A real .xlsx (not CSV, not a rasterised clone of the PDF) built with the
     SheetJS writer that's ALREADY bundled in vendor.js — no new dependency.

     The whole point of the Excel vs the PDF is that it's DATA: every amount is a
     real number (not "SAR 1,234.00" text), every sheet is one homogeneous table,
     so the auditor can sort/filter/pivot and the Debit/Credit columns total with
     live SUM() formulas. The PDF stays the signed visual artifact; this is the
     queryable companion.

     Aggregates come from buildPayload(s) — the exact same source the PDF and the
     JSON export use — so the three can never disagree. The per-transaction
     Journal sheet reads rows/checks/corrLinks directly (buildPayload doesn't carry
     row-level detail), and its Card/Ref column uses the SAME masked form as the UI
     (••••last4), never the raw _chequeRef, so this file — which may be written to
     your OneDrive folder — carries no unmasked card data.

     Note on styling: the bundled SheetJS is the community build. It writes values,
     number formats, column widths and formulas, but NOT cell fills/bold. Swapping
     in a styled fork to colour cells isn't worth destabilising a working app for —
     the data structure is what makes this useful, not shading. ─────────────── */
  async function exportXLSX(){
    if(!window.XLSX){notify(t("toast.excelLibUnavailable"),"err");return;}
    const s=stateRef.current;
    if(!s.rows?.length){notify(t("toast.noDataToExport"),"err");return;}
    const P=buildPayload(s);
    const ch=s.checks||{}, cl=s.corrLinks||{}, cp=s.cashPhys||{};
    const MONEY="#,##0.00", U=XLSX.utils;
    const wb=U.book_new();

    /* set number format on given 0-based columns, from firstDataRow to end */
    const fmtCols=(ws,cols,z,firstDataRow=1)=>{
      const ref=U.decode_range(ws["!ref"]);
      for(let R=firstDataRow;R<=ref.e.r;R++)for(const C of cols){
        const cell=ws[U.encode_cell({r:R,c:C})];
        if(cell&&cell.t==="n")cell.z=z;
      }
    };
    const colW=(...w)=>w.map(wch=>({wch}));

    /* ── Sheet: Summary (reconciliation + KPIs + sign-off) ── */
    const sum=[];
    sum.push([t("reports.title")]);
    sum.push([t("xlsx.businessDateLabel"),s.date]);
    sum.push([t("common.status"),statusLabel(P.status)]);
    sum.push([t("xlsx.cardBalance"),P.balanced?t("reports.balancedBadge"):t("xlsx.offBySar",fmt(Math.abs(P.totalDisc)))]);
    sum.push([t("xlsx.countBalance"),P.countsBalanced?t("reports.balancedBadge"):t("xlsx.offByTxn",P.totalCountDisc)]);
    sum.push([t("history.auditor"),P.auditorName,t("xlsx.submittedLabel"),P.submittedAt||""]);
    sum.push([t("reports.nightManager"),P.nightMgrName,t("xlsx.approvedLabel"),P.approvedAt||""]);
    sum.push([]);
    sum.push([t("reports.cardRecon")]);
    const cardHdrRow=sum.length; /* 0-based index of the header row we add next */
    sum.push([t("xlsx.hdrCard"),t("xlsx.hdrOperaSar"),t("xlsx.hdrOperaTxns"),t("xlsx.hdrMachSar"),t("xlsx.hdrMachTxns"),t("xlsx.hdrPloSar"),t("xlsx.hdrPloTxns"),t("xlsx.hdrAmtDiscSar"),t("xlsx.hdrCountDisc"),t("common.status")]);
    CARDS.forEach(c=>{
      const d=P.disc[c.code], cd=P.countDisc[c.code];
      const ok=Math.abs(d)<0.01, cntOk=Math.abs(cd)<1;
      sum.push([c.full,P.operaTot[c.code],P.operaCounts[c.code],P.machSums[c.code],P.machCounts[c.code],
        P.ploSums[c.code],P.ploCounts[c.code],d,cd,
        ok&&cntOk?t("xlsx.ok"):!ok&&!cntOk?t("reconcile.amountCountOff"):!ok?t("reconcile.amountOff"):t("reconcile.countOff")]);
    });
    sum.push([t("common.total"),
      CARDS.reduce((a,c)=>a+P.operaTot[c.code],0),
      CARDS.reduce((a,c)=>a+P.operaCounts[c.code],0),
      CARDS.reduce((a,c)=>a+P.machSums[c.code],0),
      CARDS.reduce((a,c)=>a+P.machCounts[c.code],0),
      CARDS.reduce((a,c)=>a+P.ploSums[c.code],0),
      CARDS.reduce((a,c)=>a+P.ploCounts[c.code],0),
      P.totalDisc,P.totalCountDisc,P.balanced&&P.countsBalanced?t("reconcile.balanced"):t("common.discrepancy")]);
    sum.push([]);
    /* BRIEF-NIGHT-AUDIT-2 Phase N2 — non-card settlements (no terminal/PLO
       second source, listed for a complete total) + the grand total-settled
       figure, both now part of the finalized record (buildPayload above). */
    sum.push([t("xlsx.nonCardSettlements")]);
    const ncHdrRow=sum.length;
    sum.push([t("xlsx.hdrCard"),t("xlsx.hdrOperaTxns"),t("xlsx.hdrOperaSar")]);
    SETTLEMENTS.forEach(x=>sum.push([x.full,P.nonCardCounts[x.code],P.nonCardSums[x.code]]));
    sum.push([t("common.total"),
      SETTLEMENTS.reduce((a,x)=>a+P.nonCardCounts[x.code],0),
      SETTLEMENTS.reduce((a,x)=>a+P.nonCardSums[x.code],0)]);
    sum.push([]);
    const totalSettledRow=sum.length;
    sum.push([t("xlsx.totalSettledTxns"),P.totalSettledCount,t("xlsx.totalSettledSar"),P.totalSettled]);
    sum.push([]);
    sum.push([t("xlsx.totalsSection")]);
    sum.push([t("reconcile.transactions"),P.txCount]);
    sum.push([t("reconcile.corrections"),P.corrCount]);
    sum.push([t("history.selfCorrected"),P.selfCorrectedCount]);
    sum.push([t("history.flagResolved"),P.flagCorrectedCount]);
    sum.push([t("history.flagged"),P.flaggedCount]);
    sum.push([t("xlsx.totalCashSar"),P.totalCash]);
    const wsSum=U.aoa_to_sheet(sum);
    wsSum["!cols"]=colW(20,15,11,15,13,12,10,16,11,18);
    /* money/disc columns of the card table only (rows from header+1 to total) */
    {
      const first=cardHdrRow+1, last=cardHdrRow+1+CARDS.length; /* inclusive total row */
      for(let R=first;R<=last;R++)for(const C of [1,3,5,7]){
        const cell=wsSum[U.encode_cell({r:R,c:C})];
        if(cell&&cell.t==="n")cell.z=MONEY;
      }
    }
    /* money column of the non-card settlements table */
    {
      const first=ncHdrRow+1, last=ncHdrRow+1+SETTLEMENTS.length;
      for(let R=first;R<=last;R++){
        const cell=wsSum[U.encode_cell({r:R,c:2})];
        if(cell&&cell.t==="n")cell.z=MONEY;
      }
    }
    {
      const cell=wsSum[U.encode_cell({r:totalSettledRow,c:3})];
      if(cell&&cell.t==="n")cell.z=MONEY;
    }
    U.book_append_sheet(wb,wsSum,"Summary");

    /* ── Sheet: Journal (one row per transaction — the queryable core) ── */
    const revIndex={}; /* reversalTrxNo -> original it was linked from */
    Object.entries(cl).forEach(([orig,v])=>{if(v?.reversalTrxNo)revIndex[v.reversalTrxNo]=orig;});
    const jHdr=[t("reports.date"),t("reports.time"),t("reports.room"),t("reports.guest"),t("xlsx.trxNo"),t("xlsx.code"),t("reports.description"),t("reports.cardRef"),
      t("xlsx.debitSar"),t("xlsx.creditSar"),t("xlsx.cashierId"),t("xlsx.cashier"),t("xlsx.user"),t("reports.receipt"),
      t("xlsx.operaRef"),t("xlsx.trxType"),
      t("xlsx.fxCurrency"),t("xlsx.fxFaceAmt"),t("xlsx.fxRate"),
      t("xlsx.ploType"),t("common.status"),t("xlsx.comment"),t("xlsx.correctionLink"),t("xlsx.linkedAt")];
    const jAoa=[jHdr];
    s.rows.forEach(r=>{
      const st=ch[r._trxNo]?.state;
      const ref=r._last4?`••••${r._last4}`:(r._chequeRef||""); /* masked, mirrors UI */
      const link=cl[r._trxNo];
      const corr=link?.reversalTrxNo?t("xlsx.correctedBy",link.reversalTrxNo)
        :revIndex[r._trxNo]?t("xlsx.reversalOf",revIndex[r._trxNo]):"";
      /* Human-readable tx type — mirrors badge logic in journal-view.js */
      const txType=r._isTax?t("xlsx.txTypeTax")
        :r._isCorr?t("xlsx.txTypeCorrection")
        :r._isCard?t("xlsx.txTypeCard")
        :r._isCash?t("xlsx.txTypeCash")
        :r._isCL?t("xlsx.txTypeCL")
        :r._isReward?t("xlsx.txTypeReward")
        :r._isOTA?t("xlsx.txTypeOTA")
        :t("xlsx.txTypeCharge");
      jAoa.push([r._date,r._time,r._room,r._guest,r._trxNo,r._code,r._desc,ref,
        r._debit||null,r._credit||null,r._agentId,r._agent,r._userName,r._receipt,
        r._ref||"",txType,
        r._fxCode||"",r._fxFaceCredit||r._fxFaceDebit||null,r._fxRate||null,
        ch[r._trxNo]?.ploType||"",
        st==="checked"?t("reconcile.checked"):st==="flagged"?t("reconcile.flagged"):"",
        ch[r._trxNo]?.comment||"",corr,link?.linkedAt||""]);
    });
    const n=s.rows.length;
    jAoa.push(["TOTAL","","","","","","","",null,null,"","","","","","","","",null,"","","","",""]);
    const wsJ=U.aoa_to_sheet(jAoa);
    wsJ["!cols"]=colW(11,8,8,22,12,7,24,14,12,12,10,16,14,10,14,16,10,13,8,14,9,30,20,22);
    fmtCols(wsJ,[8,9,17],MONEY);  /* Debit, Credit, FX Face Amt */
    fmtCols(wsJ,[18],"0.0000");   /* FX Rate */
    const jDeb=s.rows.reduce((a,r)=>a+(r._debit||0),0), jCred=s.rows.reduce((a,r)=>a+(r._credit||0),0);
    wsJ[U.encode_cell({r:n+1,c:8})]={t:"n",f:`SUBTOTAL(109,I2:I${n+1})`,v:jDeb,z:MONEY};
    wsJ[U.encode_cell({r:n+1,c:9})]={t:"n",f:`SUBTOTAL(109,J2:J${n+1})`,v:jCred,z:MONEY};
    U.book_append_sheet(wb,wsJ,"Journal");

    /* ── Sheet: Cash Drop ── */
    /* Build tx-count index from raw rows (buildPayload only has totals) */
    const cashTxCount={};
    s.rows.filter(r=>r._isCash).forEach(r=>{cashTxCount[r._agentId]=(cashTxCount[r._agentId]||0)+1;});
    const nightCashTotal=P.cashByAgent.reduce((a,x)=>a+(x.cred-x.deb),0);
    const cHdr=[t("reports.agent"),t("xlsx.cashierId"),t("xlsx.cashTxns"),t("xlsx.operaDebitSar"),t("xlsx.operaCreditSar"),t("xlsx.operaDropSar"),t("xlsx.physicalCountSar"),t("xlsx.varianceSar"),t("xlsx.pctOfNightDrop"),t("common.status")];
    const cAoa=[cHdr];
    P.cashByAgent.forEach(a=>{
      const drop=a.cred-a.deb;
      const counted=cp[a.id]!=null&&cp[a.id]!=="";
      const phys=counted?toNum(cp[a.id]):null;
      const v=counted?phys-drop:null;
      const stm=cashStatus(v==null?null:v,counted);
      const label=cashStatusLabel(stm).replace(/^[✓≈]\s*/,"");
      const pct=nightCashTotal?drop/nightCashTotal:null;
      cAoa.push([a.name,a.id,cashTxCount[a.id]||0,a.deb,a.cred,drop,counted?phys:null,counted?v:null,pct,label]);
    });
    const cn=P.cashByAgent.length;
    cAoa.push(["TOTAL","",null,null,null,null,null,null,null,""]);
    const wsC=U.aoa_to_sheet(cAoa);
    wsC["!cols"]=colW(18,11,10,17,17,16,18,15,14,16);
    fmtCols(wsC,[3,4,5,6,7],MONEY);
    fmtCols(wsC,[8],"0.0%");
    const cTotals=[
      P.cashByAgent.reduce((a,x)=>a+x.deb,0),
      P.cashByAgent.reduce((a,x)=>a+x.cred,0),
      P.cashByAgent.reduce((a,x)=>a+(x.cred-x.deb),0),
    ];
    [3,4,5].forEach((C,i)=>{
      const col=String.fromCharCode(65+C);
      wsC[U.encode_cell({r:cn+1,c:C})]={t:"n",f:`SUBTOTAL(109,${col}2:${col}${cn+1})`,v:cTotals[i],z:MONEY};
    });
    U.book_append_sheet(wb,wsC,"Cash Drop");

    /* ── Sheet: Machine Z-Reports (amounts + counts per machine per card type) ── */
    {
      const mach=s.mach||{}, machCnt=s.machCnt||{};
      const mHdr=[t("xlsx.machine"),...CARDS.map(c=>c.full+t("xlsx.sarSuffix")),t("xlsx.machineTotalSar")];
      const mcHdr=[t("xlsx.machine"),...CARDS.map(c=>c.full+t("xlsx.txnsSuffix")),t("xlsx.machineTotalTxns")];
      const mAoa=[mHdr];
      const mcAoa=[mcHdr];
      MACHINES.forEach(mac=>{
        const amts=CARDS.map(c=>toNum(mach[mac]?.[c.code])||null);
        const tots=amts.reduce((a,v)=>a+(v||0),0);
        mAoa.push([mac,...amts,tots]);
        const cnts=CARDS.map(c=>toNum((machCnt||{})[mac]?.[c.code])||null);
        const ctots=cnts.reduce((a,v)=>a+(v||0),0);
        mcAoa.push([mac,...cnts,ctots]);
      });
      /* Grand total rows */
      const grandAmts=CARDS.map(c=>MACHINES.reduce((a,mac)=>a+toNum(mach[mac]?.[c.code]),0));
      mAoa.push([t("xlsx.grandTotal"),...grandAmts,grandAmts.reduce((a,v)=>a+v,0)]);
      const grandCnts=CARDS.map(c=>MACHINES.reduce((a,mac)=>a+toNum((machCnt||{})[mac]?.[c.code]),0));
      mcAoa.push([t("xlsx.grandTotal"),...grandCnts,grandCnts.reduce((a,v)=>a+v,0)]);
      /* Combine: amounts table, blank row, counts table */
      const mCombined=[...mAoa,[],[t("xlsx.txnCountsHeader")],...mcAoa];
      const wsMach=U.aoa_to_sheet(mCombined);
      const mw=colW(16,...CARDS.map(()=>14),16);
      wsMach["!cols"]=mw;
      /* Format amount section (rows 1..MACHINES.length incl grand total) */
      fmtCols(wsMach,Array.from({length:CARDS.length+1},(_,i)=>i+1),MONEY,1);
      U.book_append_sheet(wb,wsMach,"Machine Z-Reports");
    }

    /* ── Sheet: PLO (only if any tagged) — full detail, recomputed from rows ── */
    const ploRows=s.rows.filter(r=>r._isCard&&ch[r._trxNo]?.plo);
    if(ploRows.length){
      const pAoa=[[t("xlsx.trxNo"),t("xlsx.ploType"),t("reports.card"),t("reports.date"),t("reports.time"),t("reports.room"),t("reports.guest"),t("xlsx.cashier"),t("xlsx.cardRefMasked"),t("reports.receipt"),t("xlsx.amountSar"),t("common.status"),t("xlsx.comment")]];
      ploRows.forEach(r=>{
        const ref=r._last4?`••••${r._last4}`:"";
        const st=ch[r._trxNo]?.state;
        pAoa.push([r._trxNo,ch[r._trxNo]?.ploType||"Other",BY_CODE[r._code]?.full||r._code,
          r._date,r._time,r._room,r._guest,r._agent,ref,r._receipt,r._credit||null,
          st==="checked"?t("reconcile.checked"):st==="flagged"?t("reconcile.flagged"):"",ch[r._trxNo]?.comment||""]);
      });
      const pn=ploRows.length;
      pAoa.push(["TOTAL","","","","","","","","","",null,"",""]);
      const wsP=U.aoa_to_sheet(pAoa);
      wsP["!cols"]=colW(12,14,16,11,8,8,22,14,16,12,14,9,30);
      fmtCols(wsP,[10],MONEY);
      const pTot=ploRows.reduce((a,r)=>a+(r._credit||0),0);
      wsP[U.encode_cell({r:pn+1,c:10})]={t:"n",f:`SUBTOTAL(109,K2:K${pn+1})`,v:pTot,z:MONEY};
      U.book_append_sheet(wb,wsP,"PLO");
    }

    /* ── Sheet: Corrections & Flags (only if any) ── */
    const resolved=Object.entries(cl).filter(([,v])=>v?.reversalTrxNo);
    const openFlags=s.rows.filter(r=>ch[r._trxNo]?.state==="flagged"&&!cl[r._trxNo]?.reversalTrxNo);
    if(resolved.length||openFlags.length){
      const xAoa=[];
      if(resolved.length){
        xAoa.push([t("xlsx.resolvedCorrections")]);
        xAoa.push([t("xlsx.origTrx"),t("reports.date"),t("reports.time"),t("reports.room"),t("reports.guest"),t("xlsx.cashier"),t("xlsx.originalDescription"),t("xlsx.origAmtSar"),
          t("xlsx.revTrx"),t("xlsx.revDate"),t("xlsx.revCashier"),t("xlsx.reversalDescription"),t("xlsx.revAmtSar"),
          t("xlsx.source"),t("xlsx.comment"),t("xlsx.linkedAt")]);
        resolved.forEach(([orig,v])=>{
          const o=s.rows.find(r=>r._trxNo===orig), rv=s.rows.find(r=>r._trxNo===v.reversalTrxNo);
          if(!o||!rv)return;
          const oAmt=(o._debit||0)-(o._credit||0);   /* negative = credit entry */
          const rvAmt=(rv._debit||0)-(rv._credit||0);
          xAoa.push([orig,o._date,o._time,o._room,o._guest,o._agent,o._desc,oAmt,
            v.reversalTrxNo,rv._date,rv._agent,rv._desc,rvAmt,
            isSelfCorrection(v,o,s.rows)?t("xlsx.selfCorrectedLabel"):t("xlsx.flaggedThenCorrectedLabel"),
            ch[orig]?.comment||"",v.linkedAt||""]);
        });
        xAoa.push([]);
      }
      if(openFlags.length){
        xAoa.push([t("xlsx.openFlagsUnresolvedLabel")]);
        xAoa.push([t("xlsx.trxNo"),t("reports.date"),t("reports.time"),t("reports.room"),t("reports.guest"),t("xlsx.cashier"),t("reports.description"),t("xlsx.creditSar"),t("xlsx.debitSar"),t("xlsx.comment")]);
        openFlags.forEach(r=>xAoa.push([r._trxNo,r._date,r._time,r._room,r._guest,r._agent,r._desc,
          r._credit||null,r._debit||null,ch[r._trxNo]?.comment||t("xlsx.noCommentLower")]));
      }
      const wsX=U.aoa_to_sheet(xAoa);
      wsX["!cols"]=colW(12,11,8,8,22,14,26,14,12,11,14,26,14,20,30,22);
      /* money format the amount columns */
      if(resolved.length){
        fmtCols(wsX,[7,12],MONEY,2);  /* Orig Amt, Rev Amt in resolved section */
      }
      U.book_append_sheet(wb,wsX,"Corrections & Flags");
    }

    /* ── Write: to the connected folder if present (like the PDF), else download ── */
    const fname=`NightAudit_${s.date}_${s.auditStatus==="Closed"?"FINAL":"DRAFT"}.xlsx`;
    try{
      if(dirHandle){
        const buf=XLSX.write(wb,{type:"array",bookType:"xlsx"});
        const fh=await dirHandle.getFileHandle(fname,{create:true});
        const w=await fh.createWritable();
        await w.write(new Blob([buf]));
        await w.close();
        notify(t("toast.excelSavedTo",dirHandle.name));
      }else{
        XLSX.writeFile(wb,fname);
        notify(t("toast.excelDownloaded"));
      }
    }catch(e){notify(t("toast.excelExportFailed",e.message),"err");}
  }

  async function saveFinished(){
    const s=stateRef.current;
    if(!s.rows?.length){notify(t("toast.noDataToSave"),"err");return;}
    /* BUSINESS-DATE.md: "a closed audit is never silently overwritten" — the
       manual Save Audit button stays available for Draft/Submitted/Approved
       (unchanged), but refuses to clobber a date this app has already
       Closed via the step-6 commit (finalizeClose already wrote that record). */
    if(s.auditStatus!=="Closed"&&history.some(h=>h.date===s.date&&h.status==="Closed")){
      notify(t("toast.closedCannotOverwrite",s.date),"err");
      return;
    }
    const payload=buildPayload(s);
    const newHist=[payload,...history.filter(h=>h.date!==s.date)].slice(0,90);
    setHistory(newHist);
    try{localStorage.setItem(HIST_KEY,JSON.stringify(newHist));}catch{}
    if(dirHandle){
      try{
        setSyncSt("saving");
        const fh=await dirHandle.getFileHandle(`audit_${s.date}.json`,{create:true});
        const w=await fh.createWritable();
        await w.write(JSON.stringify(payload,null,2));
        await w.close();
        try{await dirHandle.removeEntry(`audit_draft_${s.date}.json`);}catch{}
        setLastSync(new Date());setSyncSt("saved");
        notify(t("toast.auditSaved"));
      }catch{
        setSyncSt("error");
        notify(t("toast.savedLocallySyncFailed"),"err");
      }
      return;
    }
    notify(t("toast.auditSaved"));
  }

  function resumeDraft(){
    const d=resumeData;setResumeData(null);
    setRows(d.rows||[]);
    const ch={};
    Object.entries(d.checks||{}).forEach(([k,v])=>{
      ch[k]={...v,state:v.state||(v.ok?"checked":undefined)};
    });
    setChecks(ch);setCashPhys(d.cashPhys||{});setCashExceptions(d.cashExceptions||{});setMach(d.mach||initMach());setMachCnt(d.machCnt||initMach());
    setDate(d.date||today());setAuditStatus(d.auditStatus||"Draft");
    setAuditorName(d.auditorName||"");setAuditorId(d.auditorId||"");setSubmittedAt(d.submittedAt||null);
    setNightMgrName(d.nightMgrName||"");setNightMgrId(d.nightMgrId||"");setApprovedAt(d.approvedAt||null);
    setAuditorNote(d.auditorNote||"");setNightMgrNote(d.nightMgrNote||"");
    setOpenFlagsAck(d.openFlagsAck||[]);setCorrLinks(d.corrLinks||{});
    setProductionConfirmedAt(d.productionConfirmedAt||null);
    setProductionConfirmedById(d.productionConfirmedById||null);
    setProductionConfirmedByName(d.productionConfirmedByName||"");
    setNewBusinessDate(d.newBusinessDate||null);setClosedAt(d.closedAt||null);
    setClosedById(d.closedById||null);setClosedByName(d.closedByName||"");
    setView("journal");notify(t("toast.auditResumed"));
  }

  /* ── Props bundle passed to every view ── */
  const appProps={
    /* identity */
    identity,
    /* state */
    rows,date,checks,cashPhys,cashExceptions,mach,machCnt,auditStatus,auditorName,submittedAt,
    nightMgrName,approvedAt,auditorNote,nightMgrNote,openFlagsAck,history,dirHandle,folderName,
    syncSt,lastSync,toast,resumeData,jFilter,ploPickFor,newTrxNos,theme,
    corrLinks,focusedTrxNo,expandedFlag,reportType,showApproveModal,pendingApproveAck,corrPickFor,
    /* BRIEF-NIGHT-AUDIT-2 Phase N1 — guided submit flow */
    productionConfirmedAt,productionConfirmedByName,showCloseModal,newBusinessDate,
    closedAt,closedByName,multiDateNotice,
    /* refs */
    fileRef,resyncRef,jRowsRef,checksRef,stateRef,reportRef,rowRefsMap,
    /* computed */
    cardRows,cashRows,payRows,chargeRows,taxLinks,allCorrCount,checkedCnt,flaggedCnt,totalCash,
    operaTot,operaCounts,ploCounts,cashByAgent,ploList,ploSums,machSums,machCounts,disc,countDisc,
    totalDisc,balanced,totalCountDisc,countsBalanced,
    jRows,cashierProgress,cashierGroups,unresolvedFlags,syncLabel,dotClass,
    submitSteps,bizDelayInfo,closedDateGaps,
    /* BRIEF-NIGHT-AUDIT-2 Phase N2 — non-card settlements + grand total + cash gate */
    nonCardSums,nonCardCounts,totalSettled,totalSettledCount,cashBalanced,cashCountedOf,
    /* actions */
    notify,handleFile,handleResync,cycleCheck,setFlagComment,tagPLO,
    linkCorrection,checkAllVisible,submitForReview,initiateApprove,finalizeApprove,
    connectFolder,buildPayload,saveFinished,resumeDraft,exportPDF,exportXLSX,
    confirmProduction,finalizeClose,markCashException,clearCashException,
    /* setters */
    setView,setRows,setDate,setChecks,setCashPhys,setCashExceptions,setMach,setMachCnt,setAuditStatus,
    setAuditorName,setSubmittedAt,setNightMgrName,setApprovedAt,
    setAuditorNote,setNightMgrNote,setOpenFlagsAck,
    setHistory,setDirHandle,setFolderName,setSyncSt,setLastSync,setToast,
    setResumeData,setJFilter,setPloPickFor,setNewTrxNos,setCorrLinks,
    setFocusedTrxNo,setExpandedFlag,setReportType,setShowApproveModal,setPendingApproveAck,setCorrPickFor,
    setShowCloseModal,setNewBusinessDate
  };

  /* ── App Shell ── */
  const VIEWS_MAP={
    upload:UploadView,journal:JournalView,cash:CashView,
    reconcile:ReconcileView,reports:ReportsView,history:HistoryView,
    production:ProductionView,staffPins:StaffPinsView,activity:ActivityView
  };
  const ActiveView=VIEWS_MAP[view]||UploadView;

  /* Whole app gated behind PIN identity (BRIEF-IDENTITY §1) — shown instead
     of the app shell until someone identifies. Placed after every hook above
     has already run, so this conditional return never changes hook order. */
  if(!identity.currentStaffId){
    return E(IdentityGate,{identity,appLabel:"Night Audit"});
  }

  return E("div",{
    className:"app",
    dir,
    onClick:()=>{setPloPickFor(null);setCorrPickFor(null);},
    style: {
      gridTemplateColumns: navCollapsed ? "52px 1fr" : "200px 1fr",
      transition: "grid-template-columns 0.18s ease"
    }
  },
    /* Resume modal */
    resumeData&&E("div",{className:"modal-bg"},
      E("div",{className:"modal",onClick:ev=>ev.stopPropagation()},
        E("h2",null,t("app.resumeTitle")),
        E("p",null,t("app.resumeBody",resumeData.date,resumeData.rows?.length,
          resumeData.savedAt?new Date(resumeData.savedAt).toLocaleString():t("app.recently"))),
        E("div",{className:"modal-actions"},
          E("button",{className:"btn",onClick:()=>{setResumeData(null);localStorage.removeItem(DRAFT_KEY);}},t("app.startFresh")),
          E("button",{className:"btn primary",onClick:resumeDraft},
            E("i",{className:"ti ti-refresh"}),t("app.resumeAudit"))))),

    /* Approve modal — open flags acknowledgement */
    showApproveModal&&E("div",{className:"modal-bg"},
      E("div",{className:"modal",style:{width:480},onClick:ev=>ev.stopPropagation()},
        E("h2",null,E("i",{className:"ti ti-alert-triangle",style:{color:"var(--amber)",marginRight:6}}),t("app.unresolvedFlagsTitle")),
        E("p",null,t("app.unresolvedFlagsBody",pendingApproveAck.length,pluralSuffix(pendingApproveAck.length))),
        E("ul",{style:{fontSize:12,margin:"0 0 16px 16px",color:"var(--t1)"}},
          pendingApproveAck.map(r=>E("li",{key:r._trxNo,style:{marginBottom:4}},
            E("strong",null,r._room)," · ",r._guest," · ",E("em",null,checks[r._trxNo]?.comment||t("app.noComment"))))),
        E("div",{className:"modal-actions"},
          E("button",{className:"btn",onClick:()=>setShowApproveModal(false)},t("app.goBackResolve")),
          E("button",{className:"btn primary",onClick:()=>{setShowApproveModal(false);setShowSignOffModal(true);}},
            E("i",{className:"ti ti-circle-check"}),t("app.ackAndSign"))))),

    /* Night Manager sign-off — verifies a night-manager/top-admin PIN without
       switching the auditor's own session identity (see identity.js). */
    showSignOffModal&&E(SignOffModal,{
      identity,onClose:()=>setShowSignOffModal(false),
      onSuccess:entry=>finalizeApprove(pendingApproveAck,entry)
    }),

    /* Step 6 close/commit — a separate, later PIN sign-off from step 5's
       (BUSINESS-DATE.md); may be a different Night Manager. */
    showCloseModal&&E(SignOffModal,{
      identity,onClose:()=>setShowCloseModal(false),
      title:t("reconcile.stepClose"),introText:t("reconcile.closeSignatureNote"),
      onSuccess:entry=>finalizeClose(entry)
    }),

    /* Change my own PIN — always available regardless of role/tab access. */
    showChangePin&&identity.currentEntry&&E(ResetPinModal,{
      identity,actorId:identity.currentEntry.staffId,target:identity.currentEntry,
      onClose:()=>setShowChangePin(false)
    }),

    /* Sidebar */
    E("aside",{
      className:`sidebar${navCollapsed?" collapsed":""}`,
      style: {
        width: navCollapsed ? 52 : 200,
        overflowX: "hidden",
        display: "flex",
        flexDirection: "column",
        transition: "width 0.18s ease"
      }
    },
      E("div",{className:"logo"},
        E("div",{className:"logo-row",style:{justifyContent:navCollapsed?"center":"space-between"}},
          !navCollapsed&&E("div",null,
            E("div",{className:"logo-name"},t("app.name")),
            E("div",{className:"logo-date"},date,
              bizChipLabel&&E("span",{className:`bdg ${bizChipClass}`,style:{marginLeft:6,fontSize:9,verticalAlign:"middle"}},bizChipLabel))),
          E("div",{style:{display:"flex",flexDirection:navCollapsed?"column":"row",alignItems:"center",gap:6}},
            /* BRIEF-POLISH-1.md #1 — small, always-visible home control back to
               the FO Portal Launcher; hidden on file:// (unsupported there — see
               IS_FILE_PROTOCOL in identity.js). Alt+Home does the same (wired
               near the top of this component). */
            !IS_FILE_PROTOCOL&&E("button",{
              className:"home-btn",
              onClick:goHome,
              title:t("app.homeBtnTitle"),
              "aria-label":t("app.homeBtn")
            },E("i",{className:"ti ti-home"})),
            E("button",{
              className:"nb-collapse-btn",
              title:navCollapsed?t("app.expandMenu"):t("app.collapseMenu"),
              onClick:()=>setNavCollapsed(c=>!c)
            },E("i",{className:`ti ${navCollapsed?"ti-layout-sidebar-right":"ti-layout-sidebar-left"}`}))))),

      E("nav",{className:"nav", style: navCollapsed ? { alignItems: "center" } : {}},
        VIEWS.filter(v=>visibleTabIds.has(v.id)).map(v=>E("button",{
          key:v.id,
          className:`nb${view===v.id?" on":""}`,
          onClick:()=>setView(v.id),
          title:navCollapsed?t("nav."+v.id):undefined,
          style: navCollapsed ? { justifyContent: "center", padding: "10px 0" } : {}
        },E("i",{className:`ti ${v.icon}`}),!navCollapsed&&E("span",{className:"nb-label"},t("nav."+v.id))))),

      /* BRIEF-POLISH-1.md #2 — compact identity/utility footer: one user chip
         (avatar + name + role, click -> popover: Switch / Change PIN — no
         Backup/Restore/Lock-now/Change-password here, this app has no vault,
         see identity.js's file header) + one small icon row (language,
         dark/light mode, connection status). Hidden when the sidebar itself
         is collapsed, same visibility this block already had before. */
      !navCollapsed&&E(IdentityFooter,{
        initials:initials(identifiedName),
        displayName:identifiedName,
        roleLabel:sidebarRoleLabel,
        onSwitch:()=>identity.switchToGrid(),switchLabel:t("app.switchUser"),
        onChangePin:(!identity.isUnattributed&&identity.currentEntry)?()=>setShowChangePin(true):undefined,
        changePinLabel:t("app.changePin"),
        lang,onToggleLang:toggleLanguage,langButtonLabel:lang==="ar"?"English":"العربية",
        theme,onToggleTheme:toggleTheme,themeButtonLabel:theme==="dark"?t("app.lightMode"):t("app.darkMode"),
        connection:footerConnection
      })),

    /* Main */
    E("main",{className:"main"},
      E("div",{className:"topbar"},
        E("div",{className:"topbar-title"},t("title."+view)),
        E("div",{className:"topbar-right"},
          rows.length>0&&E("span",{style:{fontSize:11,color:"var(--t3)"}},t("app.rowsPayroll",rows.length,payRows.length)),
          auditStatus!=="Draft"&&E("span",{className:`bdg ${bizChipClass}`},bizChipLabel),
          E("button",{
            className:"btn xs ghost",
            title:theme==="dark"?t("app.lightMode"):t("app.darkMode"),
            onClick:toggleTheme
          },E("i",{className:`ti ${theme==="dark"?"ti-sun":"ti-moon"}`}),theme==="dark"?t("app.light"):t("app.dark")),
          E("button",{
            className:"btn xs ghost",
            title:showHelp?t("app.hideInstructions"):t("app.showInstructions"),
            style:showHelp?{background:"var(--blue-bg)",color:"var(--blue-t)"}:{},
            onClick:()=>setShowHelp(v=>{
              const nv=!v;
              try{localStorage.setItem(HELP_KEY,nv?"1":"0");}catch{}
              return nv;
            })
          },E("i",{className:"ti ti-help-circle"}),t("app.help")))),
      showHelp&&E("div",{
        style:{margin:"0 20px",padding:"12px 16px",background:"var(--blue-bg)",
          border:"1px solid var(--border)",borderRadius:"var(--r)",fontSize:13,color:"var(--t1)"}
      },
        E("ul",{style:{margin:0,paddingLeft:18,lineHeight:1.6}},
          tHelp(view).map((tx,i)=>E("li",{key:i},tx)))),
      E("div",{className:"content"},E(ActiveView,appProps))),

    /* Toast */
    toast&&E("div",{className:`toast ${toast.type}`},
      E("i",{className:`ti ${toast.type==="ok"?"ti-circle-check":"ti-alert-circle"}`}),
      toast.msg));
}

ReactDOM.render(React.createElement(App,null),document.getElementById("root"));