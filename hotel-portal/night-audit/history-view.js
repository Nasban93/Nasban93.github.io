/* ── History View ── */
function HistoryView(p){
  useLang();
  const {history}=p;
  /* Track which nights each agent appeared in (from either cashByAgent or
     corrByAgent) so nights is never 0 for an agent who only had corrections,
     which would otherwise produce Infinity in the avg/night column. */
  const agentMap={};
  const agentNightSets={};
  history.forEach(h=>{
    (h.cashByAgent||[]).forEach(a=>{
      if(!agentMap[a.id])agentMap[a.id]={name:a.name,nights:0,totalCorr:0,totalDrop:0};
      if(!agentNightSets[a.id])agentNightSets[a.id]=new Set();
      agentNightSets[a.id].add(h.date);
      agentMap[a.id].totalDrop+=(a.cred||0)-(a.deb||0);
    });
    /* Only corrections that genuinely needed the auditor to flag and chase down count here —
       self-corrected pairs (the agent caught and fixed their own mistake) are excluded, and
       this is keyed off the ORIGINAL transaction's agent, not whoever's cashier login posted
       the fix (often the auditor themselves, doing cleanup). */
    (h.corrByAgent||[]).forEach(a=>{
      if(!agentMap[a.id])agentMap[a.id]={name:a.name,nights:0,totalCorr:0,totalDrop:0};
      if(!agentNightSets[a.id])agentNightSets[a.id]=new Set();
      agentNightSets[a.id].add(h.date);
      agentMap[a.id].totalCorr+=a.count||0;
    });
  });
  /* Apply night counts after all history is processed */
  Object.keys(agentMap).forEach(id=>{agentMap[id].nights=(agentNightSets[id]||new Set()).size;});
  const agentList=Object.values(agentMap).sort((a,b)=>b.nights-a.nights);
  if(!history.length)return E("div",{className:"empty",style:{marginTop:48}},
    E("i",{className:"ti ti-history"}),t("history.empty"));
  return E("div",null,
    E("div",{className:"card np"},
      E("table",{className:"t"},
        E("thead",null,E("tr",null,
          E("th",null,t("common.date")),E("th",{className:"r"},t("upload.transactions")),E("th",{className:"r"},t("upload.corrections")),
          E("th",{className:"r"},t("history.selfCorrected")),E("th",{className:"r"},t("history.flagResolved")),
          E("th",{className:"r"},t("history.flagged")),E("th",{className:"r"},t("upload.cardTotal")),
          E("th",{className:"r"},t("history.cash")),E("th",{className:"r"},t("reconcile.discrepancy")),
          E("th",null,t("common.balanced")),E("th",null,t("history.auditor")),E("th",null,t("common.status")))),
        E("tbody",null,history.map(h=>{
          const cardTot=CARDS.reduce((s,c)=>s+(h.operaTot?.[c.code]||0),0);
          const cashTot=h.totalCash??((h.cashByAgent||[]).reduce((s,a)=>s+(a.cred||0),0));
          return E("tr",{key:h.date},
            E("td",{style:{fontWeight:700}},h.date),
            E("td",{className:"r"},h.txCount),
            E("td",{className:"r"},h.corrCount>0?E("span",{className:"bdg bamber"},h.corrCount):t("common.dash")),
            E("td",{className:"r"},h.selfCorrectedCount>0?E("span",{className:"bdg bgray"},h.selfCorrectedCount):t("common.dash")),
            E("td",{className:"r"},h.flagCorrectedCount>0?E("span",{className:"bdg bamber"},h.flagCorrectedCount):t("common.dash")),
            E("td",{className:"r"},h.flaggedCount>0?E("span",{className:"bdg bred"},h.flaggedCount):t("common.dash")),
            E("td",{className:"r"},t("common.sar")," ",fmt(cardTot)),
            E("td",{className:"r"},t("common.sar")," ",fmt(cashTot)),
            E("td",{className:`r ${Math.abs(h.totalDisc||0)<0.01?"dok":"derr"}`},
              Math.abs(h.totalDisc||0)<0.01?t("common.dash"):fmt(h.totalDisc)),
            E("td",null,h.balanced?E("span",{className:"bdg bgreen"},t("common.balanced")):E("span",{className:"bdg bred"},t("common.discrepancy"))),
            E("td",{style:{fontSize:11,color:"var(--t2)"}},h.auditorName||"—"),
            E("td",null,E("span",{className:`bdg ${h.status==="Closed"?"bgreen":h.status==="Approved"?"bblue":h.status==="Submitted for Review"?"bamber":"bgray"}`},statusLabel(h.status||"Draft"))));
        })))),
    agentList.length>0&&E("div",{className:"card np",style:{marginTop:14}},
      E("div",{className:"card-title",style:{padding:"12px 14px 0"}},t("history.agentPerformance")),
      E("div",{style:{padding:"0 14px 10px",fontSize:11,color:"var(--t3)"}},
        t("history.note")),
      E("table",{className:"t"},
        E("thead",null,E("tr",null,
          E("th",null,t("common.agent")),E("th",{className:"r"},t("history.nights")),
          E("th",{className:"r"},t("history.auditorResolved")),E("th",{className:"r"},t("history.avgPerNight")),
          E("th",{className:"r"},t("history.totalCashDrop")),E("th",null,t("history.trend")))),
        E("tbody",null,agentList.map(a=>
          E("tr",{key:a.name},
            E("td",{style:{fontWeight:700}},a.name),
            E("td",{className:"r"},a.nights),
            E("td",{className:"r"},a.totalCorr>0?E("span",{className:"bdg bamber"},a.totalCorr):t("common.dash")),
            E("td",{className:"r",style:{color:a.nights&&a.totalCorr/a.nights>2?"var(--amber-t)":undefined}},a.nights?fmt(a.totalCorr/a.nights,1):t("common.dash")),
            E("td",{className:"r",style:{fontWeight:700}},t("common.sar")," ",fmt(a.totalDrop)),
            E("td",null,!a.nights?E("span",{className:"bdg bgray"},t("common.dash"))
              :a.totalCorr/a.nights<1?E("span",{className:"bdg bgreen"},t("history.lowErrors"))
              :a.totalCorr/a.nights>3?E("span",{className:"bdg bred"},t("history.review"))
              :E("span",{className:"bdg bamber"},t("history.monitor")))))))));
}
