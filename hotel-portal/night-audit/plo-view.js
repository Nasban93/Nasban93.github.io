/* ── PLO View ── */
function PLOView(p){
  useLang();
  const {rows,ploList,ploSums,tagPLO}=p;
  if(!rows.length)return E("div",{className:"empty"},E("i",{className:"ti ti-upload"}),t("plo.empty"));
  return E("div",null,
    E("div",{className:"card",style:{background:"var(--blue-bg)",borderColor:"var(--border2)"}},
      E("p",{style:{fontSize:13,color:"var(--blue-t)",lineHeight:1.65}},
        E("strong",null,t("plo.howItWorksTitle")),t("plo.howItWorksBody"),E("strong",null,"PLO"),t("plo.howItWorksEnd"))),
    E("div",{className:"grid"},
      CARDS.map(c=>E("div",{className:"metric",key:c.code},
        E("div",{className:"mlabel"},c.full),
        E("div",{className:"mval sm"},t("common.sar")," ",fmt(ploSums[c.code])),
        E("div",{className:"msub"},t("plo.transactionsCount",ploList.filter(e=>e.cardCode===c.code).length)))),
      E("div",{className:"metric"},
        E("div",{className:"mlabel"},t("plo.ploTotal")),
        E("div",{className:"mval sm"},t("common.sar")," ",fmt(Object.values(ploSums).reduce((s,v)=>s+v,0))),
        E("div",{className:"msub"},t("plo.tagged",ploList.length)))),
    E("div",{className:"card np"},
      ploList.length===0
        ?E("div",{className:"empty"},E("i",{className:"ti ti-tag"}),t("plo.noneTagged"))
        :E("table",{className:"t"},
            E("thead",null,E("tr",null,
              E("th",null,t("plo.ploType")),E("th",null,t("plo.card")),E("th",null,t("common.date")),
              E("th",null,t("common.room")),E("th",null,t("common.guest")),E("th",null,t("plo.receipt")),
              E("th",{className:"r"},t("plo.amount")),E("th",null))),
            E("tbody",null,ploList.map(e=>
              E("tr",{key:e.trxNo},
                E("td",null,E("span",{className:"bdg bamber"},ploTypeLabel(e.ploType))),
                E("td",{style:{fontWeight:700}},BY_CODE[e.cardCode]?.full),
                E("td",{style:{fontSize:11,color:"var(--t3)"}},e.date),
                E("td",{style:{fontFamily:"monospace",fontSize:12}},e.room),
                E("td",{style:{maxWidth:130,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}},e.guest),
                E("td",{style:{fontSize:11,fontFamily:"monospace"}},e.receipt),
                E("td",{className:"r",style:{fontWeight:700}},t("common.sar")," ",fmt(e.amount)),
                E("td",null,E("button",{className:"btn xs danger",onClick:()=>tagPLO(e.trxNo,null)},
                  E("i",{className:"ti ti-x"}),t("plo.remove")))))),
            E("tfoot",null,CARDS.filter(c=>ploSums[c.code]>0).map(c=>
              E("tr",{key:c.code},
                E("td",{colSpan:6},t("plo.subtotal",c.full)),
                E("td",{className:"r"},t("common.sar")," ",fmt(ploSums[c.code])),
                E("td",null)))))));
}
