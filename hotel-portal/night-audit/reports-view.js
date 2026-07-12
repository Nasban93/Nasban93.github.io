/* ── Reports View ──
   Both reports (Reconciliation Summary + Final Journal) are always rendered
   together inside reportRef, one after another. There's no more "active tab
   replaces the other" — the tabs below just scroll you to a section. This
   means Save PDF / Print always produce one combined document containing
   both reports, instead of whichever one happened to be on screen overwriting
   the other. */
function ReportsView(p){
  useLang();
  const {rows,auditStatus,date,auditorName,nightMgrName,submittedAt,approvedAt,
         operaTot,operaCounts,machSums,machCounts,ploSums,ploCounts,disc,countDisc,totalDisc,balanced,cashByAgent,cashPhys,
         checks,corrLinks,unresolvedFlags,openFlagsAck,
         stateRef,buildPayload,reportType,setReportType,reportRef,exportPDF,exportXLSX,dirHandle,
         /* BRIEF-NIGHT-AUDIT-2 Phase N2 */
         nonCardSums,nonCardCounts,totalSettled,totalSettledCount,cashBalanced}=p;
  if(!rows.length)return E("div",{className:"empty"},E("i",{className:"ti ti-upload"}),t("reports.emptyUpload"));
  /* BRIEF-NIGHT-AUDIT-2 Phase N1 — "Closed" (step 6) is the new immutable
     final state; "Approved" (step 5) is BUSINESS-DATE.md's "submitted-draft"
     — still re-openable/amendable, so it keeps the DRAFT watermark. */
  const isDraft=auditStatus!=="Closed";
  const signedOff=auditStatus==="Approved"||auditStatus==="Closed";
  const gOpera=CARDS.reduce((s,c)=>s+operaTot[c.code],0);
  const totalPhys=Object.values(cashPhys).reduce((s,v)=>s+toNum(v),0);
  const summaryRef=useRef();
  const journalRef=useRef();

  function scrollTo(ref,id){
    setReportType(id);
    ref.current?.scrollIntoView({behavior:"smooth",block:"start"});
  }

  function SummaryReport(){
    return E("div",{className:"card report-section",ref:summaryRef},
      E("div",{style:{textAlign:"center",marginBottom:20,borderBottom:"2px solid var(--border)",paddingBottom:14}},
        isDraft&&E("div",{className:"draft-stamp"},t("reports.draftStamp")),
        E("h2",{style:{fontSize:18,fontWeight:700}},t("reports.title")),
        E("p",{style:{color:"var(--t2)",fontSize:13,marginTop:4}},
          t("reports.businessDate",date,new Date().toLocaleString())),
        signedOff&&E("div",{style:{fontSize:12,color:"var(--green-t)",marginTop:4}},
          t("reports.auditorLbl"),E("strong",null,auditorName),t("reports.nightMgrLbl"),E("strong",null,nightMgrName)),
        E("div",{style:{marginTop:8,display:"flex",gap:8,justifyContent:"center"}},
          E("span",{className:`bdg ${balanced?"bgreen":"bred"}`},balanced?t("reports.balanced"):t("reports.discrepancy")),
          E("span",{className:`bdg ${auditStatus==="Closed"?"bgreen":auditStatus==="Approved"?"bblue":auditStatus==="Submitted for Review"?"bamber":"bgray"}`},statusLabel(auditStatus))),
        E("div",{style:{marginTop:10,fontSize:14,fontWeight:700}},
          t("reports.totalSettled"),": ",t("common.sar")," ",fmt(totalSettled),
          E("span",{style:{fontWeight:400,color:"var(--t2)",fontSize:12}}," · ",t("reconcile.settledTxns",totalSettledCount,pluralSuffix(totalSettledCount))))),
      E("div",{className:"card-title"},t("reports.cardRecon")),
      E("table",{className:"t",style:{marginBottom:20}},
        E("thead",null,E("tr",null,
          E("th",null,t("reports.card")),E("th",{className:"r"},t("reports.opera")),E("th",{className:"r"},t("reports.txns")),
          E("th",{className:"r"},t("reports.machines")),E("th",{className:"r"},t("reports.machTxns")),
          E("th",{className:"r"},t("reports.plo")),E("th",{className:"r"},t("reports.ploTxns")),
          E("th",{className:"r"},t("reports.discCol")),E("th",null,t("reports.status")))),
        E("tbody",null,CARDS.map(c=>{
          const d=disc[c.code],ok=Math.abs(d)<0.01;
          const cd=countDisc[c.code],cntOk=Math.abs(cd)<1;
          let badge;
          if(ok&&cntOk)badge=E("span",{className:"bdg bgreen"},t("reports.ok"));
          else if(!ok&&!cntOk)badge=E("span",{className:"bdg bred"},t("reports.amountCountOff"));
          else if(!ok)badge=E("span",{className:"bdg bred"},t("reports.amountOff"));
          else badge=E("span",{className:"bdg bamber"},t("reports.countOff"));
          return E("tr",{key:c.code},
            E("td",{style:{fontWeight:700}},c.full),
            E("td",{className:"r"},t("common.sar")," ",fmt(operaTot[c.code])),
            E("td",{className:"r",style:{color:"var(--t2)"}},operaCounts[c.code]||t("common.dash")),
            E("td",{className:"r"},t("common.sar")," ",fmt(machSums[c.code])),
            E("td",{className:"r",style:{color:cntOk?"var(--t2)":"var(--red-t)"}},machCounts[c.code]||t("common.dash")),
            E("td",{className:"r"},ploSums[c.code]>0?`${t("common.sar")} ${fmt(ploSums[c.code])}`:t("common.dash")),
            E("td",{className:"r",style:{color:"var(--t2)"}},ploCounts[c.code]||t("common.dash")),
            E("td",{className:`r ${ok?"dok":"derr"}`},ok?t("common.dash"):fmt(d)),
            E("td",null,badge));
        }),
        E("tr",{style:{fontWeight:700,borderTop:"2px solid var(--border2)"}},
          E("td",null,t("reports.total")),
          E("td",{className:"r"},t("common.sar")," ",fmt(gOpera)),
          E("td",{className:"r"},CARDS.reduce((s,c)=>s+(operaCounts[c.code]||0),0)),
          E("td",{className:"r"},t("common.sar")," ",fmt(CARDS.reduce((s,c)=>s+machSums[c.code],0))),
          E("td",{className:"r"},CARDS.reduce((s,c)=>s+(machCounts[c.code]||0),0)),
          E("td",{className:"r"},t("common.sar")," ",fmt(CARDS.reduce((s,c)=>s+ploSums[c.code],0))),
          E("td",{className:"r"},CARDS.reduce((s,c)=>s+(ploCounts[c.code]||0),0)),
          E("td",{className:`r ${balanced?"dok":"derr"}`},balanced?t("common.dash"):fmt(totalDisc)),
          E("td",null,balanced?E("span",{className:"bdg bgreen"},t("reports.balancedBadge")):E("span",{className:"bdg bred"},t("reports.discrepancyBadge")))))),
      E("div",{className:"card-title"},t("reports.cashDrop")),
      E("p",{style:{fontSize:11,color:"var(--t3)",marginTop:-6,marginBottom:10}},
        t("reports.toleranceNote",CASH_TOLERANCE)),
      E("table",{className:"t",style:{marginBottom:20}},
        E("thead",null,E("tr",null,
          E("th",null,t("reports.agent")),E("th",{className:"r"},t("reports.operaDrop")),
          E("th",{className:"r"},t("reports.physicalCount")),E("th",{className:"r"},t("reports.variance")),E("th",null,t("reports.status")))),
        E("tbody",null,cashByAgent.map(a=>{
          const od=a.cred-a.deb,ph=toNum(cashPhys[a.id]),v=ph-od;
          const has=cashPhys[a.id]!=null&&cashPhys[a.id]!=="";
          const st=cashStatus(v,has),meta=CASH_STATUS_META[st];
          return E("tr",{key:a.id},
            E("td",{style:{fontWeight:700}},a.name),
            E("td",{className:"r"},t("common.sar")," ",fmt(od)),
            E("td",{className:"r"},has?`${t("common.sar")} ${fmt(ph)}`:t("common.dash")),
            E("td",{className:"r",style:{color:meta.color}},has?(st==="match"?t("common.dash"):`${t("common.sar")} ${fmt(v)}`):t("common.dash")),
            E("td",null,E("span",{className:`bdg ${meta.badgeClass}`},cashStatusLabel(st))));
        }),
        E("tr",{style:{fontWeight:700,borderTop:"2px solid var(--border2)"}},
          E("td",null,t("reports.total")),
          E("td",{className:"r"},t("common.sar")," ",fmt(cashByAgent.reduce((s,a)=>s+a.cred-a.deb,0))),
          E("td",{className:"r"},t("common.sar")," ",fmt(totalPhys)),
          E("td",{className:"r"},Math.abs(totalPhys-cashByAgent.reduce((s,a)=>s+a.cred-a.deb,0))<0.01?t("common.dash"):`${t("common.sar")} ${fmt(totalPhys-cashByAgent.reduce((s,a)=>s+a.cred-a.deb,0))}`),
          E("td",null)))),
      cashByAgent.length>0&&!cashBalanced&&E("p",{style:{fontSize:11,color:"var(--red-t)",marginTop:-14,marginBottom:16}},
        t("reconcile.cashNotReconciledNote")),
      /* BRIEF-NIGHT-AUDIT-2 Phase N2 — non-card settlements: no terminal/PLO
         second source, listed here (as in the reconciled workbook's Summary
         tab) for a complete night total, not a variance check. */
      E("div",{className:"card-title"},t("reports.nonCardSettlements")),
      E("table",{className:"t",style:{marginBottom:20}},
        E("thead",null,E("tr",null,E("th",null,t("reconcile.cardType")),E("th",{className:"r"},t("reconcile.txns")),E("th",{className:"r"},t("reports.total")))),
        E("tbody",null,SETTLEMENTS.map(s=>E("tr",{key:s.code},
          E("td",{style:{fontWeight:700}},s.full),
          E("td",{className:"r",style:{color:"var(--t2)"}},nonCardCounts[s.code]||t("common.dash")),
          E("td",{className:"r"},t("common.sar")," ",fmt(nonCardSums[s.code])))),
        E("tr",{style:{fontWeight:700,borderTop:"2px solid var(--border2)"}},
          E("td",null,t("reports.total")),
          E("td",{className:"r"},SETTLEMENTS.reduce((a,s)=>a+(nonCardCounts[s.code]||0),0)),
          E("td",{className:"r"},t("common.sar")," ",fmt(SETTLEMENTS.reduce((a,s)=>a+nonCardSums[s.code],0)))))),
      signedOff
        ?E("div",{style:{marginTop:28,borderTop:"1px solid var(--border)",paddingTop:16,display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:40}},
            [[t("reports.nightAuditor"),auditorName,submittedAt?new Date(submittedAt).toLocaleString():""],
             [t("reports.nightManager"),nightMgrName,approvedAt?new Date(approvedAt).toLocaleString():""],
             [t("reports.openFlagsAck"),openFlagsAck.length?t("reports.itemsCount",openFlagsAck.length):t("reports.none"),""]
            ].map(([label,val,ts])=>E("div",{key:label},
              E("div",{style:{fontSize:11,color:"var(--t2)",marginBottom:4,textTransform:"uppercase",letterSpacing:".05em"}},label),
              E("div",{style:{fontWeight:700}},val||"—"),
              ts&&E("div",{style:{fontSize:11,color:"var(--t3)"}},ts))))
        :E("div",{style:{marginTop:28,borderTop:"1px solid var(--border)",paddingTop:14,display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:48}},
            [t("reports.nightAuditor"),t("reports.nightManager"),t("reports.dateTime")].map(l=>E("div",{key:l},
              E("div",{style:{borderBottom:"1px solid var(--t1)",marginBottom:5,paddingBottom:22}}),
              E("p",{style:{fontSize:11,color:"var(--t2)"}},l)))));
  }

  function JournalReport(){
    const allGroups={};
    /* Every row type — payments AND charges/taxes — goes in the Final Journal,
       so a checked-off room charge or VAT line has a record in the signed-off
       document, not just in the live in-app Journal. */
    rows.forEach(r=>{
      if(!allGroups[r._agentId])allGroups[r._agentId]={id:r._agentId,name:r._agent,rows:[]};
      allGroups[r._agentId].rows.push(r);
    });
    const groups=Object.values(allGroups).sort((a,b)=>Number(a.id)-Number(b.id));
    const resolvedCorrs=Object.entries(corrLinks).filter(([,v])=>v.reversalTrxNo);

    return E("div",{className:`report-section report-section-break${isDraft?" draft-bg":""}`,ref:journalRef},
      E("div",{className:"card"},
        E("div",{style:{textAlign:"center",marginBottom:18,borderBottom:"2px solid var(--border)",paddingBottom:14}},
          isDraft&&E("div",{className:"draft-stamp",style:{fontSize:15,letterSpacing:6}},t("reports.draftStampPlain")),
          E("h2",{style:{fontSize:18,fontWeight:700}},t("reports.journalTitle")),
          E("p",{style:{color:"var(--t2)",fontSize:13,marginTop:4}},
            t("reports.businessDate",date,new Date().toLocaleString())),
          signedOff&&E("div",{style:{fontSize:12,color:"var(--green-t)",marginTop:4}},
            t("reports.auditorLbl"),E("strong",null,auditorName),t("reports.nightMgrLbl"),E("strong",null,nightMgrName))),
        groups.map(group=>{
          const cashSub=group.rows.filter(r=>r._isCash).reduce((s,r)=>s+r._credit-r._debit,0);
          const hasCash=group.rows.some(r=>r._isCash);
          return E("div",{key:group.id,className:"cashier-block",style:{marginBottom:22}},
            E("div",{style:{display:"flex",alignItems:"center",gap:8,padding:"5px 0",borderBottom:"2px solid var(--border2)",marginBottom:5}},
              E("span",{style:{fontWeight:800,fontFamily:"monospace",fontSize:13}},group.id),
              E("span",{style:{fontWeight:600,color:"var(--t2)",fontSize:12}},group.name),
              E("span",{style:{marginLeft:"auto",fontSize:11,color:"var(--t2)"}},t("reports.txCount",group.rows.length))),
            E("div",{style:{overflowX:"auto"}},
              /* table-layout:fixed + per-column widths keeps every column on the
                 page; long Guest/Description/Comment text wraps onto a second
                 line instead of being ellipsis-clipped (where the cut-off "important
                 comments" were disappearing) or pushing the table wider than the
                 printed page. */
              E("table",{className:"t pdf-journal-tbl",style:{fontSize:10.5,tableLayout:"fixed",width:"100%"}},
                E("colgroup",null,
                  E("col",{style:{width:"7%"}}),E("col",{style:{width:"6%"}}),E("col",{style:{width:"5%"}}),
                  E("col",{style:{width:"12%"}}),E("col",{style:{width:"6%"}}),E("col",{style:{width:"14%"}}),
                  E("col",{style:{width:"9%"}}),E("col",{style:{width:"7%"}}),E("col",{style:{width:"7%"}}),
                  E("col",{style:{width:"6%"}}),E("col",{style:{width:"4%"}}),E("col",{style:{width:"17%"}})),
                E("thead",null,E("tr",null,
                  E("th",null,t("reports.date")),E("th",null,t("reports.time")),E("th",null,t("reports.room")),E("th",null,t("reports.guest")),
                  E("th",null,t("reports.trx")),E("th",null,t("reports.description")),E("th",null,t("reports.cardRef")),
                  E("th",{className:"r"},t("reports.debit")),E("th",{className:"r"},t("reports.credit")),
                  E("th",null,t("reports.receipt")),E("th",null,t("reports.st")),E("th",null,t("reports.comment")))),
                E("tbody",null,group.rows.map(r=>{
                  const state=checks[r._trxNo]?.state;
                  const comment=checks[r._trxNo]?.comment||"";
                  return E("tr",{key:r._trxNo,style:{background:state==="flagged"?"#fef2f2":state==="checked"?"#f0fdf4":undefined}},
                    E("td",null,r._date),E("td",null,r._time),
                    E("td",{style:{fontWeight:700,fontFamily:"monospace"}},r._room),
                    E("td",{style:{wordBreak:"break-word",whiteSpace:"normal"}},r._guest),
                    E("td",{style:{fontFamily:"monospace",wordBreak:"break-word"}},r._code),
                    E("td",{style:{wordBreak:"break-word",whiteSpace:"normal"}},r._desc),
                    E("td",{style:{fontFamily:"monospace",wordBreak:"break-word"}},r._last4?`••••${r._last4}`:(r._chequeRef||"")),
                    E("td",{className:"r",style:{color:r._debit<0?"var(--red-t)":undefined}},r._debit?fmt(r._debit):t("common.dash")),
                    E("td",{className:"r",style:{color:r._credit<0?"var(--red-t)":undefined}},r._credit?fmt(r._credit):t("common.dash")),
                    E("td",{style:{fontFamily:"monospace",wordBreak:"break-word"}},r._receipt),
                    E("td",null,state==="checked"?E("span",{className:"bdg bgreen",style:{fontSize:9}},"✓"):state==="flagged"?E("span",{className:"bdg bred",style:{fontSize:9}},"⚑"):t("common.dash")),
                    E("td",{style:{wordBreak:"break-word",whiteSpace:"normal",fontStyle:comment?"italic":"normal",color:state==="flagged"?"var(--red-t)":"var(--t2)"}},comment||""));
                })),
                hasCash&&E("tfoot",null,E("tr",null,
                  E("td",{colSpan:7,style:{fontWeight:700}},t("reports.cashSubtotal",group.name)),
                  E("td",{className:"r",style:{fontWeight:700}},group.rows.filter(r=>r._isCash).reduce((s,r)=>s+r._debit,0)?fmt(group.rows.filter(r=>r._isCash).reduce((s,r)=>s+r._debit,0)):t("common.dash")),
                  E("td",{className:"r",style:{fontWeight:700}},fmt(group.rows.filter(r=>r._isCash).reduce((s,r)=>s+r._credit,0))),
                  E("td",{colSpan:3,style:{fontWeight:700,color:cashSub>=0?"var(--green-t)":"var(--red-t)"}},t("reports.netDrop",fmt(cashSub))))))));
        }),
        resolvedCorrs.length>0&&E("div",{style:{marginTop:18,borderTop:"2px solid var(--border2)",paddingTop:14}},
          E("div",{className:"card-title"},t("reports.correctionsSummary")),
          resolvedCorrs.map(([origTrxNo,link])=>{
            const origRow=rows.find(r=>r._trxNo===origTrxNo);
            const revRow=rows.find(r=>r._trxNo===link.reversalTrxNo);
            if(!origRow||!revRow)return null;
            return E("div",{key:origTrxNo,style:{background:"var(--amber-bg)",border:"1px solid #fed7aa",borderRadius:5,padding:"8px 12px",marginBottom:6,fontSize:12}},
              E("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:4}},
                E("div",{style:{fontWeight:700,color:"var(--amber-t)"}},t("reports.roomGuest",origRow._room,origRow._guest)),
                E("span",{className:`bdg ${isSelfCorrection(link,origRow,rows)?"bgray":"bamber"}`,style:{fontSize:9}},
                  isSelfCorrection(link,origRow,rows)?t("reports.selfCorrectedByAgent"):t("reports.flaggedThenCorrected"))),
              E("div",{style:{color:"var(--red-t)",marginBottom:3}},
                t("reports.original"),origRow._date," ",origRow._time," · ",origRow._desc,
                origRow._debit?" Dr "+fmt(origRow._debit):"",origRow._credit?" Cr "+fmt(origRow._credit):"",
                checks[origTrxNo]?.comment?" — "+checks[origTrxNo].comment:""),
              E("div",null,t("reports.reversal"),revRow._date," ",revRow._time," · ",revRow._desc,
                revRow._debit?" Dr "+fmt(revRow._debit):"",revRow._credit?" Cr "+fmt(revRow._credit):""));
          })),
        unresolvedFlags.length>0&&E("div",{style:{marginTop:14,borderTop:"1px solid var(--border)",paddingTop:10}},
          E("div",{style:{fontWeight:700,color:"var(--red-t)",marginBottom:6}},t("reports.openFlagsUnresolved")),
          unresolvedFlags.map(r=>E("div",{key:r._trxNo,style:{fontSize:12,marginBottom:3,color:"var(--red-t)"}},
            "⚑ ",r._date," ",r._room," · ",r._guest," · ",E("em",null,checks[r._trxNo]?.comment||t("app.noComment")))))));
  }

  return E("div",null,
    E("div",{className:"no-print",style:{display:"flex",gap:10,marginBottom:14,flexWrap:"wrap",alignItems:"center"}},
      E("div",{className:"report-tabs"},
        E("button",{className:`report-tab${reportType==="summary"?" on":""}`,onClick:()=>scrollTo(summaryRef,"summary")},t("reports.tabSummary")),
        E("button",{className:`report-tab${reportType==="journal"?" on":""}`,onClick:()=>scrollTo(journalRef,"journal")},t("reports.tabJournal"))),
      E("button",{className:"btn primary",onClick:exportPDF},
        E("i",{className:"ti ti-file-download"}),t("reports.savePdf")),
      E("button",{className:"btn",onClick:exportXLSX},
        E("i",{className:"ti ti-file-spreadsheet"}),t("reports.saveExcel")),
      E("button",{className:"btn",onClick:()=>window.print()},
        E("i",{className:"ti ti-printer"}),t("reports.print")),
      E("button",{className:"btn",onClick:()=>{
        const s=stateRef.current;
        const payload=buildPayload(s);
        const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
        const a=document.createElement("a");a.href=URL.createObjectURL(blob);
        a.download=`NightAudit_${s.date}.json`;a.click();
      }},E("i",{className:"ti ti-download"}),t("reports.exportJson")),
      E("span",{style:{fontSize:11,color:"var(--t3)"}},
        t("reports.footnote"),dirHandle?t("reports.writtenToFolder"):t("reports.downloaded"))),
    E("div",{ref:reportRef},
      E(SummaryReport,null),
      E(JournalReport,null)));
}
