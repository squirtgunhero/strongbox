// Mock data for StrongBox prototype. Realistic enough to feel like a real shop.

const today = new Date("2026-05-11");

const fmtUSD = (n, opts = {}) => {
  const { cents = false, signed = false } = opts;
  const v = Math.abs(n);
  const s = v.toLocaleString("en-US", {
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0,
  });
  const sign = signed && n > 0 ? "+" : n < 0 ? "-" : "";
  return `${sign}$${s}`;
};

const fmtPct = (n, digits = 2) => `${(n * 100).toFixed(digits)}%`;

const fmtDate = (d, opts = {}) => {
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleDateString("en-US", {
    month: opts.long ? "long" : "short",
    day: "numeric",
    year: opts.year === false ? undefined : "numeric",
  });
};

const daysBetween = (a, b) => {
  const A = typeof a === "string" ? new Date(a) : a;
  const B = typeof b === "string" ? new Date(b) : b;
  return Math.round((B - A) / (1000 * 60 * 60 * 24));
};

const addDays = (d, n) => {
  const dt = typeof d === "string" ? new Date(d) : new Date(d);
  dt.setDate(dt.getDate() + n);
  return dt;
};

// Per-diem interest (banker's: 360-day year)
const perDiem = (principal, rate) => (principal * rate) / 360;

