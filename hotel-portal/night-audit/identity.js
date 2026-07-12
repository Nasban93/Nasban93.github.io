/* ── identity.js — PIN identity module (portable, ported from Guest Portal) ──
   Per BRIEF-IDENTITY.md: run after Guest Portal's identity build
   (Code/Guest Portal/fo-portal/src/identity/*.ts(x)), which created the
   shared registry (Records/_shared/staff-registry.json) and the reference
   implementation. This file ports that module's LOGIC and CONTRACTS to plain
   JS/E() — same registry schema, same PIN/PBKDF2 approach, same activity-log
   shape — so it stays byte-compatible with what every other PMS app reads
   and writes. Two layers, honestly separated: the vault password (this app
   HAS NO VAULT — see below) would protect data; this PIN is attribution only,
   it identifies who is acting, it is not a second lock on the data.

   Deliberate deviations from the Guest Portal/Attendance version, because
   Night Audit has no vault/master key at all (confirmed in this app's own
   STATUS.md: "Night Audit has no encryption system at all"):
     - registryStore/logStore below persist PLAIN JSON to localStorage (no
       encryptJSON/decryptJSON call). Acceptable because (a) the shared
       registry file is ALREADY plain JSON by deliberate design regardless of
       which app writes it (SECURITY.md's own exception — one-way-hashed PINs
       only, no guest PII, same trust model as a Unix /etc/shadow file), and
       (b) there is no master key in this app to encrypt the local cache or
       the durable activity-log file under either. Flagged in STATUS-IDENTITY.md.
     - No recovery-code-gated tier for peer-rank or top-admin PIN resets, and
       no top-admin appoint/revoke/transfer UI — that gate is the VAULT's
       recovery code (see Guest Portal's security/crypto.ts), which doesn't
       exist here. A peer/top-admin-on-top-admin reset is simply refused in
       this app; use Guest Portal's Staff & PINs panel for that (it has the
       proper gate). Top-admin status itself is READ-ONLY here.
     - "Regenerate recovery/access code" (BRIEF-IDENTITY.md §5) skipped
       cleanly, per the brief's own instruction — there is no vault/recovery
       mechanism in this app to regenerate.

   Folder access: the shared registry lives at Records/_shared/ — a SIBLING
   of this app's own Records/Night Audit/ branch. The File System Access API
   can't navigate "up and over" between sibling folders (same reason
   production-view.js's Attendance shift-feed link keeps its OWN separate
   showDirectoryPicker() connection — see connectAttendanceFolder there), so
   this module manages its own independent "PMS root" folder connection,
   stored under its own IndexedDB key ("pmsRootFolder"). The durable
   per-app activity-log file (Records/Night Audit/activity-log/) instead
   reuses this app's EXISTING `dirHandle` (already Records/Night Audit/ per
   app.js's connectFolder()) — no new connection needed for that part. ── */

/* ── Constants / types (plain objects, no TS interfaces needed) ── */
const ID_PIN_ITERATIONS=10000; /* PERFORMANCE.md: light PBKDF2 so identify stays <=100ms */
const DEFAULT_TOP_ADMIN_ID="1241";
const UNATTRIBUTED_STAFF_ID="_unattributed";
const UNATTRIBUTED_DISPLAY_NAME="Front Desk (unattributed)";
const SYSTEM_ADMIN_STAFF_ID="sys-knasban";
const SYSTEM_ADMIN_DISPLAY_NAME="Khalid Bin Nasban (System Admin)";
const NA_APP_ID="nightAudit";
/* External accounts (BRIEF-EXTERNAL-ACCOUNTS.md) — a real, non-FO person a top
   admin adds by hand (e.g. a Guest Experience Manager as an LQA assessor).
   CAPABILITY ONLY: nothing here bootstraps/migrates one in — addExternal below
   is the sole creation path. staffId convention: EXTERNAL_STAFF_ID_PREFIX,
   avoids colliding with FO numeric ids. */
const EXTERNAL_STAFF_ID_PREFIX="ext-";

function isSystemAccount(e){return e.accountType==="system";}
function isExternalAccount(e){return e.accountType==="external";}
function excludeSystemAccounts(staff){return staff.filter(s=>!isSystemAccount(s));}
/* The FO-only roster/UI lists (identify grid's main tiles, Staff & PINs' main
   table, mapping candidates) — externals get their own separately-sectioned
   lists instead (see useIdentity's externalStaff/visibleExternalStaff). */
function excludeSystemAndExternalAccounts(staff){return staff.filter(s=>!isSystemAccount(s)&&!isExternalAccount(s));}
/* THE single gate every KPI/operations surface must use (BRIEF-EXTERNAL-ACCOUNTS.md
   #5) — system and external accounts are never scored, scheduled, or exported.
   Production KPI's mapping-candidate pool already uses identity.allStaff (which
   excludes both), so this is the standalone gate for any future direct-registry
   consumer (e.g. the Performance capstone reading this app's registry). */
function isScoreableStaff(entry){return entry.active&&!isSystemAccount(entry)&&!isExternalAccount(entry);}
/* Per-app visibility for external accounts only (BRIEF-EXTERNAL-ACCOUNTS.md #1):
   visible on an app's identify grid ONLY if they hold a role in THAT app or are
   a top admin. FO staff and system accounts are unaffected. */
function isVisibleInApp(entry,appId){if(!isExternalAccount(entry))return true;return entry.isTopAdmin||!!entry.roles[appId];}
/* Auto-suggests a staffId from a new external's name, editable before saving;
   appends -2, -3... on collision. */
function suggestExternalStaffId(name,existing){
  const slug=String(name||"").trim().toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"")||"member";
  const base=EXTERNAL_STAFF_ID_PREFIX+slug;
  const ids=new Set(existing.map(s=>s.staffId));
  if(!ids.has(base))return base;
  let n=2;
  while(ids.has(`${base}-${n}`))n++;
  return `${base}-${n}`;
}

const TRIVIAL_PIN_PATTERNS=[/^(\d)\1{3}$/,/^1234$/,/^4321$/,/^(19|20)\d{2}$/];
function isTrivialPin(pin){return TRIVIAL_PIN_PATTERNS.some(re=>re.test(pin));}
function isValidPinFormat(pin){return /^\d{4}$/.test(pin);}

/* ── BRIEF-IDENTITY-V2.md — ID+PIN login, message matrix. "not-found" is
   ambiguous on its own — an unrecognized Employee ID and "this app never
   synced the real staff list" look identical from the caller's side.
   `registrySource` is "bootstrap" only when NEITHER the local cache NOR the
   shared cache/folder has ever produced a real registry for this device+app
   (see useIdentity() below) — the exact shape of a real early identity bug
   (MASTER-PLAN 2026-07-08). Returns a suffix under the "identity." string
   table branch (see strings.js). ── */
function naIdentifyErrorMessageKey(reason,registrySource){
  switch(reason){
    case"not-found":return registrySource==="bootstrap"?"notSynced":"unknownId";
    case"inactive":return"inactive";
    case"locked":return"lockedTryReset";
    case"no-pin":return"noPinYet";
    case"wrong-pin":return"wrongPin";
    default:return"cantIdentify";
  }
}

/* ── Cross-app shared session — pure timing helper (acceptance #5: "session
   share, expiry"), factored out of useIdentity()'s poll so it stays testable
   without mounting a hook. Takes whichever of the shared session's or this
   tab's own last-activity timestamp is MORE recent — activity in any app
   must refresh the one global idle clock, per acceptance #2. ── */
function naSessionElapsedMinutes(sessionLastActivityIso,localLastActivityMs,nowMs){
  const mostRecent=Math.max(new Date(sessionLastActivityIso).getTime(),localLastActivityMs);
  return(nowMs-mostRecent)/60000;
}

/* ── PIN hashing — Web Crypto only, no dependency (mirrors Guest Portal's
   src/identity/pin.ts exactly: same salt/hash sizes, same iteration count,
   same base64 helpers) — a registry PIN hash written by one app must verify
   correctly in every other app. ── */
function idRandomBytes(n){return crypto.getRandomValues(new Uint8Array(n));}
function idToBase64(bytes){let bin="";bytes.forEach(b=>{bin+=String.fromCharCode(b);});return btoa(bin);}
function idFromBase64(s){return Uint8Array.from(atob(s),c=>c.charCodeAt(0));}
async function idDeriveBits(pin,salt,iterations){
  const baseKey=await crypto.subtle.importKey("raw",new TextEncoder().encode(pin),"PBKDF2",false,["deriveBits"]);
  const bits=await crypto.subtle.deriveBits({name:"PBKDF2",salt,iterations,hash:"SHA-256"},baseKey,256);
  return new Uint8Array(bits);
}
async function hashPin(pin){
  const salt=idRandomBytes(16);
  const bits=await idDeriveBits(pin,salt,ID_PIN_ITERATIONS);
  return{salt:idToBase64(salt),hash:idToBase64(bits),iterations:ID_PIN_ITERATIONS};
}
async function verifyPin(pin,stored){
  try{
    const bits=await idDeriveBits(pin,idFromBase64(stored.salt),stored.iterations);
    const candidate=idToBase64(bits);
    if(candidate.length!==stored.hash.length)return false;
    let diff=0;
    for(let i=0;i<candidate.length;i++)diff|=candidate.charCodeAt(i)^stored.hash.charCodeAt(i);
    return diff===0;
  }catch{return false;}
}

/* ── registryStore — Records/_shared/staff-registry.json (plain JSON, see
   this file's header for why) + a plain localStorage cache. ── */
const ID_REGISTRY_CACHE_KEY="pms-shared-staff-registry-cache-v1";
const ID_REGISTRY_FILENAME="staff-registry.json";

function idLoadRegistryCache(){
  /* Defensive: on file:// Chrome shares ONE localStorage across all local
     files, so this key can hold a cache written by another PMS app in a
     different wrapper shape. Accept only a valid registry (staff array),
     unwrap a {registry:{...}} wrapper if present, else discard — the cache
     safely repopulates from the folder. (Fix for the 2026-07-06 startup
     crash: "Cannot read properties of undefined (reading 'some')".) */
  try{
    const raw=localStorage.getItem(ID_REGISTRY_CACHE_KEY);
    if(!raw)return null;
    const parsed=JSON.parse(raw);
    if(parsed&&Array.isArray(parsed.staff))return parsed;
    if(parsed&&parsed.registry&&Array.isArray(parsed.registry.staff))return parsed.registry;
    return null;
  }catch{return null;}
}
function idSaveRegistryCache(registry){
  try{localStorage.setItem(ID_REGISTRY_CACHE_KEY,JSON.stringify(registry));}catch{}
}

/* ── Shared PMS-folder connection (BRIEF-SHARED-CONNECTION.md) — one IndexedDB
   database ("PMS-Shared"), same origin, used by every app (Guest Portal,
   Attendance, this app) so connecting the PMS folder once from ANY app or the
   Launcher makes the shared staff registry instantly reachable here too.
   Self-contained in this file rather than added to helpers.js's idbOp (which is
   hardcoded to this app's OWN "NightAudit" database) since BRIEF-SHARED-
   CONNECTION.md scopes Night Audit's change to identity.js only — app.js's own
   Records/Night Audit dirHandle and production-view.js's separate Attendance
   shift-feed connection are untouched. Also mirrors the registry itself as
   plain JSON in the same shared store (acceptance #2: a PIN set in another app
   is visible here the next time this app opens, even before the folder syncs). ── */
