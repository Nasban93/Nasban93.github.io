/* ── Upload View ── */
function UploadView(p){
  useLang();
  const {dirHandle,folderName,rows,history,date,setDate,
         fileRef,resyncRef,connectFolder,handleFile,handleResync,
         multiDateNotice,closedDateGaps}=p;
  const [drag,setDrag]=useState(false);
  return E("div",null,
    /* BRIEF-NIGHT-AUDIT-2 Phase N1 — a catch-up file spanning >1 business
       date (BUSINESS-DATE.md), detected in handleFile() from the raw
       BUSINESS_DATE field. */
    multiDateNotice&&E("div",{className:"banner banner-warn"},
      E("i",{className:"ti ti-calendar-exclamation",style:{fontSize:20,color:"var(--amber)",flexShrink:0}}),
      E("div",{style:{flex:1}},
        E("strong",null,t("reconcile.multiDateTitle")," — "),
        t("reconcile.multiDateBody",multiDateNotice.length,date),
        E("ul",{style:{margin:"4px 0 0 16px",fontSize:12}},
          multiDateNotice.map(g=>E("li",{key:g.value},g.value," · ",g.count))))),
    /* Missed-run gap detection (BUSINESS-DATE.md) — calendar-day gaps between
       consecutive CLOSED audits in this app's own history. */
    closedDateGaps&&closedDateGaps.length>0&&E("div",{className:"banner banner-warn"},
      E("i",{className:"ti ti-alert-triangle",style:{fontSize:20,color:"var(--red)",flexShrink:0}}),
      E("div",{style:{flex:1}},
        E("strong",null,t("reconcile.gapsTitle")," — "),
        t("reconcile.gapsBody",closedDateGaps.join(", ")))),
    !dirHandle&&E("div",{className:`banner ${folderName?"banner-warn":"banner-warn"}`},
      E("i",{className:"ti ti-folder-open",style:{fontSize:20,color:"var(--amber)",flexShrink:0}}),
      E("div",{style:{flex:1}},
        folderName?E("span",null,t("upload.folderNeedsPermission",folderName),
          E("button",{className:"btn xs",onClick:connectFolder},t("common.reconnect")))
        :E("span",null,t("upload.connectOneDrive"))),
      !folderName&&E("button",{className:"btn sm",onClick:connectFolder},
        E("i",{className:"ti ti-link"}),t("common.connect"))),
    dirHandle&&E("div",{className:"banner banner-ok"},
      E("i",{className:"ti ti-folder-check",style:{fontSize:20,color:"var(--green)",flexShrink:0}}),
      E("span",null,t("upload.syncingTo",dirHandle.name))),
    E("div",{className:"grid",style:{gridTemplateColumns:"200px 1fr"}},
      E("div",{className:"metric"},
        E("div",{className:"mlabel"},t("upload.auditDate")),
        E("input",{type:"date",className:"inp",value:date,onChange:ev=>setDate(ev.target.value),style:{width:"100%",marginTop:4}})),
      E("div",{className:"card np",style:{cursor:"pointer"}},
        E("div",{
          className:`drop-zone${drag?" drag":""}`,
          onDragOver:ev=>{ev.preventDefault();setDrag(true);},
          onDragLeave:()=>setDrag(false),
          onDrop:ev=>{ev.preventDefault();setDrag(false);handleFile(ev.dataTransfer.files[0]);},
          onClick:()=>fileRef.current.click()
        },
          E("i",{className:"ti ti-upload"}),
          E("div",{style:{fontWeight:700,fontSize:14,marginBottom:6}},t("upload.dropTitle")),
          E("div",{style:{fontSize:12,color:"var(--t2)"}},t("upload.dropSub")),
          E("input",{ref:fileRef,type:"file",accept:".xlsx,.xls,.csv,.xml",style:{display:"none"},onChange:ev=>handleFile(ev.target.files[0])})))),
    rows.length>0&&E("div",{className:"banner banner-info"},
      E("i",{className:"ti ti-refresh",style:{fontSize:18,color:"var(--blue)",flexShrink:0}}),
      E("div",{style:{flex:1}},
        E("strong",null,t("upload.resyncLabel")),t("upload.resyncDesc")),
      E("div",{
        className:`drop-zone${drag?" drag":""}`,
        style:{padding:"8px 16px",fontSize:12,marginLeft:8,minWidth:160,textAlign:"center"},
        onDragOver:ev=>{ev.preventDefault();setDrag(true);},
        onDragLeave:()=>setDrag(false),
        onDrop:ev=>{ev.preventDefault();setDrag(false);handleResync(ev.dataTransfer.files[0]);},
        onClick:()=>resyncRef.current.click()
      },
        E("i",{className:"ti ti-refresh",style:{fontSize:22,display:"block",marginBottom:3}}),
        t("upload.dropUpdated"),
        E("input",{ref:resyncRef,type:"file",accept:".xlsx,.xls,.csv,.xml",style:{display:"none"},onChange:ev=>handleResync(ev.target.files[0])}))),
    history.length>0&&E("div",{className:"card np",style:{marginTop:14}},
      E("table",{className:"t"},
        E("thead",null,E("tr",null,
          E("th",null,t("upload.recentAudits")),E("th",{className:"r"},t("upload.transactions")),
          E("th",{className:"r"},t("upload.corrections")),E("th",{className:"r"},t("upload.cardTotal")),
          E("th",null,t("common.balanced")),E("th",null,t("common.status")))),
        E("tbody",null,history.slice(0,7).map(h=>
          E("tr",{key:h.date},
            E("td",{style:{fontWeight:700}},h.date),
            E("td",{className:"r"},h.txCount),
            E("td",{className:"r"},h.corrCount>0?E("span",{className:"bdg bamber"},h.corrCount):t("common.dash")),
            E("td",{className:"r"},t("common.sar")," ",fmt(CARDS.reduce((s,c)=>s+(h.operaTot?.[c.code]||0),0))),
            E("td",null,h.balanced?E("span",{className:"bdg bgreen"},t("common.balanced")):E("span",{className:"bdg bred"},t("common.discrepancy"))),
            E("td",null,E("span",{className:`bdg ${h.status==="Closed"?"bgreen":h.status==="Approved"?"bblue":h.status==="Submitted for Review"?"bamber":"bgray"}`},statusLabel(h.status||"Draft")))))))))
}