// Loans across the full lifecycle
const LOANS = [
  {
    id: "SB-2026-0142",
    status: "lead",
    property: {
      address: "418 Belmont Ave",
      city: "Asheville", state: "NC", zip: "28801",
      type: "Single Family", sqft: 1840,
      purchasePrice: 285000, arv: 465000, asIsValue: 290000, rehabBudget: 88000,
      photo: "warm-craftsman",
    },
    borrower: { name: "Magnolia Capital LLC", primary: "Daniel Park", entity: true, deals: 7, credit: 742 },
    requested: 340000, rate: 0.115, points: 2, term: 12,
    purpose: "Purchase + Rehab", exit: "Sale",
    daysInStage: 2, officer: "Reese A.",
    pipeline: { lead: today, application: null, underwriting: null, approved: null, funded: null },
  },
  {
    id: "SB-2026-0138",
    status: "application",
    property: {
      address: "1207 Pinecrest Dr",
      city: "Charlotte", state: "NC", zip: "28210",
      type: "Single Family", sqft: 2260,
      purchasePrice: 412000, arv: 615000, asIsValue: 425000, rehabBudget: 112000,
      photo: "ranch",
    },
    borrower: { name: "Bridge & Beam Homes", primary: "Sasha Velez", entity: true, deals: 14, credit: 768 },
    requested: 478000, rate: 0.1125, points: 2, term: 12,
    purpose: "Purchase + Rehab", exit: "Sale",
    daysInStage: 5, officer: "Reese A.",
  },
  {
    id: "SB-2026-0131",
    status: "underwriting",
    property: {
      address: "82 Greenmont Sq",
      city: "Raleigh", state: "NC", zip: "27604",
      type: "Multi-family (4u)", sqft: 4120,
      purchasePrice: 720000, arv: 985000, asIsValue: 740000, rehabBudget: 165000,
      photo: "multifamily",
    },
    borrower: { name: "Holloway Property Group", primary: "Marcus Holloway", entity: true, deals: 22, credit: 781 },
    requested: 760000, rate: 0.1075, points: 2, term: 18,
    purpose: "Purchase + Rehab", exit: "Refinance",
    daysInStage: 8, officer: "Tomás L.",
  },
  {
    id: "SB-2026-0129",
    status: "underwriting",
    property: {
      address: "3340 Wickham Ln",
      city: "Greenville", state: "SC", zip: "29609",
      type: "Single Family", sqft: 1620,
      purchasePrice: 215000, arv: 358000, asIsValue: 222000, rehabBudget: 68000,
      photo: "bungalow",
    },
    borrower: { name: "Twin Pines LLC", primary: "Avery Whitcomb", entity: true, deals: 4, credit: 712 },
    requested: 268000, rate: 0.1175, points: 2.5, term: 12,
    purpose: "Purchase + Rehab", exit: "Sale",
    daysInStage: 3, officer: "Tomás L.",
  },
  {
    id: "SB-2026-0124",
    status: "approved",
    property: {
      address: "915 Foxhound Trail",
      city: "Knoxville", state: "TN", zip: "37919",
      type: "Single Family", sqft: 2080,
      purchasePrice: 365000, arv: 530000, asIsValue: 372000, rehabBudget: 92000,
      photo: "two-story",
    },
    borrower: { name: "Westcott Capital", primary: "Priya Westcott", entity: true, deals: 11, credit: 759 },
    requested: 412000, rate: 0.11, points: 2, term: 12,
    purpose: "Purchase + Rehab", exit: "Sale",
    daysInStage: 1, officer: "Reese A.",
    closingDate: addDays(today, 6),
  },
  {
    id: "SB-2026-0118",
    status: "approved",
    property: {
      address: "2274 Harbor Mill Rd",
      city: "Charleston", state: "SC", zip: "29407",
      type: "Single Family", sqft: 1980,
      purchasePrice: 478000, arv: 695000, asIsValue: 485000, rehabBudget: 132000,
      photo: "coastal",
    },
    borrower: { name: "Saltmarsh Holdings", primary: "Jordan Lee", entity: true, deals: 9, credit: 736 },
    requested: 552000, rate: 0.1125, points: 2, term: 12,
    purpose: "Purchase + Rehab", exit: "Sale",
    daysInStage: 4, officer: "Reese A.",
    closingDate: addDays(today, 12),
  },
  // --- ACTIVE / SERVICING ---
  {
    id: "SB-2025-0098",
    status: "active",
    property: {
      address: "1849 Cardinal Ridge",
      city: "Durham", state: "NC", zip: "27713",
      type: "Single Family", sqft: 2340,
      purchasePrice: 395000, arv: 580000, asIsValue: 402000, rehabBudget: 108000,
      photo: "modern-rehab",
    },
    borrower: { name: "Cardinal Build Co", primary: "Eliana Reyes", entity: true, deals: 16, credit: 772 },
    amount: 455000, balance: 455000, rate: 0.1125, points: 2, term: 12,
    fundedDate: "2025-12-18", maturityDate: "2026-12-18",
    purpose: "Purchase + Rehab", exit: "Sale", officer: "Tomás L.",
    rehabHoldback: 108000, rehabDrawn: 42000,
    paidThrough: "2026-04-30",
    performance: "current",
    photo: "modern-rehab",
  },
  {
    id: "SB-2025-0089",
    status: "active",
    property: {
      address: "603 Mockingbird Ln",
      city: "Atlanta", state: "GA", zip: "30307",
      type: "Single Family", sqft: 1740,
      purchasePrice: 312000, arv: 458000, asIsValue: 318000, rehabBudget: 76000,
      photo: "atlanta-craftsman",
    },
    borrower: { name: "Mockingbird Ventures", primary: "Ben Hartley", entity: true, deals: 6, credit: 728 },
    amount: 358000, balance: 358000, rate: 0.115, points: 2, term: 12,
    fundedDate: "2025-11-04", maturityDate: "2026-11-04",
    purpose: "Purchase + Rehab", exit: "Sale", officer: "Reese A.",
    rehabHoldback: 76000, rehabDrawn: 64000,
    paidThrough: "2026-04-30",
    performance: "current",
  },
  {
    id: "SB-2025-0076",
    status: "active",
    property: {
      address: "5012 Hollyfield Ct",
      city: "Nashville", state: "TN", zip: "37211",
      type: "Single Family", sqft: 2010,
      purchasePrice: 428000, arv: 612000, asIsValue: 435000, rehabBudget: 96000,
      photo: "nashville-rehab",
    },
    borrower: { name: "Hollyfield Capital", primary: "Aisha Demir", entity: true, deals: 19, credit: 781 },
    amount: 489000, balance: 489000, rate: 0.105, points: 1.5, term: 12,
    fundedDate: "2025-08-22", maturityDate: "2026-08-22",
    purpose: "Purchase + Rehab", exit: "Refinance", officer: "Tomás L.",
    rehabHoldback: 96000, rehabDrawn: 96000,
    paidThrough: "2026-04-30",
    performance: "current",
  },
  {
    id: "SB-2025-0061",
    status: "active",
    property: {
      address: "2901 Lantern Hill",
      city: "Savannah", state: "GA", zip: "31405",
      type: "Multi-family (2u)", sqft: 2880,
      purchasePrice: 385000, arv: 540000, asIsValue: 392000, rehabBudget: 84000,
      photo: "duplex",
    },
    borrower: { name: "Lantern Hill LLC", primary: "Owen Brock", entity: true, deals: 3, credit: 705 },
    amount: 412000, balance: 412000, rate: 0.12, points: 2.5, term: 12,
    fundedDate: "2025-07-15", maturityDate: "2026-07-15",
    purpose: "Purchase + Rehab", exit: "Sale", officer: "Reese A.",
    rehabHoldback: 84000, rehabDrawn: 72000,
    paidThrough: "2026-03-31", // one month late
    performance: "late-30",
  },
  {
    id: "SB-2024-0044",
    status: "active",
    property: {
      address: "117 Mariner Cove",
      city: "Wilmington", state: "NC", zip: "28403",
      type: "Single Family", sqft: 1560,
      purchasePrice: 268000, arv: 395000, asIsValue: 275000, rehabBudget: 62000,
      photo: "coastal-cottage",
    },
    borrower: { name: "Mariner Cove Homes", primary: "Talia Okafor", entity: true, deals: 8, credit: 744 },
    amount: 302000, balance: 302000, rate: 0.115, points: 2, term: 12,
    fundedDate: "2025-06-28", maturityDate: "2026-06-28",
    purpose: "Purchase + Rehab", exit: "Sale", officer: "Tomás L.",
    rehabHoldback: 62000, rehabDrawn: 62000,
    paidThrough: "2026-04-30",
    performance: "current",
  },
];