const IS_FILE_PROTOCOL=typeof location!=="undefined"&&location.protocol==="file:";
const FILE_PROTOCOL_MESSAGE="Folder connection needs the local server — open via \"Open PMS Apps.bat\", not by double-clicking this file.";
const SHARED_IDB_NAME="PMS-Shared";
const SHARED_IDB_STORE="kv";
const SHARED_ROOT_KEY="pmsRootHandle";
const SHARED_META_KEY="connectionMeta";
const SHARED_REGISTRY_KEY="registryCache";
/* Cross-app single sign-on (BRIEF-IDENTITY-V2.md #2) — one shared session under
   this same key, in this same "PMS-Shared" IDB store every app already uses for
   the root folder + registry mirror. Identifying once in any app makes every
   other app on this machine adopt the SAME session. */
const SHARED_SESSION_KEY="identitySession";
const OLD_PMS_ROOT_IDB_KEY="pmsRootFolder"; /* this app's pre-shared-connection private key, in the "NightAudit" DB helpers.js's idbOp already opens */

function sharedIdbOp(mode,key,value){
  return new Promise((res,rej)=>{
    const req=indexedDB.open(SHARED_IDB_NAME,1);
    req.onupgradeneeded=e=>e.target.result.createObjectStore(SHARED_IDB_STORE);
    req.onsuccess=e=>{
      const db=e.target.result;
      const tx=db.transaction(SHARED_IDB_STORE,mode);
      const store=tx.objectStore(SHARED_IDB_STORE);
      const r2=mode==="readwrite"?store.put(value,key):store.get(key);
      r2.onsuccess=()=>res(r2.result);
      r2.onerror=()=>rej(r2.error);
    };
    req.onerror=()=>rej(req.error);
  });
}

/* request=false only ever calls queryPermission (silent, safe on page load).
   request=true also tries requestPermission, matching this file's pre-existing
   connectPmsRoot()/mount-restore behavior exactly. */
async function verifySharedPermission(handle,request){
  const opts={mode:"readwrite"};
  if((await handle.queryPermission?.(opts))==="granted")return true;
  if(!request)return false;
  if((await handle.requestPermission?.(opts))==="granted")return true;
  return false;
}

async function readSharedRoot(){
  try{const h=await sharedIdbOp("readonly",SHARED_ROOT_KEY);return h??null;}catch{return null;}
}
async function writeSharedRoot(root){
  await sharedIdbOp("readwrite",SHARED_ROOT_KEY,root);
  await sharedIdbOp("readwrite",SHARED_META_KEY,{connectedAt:new Date().toISOString(),name:root.name});
}
/* One-time silent migration: an already-deployed Night Audit install that
   connected its OWN private pmsRootFolder handle before this brief copies it
   into the shared store instead of re-prompting. Never overwrites an existing
   shared root; a no-op once migrated. Only migrates if permission is ALREADY
   granted (query only, no gesture). */
async function migrateOldPmsRoot(){
  try{
    const already=await readSharedRoot();
    if(already)return already;
    const old=await idbOp("readonly",OLD_PMS_ROOT_IDB_KEY);
    if(!old)return null;
    const ok=await verifySharedPermission(old,false);
    if(!ok)return null;
    await writeSharedRoot(old);
    return old;
  }catch{return null;}
}
/* Silent-only check — lets the identify grid decide whether to show a "Resume
   folder access" button (acceptance #3: "not a buried setting"). */
async function sharedRootStatus(){
  if(!HAS_FS)return"none";
  const root=await readSharedRoot();
  if(!root)return"none";
  const ok=await verifySharedPermission(root,false);
  return ok?"connected":"needs-gesture";
}
/* Must be called from inside a real click handler — the only place allowed to
   request permission behind an actual user gesture. */
async function resumeSharedRootAccess(){
  const root=await readSharedRoot();
  if(!root)return null;
  const ok=await verifySharedPermission(root,true);
  return ok?root:null;
}
async function loadSharedRegistryCache(){
  try{const v=await sharedIdbOp("readonly",SHARED_REGISTRY_KEY);return v??null;}catch{return null;}
}
async function saveSharedRegistryCache(registry){
  try{await sharedIdbOp("readwrite",SHARED_REGISTRY_KEY,registry);}catch{}
}
async function readSharedValue(key){
  try{const v=await sharedIdbOp("readonly",key);return v??null;}catch{return null;}
}
async function writeSharedValue(key,value){
  try{await sharedIdbOp("readwrite",key,value);}catch{}
}

/* Bootstraps a brand-new registry — only matters if this app is somehow
   opened before any other PMS app has ever created the shared registry.
   Night Audit has no staff list of its own (hostStaff is always []), so in
   normal use this just produces an empty registry until the PMS folder is
   connected and the real registry (already built by Guest Portal) syncs in. */
function bootstrapRegistry(hostStaff,appId){
  hostStaff=Array.isArray(hostStaff)?hostStaff:[]; /* defensive */
  const now=new Date().toISOString();
  return{
    schemaVersion:1,
    staff:hostStaff.map(s=>({
      staffId:s.id,name:s.name,displayName:s.name,position:s.position,
      active:true,isTopAdmin:s.id===DEFAULT_TOP_ADMIN_ID,
      roles:{[appId]:"staff"},pin:null,failedAttempts:0,lockedAt:null,
      operaUsernames:[],cashierId:null,language:"en",theme:"light",updatedAt:now,updatedBy:"system"
    })),
    appPermissions:{},
    unattributedEnabled:{[appId]:false}, /* default OFF here — audit accountability, unlike guest-facing apps */
    idleTimeoutMin:{[appId]:10},
    updatedAt:now,updatedBy:"system"
  };
}

/* Migrates in the vendor/system account if this registry predates it —
   covers both a fresh bootstrap and an already-deployed registry synced in
   from the folder. Returns the SAME object when nothing changed. */
function ensureSystemAccount(registry){
  if(registry.staff.some(s=>s.staffId===SYSTEM_ADMIN_STAFF_ID))return registry;
  const now=new Date().toISOString();
  const sysEntry={
    staffId:SYSTEM_ADMIN_STAFF_ID,name:SYSTEM_ADMIN_DISPLAY_NAME,displayName:SYSTEM_ADMIN_DISPLAY_NAME,
    position:"System administrator (vendor)",active:true,isTopAdmin:true,accountType:"system",
    roles:{},pin:null,failedAttempts:0,lockedAt:null,operaUsernames:[],cashierId:null,language:"en",theme:"light",
    updatedAt:now,updatedBy:"system"
  };
  return{...registry,staff:[...registry.staff,sysEntry],updatedAt:now,updatedBy:"system"};
}

async function idGetSharedDir(root){
  const records=await root.getDirectoryHandle("Records",{create:true});
  return records.getDirectoryHandle("_shared",{create:true});
}
async function readRegistryFromFolder(root){
  try{
    const dir=await idGetSharedDir(root);
    const fh=await dir.getFileHandle(ID_REGISTRY_FILENAME);
    const file=await fh.getFile();
    const envelope=JSON.parse(await file.text());
    return envelope.payload;
  }catch{return null;} /* not connected, file doesn't exist yet, or unreadable — caller falls back to cache */
}
async function writeRegistryToFolder(root,registry){
  const dir=await idGetSharedDir(root);
  const envelope={schemaVersion:1,module:"_shared.staff-registry",generatedAt:new Date().toISOString(),payload:registry};
  const fh=await dir.getFileHandle(ID_REGISTRY_FILENAME,{create:true});
  const w=await fh.createWritable();
  await w.write(JSON.stringify(envelope,null,2));
  await w.close();
}

/* ── logStore — Records/Night Audit/activity-log/log_<YYYY-MM>.json, append-
   only, durable, never capped. Writes into the app's EXISTING dirHandle (see
   this file's header). Local display cache is capped at 1000 and plain JSON
   (no master key here — see header). ── */
const ID_LOG_CACHE_KEY="na_identity_activity_cache_v1";
const ID_LOG_CACHE_CAP=1000;

function idLoadLogCache(){
  try{const raw=localStorage.getItem(ID_LOG_CACHE_KEY);return raw?JSON.parse(raw):[];}catch{return[];}
}
function idSaveLogCache(entries){
  try{localStorage.setItem(ID_LOG_CACHE_KEY,JSON.stringify(entries.slice(0,ID_LOG_CACHE_CAP)));}catch{}
}
function idMonthKey(d){return d.toISOString().slice(0,7);}

async function idGetLogDir(dirHandle){return dirHandle.getDirectoryHandle("activity-log",{create:true});}

async function flushEntriesToFolder(dirHandle,entries){
  if(!entries.length)return;
  const dir=await idGetLogDir(dirHandle);
  const byMonth=new Map();
  entries.forEach(e=>{
    const k=idMonthKey(new Date(e.ts));
    if(!byMonth.has(k))byMonth.set(k,[]);
    byMonth.get(k).push(e);
  });
  for(const[month,monthEntries]of byMonth){
    const filename=`log_${month}.json`;
    let existing=[];
    try{
      const fh=await dir.getFileHandle(filename);
      const file=await fh.getFile();
      const envelope=JSON.parse(await file.text());
      existing=envelope.payload||[];
    }catch{existing=[];}
    const combined=[...existing,...monthEntries];
    const envelope={schemaVersion:1,module:"nightAudit.activity-log",periodStart:`${month}-01`,periodEnd:`${month}-01`,
      generatedAt:new Date().toISOString(),payload:combined};
    const fh=await dir.getFileHandle(filename,{create:true});
    const w=await fh.createWritable();
    await w.write(JSON.stringify(envelope,null,2));
    await w.close();
  }
}

/* ── The one Night-Audit-specific section (everything above is generic) ──
   Role vocabulary, tab defaults, and the rank/gating helpers this app's own
   Staff & PINs panel and role-based nav filtering need. ── */
const NA_ROLE_OPTIONS=[{value:"auditor",label:"Auditor"},{value:"night-manager",label:"Night Manager"}];
/* NA_ROLE_OPTIONS.label above stays English (used for rank comparisons/
   naRoleRank lookups by value, never displayed directly) — UI call sites use
   this instead, so a language toggle updates role labels immediately. */
function naRoleLabel(value){
  if(value==="auditor")return t("identity.roleAuditor");
  if(value==="night-manager")return t("identity.roleNightManager");
  return value;
}
const NA_OPERATIONAL_TABS=["upload","journal","cash","reconcile","reports","history","production"];
const NA_DEFAULT_TABS_BY_ROLE={
  viewer:["history","reports"],
  auditor:NA_OPERATIONAL_TABS,
  "night-manager":[...NA_OPERATIONAL_TABS,"staffPins","activity"]
};
const NA_ALL_TABS=[...NA_OPERATIONAL_TABS,"staffPins","activity"];

function naRoleRank(entry){
  if(entry.isTopAdmin)return Infinity;
  const idx=NA_ROLE_OPTIONS.findIndex(r=>r.value===(entry.roles[NA_APP_ID]??""));
  return idx+1; /* -1 (unset/viewer) -> 0 */
}
function naCanEdit(entry){return!!entry&&naRoleRank(entry)>0;}
function naIsNightManager(entry){return!!entry&&(entry.isTopAdmin||entry.roles[NA_APP_ID]==="night-manager");}
function naVisibleTabs(entry,overrides){
  if(!entry)return new Set(["history","reports"]);
  if(entry.isTopAdmin)return new Set(NA_ALL_TABS);
  const role=entry.roles[NA_APP_ID]??"viewer";
  const tabs=(overrides&&overrides[role])??NA_DEFAULT_TABS_BY_ROLE[role]??NA_DEFAULT_TABS_BY_ROLE.viewer;
  return new Set(tabs);
}
/* No vault here, so no recovery-code-gated middle tier (see file header) —
   just free (strictly outranks the target, or resetting your own PIN) or
   denied. Equal-rank/top-admin-on-top-admin resets: use Guest Portal. */
