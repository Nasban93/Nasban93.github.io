import{u,j as p,a as g}from"./index-Dij8jbSU.js";import{g as h}from"./tokens-Bkv_aKOa.js";const o="2026-01",I=[{kpiDefId:"fo_guest_experience",departmentId:"front_office",name:"Guest Experience",nameAr:"تجربة الضيف",weight:.2,maxScore:100,scoringMethod:"weightedQuestionnaire",params:{yes:20,partial:10,no:0,overallWeight:20,cap:100},active:!0,configVersion:o},{kpiDefId:"fo_supervisor",departmentId:"front_office",name:"Supervisor",nameAr:"تقييم المشرف",weight:.15,maxScore:110,scoringMethod:"weightedQuestionnaire",params:{yes:16,partial:8,no:0,overallWeight:20,cap:110,bonus:10},active:!0,configVersion:o},{kpiDefId:"fo_attendance",departmentId:"front_office",name:"Attendance",nameAr:"الحضور",weight:.2,maxScore:100,scoringMethod:"deduction",params:{base:100,floor:0,penalties:[{field:"absentDays",factor:8},{field:"lateMinutes",factor:.3}]},active:!0,configVersion:o},{kpiDefId:"fo_upselling",departmentId:"front_office",name:"Upselling",nameAr:"المبيعات الإضافية",weight:.15,maxScore:100,scoringMethod:"ratioVsTarget",params:{cap:100},active:!0,configVersion:o},{kpiDefId:"fo_enrollments",departmentId:"front_office",name:"Enrollments",nameAr:"تسجيل الولاء",weight:.15,maxScore:120,scoringMethod:"ratioVsTarget",params:{cap:120},active:!0,configVersion:o},{kpiDefId:"fo_production",departmentId:"front_office",name:"Production",nameAr:"الإنتاجية",weight:.15,maxScore:100,scoringMethod:"sumDivided",params:{fields:["checkIns","checkOuts","transactions"],divisor:4,cap:100},active:!0,configVersion:o},{kpiDefId:"hk_room_quality",departmentId:"housekeeping",name:"Room Quality",nameAr:"جودة الغرف",weight:.35,maxScore:100,scoringMethod:"passthrough",params:{},active:!0,configVersion:o},{kpiDefId:"hk_productivity",departmentId:"housekeeping",name:"Productivity",nameAr:"الإنتاجية",weight:.3,maxScore:100,scoringMethod:"ratioVsTarget",params:{cap:100},active:!0,configVersion:o},{kpiDefId:"hk_attendance",departmentId:"housekeeping",name:"Attendance",nameAr:"الحضور",weight:.2,maxScore:100,scoringMethod:"deduction",params:{base:100,floor:0,penalties:[{field:"absentDays",factor:8},{field:"lateMinutes",factor:.3}]},active:!0,configVersion:o},{kpiDefId:"hk_supervisor",departmentId:"housekeeping",name:"Supervisor",nameAr:"تقييم المشرف",weight:.15,maxScore:100,scoringMethod:"weightedQuestionnaire",params:{yes:16,partial:8,no:0,overallWeight:20,cap:100},active:!0,configVersion:o}],v=[{grade:"Exceptional",minScore:93,color:"#16A34A",colorAr:"متميز"},{grade:"Excellent",minScore:85,color:"#2563EB",colorAr:"ممتاز"},{grade:"Good",minScore:75,color:"#D97706",colorAr:"جيد"},{grade:"Fair",minScore:60,color:"#EA580C",colorAr:"مقبول"},{grade:"Needs Improvement",minScore:0,color:"#DC2626",colorAr:"يحتاج تطوير"}],d=75;function k(n,a){var l;const s=new Map(a.map(e=>[e.kpiDefId,e.score])),r=n.filter(e=>e.active).map(e=>({kpiDefId:e.kpiDefId,name:e.name,nameAr:e.nameAr,score:s.get(e.kpiDefId)??null,weight:e.weight,configVersion:e.configVersion}));let i=0,t=0;for(const e of r)e.score!=null&&(i+=e.score*e.weight,t+=e.weight);const c=t>0?Math.round(i/t*10)/10:0,m=((l=v.find(e=>c>=e.minScore))==null?void 0:l.grade)??"Needs Improvement",f=c<d||r.some(e=>e.score!=null&&e.score<d);return{kpiResults:r,finalScore:c,grade:m,isCoaching:f}}const S={Exceptional:"exceptional",Excellent:"excellent",Good:"good",Fair:"fair","Needs Improvement":"needsImprovement"};function y({grade:n,size:a="md"}){const s=u(),r=h(n),i=S[n],t=s[i];return p.jsx("span",{className:a==="sm"?"inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold":"inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold",style:{backgroundColor:`${r}18`,color:r,border:`1px solid ${r}40`},children:t})}function A(){const{lang:n}=g();return p.jsx("p",{className:"text-xs mt-3 pt-3 border-t italic",style:{color:"var(--text-faint)",borderColor:"var(--border)"},children:n==="ar"?"جميع الأسماء مولّدة عشوائياً للتوضيح — أي تشابه مع أشخاص حقيقيين محض مصادفة.":"All names are randomly generated for demonstration; any resemblance to real individuals is coincidental."})}const D={"Guest Experience":`1. Review guest experience scoring rubric with GR Team.
2. Shadow a top-scorer for 3 guest interactions.
3. Practice greeting scripts with supervisor.`,Supervisor:`1. Weekly 15-min one-on-one with supervisor.
2. Review SOPs for the 3 most common procedures.
3. Attend one cross-training session.`,Attendance:`1. Review attendance policy with HR.
2. Set up personal reminder for shift start.
3. Discuss barriers with supervisor.`,Upselling:`1. Review room category matrix and rate differences.
2. Shadow the top up-seller for 2 shifts.
3. Practice 3 upselling scripts.`,Enrollments:`1. Review loyalty program benefits and talking points.
2. Practice the 30-second enrollment pitch.
3. Target 1 enrollment per shift.`,Production:`1. Review Opera shortcuts for faster processing.
2. Observe a high-producer for a full shift.
3. Practice handling 3 simultaneous tasks.`,"Room Quality":`1. Review room inspection checklist with supervisor.
2. Shadow a high-quality housekeeper for 1 shift.
3. Practice self-inspection before sign-off.`,Productivity:`1. Review efficient room-turnover techniques.
2. Work with supervisor to identify bottlenecks.
3. Set a daily rooms-per-hour target.`},_={"Guest Experience":`١. مراجعة معايير تقييم تجربة الضيف.
٢. مرافقة موظف متميز لثلاث تفاعلات مع الضيوف.
٣. التدريب على نصوص الترحيب مع المشرف.`,Supervisor:`١. اجتماع أسبوعي لمدة ١٥ دقيقة مع المشرف.
٢. مراجعة الإجراءات الأساسية لأكثر ٣ مهام شيوعاً.
٣. حضور جلسة تدريب متقاطع.`,Attendance:`١. مراجعة سياسة الحضور مع الموارد البشرية.
٢. إعداد منبهات شخصية لبداية الوردية.
٣. مناقشة العوائق مع المشرف.`,Upselling:`١. مراجعة فئات الغرف وفروقات الأسعار.
٢. مرافقة أفضل بائع لورديتين.
٣. التدريب على ٣ نصوص بيعية.`,Enrollments:`١. مراجعة فوائد برنامج الولاء ونقاط الحوار.
٢. التدريب على عرض التسجيل في ٣٠ ثانية.
٣. استهداف تسجيل واحد في كل وردية.`,Production:`١. مراجعة اختصارات النظام لتسريع معالجة المعاملات.
٢. مراقبة موظف عالي الإنتاجية لوردية كاملة.
٣. التدريب على إدارة ثلاث مهام في وقت واحد.`,"Room Quality":`١. مراجعة قائمة فحص الغرف مع المشرف.
٢. مرافقة عامل نظافة متميز لوردية كاملة.
٣. ممارسة الفحص الذاتي قبل تسليم الغرفة.`,Productivity:`١. مراجعة تقنيات تجهيز الغرف بكفاءة.
٢. العمل مع المشرف لتحديد نقاط الضعف.
٣. تحديد هدف يومي لعدد الغرف في الساعة.`};export{d as C,y as G,I as K,_ as P,A as S,D as a,k as c};
