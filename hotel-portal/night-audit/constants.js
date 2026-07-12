/* ── React hook shortcuts (globally accessible) ── */
const {useState,useEffect,useMemo,useRef,useCallback} = React;

/* ── React.createElement shorthand ── */
const E = React.createElement;

/* ── Constants ── */
const CARDS=[{code:"9090",name:"Span",full:"Span (mada)"},{code:"9100",name:"Visa",full:"Visa"},{code:"9104",name:"MC",full:"Mastercard"},{code:"9102",name:"Amex",full:"Amex"}];
const BY_CODE=Object.fromEntries(CARDS.map(c=>[c.code,c]));
const CC_MAP={VA:"9100",AX:"9102"};
/* BRIEF-NIGHT-AUDIT-2 Phase N2 — was "Exec Lounge": no such terminal appears
   in any real Opera sample or in the brief itself, which names the five real
   terminals as "FO-1/2/3, Exchange, Reservations." The reconciled 7-Jul
   workbook's Terminals tab confirms it ("Exc. (189)" = Exchange). Corrected;
   this is a manually-entered label (no historical Records data exists yet
   for the old name to orphan). */
const MACHINES=["Machine 1","Machine 2","Machine 3","Machine 4","Machine 5"];
const PLO_TYPES=["Payment Link","Laundry","Other"];
/* BRIEF-NIGHT-AUDIT-2 Phase N2 — "Cash per cashier (codes 9000/9980/9235)".
   9000 (Cash) and 9235 (Refund Payment, a debit) are confirmed against real
   Opera samples (samples/Journal 7-07.xlsx, Journal 22-10.xlsx); 9980 is
   named in the brief but wasn't present in either sample — included anyway
   per the brief's explicit instruction, flagged in STATUS as unverified. */
const CASH_CODES=["9000","9980","9235"];
/* BRIEF-NIGHT-AUDIT-2 Phase N2 — "Non-card settlements... listed for a
   complete total": these settle the same night but have no terminal/PLO
   second source to reconcile against, unlike CARDS above. `full` names are
   Opera's own transaction descriptions (TRX_DESC), kept untranslated in the
   UI exactly like CARDS.full and MACHINES already are. */
const SETTLEMENTS=[{code:"9003",full:"City Ledger"},{code:"9035",full:"ALL Reward"},{code:"9239",full:"Expedia Collect Deposit"}];
/* BRIEF-NIGHT-AUDIT-2 Phase N1 — "Closed" is the new 4th/final state: only
   reached via the guided flow's step 6 (change business date → commit).
   "Approved" (steps 1-5 done, night-manager PIN sign-off) is BUSINESS-DATE.md's
   "submitted-draft" — still re-openable/amendable, NOT yet immutable. */
const STATUSES=["Draft","Submitted for Review","Approved","Closed"];
/* BRIEF-NIGHT-AUDIT-2-FIXES §1 — replaces the interim 12h-since-approval
   DELAYED_THRESHOLD_HOURS model. The real Opera night run is expected to
   roll the business date by ~07:00 daily; past that with no roll = delayed,
   growing a daysOverdue count each subsequent missed deadline (a business
   date can sit un-rolled across multiple calendar days). Configurable,
   same status as this app's other threshold constants (CASH_TOLERANCE etc.). */
const ROLL_DEADLINE="07:00";
const DRAFT_KEY="na_draft_v3";
const HIST_KEY="na_history_v2";
const FNAME_KEY="na_folder_name";
const HAS_FS="showDirectoryPicker" in window;
/* Nav short labels and topbar titles are looked up live via t("nav.<id>")/
   t("title.<id>") in strings.js — NOT baked in here as English text, so a
   language toggle updates them immediately without a page reload. */
const VIEWS=[{id:"upload",icon:"ti-upload"},{id:"journal",icon:"ti-list-details"},{id:"cash",icon:"ti-cash"},{id:"reconcile",icon:"ti-scale"},{id:"reports",icon:"ti-printer"},{id:"history",icon:"ti-history"},{id:"production",icon:"ti-chart-bar"},{id:"staffPins",icon:"ti-users-group"},{id:"activity",icon:"ti-list-check"}];
const FILTER_IDS=["all","unchecked","payments","charges","cards","cash","corrections","plo"];
/* Small drawer variances are normal handling/rounding slack, not a real discrepancy. */
const CASH_TOLERANCE=2;
/* Opera TRX_CODEs that represent tax/fee lines (not charges, not payments).
   Confirmed against the real September 2025 export:
     7500 = VAT 15% – Room
     7501 = VAT 15% – F&B
     7502 = VAT 15% – Others
     7504 = Municipality Fee 5% – Room
   These must be strings because TRX_CODE comes off the sheet as a number and
   enrich() casts it with String() before calling TAX_CODES.includes(). */
const TAX_CODES=["7500","7501","7502","7504"];
const HELP_KEY="na_help_visible";
const THEME_KEY="na_theme";
const SIDEBAR_KEY="na_nav_collapsed";
/* Per-view Help panel bullets now live in strings.js's HELP_STRINGS, looked
   up live via tHelp(view) — see that file's header for why. */