function naResetAvailability(actor,target){
  if(actor.staffId===target.staffId)return"free";
  return naRoleRank(actor)>naRoleRank(target)?"free":"denied";
}

/* ── useIdentity — the central hook: registry state, identify/switch/idle-
   timeout, PIN set, roles/permissions, activity logging, the Opera-mapping
   registry payoff (#6), and this module's own PMS-root folder connection. ── */
const ID_REGISTRY_DEBOUNCE_MS=3000;
const ID_REGISTRY_INTERVAL_MS=5*60*1000;
const ID_LOG_INTERVAL_MS=5*60*1000;
const ID_LOG_DEBOUNCE_MS=3000;
const ID_IDLE_CHECK_MS=15000;
const ID_MAX_FAILED_ATTEMPTS=5;
const ID_PMS_ROOT_NAME_KEY="na_pms_root_name";

function useIdentity(opts){
  const{appId,dirHandle,hostStaff}=opts;

  const[registry,setRegistryRaw]=useState(null);
  const[loaded,setLoaded]=useState(false);
  const[currentStaffId,setCurrentStaffId]=useState(null);
  const[activityLog,setActivityLog]=useState([]);
  const[registrySource,setRegistrySource]=useState("bootstrap");
  const[pmsRoot,setPmsRoot]=useState(null);
  const[pmsRootName,setPmsRootName]=useState(()=>{try{return localStorage.getItem(ID_PMS_ROOT_NAME_KEY)||null;}catch{return null;}});

  const registryRef=useRef(registry);registryRef.current=registry;
  const pmsRootRef=useRef(pmsRoot);pmsRootRef.current=pmsRoot;
  const currentStaffIdRef=useRef(currentStaffId);currentStaffIdRef.current=currentStaffId;
  const dirHandleRef=useRef(dirHandle);dirHandleRef.current=dirHandle;

  const[needsResume,setNeedsResume]=useState(false);

  /* Load local cache (or bootstrap) once on mount. Also consults the shared
     cross-app cache (BRIEF-SHARED-CONNECTION.md #2) — whichever of the two is
     newer wins, so a PIN set moments ago in a DIFFERENT app on this machine
     isn't shadowed by this app's own (possibly older, or altogether absent)
     local cache the very first time it opens. */
  useEffect(()=>{
    (async()=>{
      const local=idLoadRegistryCache();
      const shared=await loadSharedRegistryCache();
      const cached=!local?shared:!shared?local:(new Date(shared.updatedAt)>new Date(local.updatedAt)?shared:local);
      const base=cached??bootstrapRegistry(hostStaff,appId);
      const reg=ensureSystemAccount(base);
      if(reg!==base||reg!==shared){idSaveRegistryCache(reg);saveSharedRegistryCache(reg);}
      setRegistryRaw(reg);
      setRegistrySource(cached?"known":"bootstrap");
      setActivityLog(idLoadLogCache());
      setLoaded(true);
    })();
    // eslint-disable-next-line
  },[]);

  /* Restore this module's OWN PMS-root folder connection (separate from the
     app's own dirHandle — see file header) from the shared cross-app store,
     migrating an old private handle in silently the first time this runs
     post-upgrade (BRIEF-SHARED-CONNECTION.md). Silent check only (query, no
     gesture) — matches this effect's pre-existing behavior exactly; a stored
     root that needs a click surfaces via needsResume instead. */
  useEffect(()=>{
    if(!HAS_FS)return;
    (async()=>{
      const root=(await readSharedRoot())??(await migrateOldPmsRoot());
      if(!root)return;
      const ok=await verifySharedPermission(root,false);
      if(ok){setPmsRoot(root);setPmsRootName(root.name);}
      else setNeedsResume(true);
    })();
  },[]);

  async function connectPmsRoot(){
    if(!HAS_FS)return{ok:false,reason:"no-fs"};
    try{
      const h=await window.showDirectoryPicker({mode:"readwrite"});
      setPmsRoot(h);setPmsRootName(h.name);setNeedsResume(false);
      try{localStorage.setItem(ID_PMS_ROOT_NAME_KEY,h.name);}catch{}
      await writeSharedRoot(h);
      return{ok:true};
    }catch(e){
      if(e.name==="AbortError")return{ok:false,reason:"cancelled"};
      return{ok:false,reason:"failed"};
    }
  }

  /* Called from inside a real click handler only (the identify grid's "Resume
     folder access" button) — the sole place allowed to request permission
     behind an actual user gesture, per BRIEF-SHARED-CONNECTION.md acceptance #3. */
  async function resumePmsRootAccess(){
    const root=await resumeSharedRootAccess();
    if(!root)return false;
    setPmsRoot(root);setPmsRootName(root.name);setNeedsResume(false);
    try{localStorage.setItem(ID_PMS_ROOT_NAME_KEY,root.name);}catch{}
    return true;
  }

  /* Reconcile with the shared folder copy once reachable — last-write-wins
     by updatedAt, same rule Guest Portal's reference implementation uses. */
  useEffect(()=>{
    if(!pmsRoot||!loaded)return;
    let cancelled=false;
    (async()=>{
      const rawFolderReg=await readRegistryFromFolder(pmsRoot);
      if(cancelled)return;
      if(!rawFolderReg){
        if(registryRef.current)await writeRegistryToFolder(pmsRoot,registryRef.current).catch(()=>{});
        return;
      }
      const folderReg=ensureSystemAccount(rawFolderReg);
      if(folderReg!==rawFolderReg)await writeRegistryToFolder(pmsRoot,folderReg).catch(()=>{});
      setRegistrySource("known"); /* a real folder registry was just read — never downgrade back to "bootstrap" */
      setRegistryRaw(prev=>{
        if(!prev)return folderReg;
        const winner=new Date(folderReg.updatedAt).getTime()>new Date(prev.updatedAt).getTime()?folderReg:prev;
        saveSharedRegistryCache(winner); /* keep the same-machine mirror current too */
        return winner;
      });
    })();
    return()=>{cancelled=true;};
  },[pmsRoot,loaded]);

  const registryDirty=useRef(false);
  const registryDebounce=useRef(null);
  const flushRegistry=useCallback(async()=>{
    const r=pmsRootRef.current,reg=registryRef.current;
    if(!r||!reg||!registryDirty.current)return;
    try{await writeRegistryToFolder(r,reg);registryDirty.current=false;}catch{/* retried next interval tick */}
  },[]);
  useEffect(()=>{
    if(!pmsRoot)return;
    const id=setInterval(flushRegistry,ID_REGISTRY_INTERVAL_MS);
    return()=>clearInterval(id);
  },[pmsRoot,flushRegistry]);

  const mutateRegistry=useCallback(updater=>{
    setRegistryRaw(prev=>{
      if(!prev)return prev;
      const next=updater(prev);
      idSaveRegistryCache(next);
      saveSharedRegistryCache(next);
      registryDirty.current=true;
      if(registryDebounce.current)clearTimeout(registryDebounce.current);
      registryDebounce.current=setTimeout(flushRegistry,ID_REGISTRY_DEBOUNCE_MS);
      return next;
    });
  },[flushRegistry]);

  /* Activity log: instant in-memory update + debounced/idle durable flush
     (PERFORMANCE.md: nothing synchronous on the interaction path).

     Two SEPARATE pending queues, not one shared list — found via in-browser
     testing (not just code review) that a single shared queue duplicates
     entries every flush when no folder is connected: the folder-write branch
     is the only place that clears the queue, so with no dirHandle it never
     empties, and each debounced/interval flush re-appends the same growing
     backlog onto the local cache again. `pendingFolder` is a genuine retry
     queue (cleared only once the folder write actually succeeds);
     `pendingLocal` is cleared unconditionally every flush, since the local
     cache mirror has no equivalent "did it actually land" check to retry
     against. (The upstream Guest Portal module this was ported from shares
     this single-queue shape — worth checking there too.) */
  const pendingFolder=useRef([]);
  const pendingLocal=useRef([]);
  const logDebounce=useRef(null);
  const flushLog=useCallback(async()=>{
    const dh=dirHandleRef.current;
    const forFolder=pendingFolder.current,forLocal=pendingLocal.current;
    if(dh&&forFolder.length){
      try{await flushEntriesToFolder(dh,forFolder);pendingFolder.current=[];}catch{/* retried next interval tick */}
    }
    if(forLocal.length){
      idSaveLogCache([...forLocal,...idLoadLogCache()]);
      pendingLocal.current=[];
    }
  },[]);
  useEffect(()=>{
    const id=setInterval(flushLog,ID_LOG_INTERVAL_MS);
    return()=>clearInterval(id);
  },[flushLog]);

  const queueLog=useCallback((action,staffId,target,detail)=>{
    const entry={ts:new Date().toISOString(),staffId:staffId??UNATTRIBUTED_STAFF_ID,app:appId,action,target,detail};
    setActivityLog(prev=>[entry,...prev].slice(0,1000));
    pendingFolder.current=[entry,...pendingFolder.current];
    pendingLocal.current=[entry,...pendingLocal.current];
    if(logDebounce.current)clearTimeout(logDebounce.current);
    logDebounce.current=setTimeout(()=>{
      if("requestIdleCallback" in window)window.requestIdleCallback(flushLog);
      else flushLog();
    },ID_LOG_DEBOUNCE_MS);
  },[appId,flushLog]);

  const logAction=useCallback((action,target,detail)=>{queueLog(action,currentStaffIdRef.current,target,detail);},[queueLog]);

  const findEntry=useCallback(staffId=>registry?registry.staff.find(s=>s.staffId===staffId)??null:null,[registry]);
  const activeStaff=useMemo(()=>excludeSystemAndExternalAccounts((registry?.staff||[]).filter(s=>s.active)).sort((a,b)=>a.displayName.localeCompare(b.displayName)),[registry]);
  const allStaff=useMemo(()=>excludeSystemAndExternalAccounts([...(registry?.staff||[])]).sort((a,b)=>a.displayName.localeCompare(b.displayName)),[registry]);
  const systemStaff=useMemo(()=>(registry?.staff||[]).filter(isSystemAccount).sort((a,b)=>a.displayName.localeCompare(b.displayName)),[registry]);
  /* All externals, regardless of per-app visibility — Staff & PINs manages roles
     for every external from any app. */
  const externalStaff=useMemo(()=>(registry?.staff||[]).filter(isExternalAccount).sort((a,b)=>a.displayName.localeCompare(b.displayName)),[registry]);
  /* Externals visible on THIS app's identify grid: active, and either a top
     admin or holding a role in this specific appId. */
  const visibleExternalStaff=useMemo(()=>externalStaff.filter(s=>s.active&&isVisibleInApp(s,appId)),[externalStaff,appId]);
  const isBootstrapMode=useMemo(()=>!!registry&&!registry.staff.some(s=>s.isTopAdmin&&s.pin!==null),[registry]);
  const currentEntry=currentStaffId&&currentStaffId!==UNATTRIBUTED_STAFF_ID?findEntry(currentStaffId):null;
  const isUnattributed=currentStaffId===UNATTRIBUTED_STAFF_ID;
  const unattributedEnabled=registry?.unattributedEnabled[appId]??false;
  const idleTimeoutMin=registry?.idleTimeoutMin[appId]??10;

  /* Idle timeout — ref-only activity tracking, zero re-renders per keystroke. */
  const lastActivity=useRef(Date.now());
  const bumpActivity=useCallback(()=>{lastActivity.current=Date.now();},[]);
  useEffect(()=>{
    const onActivity=()=>{lastActivity.current=Date.now();};
    window.addEventListener("mousedown",onActivity,{passive:true});
    window.addEventListener("keydown",onActivity,{passive:true});
    window.addEventListener("touchstart",onActivity,{passive:true});
    return()=>{
      window.removeEventListener("mousedown",onActivity);
      window.removeEventListener("keydown",onActivity);
      window.removeEventListener("touchstart",onActivity);
    };
  },[]);
  /* Starts (or refreshes) the ONE shared cross-app session (BRIEF-IDENTITY-V2.md
     #2) — fire-and-forget, never awaited on the interaction path (PERFORMANCE.md). */
  const startSharedSession=useCallback(staffId=>{
    writeSharedValue(SHARED_SESSION_KEY,{staffId,appId,identifiedAt:new Date().toISOString(),lastActivity:new Date().toISOString()});
  },[appId]);

  /* Tracks whether THIS tab has ever seen its own current session actually land
     in the shared store — distinguishes "another app genuinely cleared/replaced
     it" from "my own startSharedSession() write hasn't landed yet" (a real race:
     each shared-store call opens its own IndexedDB transaction, and
     mutateRegistry's registry update — a dependency of findEntry, hence of this
     whole callback — re-triggers the effect below immediately, often before the
     write's transaction resolves). Without this, a fresh identify could read
     back a still-empty shared session on the very next tick and immediately log
     itself back out. */
  const sessionSeenRef=useRef(false);

  /* Poll (not push) — matches the cadence the local-only idle check already used,
     so this replaces it rather than adding a second timer. Three jobs per tick:
     1. Nobody identified locally yet -> adopt a still-fresh session from another
        app (silent — the ORIGINAL identify already logged once; this is pickup,
        not a new identify — acceptance #2's "already identified" behavior).
     2. Someone IS identified locally, but the shared session disappeared or now
        belongs to someone else -> if we'd already confirmed our OWN session was
        there at least once, this is a genuine remote clear/hand-off — drop
        locally, unlogged (whoever cleared it already logged once). If we never
        confirmed it yet, this is almost certainly the write-race above —
        self-heal by re-writing our own session instead of logging out the
        moment after identifying.
     3. Someone IS identified locally and the session still matches -> whichever
        of the local ref or the shared value saw more RECENT activity wins; if
        the combined idle time exceeds THIS app's own idleTimeoutMin, this tab
        performs a compare-and-clear (re-reads before writing, so two tabs
        racing the same expiry don't both log it) and logs "idle-timeout"
        exactly once. Otherwise pushes this tab's more-recent activity into the
        shared session so every other app's clock sees it too ("Idle timer is
        GLOBAL"). */
  const syncSharedSession=useCallback(async()=>{
    const session=await readSharedValue(SHARED_SESSION_KEY);
    const now=Date.now();
    if(!currentStaffIdRef.current){
      sessionSeenRef.current=false;
      if(!session)return;
      const entry=findEntry(session.staffId);
      if(!entry||!entry.active||entry.lockedAt)return;
      if(naSessionElapsedMinutes(session.lastActivity,0,now)>=idleTimeoutMin)return; /* stale — the owning app will clear it */
      lastActivity.current=new Date(session.lastActivity).getTime();
      setCurrentStaffId(session.staffId);
      return;
    }
    if(!session||session.staffId!==currentStaffIdRef.current){
      if(!sessionSeenRef.current){
        startSharedSession(currentStaffIdRef.current); /* self-heal a same-tab write race, not a real clear */
        return;
      }
      setCurrentStaffId(null);
      return;
    }
    sessionSeenRef.current=true;
    const sharedActivity=new Date(session.lastActivity).getTime();
    const elapsedMin=naSessionElapsedMinutes(session.lastActivity,lastActivity.current,now);
    if(elapsedMin>=idleTimeoutMin){
      const stillThere=await readSharedValue(SHARED_SESSION_KEY);
      if(stillThere&&stillThere.staffId===currentStaffIdRef.current){
        await writeSharedValue(SHARED_SESSION_KEY,null);
        queueLog("idle-timeout",currentStaffIdRef.current);
      }
      setCurrentStaffId(null);
      sessionSeenRef.current=false;
      return;
    }
    if(lastActivity.current>sharedActivity){
      writeSharedValue(SHARED_SESSION_KEY,{...session,lastActivity:new Date(lastActivity.current).toISOString()});
    }
  },[findEntry,idleTimeoutMin,queueLog,startSharedSession]);

  useEffect(()=>{
    if(!loaded)return;
    syncSharedSession();
    const id=setInterval(syncSharedSession,ID_IDLE_CHECK_MS);
    return()=>clearInterval(id);
  },[loaded,syncSharedSession]);

  const identify=useCallback(async(staffId,pin)=>{
    const entry=findEntry(staffId);
    if(!entry)return{ok:false,reason:"not-found"};
    if(!entry.active)return{ok:false,reason:"inactive"};
    if(entry.lockedAt)return{ok:false,reason:"locked"};
    if(!entry.pin)return{ok:false,reason:"no-pin"};
    const ok=await verifyPin(pin,entry.pin);
    if(ok){
      mutateRegistry(prev=>({...prev,staff:prev.staff.map(s=>s.staffId===staffId?{...s,failedAttempts:0}:s)}));
      setCurrentStaffId(staffId);bumpActivity();queueLog("identify-success",staffId);
      startSharedSession(staffId);
      return{ok:true};
    }
    const attempts=entry.failedAttempts+1;
    const willLock=attempts>=ID_MAX_FAILED_ATTEMPTS;
    const now=new Date().toISOString();
    mutateRegistry(prev=>({...prev,staff:prev.staff.map(s=>s.staffId===staffId?{...s,failedAttempts:attempts,lockedAt:willLock?now:s.lockedAt}:s)}));
    queueLog("identify-fail",staffId,undefined,`attempt ${attempts}/${ID_MAX_FAILED_ATTEMPTS}`);
    if(willLock)queueLog("soft-lock",staffId);
    return{ok:false,reason:willLock?"locked":"wrong-pin"};
  },[findEntry,mutateRegistry,queueLog,bumpActivity,startSharedSession]);

  /* Sign-off verification for the Night Manager approval "signature"
     (BRIEF-IDENTITY §1) — like identify(), but deliberately does NOT change
     currentStaffId: the auditor's own session stays current after the night
     manager co-signs the approval. Only night-manager/top-admin may sign. */
  const verifySignOff=useCallback(async(staffId,pin)=>{
    const entry=findEntry(staffId);
    if(!entry)return{ok:false,reason:"not-found"};
    if(!entry.active)return{ok:false,reason:"inactive"};
    if(entry.lockedAt)return{ok:false,reason:"locked"};
    if(!entry.pin)return{ok:false,reason:"no-pin"};
    if(!naIsNightManager(entry))return{ok:false,reason:"not-authorized"};
    const ok=await verifyPin(pin,entry.pin);
    if(ok){
      mutateRegistry(prev=>({...prev,staff:prev.staff.map(s=>s.staffId===staffId?{...s,failedAttempts:0}:s)}));
      queueLog("sign-off-success",staffId);
      return{ok:true,entry};
    }
    const attempts=entry.failedAttempts+1;
    const willLock=attempts>=ID_MAX_FAILED_ATTEMPTS;
    const now=new Date().toISOString();
    mutateRegistry(prev=>({...prev,staff:prev.staff.map(s=>s.staffId===staffId?{...s,failedAttempts:attempts,lockedAt:willLock?now:s.lockedAt}:s)}));
    queueLog("sign-off-fail",staffId,undefined,`attempt ${attempts}/${ID_MAX_FAILED_ATTEMPTS}`);
    if(willLock)queueLog("soft-lock",staffId);
    return{ok:false,reason:willLock?"locked":"wrong-pin"};
  },[findEntry,mutateRegistry,queueLog]);

  const identifyUnattributed=useCallback(()=>{
    setCurrentStaffId(UNATTRIBUTED_STAFF_ID);bumpActivity();queueLog("identify-success",UNATTRIBUTED_STAFF_ID);
    startSharedSession(UNATTRIBUTED_STAFF_ID);
  },[queueLog,bumpActivity,startSharedSession]);

  const switchToGrid=useCallback(()=>{
    const sid=currentStaffIdRef.current;
    queueLog("switch",sid);
    setCurrentStaffId(null);
    (async()=>{
      const session=await readSharedValue(SHARED_SESSION_KEY);
      if(session&&session.staffId===sid)await writeSharedValue(SHARED_SESSION_KEY,null);
    })();
  },[queueLog]);

  const bootstrapSetOwnPin=useCallback(async(staffId,pin)=>{
    if(!isBootstrapMode)return{ok:false,reason:"not-bootstrap"};
    if(!isValidPinFormat(pin))return{ok:false,reason:"bad-format"};
    if(isTrivialPin(pin))return{ok:false,reason:"trivial"};
    if(!findEntry(staffId))return{ok:false,reason:"not-found"};
    const hash=await hashPin(pin);
    const now=new Date().toISOString();
    mutateRegistry(prev=>({...prev,staff:prev.staff.map(s=>s.staffId===staffId?{...s,pin:hash,failedAttempts:0,lockedAt:null,updatedAt:now,updatedBy:staffId}:s)}));
    queueLog("pin-set-bootstrap",staffId);
    setCurrentStaffId(staffId);bumpActivity();queueLog("identify-success",staffId);
    startSharedSession(staffId);
    return{ok:true};
  },[isBootstrapMode,findEntry,mutateRegistry,queueLog,bumpActivity,startSharedSession]);

  const setPin=useCallback(async(actorStaffId,targetStaffId,newPin)=>{
    if(!isValidPinFormat(newPin))return{ok:false,reason:"bad-format"};
    if(isTrivialPin(newPin))return{ok:false,reason:"trivial"};
    const actor=findEntry(actorStaffId),target=findEntry(targetStaffId);
    if(!actor||!target)return{ok:false,reason:"not-found"};
    if(naResetAvailability(actor,target)==="denied")return{ok:false,reason:"not-authorized"};
    const hash=await hashPin(newPin);
    const now=new Date().toISOString();
    mutateRegistry(prev=>({...prev,staff:prev.staff.map(s=>s.staffId===targetStaffId?{...s,pin:hash,failedAttempts:0,lockedAt:null,updatedAt:now,updatedBy:actorStaffId}:s)}));
    queueLog("pin-reset",actorStaffId,targetStaffId);
    return{ok:true};
  },[findEntry,mutateRegistry,queueLog]);

  const setRole=useCallback((actorStaffId,targetStaffId,appIdForRole,role)=>{
    const actor=findEntry(actorStaffId);
    if(!actor?.isTopAdmin)return;
    const now=new Date().toISOString();
    mutateRegistry(prev=>({...prev,staff:prev.staff.map(s=>{
      if(s.staffId!==targetStaffId)return s;
      const roles={...s.roles};
      if(role)roles[appIdForRole]=role;else delete roles[appIdForRole];
      return{...s,roles,updatedAt:now,updatedBy:actorStaffId};
    })}));
    queueLog("role-grant",actorStaffId,`${targetStaffId}:${appIdForRole}`,role??"viewer");
  },[findEntry,mutateRegistry,queueLog]);

  /* External accounts — top-admin only, add/edit (BRIEF-EXTERNAL-ACCOUNTS.md).
     CAPABILITY ONLY: sole creation path, nothing bootstraps/migrates one in.
     Deactivate/reactivate: Night Audit has no generic setActive (top-admin
     status is read-only here, per this file's header) — use Guest Portal's
     Staff & PINs panel for that, same as any other top-admin toggle here. */
  const addExternal=useCallback((actorStaffId,input)=>{
    const actor=findEntry(actorStaffId);
    if(!actor?.isTopAdmin)return{ok:false,reason:"not-authorized"};
    const staffId=(input.staffId||"").trim();
    const name=(input.name||"").trim();
    if(!staffId.startsWith(EXTERNAL_STAFF_ID_PREFIX)||!name)return{ok:false,reason:"bad-input"};
    if(findEntry(staffId))return{ok:false,reason:"already-exists"};
    const now=new Date().toISOString();
    const entry={
      staffId,name,displayName:(input.displayName||name).trim()||name,
      position:(input.position||"").trim(),department:input.department?.trim()||undefined,
      active:true,isTopAdmin:false,accountType:"external",roles:{},
      pin:null,failedAttempts:0,lockedAt:null,operaUsernames:[],cashierId:null,language:"en",theme:"light",
      updatedAt:now,updatedBy:actorStaffId
    };
    mutateRegistry(prev=>({...prev,staff:[...prev.staff,entry],updatedAt:now,updatedBy:actorStaffId}));
    queueLog("external-add",actorStaffId,staffId,name);
    return{ok:true};
  },[findEntry,mutateRegistry,queueLog]);

  const updateExternal=useCallback((actorStaffId,targetStaffId,patch)=>{
    const actor=findEntry(actorStaffId);
    if(!actor?.isTopAdmin)return{ok:false,reason:"not-authorized"};
    const target=findEntry(targetStaffId);
    if(!target||!isExternalAccount(target))return{ok:false,reason:"not-found"};
    const now=new Date().toISOString();
    mutateRegistry(prev=>({...prev,staff:prev.staff.map(s=>s.staffId===targetStaffId?{...s,...patch,updatedAt:now,updatedBy:actorStaffId}:s)}));
    queueLog("external-edit",actorStaffId,targetStaffId,JSON.stringify(patch));
    return{ok:true};
  },[findEntry,mutateRegistry,queueLog]);

  const updateDisplayName=useCallback((actorStaffId,targetStaffId,displayName)=>{
    const trimmed=displayName.trim();
    if(!trimmed)return;
    const actor=findEntry(actorStaffId);
    if(actorStaffId!==targetStaffId&&!actor?.isTopAdmin)return;
    const now=new Date().toISOString();
    mutateRegistry(prev=>({...prev,staff:prev.staff.map(s=>s.staffId===targetStaffId?{...s,displayName:trimmed,updatedAt:now,updatedBy:actorStaffId}:s)}));
    queueLog("display-name-edit",actorStaffId,targetStaffId,trimmed);
  },[findEntry,mutateRegistry,queueLog]);

  const setPermissionsOverride=useCallback((actorStaffId,appIdForPerm,role,tabs)=>{
    const actor=findEntry(actorStaffId);
    if(!actor?.isTopAdmin)return;
    mutateRegistry(prev=>{
      const appPermissions={...prev.appPermissions};
      const forApp={...(appPermissions[appIdForPerm]??{})};
      if(tabs)forApp[role]=tabs;else delete forApp[role];
      appPermissions[appIdForPerm]=forApp;
      return{...prev,appPermissions,updatedAt:new Date().toISOString(),updatedBy:actorStaffId};
    });
    queueLog("permissions-edit",actorStaffId,`${appIdForPerm}:${role}`,tabs?tabs.join(","):"default");
  },[findEntry,mutateRegistry,queueLog]);

  const setUnattributedEnabled=useCallback((actorStaffId,enabled)=>{
    mutateRegistry(prev=>({...prev,unattributedEnabled:{...prev.unattributedEnabled,[appId]:enabled}}));
    queueLog("unattributed-toggle",actorStaffId,appId,String(enabled));
  },[appId,mutateRegistry,queueLog]);

  const setIdleTimeoutMinutes=useCallback((actorStaffId,minutes)=>{
    if(!Number.isFinite(minutes)||minutes<1)return;
    mutateRegistry(prev=>({...prev,idleTimeoutMin:{...prev.idleTimeoutMin,[appId]:Math.round(minutes)}}));
    queueLog("idle-timeout-setting",actorStaffId,appId,String(Math.round(minutes)));
  },[appId,mutateRegistry,queueLog]);

  /* Night Audit's registry payoff (BRIEF-IDENTITY §6): operaUsernames/
     cashierId per staff, wired into Production KPI's identity mapping.
     Editable by anyone with edit rights in this app (auditor+), not just
     the top admin — it's operational join data, not an identity/security
     action, so it doesn't need the top-admin gate role-grants use. */
  const setOperaMapping=useCallback((actorStaffId,targetStaffId,patch)=>{
    const now=new Date().toISOString();
    mutateRegistry(prev=>({...prev,staff:prev.staff.map(s=>s.staffId===targetStaffId?{...s,...patch,updatedAt:now,updatedBy:actorStaffId}:s)}));
    queueLog("opera-mapping-edit",actorStaffId,targetStaffId,JSON.stringify(patch));
  },[mutateRegistry,queueLog]);

  /* LANGUAGE.md rule 4: per-user UI language, self-set (no rank gate — a
     personal preference, not a security/identity action). Registry schema
     addition `language` — byte-compatible, optional field (this is the
     first app to run BRIEF-BILINGUAL; other apps just read/write it once
     they adopt it too). */
  const updateLanguage=useCallback((staffId,lang)=>{
    if(lang!=="en"&&lang!=="ar")return;
    const now=new Date().toISOString();
    mutateRegistry(prev=>({...prev,staff:prev.staff.map(s=>s.staffId===staffId?{...s,language:lang,updatedAt:now,updatedBy:staffId}:s)}));
  },[mutateRegistry]);

  /* BRIEF-POLISH-1.md #3 ("theme must default to LIGHT and follow the user,
     not the OS") — exact same self-service pattern as updateLanguage above,
     just a different field. Absent/undefined `theme` on a registry entry
     means "light" (never the OS preference); this is the explicit-choice
     write path, applied after identify on any device (see app.js's theme-
     sync effect, which mirrors its own language-sync effect). */
  const updateTheme=useCallback((staffId,theme)=>{
    if(theme!=="light"&&theme!=="dark")return;
    const now=new Date().toISOString();
    mutateRegistry(prev=>({...prev,staff:prev.staff.map(s=>s.staffId===staffId?{...s,theme,updatedAt:now,updatedBy:staffId}:s)}));
  },[mutateRegistry]);

  return{
    loaded,registry,currentStaffId,currentEntry,isUnattributed,isBootstrapMode,registrySource,
    activeStaff,allStaff,systemStaff,externalStaff,visibleExternalStaff,
    unattributedEnabled,idleTimeoutMin,activityLog,
    pmsRoot,pmsRootName,connectPmsRoot,needsResume,resumePmsRootAccess,
    findEntry,identify,verifySignOff,identifyUnattributed,switchToGrid,bootstrapSetOwnPin,
    setPin,setRole,updateDisplayName,addExternal,updateExternal,setPermissionsOverride,setUnattributedEnabled,
    setIdleTimeoutMinutes,setOperaMapping,updateLanguage,updateTheme,logAction
  };
}