// Pipeline columns
const PIPELINE_STAGES = [
  { id: "lead",         label: "Lead",         hint: "New inquiries" },
  { id: "application",  label: "Application",  hint: "Intake in progress" },
  { id: "underwriting", label: "Underwriting", hint: "Scoring + docs" },
  { id: "approved",     label: "Approved",     hint: "Cleared to fund" },
  { id: "funded",       label: "Funded",       hint: "Wired this week" },
];

// Payments — historical for the active "primary" loan (SB-2025-0098)
const PAYMENTS_PRIMARY = [
  { id: "p7", date: "2026-04-30", due: "2026-05-01", type: "Interest", amount: 4265.63, principal: 0, balance: 455000, status: "received" },
  { id: "p6", date: "2026-03-31", due: "2026-04-01", type: "Interest", amount: 4265.63, principal: 0, balance: 455000, status: "received" },
  { id: "p5", date: "2026-02-28", due: "2026-03-01", type: "Interest", amount: 4265.63, principal: 0, balance: 455000, status: "received" },
  { id: "p4", date: "2026-01-30", due: "2026-02-01", type: "Interest", amount: 4265.63, principal: 0, balance: 455000, status: "received" },
  { id: "p3", date: "2025-12-31", due: "2026-01-01", type: "Interest", amount: 4265.63, principal: 0, balance: 455000, status: "received" },
  { id: "p2", date: "2025-12-18", due: "2025-12-18", type: "Origination",  amount: 9100,    principal: 0, balance: 455000, status: "received" },
  { id: "p1", date: "2025-12-18", due: "2025-12-18", type: "Funding wire", amount: -455000, principal: 0, balance: 455000, status: "disbursed" },
];

// Draws for primary loan
const DRAWS_PRIMARY = [
  { id: "d4", number: 4, requested: "2026-05-08", amount: 22000, status: "requested",  items: ["Kitchen cabinets", "Quartz countertops"], inspection: "scheduled", inspector: "BluePeak" },
  { id: "d3", number: 3, requested: "2026-03-12", funded: "2026-03-18", amount: 18000, status: "funded", items: ["Roof tear-off + reshingle"], inspection: "approved" },
  { id: "d2", number: 2, requested: "2026-02-05", funded: "2026-02-11", amount: 14000, status: "funded", items: ["Demo", "Framing"], inspection: "approved" },
  { id: "d1", number: 1, requested: "2026-01-09", funded: "2026-01-15", amount: 10000, status: "funded", items: ["Permits", "Site prep"], inspection: "approved" },
];

