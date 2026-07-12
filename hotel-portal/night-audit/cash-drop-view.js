/* ── Cash Drop View ── */
function CashView(p){
  useLang();
  const {rows,cashByAgent,cashPhys,setCashPhys,cashRows,
    /* BRIEF-NIGHT-AUDIT-2-FIXES §2 — "no cash-drop slip recorded" exception */
    cashExceptions,markCashException,clearCashException,identity}=p;
  const [reasonDraft,setReasonDraft]=useState({});
  if(!rows.length)return E("div",{className:"empty"},E("i",{className:"ti ti-upload"}),t("cash.empty"));
  const totalDrop=cashByAgent.reduce((s,a)=>s+a.cred-a.deb,0);
  const totalPhys=Object.values(cashPhys).reduce((s,v)=>s+toNum(v),0);
  const variance=totalPhys-totalDrop;
  const totVar=CASH_STATUS_META[cashStatus(variance)];
  const fxRows=cashRows.filter(r=>r._fxCode);
  const fxByCurrency={};
  fxRows.forEach(r=>{
    const k=r._fxCode;
    if(!fxByCurrency[k])fxByCurrency[k]={face:0,sar:0,rate:r._fxRate};
    fxByCurrency[k].face+=(r._fxFaceCredit||0)-(r._fxFaceDebit||0);
    fxByCurrency[k].sar+=(r._credit||0)-(r._debit||0);
  });
  return E("div",null,
    fxRows.length>0&&E("div",{className:"banner banner-info"},
      E("i",{className:"ti ti-currency-dollar",style:{fontSize:18,color:"var(--blue)",flexShrink:0}}),
      E("div",{style:{flex:1}},
        E("strong",null,t("cash.fxBanner")),
        Object.entries(fxByCurrency).map(([cur,v])=>`${cur} ${fmt(v.face)} (≈ ${t("common.sar")} ${fmt(v.sar)} @ ${v.rate})`).join(" · "),
        t("cash.fxBannerEnd"))),
    E("div",{className:"grid"},
      E("div",{className:"metric"},E("div",{className:"mlabel"},t("cash.operaCashDrop")),E("div",{className:"mval sm"},t("common.sar")," ",fmt(totalDrop)),E("div",{className:"msub"},t("cash.fromSystem"))),
      E("div",{className:"metric"},E("div",{className:"mlabel"},t("cash.physicalCounted")),E("div",{className:"mval sm"},t("common.sar")," ",fmt(totalPhys)),E("div",{className:"msub"},t("cash.enterBelow"))),
      E("div",{className:"metric"},
        E("div",{className:"mlabel"},t("cash.variance")),
        E("div",{className:"mval sm",style:{color:totVar.color}},
          Math.abs(variance)<0.01?t("cash.zero"):`${t("common.sar")} ${fmt(variance)}`),
        Math.abs(variance)>=0.01&&Math.abs(variance)<=CASH_TOLERANCE&&E("div",{className:"msub"},t("cash.withinTolerance",CASH_TOLERANCE))),
      E("div",{className:"metric"},E("div",{className:"mlabel"},t("cash.cashCorrections")),
        E("div",{className:"mval",style:{color:cashRows.filter(r=>r._isCorr).length?"var(--amber-t)":undefined}},cashRows.filter(r=>r._isCorr).length))),
    E("div",{className:"card np"},
      E("table",{className:"t"},
        E("thead",null,E("tr",null,
          E("th",null,t("cash.agent")),E("th",null,t("cash.id")),
          E("th",{className:"r"},t("cash.operaDebit")),E("th",{className:"r"},t("cash.operaCredit")),
          E("th",{className:"r"},t("cash.operaDrop")),
          E("th",{className:"r",style:{background:"var(--amber-bg)"}},t("cash.physicalCountCol")),
          E("th",{className:"r"},t("cash.variance")),E("th",null,t("cash.status")),
          E("th",null,t("cash.exceptionCol")))),
        E("tbody",null,cashByAgent.map(a=>{
          const od=a.cred-a.deb,ph=toNum(cashPhys[a.id]),v=ph-od;
          const has=cashPhys[a.id]!=null&&cashPhys[a.id]!=="";
          const exc=cashExceptions?.[a.id];
          const st=exc?"exception":cashStatus(v,has),meta=CASH_STATUS_META[st];
          return E("tr",{key:a.id},
            E("td",{style:{fontWeight:700}},a.name),
            E("td",{style:{color:"var(--t3)",fontSize:11,fontFamily:"monospace"}},a.id),
            E("td",{className:"r"},fmt(a.deb)),
            E("td",{className:"r"},fmt(a.cred)),
            E("td",{className:"r",style:{fontWeight:700}},t("common.sar")," ",fmt(od)),
            E("td",{style:{background:"var(--amber-bg)",textAlign:"right"}},
              E("input",{className:"inp mono xs",type:"number",min:"0",
                placeholder:fmt(od),value:cashPhys[a.id]??"",style:{width:110},
                onChange:ev=>setCashPhys(p=>({...p,[a.id]:ev.target.value}))})),
            E("td",{className:"r"},has?E("span",{style:{fontWeight:700,color:meta.color}},
                st==="match"?t("common.dash"):`${t("common.sar")} ${fmt(v)}`):E("span",{style:{color:"var(--t3)"}},t("common.pending"))),
            E("td",null,E("span",{className:`bdg ${meta.badgeClass}`},cashStatusLabel(st))),
            /* BRIEF-NIGHT-AUDIT-2-FIXES §2 — "no cash-drop slip recorded"
               exception: required reason, logged; satisfies the cash gate for
               this cashier in place of a matching count. */
            E("td",{style:{minWidth:180}},
              exc
                ?E("div",{style:{fontSize:11,color:"var(--t2)"}},
                    E("div",{style:{fontWeight:700,color:"var(--amber-t)"}},t("cash.exceptionSetLabel")),
                    E("div",{style:{margin:"2px 0"}},exc.reason),
                    E("div",{style:{color:"var(--t3)"}},exc.byName," · ",new Date(exc.at).toLocaleString()),
                    E("button",{className:"btn xs",style:{marginTop:4},
                      onClick:()=>clearCashException(a.id),disabled:!identity?.currentEntry},
                      t("cash.exceptionClear")))
                :E("div",null,
                    E("input",{className:"inp xs",placeholder:t("cash.exceptionReasonPh"),
                      value:reasonDraft[a.id]||"",style:{width:"100%",marginBottom:4},
                      onChange:ev=>setReasonDraft(prev=>({...prev,[a.id]:ev.target.value}))}),
                    E("button",{className:"btn xs",disabled:!identity?.currentEntry||!(reasonDraft[a.id]||"").trim(),
                      onClick:()=>{markCashException(a.id,reasonDraft[a.id]||"");setReasonDraft(prev=>({...prev,[a.id]:""}));}},
                      t("cash.exceptionMark")))));
        })),
        E("tfoot",null,E("tr",null,
          E("td",{colSpan:2},t("common.total")),
          E("td",{className:"r"},fmt(cashByAgent.reduce((s,a)=>s+a.deb,0))),
          E("td",{className:"r"},fmt(cashByAgent.reduce((s,a)=>s+a.cred,0))),
          E("td",{className:"r"},t("common.sar")," ",fmt(totalDrop)),
          E("td",{className:"r",style:{background:"var(--amber-bg)"}},t("common.sar")," ",fmt(totalPhys)),
          E("td",{className:"r",style:{color:totVar.color,fontWeight:700}},
            Math.abs(variance)<0.01?t("common.dash"):`${t("common.sar")} ${fmt(variance)}`),
          E("td",null),E("td",null))))));
}