/* ── UI: PinPad — BRIEF-PINPAD-SIMPLIFY.md: keyboard-first PIN entry. Hotel
   PCs are keyboard-only (no touchscreen), so the old 10-button on-screen
   keypad grid was pure dead weight. Four masked, single-digit cells replace
   it: auto-advance on type, backspace steps back, paste of a 4-digit string
   fills all four. Plain component state per keystroke (PERFORMANCE.md: well
   under the 50ms budget — this isn't the high-frequency journal-nav hot path
   that needs the two-tier pattern). Ported from Guest Portal's PinPad.tsx. ── */
const PIN_LENGTH=4;
function pinEmptyDigits(){return Array(PIN_LENGTH).fill("");}

function PinPad({onComplete,error,disabled,autoFocus=true}){
  const[digits,setDigits]=useState(pinEmptyDigits);
  const firedRef=useRef(false);
  const cellsRef=useRef([]);
  const value=digits.join("");

  /* Fires onComplete as an effect (not inside the setDigits updater), and
     clears its OWN digits/fired state right after — does NOT wait for the
     parent's `error` prop to change as the reset trigger, since two
     consecutive wrong PINs produce the identical error STRING and React
     bails out of a same-value setState, which would freeze the pad after
     the first wrong attempt (this exact bug was found + fixed in Guest
     Portal's build — see its STATUS-LOGINS.md bug #3). */
  useEffect(()=>{
    if(value.length===PIN_LENGTH&&digits.every(Boolean)&&!firedRef.current){
      firedRef.current=true;
      const id=setTimeout(()=>{onComplete(value);setDigits(pinEmptyDigits());firedRef.current=false;},60);
      return()=>clearTimeout(id);
    }
    // eslint-disable-next-line
  },[value,onComplete]);

  function focusCell(i){
    const el=cellsRef.current[Math.max(0,Math.min(PIN_LENGTH-1,i))];
    if(el)el.focus();
  }

  /* BRIEF-POLISH-1.md #5 — ONE-PAGE login: focus starts on the PIN, and
     returns here (not the Employee ID field) whenever the pad is empty — on
     mount, after a completed/failed attempt resets it, and after the
     bootstrap retype step swaps in a fresh instance via its `key`.
     BRIEF-LOGIN-FOCUS-FIX.md — `autoFocus` is the caller's signal for whether
     the PIN is allowed to grab focus right now (false while the Employee ID
     is still empty/unmatched, so a fresh login leaves focus in the ID field;
     true once a remembered ID is prefilled or a typed ID completes a
     registry match). Edge-triggered: when autoFocus flips false→true while a
     non-cell text input (the ID field) currently holds focus, that's the
     intentional "ID is complete, PIN takes over" handoff, so it's allowed
     through. Any OTHER re-run while that same text input still has focus
     (e.g. value resetting for an unrelated reason) leaves it alone — the PIN
     must never steal focus from the ID field mid-keystroke. */
  const wasAutoFocusableRef=useRef(autoFocus);
  useEffect(()=>{
    const justBecameEligible=autoFocus&&!wasAutoFocusableRef.current;
    wasAutoFocusableRef.current=autoFocus;
    if(disabled||value!==""||!autoFocus)return;

    const active=document.activeElement;
    const cellFocused=!!active&&cellsRef.current.includes(active);
    const otherTextInputFocused=!!active&&!cellFocused&&(active.tagName==="INPUT"||active.tagName==="TEXTAREA");
    if(otherTextInputFocused&&!justBecameEligible)return;

    focusCell(0);
  },[disabled,value,autoFocus]);

  function setDigitAt(i,d){
    setDigits(prev=>{const next=prev.slice();next[i]=d;return next;});
  }

  function handleChange(i,raw){
    if(disabled)return;
    const d=raw.replace(/\D/g,"").slice(-1);
    setDigitAt(i,d);
    if(d&&i<PIN_LENGTH-1)focusCell(i+1);
  }

  function handleKeyDown(i,e){
    if(disabled)return;
    if(e.key==="Backspace"&&!digits[i]&&i>0){
      e.preventDefault();
      setDigitAt(i-1,"");
      focusCell(i-1);
    }else if(e.key==="ArrowLeft"&&i>0){
      e.preventDefault();focusCell(i-1);
    }else if(e.key==="ArrowRight"&&i<PIN_LENGTH-1){
      e.preventDefault();focusCell(i+1);
    }
  }

  function handlePaste(e){
    if(disabled)return;
    const text=(e.clipboardData.getData("text")||"").replace(/\D/g,"").slice(0,PIN_LENGTH);
    if(!text)return;
    e.preventDefault();
    const next=pinEmptyDigits();
    for(let i=0;i<text.length;i++)next[i]=text[i];
    setDigits(next);
    focusCell(Math.min(text.length,PIN_LENGTH-1));
  }

  /* Fallback for the one gap real per-cell inputs leave: a keystroke landing
     with NOTHING focused (e.g. right after a click outside both fields).
     Mirrors POLISH-1's focus-guard — backs off whenever a real text field
     (the Employee ID input) currently holds focus, so it keeps its own
     keystrokes. */
  useEffect(()=>{
    function onKey(e){
      if(disabled)return;
      const active=document.activeElement;
      if(active&&cellsRef.current.includes(active))return;
      if(active&&(active.tagName==="INPUT"||active.tagName==="TEXTAREA"))return;
      if(/^\d$/.test(e.key)){
        const firstEmpty=digits.findIndex(d=>!d);
        const idx=firstEmpty===-1?PIN_LENGTH-1:firstEmpty;
        setDigitAt(idx,e.key);
        focusCell(Math.min(idx+1,PIN_LENGTH-1));
      }else if(e.key==="Backspace"){
        const lastFilled=PIN_LENGTH-1-digits.slice().reverse().findIndex(d=>d);
        if(lastFilled>=0&&lastFilled<PIN_LENGTH){setDigitAt(lastFilled,"");focusCell(lastFilled);}
      }
    }
    window.addEventListener("keydown",onKey);
    return()=>window.removeEventListener("keydown",onKey);
  },[disabled,digits]);

  return E("div",{style:{display:"flex",flexDirection:"column",alignItems:"center",gap:14}},
    E("div",{className:"pin-cells",dir:"ltr"},
      digits.map((d,i)=>E("input",{
        key:i,
        ref:el=>{cellsRef.current[i]=el;},
        type:"password",inputMode:"numeric",autoComplete:"off",maxLength:1,
        className:"pin-cell",value:d,disabled,
        onChange:e=>handleChange(i,e.target.value),
        onKeyDown:e=>handleKeyDown(i,e),
        onPaste:handlePaste,
        onFocus:e=>e.currentTarget.select(),
        "aria-label":`PIN digit ${i+1}`,
      }))),
    error&&E("div",{style:{fontSize:12,color:"var(--red-t)"}},error));
}

