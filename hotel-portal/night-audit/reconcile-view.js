/* ── Reconcile View — also the guided "Submit the audit" flow
   (BRIEF-NIGHT-AUDIT-2 Phase N1): steps 1-6, each gating the next.
   Steps 1 (journal loaded) is implicit — the empty-state guard below already
   requires it. Steps 2-4 gate step 5 (submitForReview enforces this in
   app.js); step 6 (close/commit) is its own separate, later action, only
   available once step 5 (Approved) is done. ── */
function ReconcileView(p){
  useLang();
  const {rows,operaTot,operaCounts,machSums,machCounts,ploSums,ploCounts,ploList,cashPhys,disc,countDisc,totalDisc,balanced,countsBalanced,
         allCorrCount,checkedCnt,flaggedCnt,payRows,totalCash,auditStatus,
         cashByAgent,auditorName,auditorNote,setAuditorNote,
         submittedAt,nightMgrName,nightMgrNote,setNightMgrNote,
         approvedAt,unresolvedFlags,checks,openFlagsAck,date,identity,
         submitForReview,initiateApprove,saveFinished,
         submitSteps,productionConfirmedAt,productionConfirmedByName,confirmProduction,setView,
         showCloseModal,setShowCloseModal,newBusinessDate,setNewBusinessDate,
         closedAt,closedByName,
         /* BRIEF-NIGHT-AUDIT-2 Phase N2 */
         nonCardSums,nonCardCounts,totalSettled,totalSettledCount,cashBalanced,cashCountedOf}=p;
  if(!rows.length)return E("div",{className:"empty"},E("i",{className:"ti ti-upload"}),t("reconcile.empty"));
  const gOpera=CARDS.reduce((s,c)=>s+operaTot[c.code],0);
  const gMach=CARDS.reduce((s,c)=>s+machSums[c.code],0);
  const gPLO=CARDS.reduce((s,c)=>s+ploSums[c.code],0);
  const totalPhys=Object.values(cashPhys).reduce((s,v)=>s+toNum(v),0);
  const canSubmit=submitSteps.accuracyReviewed&&submitSteps.paymentsReconciled&&submitSteps.productionConfirmed;
  const missingStepsLabel=[
    !submitSteps.accuracyReviewed&&t("reconcile.stepAccuracyReviewed"),
    !submitSteps.paymentsReconciled&&t("reconcile.stepPaymentsReconciled"),
    !submitSteps.productionConfirmed&&t("reconcile.stepProduction")
  ].filter(Boolean).join(" · ");

  return E("div",null,

    /* ── Step 2: Accuracy reviewed ── */
    E("div",{className:"card-title"},
      E("i",{className:"ti ti-checkbox",style:{marginRight:6}}),t("reconcile.stepAccuracyReviewed")),
    E("div",{className:"card",style:{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}},
      E("i",{className:`ti ${submitSteps.accuracyReviewed?"ti-circle-check":"ti-circle-dashed"}`,
        style:{fontSize:20,color:submitSteps.accuracyReviewed?"var(--green)":"var(--t3)"}}),
      E("span",null,t("reconcile.accuracyReviewedNote",submitSteps.reviewedCount,rows.length)),
      !submitSteps.accuracyReviewed&&E("span",{style:{marginLeft:"auto",fontSize:12,color:"var(--t3)"}},t("reconcile.accuracyNotReviewed"))),

    /* ── Step 3: Payments reconciled ── */
    E("div",{className:"card-title",style:{marginTop:22}},
      E("i",{className:"ti ti-scale",style:{marginRight:6}}),t("reconcile.stepPaymentsReconciled")),

    /* BRIEF-NIGHT-AUDIT-2 Phase N2 — headline figure first, mirroring the
       reconciled workbook's own Summary tab: every payment type (cards, cash,
       City Ledger, ALL Reward, Expedia) net of any debit. */
    E("div",{className:"grid"},
      E("div",{className:"metric"},
        E("div",{className:"mlabel"},t("reconcile.totalSettled")),
        E("div",{className:"mval"},t("common.sar")," ",fmt(totalSettled)),
        E("div",{className:"msub"},t("reconcile.settledTxns",totalSettledCount,pluralSuffix(totalSettledCount))))),

    E("div",{className:"card-title",style:{marginTop:10,fontSize:13,color:"var(--t2)"}},
      E("i",{className:"ti ti-device-desktop",style:{marginRight:6}}),t("reconcile.step1")),
    E(MachinesView,p),

    E("div",{className:"card-title",style:{marginTop:22,fontSize:13,color:"var(--t2)"}},
      E("i",{className:"ti ti-receipt",style:{marginRight:6}}),t("reconcile.step2")),
    E(PLOView,p),

    E("div",{className:"card-title",style:{marginTop:22,fontSize:13,color:"var(--t2)"}},
      E("i",{className:"ti ti-scale",style:{marginRight:6}}),t("reconcile.step3")),

    E("div",{className:"grid"},
      E("div",{className:"metric"},
        E("div",{className:"mlabel"},t("reconcile.balanceStatus")),
        E("div",{className:"mval sm",style:{color:balanced?"var(--green-t)":"var(--red-t)"}},
          balanced?t("common.balanced"):t("reconcile.offBy",fmt(Math.abs(totalDisc))))),
      E("div",{className:"metric"},E("div",{className:"mlabel"},t("reconcile.operaCards")),E("div",{className:"mval sm"},t("common.sar")," ",fmt(gOpera))),
      E("div",{className:"metric"},E("div",{className:"mlabel"},t("reconcile.machineZReports")),E("div",{className:"mval sm"},t("common.sar")," ",fmt(gMach))),
      E("div",{className:"metric"},E("div",{className:"mlabel"},t("reconcile.plo",ploList.length)),E("div",{className:"mval sm"},t("common.sar")," ",fmt(gPLO)))),

    E("div",{className:"card np"},
      E("table",{className:"t"},
        E("thead",null,E("tr",null,
          E("th",null,t("reconcile.cardType")),E("th",{className:"r"},t("reconcile.opera")),E("th",{className:"r"},t("reconcile.txns")),
          E("th",{className:"r"},t("reconcile.machineZ")),E("th",{className:"r"},t("reconcile.machineTxns")),
          E("th",{className:"r"},t("reconcile.ploCol")),E("th",{className:"r"},t("reconcile.ploTxns")),
          E("th",{className:"r"},t("reconcile.discrepancy")),E("th",null,t("common.status")))),
        E("tbody",null,CARDS.map(c=>{
          const d=disc[c.code],ok=Math.abs(d)<0.01;
          const cd=countDisc[c.code],cntOk=Math.abs(cd)<1;
          let badge;
          if(ok&&cntOk)badge=E("span",{className:"bdg bgreen"},t("reconcile.ok"));
          else if(!ok&&!cntOk)badge=E("span",{className:"bdg bred"},t("reconcile.amountCountOff"));
          else if(!ok)badge=E("span",{className:"bdg bred"},t("reconcile.amountOff"));
          else badge=E("span",{className:"bdg bamber"},t("reconcile.countOff"));
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
        })),
        E("tfoot",null,E("tr",null,
          E("td",null,t("common.total")),
          E("td",{className:"r"},t("common.sar")," ",fmt(gOpera)),
          E("td",{className:"r"},CARDS.reduce((s,c)=>s+(operaCounts[c.code]||0),0)),
          E("td",{className:"r"},t("common.sar")," ",fmt(gMach)),
          E("td",{className:"r"},CARDS.reduce((s,c)=>s+(machCounts[c.code]||0),0)),
          E("td",{className:"r"},t("common.sar")," ",fmt(gPLO)),
          E("td",{className:"r"},CARDS.reduce((s,c)=>s+(ploCounts[c.code]||0),0)),
          E("td",{className:`r ${balanced?"dok":"derr"}`},balanced?t("common.dash"):fmt(totalDisc)),
          E("td",null,balanced?E("span",{className:"bdg bgreen"},t("reconcile.balanced")):E("span",{className:"bdg bred"},t("common.discrepancy"))))))),

    /* ── Cash per Cashier (BRIEF-NIGHT-AUDIT-2 Phase N2) ──
       No terminal to check cash against — "reconciled" means every cashier
       who posted a cash-code row (9000/9980/9235) tonight has a physical
       count within CASH_TOLERANCE. Compact summary + link to the full Cash
       tab, same pattern Step 4 uses for Production KPI. */
    E("div",{className:"card-title",style:{marginTop:22,fontSize:13,color:"var(--t2)"}},
      E("i",{className:"ti ti-cash",style:{marginRight:6}}),t("reconcile.stepCashPerCashier")),
    E("div",{className:"card"},
      E("div",{className:"grid"},
        E("div",{className:"metric"},E("div",{className:"mlabel"},t("cash.operaCashDrop")),E("div",{className:"mval sm"},t("common.sar")," ",fmt(totalCash))),
        E("div",{className:"metric"},E("div",{className:"mlabel"},t("cash.physicalCounted")),E("div",{className:"mval sm"},t("common.sar")," ",fmt(totalPhys))),
        E("div",{className:"metric"},E("div",{className:"mlabel"},t("common.status")),
          E("div",{className:"mval sm",style:{color:cashBalanced?"var(--green-t)":"var(--amber-t)"}},
            cashByAgent.length?t("reconcile.cashCountedOf",cashCountedOf,cashByAgent.length,pluralSuffix(cashByAgent.length)):t("common.dash")))),
      E("div",{style:{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap",marginTop:10}},
        E("button",{className:"btn sm",onClick:()=>setView("cash")},
          E("i",{className:"ti ti-cash"}),t("reconcile.goToCash")),
        cashByAgent.length>0&&E("span",{style:{fontSize:12,color:cashBalanced?"var(--green-t)":"var(--amber-t)",display:"flex",gap:6,alignItems:"center"}},
          E("i",{className:`ti ${cashBalanced?"ti-circle-check":"ti-alert-triangle"}`}),
          cashBalanced?t("reconcile.cashReconciledNote"):t("reconcile.cashNotReconciledNote")))),

    /* ── Non-Card Settlements (BRIEF-NIGHT-AUDIT-2 Phase N2) ──
       City Ledger / ALL Reward / Expedia — no terminal or PLO to check
       against, listed here for a complete night total only (not gated). */
    E("div",{className:"card-title",style:{marginTop:22,fontSize:13,color:"var(--t2)"}},
      E("i",{className:"ti ti-building-bank",style:{marginRight:6}}),t("reconcile.stepNonCardSettlements")),
    E("div",{className:"card np"},
      E("p",{style:{fontSize:12,color:"var(--t2)",margin:"10px 12px 0"}},t("reconcile.nonCardIntro")),
      E("table",{className:"t",style:{marginTop:8}},
        E("thead",null,E("tr",null,E("th",null,t("reconcile.cardType")),E("th",{className:"r"},t("reconcile.txns")),E("th",{className:"r"},t("common.total")))),
        E("tbody",null,SETTLEMENTS.map(s=>E("tr",{key:s.code},
          E("td",{style:{fontWeight:700}},s.full),
          E("td",{className:"r",style:{color:"var(--t2)"}},nonCardCounts[s.code]||t("common.dash")),
          E("td",{className:"r"},t("common.sar")," ",fmt(nonCardSums[s.code]))))),
        E("tfoot",null,E("tr",null,
          E("td",null,t("common.total")),
          E("td",{className:"r"},SETTLEMENTS.reduce((a,s)=>a+(nonCardCounts[s.code]||0),0)),
          E("td",{className:"r"},t("common.sar")," ",fmt(SETTLEMENTS.reduce((a,s)=>a+nonCardSums[s.code],0))))))),

    /* Acknowledgement path (BRIEF-NIGHT-AUDIT-2: "won't let Submit proceed
       with an unexplained variance unless acknowledged (logged)") — now
       covers the full card+cash model (Phase N2): while unbalanced, a
       written note is the acknowledgement path; it's saved into the audit
       record like every other note here. */
    !(balanced&&countsBalanced&&cashBalanced)&&E("div",{className:"card",style:{borderColor:"var(--amber)"}},
      E("div",{style:{fontSize:12,color:"var(--amber-t)",marginBottom:8,display:"flex",gap:6,alignItems:"center"}},
        E("i",{className:"ti ti-alert-triangle"}),t("reconcile.paymentsNotReconciled")),
      E("label",{className:"inp-label",style:{display:"block",marginBottom:4,fontSize:12,color:"var(--t2)"}},
        t("reconcile.varianceNoteLabel")),
      E("textarea",{className:"flag-textarea",rows:2,
        placeholder:t("reconcile.varianceNotePh"),
        value:auditorNote,onChange:ev=>setAuditorNote(ev.target.value),
        style:{width:"100%",maxWidth:520,resize:"vertical"}})),
    balanced&&countsBalanced&&cashBalanced&&E("div",{style:{fontSize:12,color:"var(--green-t)",display:"flex",gap:6,alignItems:"center",margin:"4px 0 0"}},
      E("i",{className:"ti ti-circle-check"}),t("reconcile.paymentsReconciledNote")),

    /* ── Step 4: Production KPI confirmed ── */
    E("div",{className:"card-title",style:{marginTop:22}},
      E("i",{className:"ti ti-chart-bar",style:{marginRight:6}}),t("reconcile.stepProduction")),
    E("div",{className:"card"},
      E("p",{style:{fontSize:12,color:"var(--t2)",marginTop:0}},t("reconcile.productionIntro")),
      E("div",{style:{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}},
        E("button",{className:"btn sm",onClick:()=>setView("production")},
          E("i",{className:"ti ti-chart-bar"}),t("reconcile.goToProduction")),
        productionConfirmedAt
          ?E("span",{style:{fontSize:12,color:"var(--green-t)",display:"flex",gap:6,alignItems:"center"}},
              E("i",{className:"ti ti-circle-check"}),
              t("reconcile.productionConfirmedBy"),E("strong",null,productionConfirmedByName),
              E("span",{style:{color:"var(--t3)"}}," · ",new Date(productionConfirmedAt).toLocaleString()))
          :E("button",{className:"btn primary sm",onClick:confirmProduction,disabled:!identity?.currentEntry},
              E("i",{className:"ti ti-circle-check"}),t("reconcile.confirmProduction")))),

    E("div",{className:"card"},
      E("div",{className:"card-title"},t("reconcile.summary")),
      E("div",{className:"grid"},
        E("div",{className:"metric"},E("div",{className:"mlabel"},t("reconcile.transactions")),E("div",{className:"mval"},rows.length)),
        E("div",{className:"metric"},E("div",{className:"mlabel"},t("reconcile.corrections")),E("div",{className:"mval",style:{color:allCorrCount?"var(--amber-t)":undefined}},allCorrCount)),
        E("div",{className:"metric"},E("div",{className:"mlabel"},t("reconcile.checked")),E("div",{className:"mval"},checkedCnt,"/",rows.length)),
        E("div",{className:"metric"},E("div",{className:"mlabel"},t("reconcile.flagged")),E("div",{className:"mval",style:{color:flaggedCnt?"var(--red-t)":undefined}},flaggedCnt)),
        E("div",{className:"metric"},E("div",{className:"mlabel"},t("reconcile.totalCash")),E("div",{className:"mval sm"},t("common.sar")," ",fmt(totalCash)))),

      E("div",{className:"card-title",style:{marginTop:8}},t("reconcile.auditStatus")),
      E("div",{className:"steps"},
        STATUSES.map(s=>E("div",{key:s,className:`step${auditStatus===s?" on":""}`},statusLabel(s)))),

      /* ── Step 5: night-manager sign-off ── */
      E("div",{className:"approval-box"},
        auditStatus==="Draft"&&E("div",null,
          E("div",{className:"card-title",style:{marginBottom:8}},t("reconcile.auditorSignOff")),
          E("div",{style:{marginBottom:10}},
            E("label",{className:"inp-label",style:{display:"block",marginBottom:4,fontSize:12,color:"var(--t2)"}},t("reconcile.noteForNightMgr")),
            E("textarea",{className:"flag-textarea",rows:2,
              placeholder:t("reconcile.auditorNotePh"),
              value:auditorNote,onChange:ev=>setAuditorNote(ev.target.value),
              style:{width:"100%",maxWidth:520,resize:"vertical"}})),
          !canSubmit&&E("div",{style:{fontSize:12,color:"var(--amber-t)",marginBottom:8,display:"flex",gap:6,alignItems:"center"}},
            E("i",{className:"ti ti-alert-triangle"}),t("toast.stepsIncomplete",missingStepsLabel)),
          E("div",{className:"approval-row"},
            E("span",{className:"inp-label",style:{marginBottom:0,whiteSpace:"nowrap"}},t("reconcile.auditorLabel")),
            E("strong",{style:{flex:1}},identity?.currentEntry?.displayName||"—"),
            E("button",{className:"btn primary sm",onClick:submitForReview,disabled:!identity?.currentEntry||!canSubmit,
              title:!canSubmit?t("toast.stepsIncomplete",missingStepsLabel):undefined},
              E("i",{className:"ti ti-send"}),t("reconcile.submitForReview")))),

        auditStatus==="Submitted for Review"&&E("div",null,
          E("div",{style:{fontSize:12,color:"var(--green-t)",marginBottom:10,display:"flex",gap:6,alignItems:"center"}},
            E("i",{className:"ti ti-circle-check"}),
            t("reconcile.submittedBy"),E("strong",null,auditorName),
            submittedAt&&E("span",{style:{color:"var(--t3)"}}," · ",new Date(submittedAt).toLocaleString())),
          auditorNote&&E("div",{style:{fontSize:12,background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:6,padding:"8px 12px",marginBottom:10,color:"var(--t2)"}},
            E("span",{style:{fontWeight:700,color:"var(--t1)",display:"block",marginBottom:2}},E("i",{className:"ti ti-notes",style:{marginRight:4}}),t("reconcile.auditorNoteLabel")),
            auditorNote),
          E("div",{className:"card-title",style:{marginBottom:8}},t("reconcile.nightMgrApproval")),
          unresolvedFlags.length>0&&E("div",{className:"open-flags-box"},
            E("div",{style:{fontWeight:700,color:"var(--red-t)",marginBottom:6,fontSize:12}},
              E("i",{className:"ti ti-alert-triangle"}),
              " ",t("reconcile.unresolvedFlags",unresolvedFlags.length,pluralSuffix(unresolvedFlags.length))),
            E("ul",null,unresolvedFlags.map(r=>
              E("li",{key:r._trxNo,style:{marginBottom:2,marginLeft:16}},
                E("span",{style:{fontFamily:"monospace",fontSize:11}},r._trxNo," · "),
                r._room," · ",trunc(r._guest,18)," · ",E("em",null,checks[r._trxNo]?.comment||t("app.noComment")))))),
          E("div",{style:{marginBottom:10}},
            E("label",{className:"inp-label",style:{display:"block",marginBottom:4,fontSize:12,color:"var(--t2)"}},t("reconcile.nightMgrNoteLabel")),
            E("textarea",{className:"flag-textarea",rows:2,
              placeholder:t("reconcile.nightMgrNotePh"),
              value:nightMgrNote,onChange:ev=>setNightMgrNote(ev.target.value),
              style:{width:"100%",maxWidth:520,resize:"vertical"}})),
          E("div",{className:"approval-row"},
            E("span",{className:"inp-label",style:{marginBottom:0,whiteSpace:"nowrap"}},t("reconcile.nightMgrLabel")),
            E("span",{style:{flex:1,fontSize:12,color:"var(--t2)"}},t("reconcile.signaturePinNote")),
            E("button",{className:"btn success sm",onClick:initiateApprove},
              E("i",{className:"ti ti-circle-check"}),t("reconcile.approveAudit")))),

        (auditStatus==="Approved"||auditStatus==="Closed")&&E("div",null,
          E("div",{style:{fontSize:12,color:"var(--green-t)",marginBottom:4,display:"flex",gap:6,alignItems:"center"}},
            E("i",{className:"ti ti-circle-check"}),
            t("reconcile.submittedBy"),E("strong",null,auditorName),
            submittedAt&&E("span",{style:{color:"var(--t3)"}}," · ",new Date(submittedAt).toLocaleString())),
          auditorNote&&E("div",{style:{fontSize:12,background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:6,padding:"8px 12px",marginBottom:8,color:"var(--t2)"}},
            E("span",{style:{fontWeight:700,color:"var(--t1)",display:"block",marginBottom:2}},E("i",{className:"ti ti-notes",style:{marginRight:4}}),t("reconcile.auditorNoteLabel")),
            auditorNote),
          E("div",{style:{fontSize:12,color:"var(--green-t)",marginBottom:4,display:"flex",gap:6,alignItems:"center"}},
            E("i",{className:"ti ti-circle-check"}),
            t("reconcile.approvedBy"),E("strong",null,nightMgrName),
            approvedAt&&E("span",{style:{color:"var(--t3)"}}," · ",new Date(approvedAt).toLocaleString())),
          nightMgrNote&&E("div",{style:{fontSize:12,background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:6,padding:"8px 12px",color:"var(--t2)"}},
            E("span",{style:{fontWeight:700,color:"var(--t1)",display:"block",marginBottom:2}},E("i",{className:"ti ti-notes",style:{marginRight:4}}),t("reconcile.nightMgrNoteLabel2")),
            nightMgrNote))),

      /* ── Step 6: close — change business date → commit ──
         Only reachable once step 5 (Approved) is done; a separate, later
         action (BUSINESS-DATE.md), can be a different Night Manager. */
      (auditStatus==="Approved"||auditStatus==="Closed")&&E("div",{className:"card",style:{marginTop:14,borderColor:auditStatus==="Closed"?"var(--green)":"var(--blue)"}},
        E("div",{className:"card-title"},
          E("i",{className:"ti ti-flag-3",style:{marginRight:6}}),t("reconcile.stepClose")),
        auditStatus==="Closed"
          ?E("div",{style:{fontSize:12,color:"var(--green-t)",display:"flex",flexDirection:"column",gap:4}},
              E("div",{style:{display:"flex",gap:6,alignItems:"center"}},
                E("i",{className:"ti ti-circle-check"}),
                E("strong",null,t("reconcile.closedRolledTo",newBusinessDate||"—"))),
              E("div",{style:{color:"var(--t2)"}},
                t("reconcile.closedByLabel"),E("strong",null,closedByName),
                closedAt&&E("span",{style:{color:"var(--t3)"}}," · ",new Date(closedAt).toLocaleString())))
          :E("div",null,
              E("p",{style:{fontSize:12,color:"var(--t2)",marginTop:0}},t("reconcile.closeIntro")),
              E("div",{className:"approval-row"},
                E("span",{className:"inp-label",style:{marginBottom:0,whiteSpace:"nowrap"}},t("reconcile.closingBusinessDate")),
                E("strong",null,date)),
              E("div",{className:"approval-row"},
                E("span",{className:"inp-label",style:{marginBottom:0,whiteSpace:"nowrap"}},t("reconcile.newBusinessDateLabel")),
                E("input",{type:"date",className:"inp",
                  value:newBusinessDate||addDaysISO(date,1),
                  onChange:ev=>setNewBusinessDate(ev.target.value)})),
              E("div",{className:"approval-row"},
                E("span",{style:{flex:1,fontSize:12,color:"var(--t2)"}},t("reconcile.closeSignatureNote")),
                E("button",{className:"btn success sm",onClick:()=>setShowCloseModal(true)},
                  E("i",{className:"ti ti-flag-3"}),t("reconcile.closeAndConfirm"))))),

      E("button",{className:"btn primary",style:{marginTop:12},onClick:saveFinished,disabled:auditStatus==="Closed"},
        E("i",{className:"ti ti-device-floppy"}),t("reconcile.saveAudit",date))));
}
