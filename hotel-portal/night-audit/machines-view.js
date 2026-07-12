/* ── Machines View ──
   Each terminal's Z-report gives both an amount and a transaction count per
   card type. Both get entered and both get reconciled — count catches the
   case where two wrong transactions cancel out and the amount alone would
   look "balanced" while the count doesn't. */
function MachinesView(p){
  useLang();
  const {mach,setMach,machCnt,setMachCnt,machSums,machCounts,operaTot,operaCounts,disc,countDisc}=p;
  const cellRefs=useRef({});

  /* The auditor works from one paper Z-report per machine, listing every
     card type's total for that terminal. So Tab should walk down all card
     types for FO-1 first, then move into FO-2 — not across every machine for
     one card type, which is what the table's natural left-to-right DOM order
     would otherwise give for free. This list defines that intended order;
     Tab/Shift+Tab below walks it directly instead of relying on DOM order. */
  const tabOrder=useMemo(()=>{
    const o=[];
    MACHINES.forEach(mac=>CARDS.forEach(c=>{o.push(`${mac}|${c.code}|amt`);o.push(`${mac}|${c.code}|cnt`);}));
    return o;
  },[]);

  function handleTabKey(key,e){
    if(e.key!=="Tab")return;
    const idx=tabOrder.indexOf(key);
    if(idx<0)return;
    const nextIdx=e.shiftKey?idx-1:idx+1;
    /* At the very first/last field, do nothing — let native Tab carry on to
       whatever comes before/after this table on the page (e.g. into PLO
       Entries), instead of trapping focus inside the grid. */
    if(nextIdx<0||nextIdx>=tabOrder.length)return;
    const target=cellRefs.current[tabOrder[nextIdx]];
    if(target){e.preventDefault();target.focus();target.select();}
  }

  return E("div",null,
    E("p",{style:{fontSize:13,color:"var(--t2)",marginBottom:14,lineHeight:1.6}},
      t("machines.desc")),
    E("div",{className:"card",style:{overflowX:"auto"}},
      E("table",{className:"t",style:{tableLayout:"fixed",minWidth:740}},
        E("thead",null,E("tr",null,
          E("th",{style:{width:120}},t("machines.cardType")),
          MACHINES.map(m=>E("th",{key:m,style:{width:120,textAlign:"right"}},m)),
          E("th",{style:{width:110,textAlign:"right",background:"var(--green-bg)"}},t("machines.machineTotal")),
          E("th",{style:{width:110,textAlign:"right",background:"var(--blue-bg)"}},t("machines.operaTotal")))),
        E("tbody",null,CARDS.map(c=>{
          const d=disc[c.code],ok=Math.abs(d)<0.01;
          const cd=countDisc[c.code],cntOk=Math.abs(cd)<1;
          return E("tr",{key:c.code},
            E("td",{style:{fontWeight:700}},c.full),
            MACHINES.map(mac=>{
              const amtKey=`${mac}|${c.code}|amt`,cntKey=`${mac}|${c.code}|cnt`;
              return E("td",{key:mac,style:{textAlign:"right"}},
                E("input",{className:"mach-inp",type:"number",min:"0",placeholder:t("machines.amountPh"),
                  ref:el=>{cellRefs.current[amtKey]=el;},
                  onKeyDown:e=>handleTabKey(amtKey,e),
                  value:mach[mac]?.[c.code]??"",
                  onChange:ev=>setMach(p=>({...p,[mac]:{...p[mac],[c.code]:ev.target.value}}))}),
                E("input",{className:"mach-inp",type:"number",min:"0",placeholder:t("machines.countPh"),
                  style:{marginTop:4,fontSize:11,opacity:.85},
                  ref:el=>{cellRefs.current[cntKey]=el;},
                  onKeyDown:e=>handleTabKey(cntKey,e),
                  value:machCnt[mac]?.[c.code]??"",
                  onChange:ev=>setMachCnt(p=>({...p,[mac]:{...p[mac],[c.code]:ev.target.value}}))}));
            }),
            E("td",{className:"r",style:{fontWeight:700,background:"var(--green-bg)"}},
              t("common.sar")," ",fmt(machSums[c.code]),
              E("div",{style:{fontSize:10,marginTop:1,color:"var(--t2)",fontWeight:400}},
                machCounts[c.code]||0," ",machCounts[c.code]===1?t("machines.txn"):t("machines.txns"))),
            E("td",{className:"r",style:{fontWeight:700,background:"var(--blue-bg)"}},
              t("common.sar")," ",fmt(operaTot[c.code]),
              E("div",{style:{fontSize:10,marginTop:1,color:"var(--t2)",fontWeight:400}},
                operaCounts[c.code]||0," ",operaCounts[c.code]===1?t("machines.txn"):t("machines.txns")),
              machSums[c.code]>0&&E("div",{style:{fontSize:10,marginTop:1,color:ok?"var(--green-t)":"var(--red-t)"}},
                ok?t("machines.amountMatch"):t("machines.delta",fmt(d))),
              machCounts[c.code]>0&&E("div",{style:{fontSize:10,marginTop:1,color:cntOk?"var(--green-t)":"var(--red-t)"}},
                cntOk?t("machines.countMatch"):t("machines.deltaTxn",cd>0?"+":"",cd,Math.abs(cd)===1?t("machines.txn"):t("machines.txns")))));
        })),
        E("tfoot",null,E("tr",null,
          E("td",null,t("machines.grandTotal")),
          MACHINES.map(mac=>E("td",{key:mac,className:"r"},
            fmt(CARDS.reduce((s,c)=>s+toNum(mach[mac]?.[c.code]),0)),
            E("div",{style:{fontSize:10,marginTop:1,color:"var(--t2)"}},
              CARDS.reduce((s,c)=>s+toNum(machCnt[mac]?.[c.code]),0)," ",t("machines.txns")))),
          E("td",{className:"r",style:{background:"var(--green-bg)"}},
            t("common.sar")," ",fmt(CARDS.reduce((s,c)=>s+machSums[c.code],0)),
            E("div",{style:{fontSize:10,marginTop:1,color:"var(--t2)",fontWeight:400}},
              CARDS.reduce((s,c)=>s+(machCounts[c.code]||0),0)," ",t("machines.txns"))),
          E("td",{className:"r",style:{background:"var(--blue-bg)"}},
            t("common.sar")," ",fmt(CARDS.reduce((s,c)=>s+operaTot[c.code],0)),
            E("div",{style:{fontSize:10,marginTop:1,color:"var(--t2)",fontWeight:400}},
              CARDS.reduce((s,c)=>s+(operaCounts[c.code]||0),0)," ",t("machines.txns"))))))));
}