function initials(name){
  const parts=String(name||"").trim().split(/\s+/);
  return((parts[0]?parts[0][0]:"")+(parts[1]?parts[1][0]:"")).toUpperCase()||"?";
}

/* ── UI: IdentityGate — full-screen "who's using this?" screen, shown
   instead of the whole app when nobody is identified. ── */
/* BRIEF-IDENTITY-V2.md: no staff grid — nobody sees the staff list before
   logging in.
   BRIEF-POLISH-1.md #5 (Khalid, 2026-07-09) — ONE page: Employee ID field and
   PIN pad on the SAME screen, one confirm action (this component used to
   sequence them into two stages — "id" then "pin" — specifically because
   PinPad's window-wide digit listener didn't check what element had focus;
   that's fixed at the root now (see PinPad's onKey guard above), so both
   fields can stay mounted together. Remembered ID prefilled; digit keystrokes
   go straight to the PIN pad unless the ID field itself has focus — Tab or a
   click moves focus there to change it. */
const NA_LAST_ID_KEY="pms-last-identify-id";
function naLoadRememberedId(){try{return localStorage.getItem(NA_LAST_ID_KEY)||"";}catch{return"";}}
function naRememberId(id){try{localStorage.setItem(NA_LAST_ID_KEY,id);}catch{}}