const DOCUMENTS_PRIMARY = [
  { id: "doc1", name: "Promissory Note",          status: "signed",   updated: "2025-12-18", signer: "E. Reyes" },
  { id: "doc2", name: "Deed of Trust",            status: "recorded", updated: "2025-12-19", signer: "E. Reyes" },
  { id: "doc3", name: "Personal Guarantee",       status: "signed",   updated: "2025-12-18", signer: "E. Reyes" },
  { id: "doc4", name: "Hazard Insurance Binder",  status: "current",  updated: "2025-12-15", signer: "Liberty Mutual" },
  { id: "doc5", name: "Title Commitment",         status: "cleared",  updated: "2025-12-10", signer: "First American" },
  { id: "doc6", name: "Rehab Scope of Work",      status: "approved", updated: "2025-12-08", signer: "Cardinal Build" },
  { id: "doc7", name: "Draw #4 Invoices",         status: "pending",  updated: "2026-05-08", signer: "Cardinal Build" },
];

// Activity feed
const ACTIVITY = [
  { id: "a1", at: "10 min ago",  who: "Reese A.",    text: "Moved SB-2026-0124 to Approved",      kind: "stage" },
  { id: "a2", at: "32 min ago",  who: "Tomás L.",    text: "Requested updated insurance for SB-2025-0061", kind: "task" },
  { id: "a3", at: "1 hr ago",    who: "System",      text: "Draw #4 requested — $22,000 on SB-2025-0098", kind: "draw" },
  { id: "a4", at: "3 hr ago",    who: "Eliana Reyes",text: "Uploaded kitchen cabinet invoices",   kind: "doc" },
  { id: "a5", at: "Yesterday",   who: "System",      text: "Interest accrued — $48,210 across portfolio", kind: "system" },
  { id: "a6", at: "Yesterday",   who: "Reese A.",    text: "Sent term sheet to Magnolia Capital",  kind: "doc" },
  { id: "a7", at: "Tue",         who: "System",      text: "Payment received — $4,265.63 from Cardinal Build", kind: "payment" },
];

// Maturity buckets
const buildMaturities = () => {
  const active = LOANS.filter((l) => l.status === "active");
  return active.map((l) => ({
    id: l.id,
    address: `${l.property.address}, ${l.property.city}`,
    borrower: l.borrower.name,
    balance: l.balance,
    rate: l.rate,
    maturity: l.maturityDate,
    daysOut: daysBetween(today, new Date(l.maturityDate)),
  })).sort((a,b) => a.daysOut - b.daysOut);
};

// LTV helpers
const ltv = (loanAmt, asIs) => loanAmt / asIs;
const ltc = (loanAmt, cost) => loanAmt / cost;
const ltarv = (loanAmt, arv) => loanAmt / arv;

// Status palettes
const STATUS_TONE = {
  lead:         { fg: "oklch(0.42 0.04 250)", bg: "oklch(0.94 0.02 250)" },
  application:  { fg: "oklch(0.42 0.06 245)", bg: "oklch(0.95 0.03 245)" },
  underwriting: { fg: "oklch(0.45 0.09 75)",  bg: "oklch(0.96 0.04 80)"  },
  approved:     { fg: "oklch(0.45 0.09 155)", bg: "oklch(0.95 0.04 155)" },
  funded:       { fg: "oklch(0.40 0.10 155)", bg: "oklch(0.93 0.06 155)" },
  active:       { fg: "oklch(0.40 0.10 155)", bg: "oklch(0.95 0.04 155)" },
  current:      { fg: "oklch(0.40 0.10 155)", bg: "oklch(0.95 0.04 155)" },
  "late-30":    { fg: "oklch(0.48 0.14 50)",  bg: "oklch(0.95 0.05 50)"  },
  default:      { fg: "oklch(0.50 0.18 25)",  bg: "oklch(0.95 0.05 25)"  },
};

Object.assign(window, {
  LOANS, PIPELINE_STAGES, PAYMENTS_PRIMARY, DRAWS_PRIMARY, DOCUMENTS_PRIMARY, ACTIVITY, STATUS_TONE,
  fmtUSD, fmtPct, fmtDate, daysBetween, addDays, perDiem, ltv, ltc, ltarv, buildMaturities,
  TODAY: today,
});
