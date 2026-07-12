/* ── Journal View ── */
function JournalView(p){
  useLang();
  const {rows,focusedTrxNo,setFocusedTrxNo,payRows,chargeRows,taxLinks,checkedCnt,flaggedCnt,
         cardRows,cashRows,allCorrCount,ploList,newTrxNos,jFilter,setJFilter,
         cashierGroups,cashierProgress,checks,setChecks,ploPickFor,setPloPickFor,
         expandedFlag,setExpandedFlag,corrLinks,setCorrLinks,corrPickFor,setCorrPickFor,
         cycleCheck,setFlagComment,tagPLO,linkCorrection,checkAllVisible,
         jRowsRef,checksRef,resyncRef,handleResync,rowRefsMap}=p;
  /* rowRefs is App's rowRefsMap — App owns it so the keyboard handler can scroll
     immediately without waiting for a React render. JournalView just populates it. */
  const rowRefs=rowRefsMap;
  /* Reverse lookup: TRX_NO of a reversal/correction → the original TRX_NO it's linked from.
     Lets a correction row that's already accounted for skip both the Flag and Link prompts. */
  const reversalIndex=useMemo(()=>{
    const m={};
    Object.entries(corrLinks).forEach(([orig,v])=>{if(v?.reversalTrxNo)m[v.reversalTrxNo]=orig;});
    return m;
  },[corrLinks]);
  /* After any React render (e.g. checking a row), re-apply the row-focused class to
     whatever row moveFocus() last highlighted. React reconciliation replaces the full
     className string so it can wipe a class we added via DOM — this corrects that. */
  useEffect(()=>{
    const t=focusedTrxNo;
    if(t&&rowRefs.current[t])rowRefs.current[t].classList.add("row-focused");
  });

  if(!rows.length)return E("div",{className:"empty"},E("i",{className:"ti ti-upload"}),t("journal.empty"));

  const pct=rows.length?Math.round(checkedCnt/rows.length*100):0;
  const filtersArr=[
    {id:"all",label:t("journal.filterAll",rows.length)},
    {id:"unchecked",label:t("journal.filterUnchecked",rows.length-checkedCnt)},
    {id:"payments",label:t("journal.filterPayments",payRows.length)},
    {id:"charges",label:t("journal.filterCharges",chargeRows.length)},
    {id:"cards",label:t("journal.filterCards",cardRows.length)},
    {id:"cash",label:t("journal.filterCash",cashRows.length)},
    {id:"corrections",label:t("journal.filterCorrections",allCorrCount)},
    {id:"plo",label:t("journal.filterPlo",ploList.length)},
  ];
  if(flaggedCnt>0)filtersArr.push({id:"flagged",label:t("journal.filterFlagged",flaggedCnt)});
  if(newTrxNos.size>0)filtersArr.push({id:"new",label:t("journal.filterNew",newTrxNos.size)});

  const tableRows=[];
  cashierGroups.forEach(group=>{
    const prog=cashierProgress[group.id]||{checked:0,flagged:0,total:0};
    const pct2=prog.total?Math.round((prog.checked+prog.flagged)/prog.total*100):0;
    tableRows.push(E("tr",{key:"hdr-"+group.id,className:"cashier-hdr"},
      E("td",{colSpan:15},
        E("div",{className:"cashier-hdr-inner"},
          E("i",{className:"ti ti-user",style:{color:"var(--t3)",fontSize:12}}),
          E("span",{className:"cashier-id"},group.id),
          E("span",{className:"cashier-name"},group.name),
          E("div",{className:"cashier-progress"},
            prog.flagged>0&&E("span",{className:"bdg bred",style:{fontSize:10}},t("journal.nFlagged",prog.flagged)),
            E("span",null,prog.checked,"/",prog.total," ",t("reconcile.checked")),
            E("div",{className:"cashier-pbar"},E("div",{className:"cashier-pfill",style:{width:pct2+"%"}})))))));

    const groupTrxSet=new Set(group.rows.map(r=>r._trxNo));

    group.rows.forEach(r=>{
      /* This tax line's parent charge is also visible in this group → it'll be
         rendered as a sub-row directly under that charge instead of standalone. */
      const taxParentTrxNo=taxLinks.byTax[r._trxNo];
      if(taxParentTrxNo&&groupTrxSet.has(taxParentTrxNo))return;

      const pairedTaxes=(taxLinks.byCharge[r._trxNo]||[]).filter(t=>groupTrxSet.has(t._trxNo));
      const hasPairedTaxes=pairedTaxes.length>0;
      const state=checks[r._trxNo]?.state;
      const comment=checks[r._trxNo]?.comment||"";
      const isPLO=checks[r._trxNo]?.plo;
      const ploType=checks[r._trxNo]?.ploType;
      const picking=ploPickFor===r._trxNo;
      const isFocused=focusedTrxNo===r._trxNo;
      const isNew=newTrxNos.has(r._trxNo);
      const link=corrLinks[r._trxNo];
      const reversalOfTrxNo=reversalIndex[r._trxNo];
      const corrPicking=corrPickFor===r._trxNo;
      /* Any card/correction row not yet accounted for can be linked straight away —
         no need to flag something that isn't actually wrong (e.g. the agent already
         voided and re-posted it correctly; we just want the pairing on record). */
      const canDirectLink=(r._isCard||r._isCorr)&&!link?.reversalTrxNo&&!reversalOfTrxNo;

      let rowClass="row-j";
      if(isFocused)rowClass+=" row-focused";
      else if(state==="flagged")rowClass+=" row-flagged";
      else if(state==="checked")rowClass+=" row-checked";
      if(isNew)rowClass+=" row-new";
      if(link?.reversalTrxNo)rowClass+=" row-resolved";

      tableRows.push(E("tr",{
        key:r._trxNo,
        ref:el=>{if(el)rowRefs.current[r._trxNo]=el;},
        className:rowClass,
        onClick:ev=>{
          if(ev.target.tagName==="INPUT"||ev.target.tagName==="BUTTON"||ev.target.tagName==="TEXTAREA")return;
          setFocusedTrxNo(r._trxNo);
          const next=cycleCheck(r._trxNo);
          if(next==="checked"){
            const vis=jRowsRef.current;
            const idx=vis.findIndex(x=>x._trxNo===r._trxNo);
            const nu=vis.find((x,i)=>i>idx&&checksRef.current[x._trxNo]?.state!=="checked");
            if(nu)setTimeout(()=>setFocusedTrxNo(nu._trxNo),0);
          }
          if(state==="flagged"&&next!=="flagged")setExpandedFlag(null);
        }
      },
        E("td",{style:{textAlign:"center",userSelect:"none"}},
          E("div",{
            className:`chk3${state==="checked"?" checked":state==="flagged"?" flagged":""}`,
            onClick:ev=>{
              ev.stopPropagation();
              if(state==="flagged"){setExpandedFlag(prev=>prev===r._trxNo?null:r._trxNo);}
              else{const next=cycleCheck(r._trxNo);setFocusedTrxNo(r._trxNo);if(next!=="flagged")setExpandedFlag(null);}
            },
            title:state==="checked"?t("journal.checkedTip"):state==="flagged"?t("journal.flaggedTip"):t("journal.verifyTip")
          },
            state==="checked"&&E("i",{className:"ti ti-check"}),
            state==="flagged"&&E("i",{className:"ti ti-flag"}),
            !state&&isNew&&E("i",{className:"ti ti-point",style:{color:"var(--blue)",fontSize:8}}))),
        E("td",{style:{fontSize:11,color:"var(--t3)"}},r._date),
        E("td",{style:{fontSize:11,color:"var(--t3)"}},r._time),
        E("td",{style:{fontWeight:700,fontFamily:"monospace",fontSize:12}},r._room),
        E("td",{style:{maxWidth:130,overflow:"hidden",textOverflow:"ellipsis"},title:r._guest},trunc(r._guest,18)),
        E("td",{style:{fontFamily:"monospace",fontSize:11,color:"var(--t3)"}},r._code),
        E("td",{style:{maxWidth:140,overflow:"hidden",textOverflow:"ellipsis"},title:r._desc},
          E("div",{style:{display:"flex",gap:4,alignItems:"center",flexWrap:"wrap"}},
            r._isCard&&BY_CODE[r._code]?E("span",{className:"bdg bblue"},BY_CODE[r._code].name)
            :r._isCash?E("span",{className:"bdg bgray"},t("journal.cash"))
            :r._isCL?E("span",{className:"bdg bgray"},t("journal.cityLedger"))
            :E("span",{className:"bdg bgray",style:{opacity:0.7,fontSize:10}},trunc(r._desc,16)),
            r._isCorr&&E("span",{className:"bdg bamber",style:{fontSize:9},title:t("journal.corrTitle")},t("journal.corrBadge")),
            hasPairedTaxes&&E("span",{className:"bdg bgray",style:{fontSize:9},
              title:t("journal.taxIncludes",pairedTaxes.length,pluralSuffix(pairedTaxes.length))+
                pairedTaxes.map(t=>`${t._desc} SAR ${fmt(t._credit||t._debit)}`).join(" · ")+
                t("journal.taxTotalIncl",fmt((r._credit||r._debit)+pairedTaxes.reduce((s,t)=>s+(t._credit||t._debit),0)))},
              pairedTaxes.length>1?t("journal.taxBadgeN",pairedTaxes.length):t("journal.taxBadge")),
            r._fxCode&&E("span",{className:"bdg bblue",style:{fontSize:9},
              title:t("journal.fxTitle",r._fxCode,fmt(r._fxFaceCredit||r._fxFaceDebit),r._fxRate,fmt(r._credit||r._debit))},
              `${r._fxCode} ${fmt(r._fxFaceCredit||r._fxFaceDebit)}`))),
        E("td",{style:{fontFamily:"monospace",fontSize:11,color:"var(--t3)"}},
          r._last4?`••••${r._last4}`:trunc(r._chequeRef,12)),
        E("td",{className:"r",style:{color:r._debit<0?"var(--red-t)":undefined,fontWeight:r._debit?600:undefined}},
          r._debit?fmt(r._debit):t("common.dash")),
        E("td",{className:"r",style:{color:r._credit<0?"var(--red-t)":undefined,fontWeight:r._credit?600:undefined}},
          r._credit?fmt(r._credit):t("common.dash")),
        E("td",{style:{fontFamily:"monospace",fontSize:11,color:"var(--t3)"}},r._agentId),
        E("td",{style:{fontSize:11}},trunc(r._userName,12)),
        E("td",{style:{fontFamily:"monospace",fontSize:11,color:"var(--t3)"}},r._receipt),
        E("td",{style:{position:"relative"}},
          r._isCard&&!r._isCorr&&E(React.Fragment,null,
            E("button",{
              className:`plo-btn${isPLO?" tagged":""}`,
              title:t("journal.ploKeyTip"),
              onClick:ev=>{ev.stopPropagation();setPloPickFor(picking?null:r._trxNo);}
            },isPLO?ploTypeLabel(ploType):t("journal.ploLabel")),
            picking&&E("div",{className:"plo-drop",onClick:ev=>ev.stopPropagation()},
              PLO_TYPES.map((pt,pi)=>E("div",{key:pt,className:"plo-opt",onClick:()=>tagPLO(r._trxNo,pt)},
                E("kbd",{style:{marginRight:5,opacity:.6}},pi+1),ploTypeLabel(pt))),
              isPLO&&E("div",{className:"plo-opt remove",onClick:()=>tagPLO(r._trxNo,null)},
                E("kbd",{style:{marginRight:5,opacity:.6}},"0"),t("journal.removePloTag"))))),
        E("td",{onClick:ev=>ev.stopPropagation()},
          link?.reversalTrxNo
            ?E("div",{style:{display:"flex",alignItems:"center",gap:4,flexWrap:"wrap"}},
                E("span",{className:"bdg bgreen",style:{fontSize:10}},isSelfCorrection(link,r,rows)?t("journal.selfCorrected"):t("journal.corrected")),
                E("code",{style:{fontSize:10}},link.reversalTrxNo),
                E("button",{className:"btn xs ghost",style:{fontSize:10},
                  onClick:()=>setCorrLinks(p=>{const n={...p};delete n[r._trxNo];return n;})},t("journal.unlink")))
          :reversalOfTrxNo
            ?E("span",{style:{fontSize:11,color:"var(--t3)"}},
                E("i",{className:"ti ti-corner-up-left",style:{marginRight:3}}),t("journal.linkedFrom"),E("code",{style:{fontSize:10}},reversalOfTrxNo))
          :state==="flagged"
            ?E("span",{style:{fontSize:11,color:"var(--red-t)",cursor:"pointer"},onClick:()=>setExpandedFlag(prev=>prev===r._trxNo?null:r._trxNo)},
                E("i",{className:"ti ti-flag",style:{marginRight:3}}),trunc(comment,16)||t("journal.addComment"))
            :E(React.Fragment,null,
                E("button",{className:"btn xs ghost",style:{fontSize:11},
                  onClick:()=>{setChecks(p=>({...p,[r._trxNo]:{...p[r._trxNo],state:"flagged"}}));setExpandedFlag(r._trxNo);setCorrPickFor(null);setFocusedTrxNo(r._trxNo);}},
                  E("i",{className:"ti ti-flag",style:{fontSize:11}})," ",t("journal.flagBtn")),
                canDirectLink&&E("button",{className:"btn xs ghost",style:{fontSize:11,marginLeft:4},
                  title:t("journal.linkKeyTip"),
                  onClick:()=>setCorrPickFor(prev=>prev===r._trxNo?null:r._trxNo)},
                  E("i",{className:"ti ti-link",style:{fontSize:11}})," ",t("journal.linkBtn"))))));

      /* Compact sub-row per linked tax/fee line — no checkbox of its own (checking/
         flagging the charge above already covers all of them, via the propagation
         wired up in cycleCheck / the F-key handler in app.js using taxPartners()),
         just enough detail to confirm each amount belongs with this charge. A charge
         can have more than one (e.g. "VAT 15%" + "VAT .75%" + "Municipality Fee 5%"
         all on the same room/time), so this renders the whole array. */
      pairedTaxes.forEach(taxRow=>{
        const tState=checks[taxRow._trxNo]?.state;
        let tClass="tax-subrow vat-subrow";
        if(tState==="flagged")tClass+=" row-flagged";else if(tState==="checked")tClass+=" row-checked";
        tableRows.push(E("tr",{key:taxRow._trxNo+"-tax",className:tClass},
          E("td",{style:{textAlign:"center"}},E("i",{className:"ti ti-corner-down-right",style:{fontSize:11,color:"var(--t3)"}})),
          E("td",{colSpan:4,style:{color:"var(--t3)",fontSize:11,fontStyle:"italic"}},t("journal.onChargeAbove")),
          E("td",{style:{fontFamily:"monospace",fontSize:11,color:"var(--t3)"}},taxRow._code),
          E("td",null,E("span",{className:"bdg bgray",style:{fontSize:9}},trunc(taxRow._desc,16))),
          E("td"),
          E("td",{className:"r",style:{color:"var(--t3)",fontSize:11}},taxRow._debit?fmt(taxRow._debit):t("common.dash")),
          E("td",{className:"r",style:{color:"var(--t3)",fontSize:11}},taxRow._credit?fmt(taxRow._credit):t("common.dash")),
          E("td",{colSpan:3,style:{fontFamily:"monospace",fontSize:10,color:"var(--t3)"}},taxRow._receipt?`#${taxRow._receipt}`:""),
          E("td",{colSpan:2})));
      });

      /* Flag detail panel */
      if(state==="flagged"&&expandedFlag===r._trxNo){
        const candidates=scoreCandidates(r,rows.filter(x=>x._trxNo!==r._trxNo));
        tableRows.push(E("tr",{key:r._trxNo+"-flag",className:"flag-panel"},
          E("td",{colSpan:15},
            E("div",{className:"flag-inner"},
              E("i",{className:"ti ti-flag",style:{color:"var(--red-t)",marginTop:2,flexShrink:0}}),
              E("div",{style:{flex:1}},
                E("div",{style:{fontSize:11,fontWeight:600,color:"var(--red-t)",marginBottom:4}},t("journal.describeWrong")),
                E("textarea",{
                  className:"flag-textarea",
                  placeholder:t("journal.flagPh"),
                  value:comment,rows:2,
                  onChange:ev=>setFlagComment(r._trxNo,ev.target.value)
                }),
                link?.reversalTrxNo
                  ?E("div",{style:{marginTop:6,display:"flex",gap:6,alignItems:"center",fontSize:11}},
                      E("i",{className:"ti ti-circle-check",style:{color:"var(--green-t)"}}),
                      E("span",{className:"bdg bgreen"},isSelfCorrection(link,r,rows)?t("journal.selfCorrected"):t("journal.correctionLinked")),
                      E("code",{style:{fontSize:10}},link.reversalTrxNo),
                      E("button",{className:"btn xs ghost",onClick:()=>setCorrLinks(p=>{const n={...p};delete n[r._trxNo];return n;})},
                        t("journal.unlink")))
                  :candidates.length>0&&E("div",{style:{marginTop:8}},
                      E("div",{style:{fontSize:11,fontWeight:600,color:"var(--amber-t)",marginBottom:4}},t("journal.suggestedMatches")),
                      candidates.map((cand,ci)=>E("div",{key:ci,className:"corr-candidate",
                          onClick:ev=>{ev.stopPropagation();linkCorrection(r._trxNo,cand.row._trxNo);}},
                        E("kbd",{style:{fontFamily:"monospace",fontSize:10,color:"var(--t3)",opacity:.8}},ci+1),
                        E("span",{className:"bdg bgray",style:{fontSize:10}},t("journal.score",cand.score)),
                        E("span",{style:{fontFamily:"monospace",fontSize:11}},cand.row._trxNo),
                        E("span",{style:{color:"var(--t2)"}},cand.row._date," ",cand.row._time),
                        E("span",{style:{fontWeight:700,fontFamily:"monospace",fontSize:11}},cand.row._room),
                        E("span",{style:{color:"var(--t3)",fontSize:11}},trunc(cand.row._desc,16)),
                        cand.row._debit?E("span",{style:{color:"var(--red-t)",fontFamily:"monospace",fontSize:11}},"-"+fmt(cand.row._debit)):null,
                        cand.row._credit?E("span",{style:{fontFamily:"monospace",fontSize:11}},fmt(cand.row._credit)):null,
                        E("span",{className:"bdg bgreen",style:{marginLeft:"auto",fontSize:10}},t("journal.confirmArrow")))),
                      E("button",{className:"btn xs ghost",style:{marginTop:4},
                        onClick:()=>{const v=prompt(t("journal.enterReversalPrompt"));if(v)linkCorrection(r._trxNo,v.trim());}},
                        E("i",{className:"ti ti-pencil"}),t("journal.enterManually"))),
                E("div",{style:{display:"flex",gap:6,marginTop:6}},
                  E("button",{className:"btn xs danger",onClick:()=>{setChecks(p=>({...p,[r._trxNo]:{...p[r._trxNo],state:undefined}}));setExpandedFlag(null);}},
                    E("i",{className:"ti ti-x"}),t("journal.clearFlag")),
                  E("button",{className:"btn xs",onClick:()=>setExpandedFlag(null)},t("journal.collapse"))))))));
      }

      /* Direct-link picker — links a self-corrected transaction to its match without ever flagging it */
      if(corrPicking){
        const candidates=scoreCandidates(r,rows.filter(x=>x._trxNo!==r._trxNo));
        tableRows.push(E("tr",{key:r._trxNo+"-corrpick",className:"flag-panel"},
          E("td",{colSpan:15},
            E("div",{className:"flag-inner"},
              E("i",{className:"ti ti-link",style:{color:"var(--blue)",marginTop:2,flexShrink:0}}),
              E("div",{style:{flex:1}},
                E("div",{style:{fontSize:11,fontWeight:600,color:"var(--blue-t)",marginBottom:4}},
                  t("journal.linkToMatch")),
                candidates.length>0
                  ?candidates.map((cand,ci)=>E("div",{key:ci,className:"corr-candidate",
                      onClick:()=>linkCorrection(r._trxNo,cand.row._trxNo,"direct")},
                    E("kbd",{style:{fontFamily:"monospace",fontSize:10,color:"var(--t3)",opacity:.8}},ci+1),
                    E("span",{className:"bdg bgray",style:{fontSize:10}},t("journal.score",cand.score)),
                    E("span",{style:{fontFamily:"monospace",fontSize:11}},cand.row._trxNo),
                    E("span",{style:{color:"var(--t2)"}},cand.row._date," ",cand.row._time),
                    E("span",{style:{fontWeight:700,fontFamily:"monospace",fontSize:11}},cand.row._room),
                    E("span",{style:{color:"var(--t3)",fontSize:11}},trunc(cand.row._desc,16)),
                    cand.row._debit?E("span",{style:{color:"var(--red-t)",fontFamily:"monospace",fontSize:11}},"-"+fmt(cand.row._debit)):null,
                    cand.row._credit?E("span",{style:{fontFamily:"monospace",fontSize:11}},fmt(cand.row._credit)):null,
                    E("span",{className:"bdg bgreen",style:{marginLeft:"auto",fontSize:10}},t("journal.linkArrow"))))
                  :E("div",{style:{fontSize:12,color:"var(--t3)",marginBottom:6}},t("journal.noObviousMatch")),
                E("div",{style:{display:"flex",gap:6,marginTop:6}},
                  E("button",{className:"btn xs ghost",
                    onClick:()=>{const v=prompt(t("journal.enterMatchingPrompt"));if(v)linkCorrection(r._trxNo,v.trim(),"direct");}},
                    E("i",{className:"ti ti-pencil"}),t("journal.enterManually")),
                  E("button",{className:"btn xs",onClick:()=>setCorrPickFor(null)},t("journal.cancel"))))))));
      }
    });
  });

  return E("div",null,
    E("div",{className:"card",style:{padding:"9px 12px",marginBottom:8}},
      E("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:3}},
        E("span",{style:{fontSize:12,color:"var(--t2)"}},t("journal.progress")),
        E("span",{style:{fontSize:12,fontWeight:700}},
          t("journal.checkedOf",checkedCnt,rows.length),
          flaggedCnt>0&&E("span",{style:{marginLeft:8,color:"var(--red-t)"}},t("journal.nFlagged",flaggedCnt)))),
      E("div",{className:"pbar"},E("div",{className:"pfill",style:{width:pct+"%"}}))),
    E("div",{className:"filters"},
      filtersArr.map((f,i)=>E("button",{
        key:f.id,className:`flt${jFilter===f.id?" on":""}`,
        onClick:()=>setJFilter(f.id),title:`Key: ${i+1}`
      },f.label)),
      E("button",{className:"btn sm ghost",style:{marginLeft:"auto"},onClick:checkAllVisible},
        E("i",{className:"ti ti-checks"}),t("journal.checkAll")),
      E("button",{className:"btn sm ghost",onClick:()=>resyncRef.current?.click()},
        E("i",{className:"ti ti-refresh"}),t("journal.resync")),
      E("input",{ref:resyncRef,type:"file",accept:".xlsx,.xls,.csv,.xml",style:{display:"none"},onChange:ev=>handleResync(ev.target.files[0])})),
    E("div",{style:{fontSize:11,color:"var(--t3)",marginBottom:6}},
      t("journal.keysLegend"),
      E("kbd",{style:{background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:3,padding:"0 4px",fontFamily:"monospace"}},"C"),
      " / ",
      E("kbd",{style:{background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:3,padding:"0 4px",fontFamily:"monospace"}},"Space"),
      t("journal.keyCheck"),
      E("kbd",{style:{background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:3,padding:"0 4px",fontFamily:"monospace"}},"F"),
      t("journal.keyFlag"),
      E("kbd",{style:{background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:3,padding:"0 4px",fontFamily:"monospace"}},"N"),
      t("journal.keyNote"),
      E("kbd",{style:{background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:3,padding:"0 4px",fontFamily:"monospace"}},"P"),
      t("journal.keyPlo"),
      E("kbd",{style:{background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:3,padding:"0 4px",fontFamily:"monospace"}},"L"),
      t("journal.keyLink"),
      E("kbd",{style:{background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:3,padding:"0 4px",fontFamily:"monospace"}},"1-9"),
      t("journal.keyPick"),
      E("kbd",{style:{background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:3,padding:"0 4px",fontFamily:"monospace"}},"Tab"),
      t("journal.keyTab"),
      E("kbd",{style:{background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:3,padding:"0 4px",fontFamily:"monospace"}},"↑↓"),
      t("journal.keyArrows"),
      E("kbd",{style:{background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:3,padding:"0 4px",fontFamily:"monospace"}},"Esc"),
      t("journal.keyEsc")),
    E("div",{className:"journal-wrap"},
      E("table",{className:"j-tbl"},
        E("thead",null,E("tr",null,
          E("th",{style:{width:34,textAlign:"center"}},"✓"),
          E("th",null,t("journal.date")),E("th",null,t("journal.time")),E("th",null,t("journal.room")),E("th",null,t("journal.guest")),
          E("th",null,t("journal.trx")),E("th",null,t("journal.description")),E("th",null,t("journal.cardRef")),
          E("th",{className:"r"},t("journal.debit")),E("th",{className:"r"},t("journal.credit")),
          E("th",null,t("journal.cashier")),E("th",null,t("journal.user")),E("th",null,t("journal.receipt")),
          E("th",null,t("journal.plo")),E("th",null,t("journal.flag")))),
        E("tbody",null,
          tableRows.length===0
            ?E("tr",null,E("td",{colSpan:15,style:{textAlign:"center",padding:20,color:"var(--t3)"}},t("journal.noMatchFilter")))
            :tableRows))));
}