function IdentityGate({identity,appLabel}){
  useLang();
  const[id,setId]=useState(naLoadRememberedId);
  const[bootstrapFirstPin,setBootstrapFirstPin]=useState(null);
  const[error,setError]=useState(undefined);
  const[busy,setBusy]=useState(false);

  if(!identity.loaded){
    return E("div",{className:"identity-shell"},E("div",{style:{color:"var(--t3)"}},t("identity.loadingStaff")));
  }

  const trimmedId=id.trim();
  const entry=trimmedId?identity.findEntry(trimmedId):null;
  const bootstrapping=!!entry&&!entry.pin&&identity.isBootstrapMode;

  /* Live, non-blocking hint under the ID field — doesn't stop anyone from
     typing their PIN; the actual confirm action is the PIN pad completing
     (see submitPin below), not this field. */
  const idHint=!trimmedId?undefined
    :!entry?t("identity."+naIdentifyErrorMessageKey("not-found",identity.registrySource))
    :!entry.active?t("identity."+naIdentifyErrorMessageKey("inactive",identity.registrySource))
    :entry.lockedAt?t("identity."+naIdentifyErrorMessageKey("locked",identity.registrySource))
    :undefined;

  /* Does ALL the validation that used to be split across the old id/pin
     stages: looks up the entry FRESH from the current `id` state at the
     moment the PIN completes (rather than trusting a possibly-stale closure),
     handles the bootstrap first-PIN/confirm flow, then identifies. */
  async function submitPin(pin){
    setError(undefined);
    const current=identity.findEntry(trimmedId);
    if(!current){setError(idHint??t("identity.cantIdentify"));return;}
    if(!current.active||current.lockedAt){setError(idHint);return;}

    const bootstrappingNow=!current.pin&&identity.isBootstrapMode;
    if(bootstrappingNow){
      if(!bootstrapFirstPin){setBootstrapFirstPin(pin);return;}
      if(pin!==bootstrapFirstPin){setError(t("identity.didntMatch"));setBootstrapFirstPin(null);return;}
      setBusy(true);
      const res=await identity.bootstrapSetOwnPin(current.staffId,pin);
      setBusy(false);
      if(!res.ok){
        setError(res.reason==="trivial"?t("identity.pinTooEasy"):t("identity.couldntSetPin"));
        setBootstrapFirstPin(null);
        return;
      }
      naRememberId(current.staffId);
      return; /* bootstrapSetOwnPin already logs the person straight in */
    }

    if(!current.pin){setError(t("identity."+naIdentifyErrorMessageKey("no-pin",identity.registrySource)));return;}
    setBusy(true);
    const res=await identity.identify(current.staffId,pin);
    setBusy(false);
    if(!res.ok){setError(t("identity."+naIdentifyErrorMessageKey(res.reason,identity.registrySource)));return;}
    naRememberId(current.staffId);
  }

  return E("div",{className:"identity-shell"},
    E("div",{style:{width:"100%",maxWidth:360}},
      E("div",{style:{textAlign:"center",marginBottom:18}},
        E("div",{className:"card-title",style:{fontSize:16}},t("identity.whoIsUsing",appLabel)),
        E("p",{style:{fontSize:13,color:"var(--t2)"}},t("identity.enterIdThenPin")),
        identity.needsResume&&E("button",{className:"btn sm",style:{marginTop:10},onClick:identity.resumePmsRootAccess},t("identity.resumeFolderAccess"))),

      E("div",{style:{marginBottom:18}},
        E("label",{className:"inp-label",style:{display:"block"}},t("identity.idFieldLabel")),
        /* BRIEF-LOGIN-FOCUS-FIX.md — only claim initial focus when there's no
           remembered ID to prefill; autoFocus is a mount-only DOM attribute, so
           this reads `id`'s ORIGINAL useState() initializer result, not its
           current (possibly since-typed) value. */
        E("input",{className:"inp",style:{width:"100%"},type:"text",inputMode:"text",autoFocus:!id,autoComplete:"off",spellCheck:false,
          value:id,disabled:!!bootstrapFirstPin,
          onChange:e=>{setId(e.target.value);setError(undefined);setBootstrapFirstPin(null);}}),
        idHint&&E("p",{style:{fontSize:12,color:"var(--red-t)",marginTop:4}},idHint)),

      E("div",{style:{display:"flex",flexDirection:"column",alignItems:"center",gap:16}},
        entry&&E("div",{style:{textAlign:"center"}},
          E("div",{className:"card-title"},entry.displayName),
          E("p",{style:{fontSize:13,color:"var(--t2)"}},
            bootstrapping?(bootstrapFirstPin?t("identity.firstTimeConfirm"):t("identity.firstTimeChoose")):t("identity.enterYourPin"))),
        /* BRIEF-LOGIN-FOCUS-FIX.md — the key used to include `trimmedId`,
           remounting PinPad on every ID keystroke; its own mount-focus effect
           then stole focus from the Employee ID field after every digit. Key
           only on the bootstrap retype step now (an intentional, infrequent
           reset); `autoFocus` (edge-triggered on a real entry match) governs
           day-to-day focus handoff instead. */
        E(PinPad,{key:bootstrapFirstPin??"1",onComplete:submitPin,error,disabled:busy||!!(entry&&entry.lockedAt),autoFocus:!!entry}),
        entry&&entry.lockedAt&&E("p",{style:{fontSize:12,color:"var(--red-t)"}},t("identity.lockedHelp")),
        identity.unattributedEnabled&&E("button",{type:"button",className:"btn sm",onClick:()=>identity.identifyUnattributed()},t("identity.continueUnattributed")))));
}

/* ── UI: IdentityFooter — the compact sidebar identity/utility block
   (BRIEF-POLISH-1.md #2). Replaces a sprawling stack of separate rows with
   ONE user chip (avatar initials + first name + role, click -> popover with
   Switch / Change PIN — Night Audit has no vault, so there's no Backup/
   Restore/Lock-now/Change-password here, see identity.js's file header) +
   ONE small icon row (language, dark/light mode, connection-status dot with
   tooltip). Generic/portable, same discipline PinPad/IdentityGate already
   follow — every string is a prop, no i18n calls inside this file. ── */
function IdentityFooter({
  initials:chipInitials,displayName,roleLabel,onSwitch,switchLabel,
  onChangePin,changePinLabel,
  lang,onToggleLang,langButtonLabel,
  theme,onToggleTheme,themeButtonLabel,
  connection
}){
  const[open,setOpen]=useState(false);
  const ref=useRef(null);

  useEffect(()=>{
    if(!open)return;
    function onDocClick(e){if(ref.current&&!ref.current.contains(e.target))setOpen(false);}
    function onEsc(e){if(e.key==="Escape")setOpen(false);}
    document.addEventListener("mousedown",onDocClick);
    document.addEventListener("keydown",onEsc);
    return()=>{document.removeEventListener("mousedown",onDocClick);document.removeEventListener("keydown",onEsc);};
  },[open]);

  function act(fn){setOpen(false);fn();}

  return E("div",{className:"id-footer",ref:ref},
    E("div",{className:"id-footer-chip-row"},
      E("button",{type:"button",className:"id-chip",onClick:()=>setOpen(v=>!v),"aria-expanded":open},
        E("span",{className:"avatar id-chip-avatar"},chipInitials),
        E("span",{className:"id-chip-text"},
          E("span",{className:"id-chip-name"},displayName),
          roleLabel&&E("span",{className:"id-chip-role"},roleLabel))),
      open&&E("div",{className:"id-chip-popover"},
        E("button",{type:"button",className:"id-chip-popover-item",onClick:()=>act(onSwitch)},switchLabel),
        onChangePin&&E("button",{type:"button",className:"id-chip-popover-item",onClick:()=>act(onChangePin)},changePinLabel))),
    E("div",{className:"id-footer-icon-row"},
      E("button",{type:"button",className:"id-icon-btn",onClick:onToggleLang,title:langButtonLabel,"aria-label":langButtonLabel},
        E("i",{className:"ti ti-language"})),
      E("button",{type:"button",className:"id-icon-btn",onClick:onToggleTheme,title:themeButtonLabel,"aria-label":themeButtonLabel},
        E("i",{className:`ti ${theme==="dark"?"ti-sun":"ti-moon"}`})),
      connection&&E("button",{
        type:"button",className:"id-icon-btn",onClick:connection.onClick,title:connection.label,"aria-label":connection.label,
        disabled:!connection.onClick
      },E("span",{className:`id-status-dot id-status-${connection.tone}`}))));
}

/* ── UI: SignOffModal — Night Manager approval "signature" (BRIEF-IDENTITY
   §1: re-prompt PIN at signing, doesn't switch the auditor's own session).
   `title`/`introText` (BRIEF-NIGHT-AUDIT-2 Phase N1) let a second, later,
   separate signature moment — the step-6 business-date close/commit, still
   night-manager-gated via the same verifySignOff — read correctly instead of
   reusing the "Night Manager sign-off" wording verbatim; both optional, so
   every existing call site (the step-5 approval) is unaffected. ── */
function SignOffModal({identity,onClose,onSuccess,title,introText}){
  useLang();
  const candidates=useMemo(()=>identity.activeStaff.filter(naIsNightManager),[identity.activeStaff]);
  const[picked,setPicked]=useState(null);
  const[error,setError]=useState(undefined);
  const[busy,setBusy]=useState(false);

  async function submitPin(pin){
    if(!picked)return;
    setBusy(true);
    const res=await identity.verifySignOff(picked.staffId,pin);
    setBusy(false);
    if(!res.ok){
      setError(res.reason==="locked"?t("identity.lockedFivePins"):res.reason==="wrong-pin"?t("identity.wrongPin"):t("identity.cantSignOff"));
      return;
    }
    onSuccess(res.entry);
  }

  return E("div",{className:"modal-bg",onClick:onClose},
    E("div",{className:"modal",onClick:ev=>ev.stopPropagation()},
      E("h2",null,title||t("identity.signOffTitle")),
      introText&&E("p",{style:{fontSize:12,color:"var(--t2)",marginTop:-6,marginBottom:10}},introText),
      candidates.length===0
        ?E("p",null,t("identity.noNightManager"))
        :!picked
          ?E(React.Fragment,null,
              E("p",null,t("identity.whoIsApproving")),
              E("div",{className:"identity-grid"},
                candidates.map(s=>E("div",{key:s.staffId,className:"identity-tile",onClick:()=>{setPicked(s);setError(undefined);}},
                  E("div",{className:"avatar"},initials(s.displayName)),
                  E("div",{className:"identity-tile-name"},s.displayName)))))
          :E("div",{style:{display:"flex",flexDirection:"column",alignItems:"center",gap:14}},
              E("div",{className:"card-title"},t("identity.signAs",picked.displayName)),
              E(PinPad,{key:picked.staffId,onComplete:submitPin,error,disabled:busy}),
              E("button",{className:"btn",onClick:()=>{setPicked(null);setError(undefined);}},t("identity.notYouBack"))),
      E("div",{className:"modal-actions"},E("button",{className:"btn",onClick:onClose},t("common.cancel")))));
}

/* ── UI: ResetPinModal — set/reset a PIN; the target types it themselves
   twice on the spot (BRIEF-STAFF-LOGINS.md pattern). Also used for
   self-service "change my own PIN" from the sidebar. ── */
function ResetPinModal({identity,actorId,target,onClose}){
  useLang();
  const[firstPin,setFirstPin]=useState(null);
  const[error,setError]=useState(undefined);
  const[busy,setBusy]=useState(false);

  async function submitPin(pin){
    if(!firstPin){setFirstPin(pin);return;}
    if(pin!==firstPin){setError(t("identity.didntMatchStart"));setFirstPin(null);return;}
    setBusy(true);
    const res=await identity.setPin(actorId,target.staffId,pin);
    setBusy(false);
    if(!res.ok){
      setError(res.reason==="trivial"?t("identity.tooEasyPick"):t("identity.couldntSetPin2"));
      setFirstPin(null);
      return;
    }
    onClose();
  }

  return E("div",{className:"modal-bg",onClick:onClose},
    E("div",{className:"modal",onClick:ev=>ev.stopPropagation()},
      E("h2",null,t(target.pin?"identity.resetPinTitle":"identity.setPinTitle",target.displayName)),
      E("p",null,t("identity.handKeyboard",target.displayName,firstPin?t("identity.confirmOnceMore"):t("identity.chooseFourDigit"))),
      E("div",{style:{display:"flex",justifyContent:"center",margin:"14px 0"}},
        E(PinPad,{key:firstPin??"1",onComplete:submitPin,error,disabled:busy})),
      E("div",{className:"modal-actions"},E("button",{className:"btn",onClick:onClose},t("common.cancel")))));
}

/* ── UI: StaffPinsView — the "Staff & PINs" tab (night-manager/top-admin
   only, per NA_DEFAULT_TABS_BY_ROLE). No vault here, so no cross-app role
   grid and no top-admin appoint/revoke/transfer UI (see file header) —
   those stay Guest Portal's job. ── */
function StaffPinsView(p){
  useLang();
  const{identity,notify}=p;
  const me=identity.currentEntry;
  const[resetTarget,setResetTarget]=useState(null);
  const[matrixRole,setMatrixRole]=useState("viewer");
  const[connecting,setConnecting]=useState(false);
  const[showAddExternal,setShowAddExternal]=useState(false);
  const[editExternalTarget,setEditExternalTarget]=useState(null);

  if(!me)return null;
  const iAmTopAdmin=me.isTopAdmin;

  async function connectPms(){
    setConnecting(true);
    const res=await identity.connectPmsRoot();
    setConnecting(false);
    if(res.ok)notify(t("toast.connected",identity.pmsRootName));
    else if(res.reason!=="cancelled")notify(t("identity.folderAccessFailedChrome"),"err");
  }

  return E("div",null,
    E("div",{className:"card"},
      E("div",{className:"card-title"},t("identity.sharedRegistry")),
      E("div",{style:{fontSize:12,color:"var(--t2)",marginBottom:10}},
        identity.pmsRootName
          ?t("identity.connectedSync",identity.pmsRootName)
          :t("identity.notConnected")),
      IS_FILE_PROTOCOL
        ?E("div",{style:{fontSize:12,color:"var(--t2)"}},FILE_PROTOCOL_MESSAGE)
        :E("button",{className:"btn sm",onClick:connectPms,disabled:connecting},
          E("i",{className:"ti ti-link"}),identity.pmsRootName?t("identity.reconnectPmsFolder"):t("identity.connectPmsFolder"))),

    E("div",{className:"card",style:{marginTop:14}},
      E("div",{className:"card-title"},t("identity.settings")),
      E("div",{style:{display:"flex",gap:24,flexWrap:"wrap",alignItems:"center"}},
        E("div",null,
          E("label",{className:"inp-label",style:{display:"block"}},t("identity.idleTimeout")),
          E("input",{className:"inp sm",type:"number",min:1,style:{width:90},
            value:identity.idleTimeoutMin,onChange:ev=>identity.setIdleTimeoutMinutes(me.staffId,Number(ev.target.value))})),
        iAmTopAdmin&&E("label",{style:{display:"flex",alignItems:"center",gap:8,fontSize:13,cursor:"pointer"}},
          E("input",{type:"checkbox",checked:identity.unattributedEnabled,
            onChange:ev=>identity.setUnattributedEnabled(me.staffId,ev.target.checked)}),
          t("identity.allowUnattributed")))),

    E("div",{className:"card np",style:{marginTop:14}},
      E("div",{className:"card-title",style:{padding:"12px 14px 0"}},t("identity.staffCount",identity.allStaff.length)),
      E("table",{className:"t"},
        E("thead",null,E("tr",null,
          E("th",null,t("identity.name")),E("th",null,t("identity.position")),E("th",null,t("identity.status")),E("th",null,t("identity.pin")),E("th",null,t("identity.roleCol")))),
        E("tbody",null,identity.allStaff.map(s=>{
          const avail=naResetAvailability(me,s);
          return E("tr",{key:s.staffId,style:s.active?{}:{opacity:.55}},
            E("td",null,
              (s.staffId===me.staffId||iAmTopAdmin)
                ?E("input",{className:"inp xs",defaultValue:s.displayName,style:{width:140},
                    onBlur:ev=>{if(ev.target.value.trim()!==s.displayName)identity.updateDisplayName(me.staffId,s.staffId,ev.target.value);}})
                :s.displayName,
              E("div",{style:{fontSize:10,color:"var(--t3)",fontFamily:"monospace"}},s.staffId)),
            E("td",null,s.position),
            E("td",null,E("span",{className:`bdg ${s.active?"bgreen":"bgray"}`},s.active?t("identity.active"):t("identity.inactive"))),
            E("td",null,
              s.lockedAt&&E("span",{className:"bdg bred",style:{marginRight:6}},t("identity.locked")),
              avail!=="denied"&&s.active&&E("button",{className:"btn xs",onClick:()=>setResetTarget(s)},s.pin?t("identity.resetPinBtn"):t("identity.setPinBtn"))),
            E("td",null,
              iAmTopAdmin
                ?E("select",{value:s.roles[NA_APP_ID]??"",onChange:ev=>identity.setRole(me.staffId,s.staffId,NA_APP_ID,ev.target.value||null)},
                    E("option",{value:""},t("identity.viewer")),
                    NA_ROLE_OPTIONS.map(r=>E("option",{key:r.value,value:r.value},naRoleLabel(r.value))))
                :E("span",{className:"rank-badge"},s.isTopAdmin?t("identity.topAdminBadge"):(s.roles[NA_APP_ID]?naRoleLabel(s.roles[NA_APP_ID]):t("identity.viewer")))));
        })))),

    iAmTopAdmin&&E("div",{className:"card",style:{marginTop:14}},
      E("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}},
        E("div",{className:"card-title",style:{marginBottom:0}},t("identity.permissionsMatrix")),
        E("select",{value:matrixRole,onChange:ev=>setMatrixRole(ev.target.value)},
          E("option",{value:"viewer"},t("identity.viewer")),
          NA_ROLE_OPTIONS.map(r=>E("option",{key:r.value,value:r.value},naRoleLabel(r.value))))),
      E("div",{style:{display:"flex",flexWrap:"wrap",gap:14,marginTop:10}},
        NA_ALL_TABS.map(id=>{
          const override=identity.registry?.appPermissions?.[NA_APP_ID]?.[matrixRole];
          const defaults=NA_DEFAULT_TABS_BY_ROLE[matrixRole]??[];
          const visible=(override??defaults).includes(id);
          const label=(typeof VIEWS!=="undefined"&&VIEWS.some(v=>v.id===id))?t("nav."+id):id;
          return E("label",{key:id,style:{display:"flex",alignItems:"center",gap:6,fontSize:13}},
            E("input",{type:"checkbox",checked:visible,onChange:ev=>{
              const current=override??defaults;
              const next=ev.target.checked?[...current,id]:current.filter(x=>x!==id);
              identity.setPermissionsOverride(me.staffId,NA_APP_ID,matrixRole,next);
            }}),
            label);
        }))),

    iAmTopAdmin&&E("div",{className:"card np",style:{marginTop:14}},
      E("div",{style:{padding:"12px 14px 0",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}},
        E("div",{className:"card-title",style:{marginBottom:0}},t("identity.externalCount",identity.externalStaff.length)),
        E("button",{className:"btn xs",onClick:()=>setShowAddExternal(true)},t("identity.addExternalMember"))),
      E("div",{style:{fontSize:12,color:"var(--t2)",padding:"0 14px 10px"}},
        t("identity.externalDesc")),
      identity.externalStaff.length===0?
        E("div",{style:{padding:"0 14px 14px",fontSize:12,color:"var(--t3)"}},t("identity.noExternalYet"))
        :E("table",{className:"t"},
          E("thead",null,E("tr",null,
            E("th",null,t("identity.name")),E("th",null,t("identity.positionDept")),E("th",null,t("identity.status")),E("th",null,t("identity.pin")),E("th",null,t("identity.roleCol")),E("th",null))),
          E("tbody",null,identity.externalStaff.map(s=>{
            const avail=naResetAvailability(me,s);
            return E("tr",{key:s.staffId,style:s.active?{}:{opacity:.55}},
              E("td",null,s.displayName,E("div",{style:{fontSize:10,color:"var(--t3)",fontFamily:"monospace"}},s.staffId)),
              E("td",null,s.position,s.department?` · ${s.department}`:""),
              E("td",null,E("span",{className:`bdg ${s.active?"bgreen":"bgray"}`},s.active?t("identity.active"):t("identity.inactive"))),
              E("td",null,
                s.lockedAt&&E("span",{className:"bdg bred",style:{marginRight:6}},t("identity.locked")),
                avail!=="denied"&&E("button",{className:"btn xs",onClick:()=>setResetTarget(s)},s.pin?t("identity.resetPinBtn"):t("identity.setPinBtn"))),
              E("td",null,
                E("select",{value:s.roles[NA_APP_ID]??"",onChange:ev=>identity.setRole(me.staffId,s.staffId,NA_APP_ID,ev.target.value||null)},
                  E("option",{value:""},t("identity.viewer")),
                  NA_ROLE_OPTIONS.map(r=>E("option",{key:r.value,value:r.value},naRoleLabel(r.value))))),
              E("td",null,E("button",{className:"btn xs",onClick:()=>setEditExternalTarget(s)},t("common.edit"))));
          })))),

    resetTarget&&E(ResetPinModal,{identity,actorId:me.staffId,target:resetTarget,onClose:()=>setResetTarget(null)}),
    showAddExternal&&E(AddExternalModal,{identity,actorId:me.staffId,onClose:()=>setShowAddExternal(false)}),
    editExternalTarget&&E(EditExternalModal,{identity,actorId:me.staffId,target:editExternalTarget,onClose:()=>setEditExternalTarget(null)}));
}

/* ── UI: AddExternalModal / EditExternalModal — top-admin only
   (BRIEF-EXTERNAL-ACCOUNTS.md). staffId is auto-suggested from the name as
   they type, editable up until save. ── */
function AddExternalModal({identity,actorId,onClose}){
  useLang();
  const[name,setName]=useState("");
  const[staffId,setStaffId]=useState("");
  const[staffIdTouched,setStaffIdTouched]=useState(false);
  const[displayName,setDisplayName]=useState("");
  const[position,setPosition]=useState("");
  const[department,setDepartment]=useState("");
  const[error,setError]=useState("");

  function onNameChange(v){
    setName(v);
    if(!staffIdTouched)setStaffId(suggestExternalStaffId(v,identity.allStaff.concat(identity.externalStaff,identity.systemStaff)));
  }

  async function submit(){
    if(!name.trim()||!staffId.trim()||!position.trim()){setError(t("identity.requiredNameIdPos"));return;}
    const res=identity.addExternal(actorId,{staffId,name,displayName:displayName||undefined,position,department:department||undefined});
    if(!res.ok){
      setError(res.reason==="already-exists"?t("identity.idInUse"):res.reason==="bad-input"?t("identity.idMustStartExt"):t("identity.couldntAddPerson"));
      return;
    }
    onClose();
  }

  return E("div",{className:"modal-bg",onClick:onClose},
    E("div",{className:"modal",onClick:ev=>ev.stopPropagation()},
      E("h2",null,t("identity.addExternalTitle")),
      E("div",{style:{display:"flex",flexDirection:"column",gap:10}},
        E("div",null,E("label",{className:"inp-label",style:{display:"block"}},t("identity.nameLabel")),
          E("input",{className:"inp sm",value:name,onChange:ev=>onNameChange(ev.target.value),autoFocus:true})),
        E("div",null,E("label",{className:"inp-label",style:{display:"block"}},t("identity.idLabel")),
          E("input",{className:"inp sm mono",value:staffId,onChange:ev=>{setStaffId(ev.target.value);setStaffIdTouched(true);}})),
        E("div",null,E("label",{className:"inp-label",style:{display:"block"}},t("identity.displayNameOptional")),
          E("input",{className:"inp sm",value:displayName,onChange:ev=>setDisplayName(ev.target.value)})),
        E("div",null,E("label",{className:"inp-label",style:{display:"block"}},t("identity.positionLabel")),
          E("input",{className:"inp sm",value:position,onChange:ev=>setPosition(ev.target.value)})),
        E("div",null,E("label",{className:"inp-label",style:{display:"block"}},t("identity.departmentOptional")),
          E("input",{className:"inp sm",value:department,onChange:ev=>setDepartment(ev.target.value)})),
        error&&E("div",{style:{fontSize:12,color:"var(--red-t)"}},error)),
      E("div",{className:"modal-actions"},
        E("button",{className:"btn",onClick:onClose},t("common.cancel")),
        E("button",{className:"btn primary",onClick:submit},t("identity.add")))));
}

function EditExternalModal({identity,actorId,target,onClose}){
  useLang();
  const[name,setName]=useState(target.name);
  const[displayName,setDisplayName]=useState(target.displayName);
  const[position,setPosition]=useState(target.position);
  const[department,setDepartment]=useState(target.department??"");
  const[error,setError]=useState("");

  async function submit(){
    if(!name.trim()||!displayName.trim()||!position.trim()){setError(t("identity.requiredNameDisplayPos"));return;}
    const res=identity.updateExternal(actorId,target.staffId,{name,displayName,position,department:department||undefined});
    if(!res.ok){setError(t("identity.couldntSaveChanges"));return;}
    onClose();
  }

  return E("div",{className:"modal-bg",onClick:onClose},
    E("div",{className:"modal",onClick:ev=>ev.stopPropagation()},
      E("h2",null,t("identity.editTitle",target.displayName)),
      E("div",{style:{display:"flex",flexDirection:"column",gap:10}},
        E("div",null,E("label",{className:"inp-label",style:{display:"block"}},t("identity.nameLabel")),
          E("input",{className:"inp sm",value:name,onChange:ev=>setName(ev.target.value),autoFocus:true})),
        E("div",null,E("label",{className:"inp-label",style:{display:"block"}},t("identity.displayNameLabel")),
          E("input",{className:"inp sm",value:displayName,onChange:ev=>setDisplayName(ev.target.value)})),
        E("div",null,E("label",{className:"inp-label",style:{display:"block"}},t("identity.positionLabel")),
          E("input",{className:"inp sm",value:position,onChange:ev=>setPosition(ev.target.value)})),
        E("div",null,E("label",{className:"inp-label",style:{display:"block"}},t("identity.departmentLabel")),
          E("input",{className:"inp sm",value:department,onChange:ev=>setDepartment(ev.target.value)})),
        error&&E("div",{style:{fontSize:12,color:"var(--red-t)"}},error)),
      E("div",{className:"modal-actions"},
        E("button",{className:"btn",onClick:onClose},t("common.cancel")),
        E("button",{className:"btn primary",onClick:submit},t("common.save")))));
}

/* ── UI: ActivityView — the "Activity" tab. Append-only, no delete/edit
   path. Reads this device's local cache; the full durable cross-device
   history lives in Records/Night Audit/activity-log/ monthly files (not
   re-hydrated here, same deferred scope as Guest Portal's build). ── */
function ActivityView(p){
  useLang();
  const{identity}=p;
  const[personFilter,setPersonFilter]=useState("all");
  const[actionFilter,setActionFilter]=useState("all");
  const[from,setFrom]=useState("");
  const[to,setTo]=useState("");

  function nameFor(staffId){
    return staffId===UNATTRIBUTED_STAFF_ID?t("identity.unattributedName"):(identity.findEntry(staffId)?.displayName??staffId);
  }
  const actions=useMemo(()=>Array.from(new Set(identity.activityLog.map(e=>e.action))).sort(),[identity.activityLog]);
  const filtered=useMemo(()=>identity.activityLog.filter(e=>{
    if(personFilter!=="all"&&e.staffId!==personFilter)return false;
    if(actionFilter!=="all"&&e.action!==actionFilter)return false;
    const day=e.ts.slice(0,10);
    if(from&&day<from)return false;
    if(to&&day>to)return false;
    return true;
  }),[identity.activityLog,personFilter,actionFilter,from,to]);

  return E("div",{className:"card np"},
    E("div",{style:{padding:"12px 14px 0",display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:10,alignItems:"center"}},
      E("div",{className:"card-title",style:{marginBottom:0}},t("identity.activityTitle",filtered.length,identity.activityLog.length)),
      E("div",{style:{display:"flex",gap:8,flexWrap:"wrap"}},
        E("select",{value:personFilter,onChange:ev=>setPersonFilter(ev.target.value)},
          E("option",{value:"all"},t("identity.everyone")),
          identity.allStaff.map(s=>E("option",{key:s.staffId,value:s.staffId},s.displayName)),
          identity.externalStaff.map(s=>E("option",{key:s.staffId,value:s.staffId},s.displayName)),
          E("option",{value:UNATTRIBUTED_STAFF_ID},t("identity.unattributedName"))),
        E("select",{value:actionFilter,onChange:ev=>setActionFilter(ev.target.value)},
          E("option",{value:"all"},t("identity.allActions")),
          actions.map(a=>E("option",{key:a,value:a},a))),
        E("input",{className:"inp xs",type:"date",value:from,onChange:ev=>setFrom(ev.target.value)}),
        E("span",{style:{fontSize:11,color:"var(--t3)"}},t("identity.to")),
        E("input",{className:"inp xs",type:"date",value:to,onChange:ev=>setTo(ev.target.value)}))),
    E("div",{style:{padding:"10px 14px"}},
      filtered.length===0
        ?E("div",{className:"empty"},t("identity.nothingLogged"))
        :E("table",{className:"t"},
            E("thead",null,E("tr",null,E("th",null,t("identity.when")),E("th",null,t("identity.who")),E("th",null,t("identity.action")),E("th",null,t("identity.target")),E("th",null,t("identity.detail")))),
            E("tbody",null,filtered.map((e,i)=>E("tr",{key:i},
              E("td",{style:{fontSize:11,color:"var(--t3)"}},new Date(e.ts).toLocaleString([],{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})),
              E("td",null,nameFor(e.staffId)),
              E("td",null,E("span",{className:"bdg bgray"},e.action)),
              E("td",{style:{fontSize:11,color:"var(--t3)",fontFamily:"monospace"}},e.target??"—"),
              E("td",{style:{fontSize:11,color:"var(--t3)"}},e.detail??"—")))))));
}
