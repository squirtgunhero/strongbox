// Loan detail — the operational center
const LoanDetail = ({ loanId, nav }) => {
  const loan = LOANS.find((l) => l.id === loanId) || LOANS.find((l) => l.status === "active");
  const [tab, setTab] = React.useState("overview");
  const [toast, setToast] = React.useState(null);
  const [payoffDate, setPayoffDate] = React.useState(() => addDays(TODAY, 30).toISOString().slice(0,10));

  // Live underwriting controls
  const isActive = loan.status === "active";
  const baseAmt = loan.amount || loan.requested;
  const [amt, setAmt] = React.useState(baseAmt);
  const [rate, setRate] = React.useState(loan.rate);
  const [points, setPoints] = React.useState(loan.points);
  const [arvOverride, setArvOverride] = React.useState(loan.property.arv);

  React.useEffect(() => {
    setAmt(loan.amount || loan.requested);
    setRate(loan.rate);
    setPoints(loan.points);
    setArvOverride(loan.property.arv);
  }, [loan.id]);

  const ratioLtv = amt / loan.property.asIsValue;
  const ratioLtc = amt / (loan.property.purchasePrice + loan.property.rehabBudget);
  const ratioLtarv = amt / arvOverride;
  const tone = (v, warn, danger) => v >= danger ? "danger" : v >= warn ? "warn" : "";

  // Payoff calculation
  const balance = loan.balance || baseAmt;
  const paidThrough = loan.paidThrough || (loan.fundedDate ? loan.fundedDate : TODAY);
  const days = Math.max(0, daysBetween(paidThrough, new Date(payoffDate)));
  const accrued = perDiem(balance, rate) * days;
  const lateFees = loan.performance === "late-30" ? 850 : 0;
  const payoffTotal = balance + accrued + lateFees;

  const tabs = [
    { id: "overview",     label: "Overview" },
    { id: "underwriting", label: "Underwriting" },
    { id: "payments",     label: "Payments",  count: PAYMENTS_PRIMARY.length },
    { id: "draws",        label: "Draws",     count: DRAWS_PRIMARY.length },
    { id: "documents",    label: "Documents", count: DOCUMENTS_PRIMARY.length },
    { id: "notes",        label: "Notes" },
  ];

  // Timeline progress
  const stages = ["lead","application","underwriting","approved","funded"];
  let stageIdx = stages.indexOf(loan.status);
  if (isActive) stageIdx = stages.length; // all done

  return (
    <div className="sb-content-narrow">
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14, fontSize: 13 }}>
        <button className="sb-btn sb-btn-ghost sb-btn-sm" onClick={() => nav(isActive ? "servicing" : "pipeline")} style={{ height: 26, padding: "0 8px" }}>← {isActive ? "Servicing" : "Pipeline"}</button>
        <span className="sb-muted">/</span>
        <span className="mono sb-muted">{loan.id}</span>
      </div>

      <Card>
        <div className="ld-hero">
          <div className="ld-photo"><PropertyPhoto tag={loan.property.photo}/></div>
          <div className="ld-title">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h1 className="sb-h2">{loan.property.address}</h1>
              <Badge tone={loan.status} dot>{loan.status.replace("_"," ")}</Badge>
              {loan.performance === "late-30" && <Badge tone="late-30" dot>Late 30</Badge>}
            </div>
            <div className="sb-muted">{loan.property.city}, {loan.property.state} {loan.property.zip} · {loan.property.type} · {loan.property.sqft.toLocaleString()} sqft</div>
            <div className="ld-meta" style={{ marginTop: 12 }}>
              <div><div className="ld-meta-label">Borrower</div><div className="ld-meta-val">{loan.borrower.name}</div></div>
              <div><div className="ld-meta-label">{isActive ? "Balance" : "Requested"}</div><div className="ld-meta-val mono">{fmtUSD(balance)}</div></div>
              <div><div className="ld-meta-label">Rate / Points</div><div className="ld-meta-val mono">{fmtPct(rate, 2)} · {points}</div></div>
              <div><div className="ld-meta-label">{isActive ? "Matures" : "Term"}</div><div className="ld-meta-val mono">{isActive ? fmtDate(loan.maturityDate) : `${loan.term}mo`}</div></div>
            </div>
          </div>
          <div className="ld-actions">
            <Button variant="primary" icon={<I.Wire/>}>{isActive ? "Record payment" : "Generate term sheet"}</Button>
            <Button variant="outline" size="md" icon={<I.Doc/>}>{isActive ? "Generate payoff" : "Request docs"}</Button>
            <Button variant="ghost" size="md" icon={<I.More/>}>More</Button>
          </div>
        </div>

        <div style={{ padding: "0 18px 18px" }}>
          <div className="timeline">
            {stages.map((s, i) => (
              <div className="timeline-step" key={s}>
                <div className={cx("ts-dot", i < stageIdx && "done", i === stageIdx && "current")}>
                  {i < stageIdx && <I.Check size={9} stroke="#fff" strokeWidth={2.5}/>}
                </div>
                <div className={cx("ts-line", i < stageIdx && "done")}/>
              </div>
            ))}
          </div>
          <div className="timeline-labels">
            {["Lead","Application","Underwriting","Approved","Funded"].map((l, i) => (
              <span key={l} className={cx(i < stageIdx && "done", i === stageIdx && "current")}>{l}</span>
            ))}
          </div>
        </div>
      </Card>

      <div className="ld-tabs-wrap">
        <Tabs items={tabs} active={tab} onChange={setTab}/>
      </div>

      {tab === "overview" && (
        <div className="ld-cols">
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Card>
              <CardHeader title="Deal scorecard" subtitle="Ratios update live as you adjust terms"/>
              <div className="scorecard">
                <div className={cx("score-tile", tone(ratioLtv, 0.65, 0.75))}>
                  <span className="score-label">LTV (as-is)</span>
                  <span className="score-val mono">{fmtPct(ratioLtv, 1)}</span>
                  <div className="score-bar"><i style={{ width: `${Math.min(100, ratioLtv*100)}%` }}/></div>
                  <span className="score-policy"><span>policy ≤ 75%</span><span className="mono">{fmtUSD(loan.property.asIsValue)}</span></span>
                </div>
                <div className={cx("score-tile", tone(ratioLtc, 0.85, 0.95))}>
                  <span className="score-label">LTC</span>
                  <span className="score-val mono">{fmtPct(ratioLtc, 1)}</span>
                  <div className="score-bar"><i style={{ width: `${Math.min(100, ratioLtc*100)}%` }}/></div>
                  <span className="score-policy"><span>policy ≤ 90%</span><span className="mono">{fmtUSD(loan.property.purchasePrice + loan.property.rehabBudget)}</span></span>
                </div>
                <div className={cx("score-tile", tone(ratioLtarv, 0.7, 0.75))}>
                  <span className="score-label">LTARV</span>
                  <span className="score-val mono">{fmtPct(ratioLtarv, 1)}</span>
                  <div className="score-bar"><i style={{ width: `${Math.min(100, ratioLtarv*100)}%` }}/></div>
                  <span className="score-policy"><span>policy ≤ 75%</span><span className="mono">{fmtUSD(arvOverride)}</span></span>
                </div>
              </div>
              <div className="uw-controls">
                <RangeRow label="Loan amount" value={amt} min={Math.round(baseAmt*0.5)} max={Math.round(baseAmt*1.3)} step={1000} onChange={setAmt} format={fmtUSD}/>
                <RangeRow label="Rate" value={Math.round(rate*10000)} min={900} max={1500} step={25} onChange={(v) => setRate(v/10000)} format={(v) => `${(v/100).toFixed(2)}%`}/>
                <RangeRow label="Points" value={points*2} min={0} max={10} step={1} onChange={(v) => setPoints(v/2)} format={(v) => `${(v/2).toFixed(1)}`}/>
                <RangeRow label="ARV (override)" value={arvOverride} min={Math.round(loan.property.arv*0.8)} max={Math.round(loan.property.arv*1.2)} step={1000} onChange={setArvOverride} format={fmtUSD}/>
              </div>
            </Card>

            {isActive ? (
              <Card>
                <CardHeader title="Per-diem payoff" subtitle={`Quote as of ${fmtDate(payoffDate, {long:true})}`} action={
                  <input type="date" className="sb-search" style={{ padding: "4px 8px", width: 160 }} value={payoffDate} onChange={(e) => setPayoffDate(e.target.value)}/>
                }/>
                <div className="payoff-calc">
                  <div className="payoff-row"><span className="label">Principal balance</span><span className="val">{fmtUSD(balance, { cents: true })}</span></div>
                  <div className="payoff-row"><span className="label">Accrued interest <span className="sb-muted">· {days} days @ {fmtUSD(perDiem(balance, rate), { cents: true })}/day</span></span><span className="val">{fmtUSD(accrued, { cents: true })}</span></div>
                  {lateFees > 0 && <div className="payoff-row"><span className="label">Late fees</span><span className="val">{fmtUSD(lateFees, { cents: true })}</span></div>}
                  <div className="payoff-row total"><span className="label">Total payoff</span><span className="val">{fmtUSD(payoffTotal, { cents: true })}</span></div>
                  <RangeRow label="Quote date" value={daysBetween(TODAY, new Date(payoffDate))} min={0} max={120} step={1} onChange={(v) => setPayoffDate(addDays(TODAY, v).toISOString().slice(0,10))} format={(v) => `T+${v} days`}/>
                  <Button variant="primary" icon={<I.Doc/>} onClick={() => setToast("Payoff letter generated")}>Generate payoff letter</Button>
                </div>
              </Card>
            ) : (
              <Card>
                <CardHeader title="Conditions to close" subtitle="3 of 7 cleared"/>
                <div>
                  {[
                    ["Title commitment received", true],
                    ["Hazard insurance binder", true],
                    ["Personal guarantee signed", true],
                    ["Rehab scope of work approved", false],
                    ["Entity good standing certificate", false],
                    ["Borrower track record verified", false],
                    ["Background check complete", false],
                  ].map(([t, done], i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 18px", borderTop: i ? "1px solid var(--border)" : 0 }}>
                      <div style={{ width: 16, height: 16, borderRadius: 4, border: "1.5px solid var(--border-strong)", background: done ? "var(--accent)" : "var(--surface)", display: "grid", placeItems: "center" }}>
                        {done && <I.Check size={10} stroke="#fff" strokeWidth={3}/>}
                      </div>
                      <span style={{ fontSize: 13.5, color: done ? "var(--muted)" : "var(--text)", textDecoration: done ? "line-through" : "none" }}>{t}</span>
                      {!done && <Button variant="ghost" size="sm" style={{ marginLeft: "auto" }}>Mark done</Button>}
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Card>
              <CardHeader title="Property"/>
              <div style={{ padding: "12px 18px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
                <Row label="Purchase price" val={fmtUSD(loan.property.purchasePrice)}/>
                <Row label="Rehab budget"   val={fmtUSD(loan.property.rehabBudget)}/>
                <Row label="As-is value"    val={fmtUSD(loan.property.asIsValue)}/>
                <Row label="ARV"            val={fmtUSD(loan.property.arv)}/>
                <Row label="Exit"           val={loan.exit}/>
              </div>
            </Card>

            {isActive && (
              <Card>
                <CardHeader title="Rehab holdback"/>
                <div className="holdback">
                  <div className="holdback-bar">
                    <i style={{ width: `${(loan.rehabDrawn / loan.rehabHoldback) * 100}%` }}/>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--muted)" }}>
                    <span className="mono">{fmtUSD(loan.rehabDrawn)} drawn</span>
                    <span className="mono">{fmtUSD(loan.rehabHoldback - loan.rehabDrawn)} remaining</span>
                  </div>
                </div>
              </Card>
            )}

            <Card>
              <CardHeader title="Borrower"/>
              <div style={{ padding: "12px 18px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
                <Row label="Entity"      val={loan.borrower.name}/>
                <Row label="Primary"     val={loan.borrower.primary}/>
                <Row label="Prior deals" val={loan.borrower.deals}/>
                <Row label="Credit"      val={loan.borrower.credit}/>
              </div>
            </Card>
          </div>
        </div>
      )}

      {tab === "payments" && (
        <Card>
          <CardHeader title="Payment ledger" subtitle="Banker's interest · 360-day year"/>
          <table className="sb-table payments-table">
            <thead><tr>
              <th>Date</th><th>Type</th><th>Status</th><th className="num">Amount</th><th className="num">Balance</th>
            </tr></thead>
            <tbody>
              {PAYMENTS_PRIMARY.map((p) => (
                <tr key={p.id}>
                  <td><span className="mono sb-sm">{fmtDate(p.date)}</span><div className="sb-muted sb-xs">due {fmtDate(p.due)}</div></td>
                  <td>{p.type}</td>
                  <td><Badge tone={p.status === "received" ? "current" : "default"} dot>{p.status}</Badge></td>
                  <td className="num">{p.amount < 0 ? `(${fmtUSD(-p.amount, { cents: true })})` : fmtUSD(p.amount, { cents: true })}</td>
                  <td className="num">{fmtUSD(p.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {tab === "draws" && (
        <Card>
          <CardHeader title="Draw schedule" subtitle={`${fmtUSD(loan.rehabDrawn || 0)} drawn of ${fmtUSD(loan.rehabHoldback || 0)} budget`} action={<Button variant="primary" size="sm" icon={<I.Plus/>}>New draw</Button>}/>
          <div className="draw-list">
            {DRAWS_PRIMARY.map((d) => (
              <div className="draw-item" key={d.id}>
                <div className={cx("draw-num", d.status === "requested" && "requested")}>#{d.number}</div>
                <div>
                  <div style={{ fontWeight: 500 }}>{d.items.join(" · ")}</div>
                  <div className="sb-muted sb-sm">Requested {fmtDate(d.requested)}{d.funded && ` · Funded ${fmtDate(d.funded)}`} · Inspection: {d.inspection}</div>
                </div>
                <span className="mono" style={{ fontSize: 14, fontWeight: 500 }}>{fmtUSD(d.amount)}</span>
                <Badge tone={d.status === "funded" ? "current" : "underwriting"} dot>{d.status}</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === "documents" && (
        <Card>
          <CardHeader title="Document package" action={<Button variant="outline" size="sm" icon={<I.Upload/>}>Upload</Button>}/>
          <div>
            {DOCUMENTS_PRIMARY.map((d) => (
              <div key={d.id} className="doc-row">
                <div className="doc-icon"><I.Doc size={14}/></div>
                <div>
                  <div style={{ fontWeight: 500 }}>{d.name}</div>
                  <div className="sb-muted sb-xs">{d.signer} · updated {fmtDate(d.updated)}</div>
                </div>
                <Badge tone={["signed","recorded","cleared","approved","current"].includes(d.status) ? "current" : "underwriting"} dot>{d.status}</Badge>
                <button className="sb-icon-btn"><I.Download size={14}/></button>
                <button className="sb-icon-btn"><I.More size={14}/></button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === "underwriting" && (
        <Card>
          <CardHeader title="Underwriting notes" action={<Button variant="primary" size="sm">Approve</Button>}/>
          <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
            {[
              { who: "Tomás L.", at: "May 9", text: "Comps support ARV. Three sales within 0.4mi closed at $278-$285/sqft in last 90d. Subject pencils at $277/sqft post-rehab." },
              { who: "Reese A.", at: "May 8", text: "Borrower has 16 completed deals in this market, all sold within 9 months. Pulled track record from prior funder." },
              { who: "Tomás L.", at: "May 7", text: "Title clean. One satisfied lien from 2021. No environmental flags." },
            ].map((n, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "32px 1fr", gap: 10 }}>
                <div className="sb-avatar">{n.who.split(" ").map(s => s[0]).join("")}</div>
                <div>
                  <div style={{ fontSize: 13 }}><span style={{ fontWeight: 500 }}>{n.who}</span> <span className="sb-muted">· {n.at}</span></div>
                  <div style={{ fontSize: 13, marginTop: 4, lineHeight: 1.55 }}>{n.text}</div>
                </div>
              </div>
            ))}
            <textarea placeholder="Add a note…" style={{ marginTop: 6, padding: 10, border: "1px solid var(--border)", borderRadius: 8, minHeight: 64, background: "var(--surface)", color: "var(--text)", fontSize: 13, resize: "vertical", outline: "none" }}/>
          </div>
        </Card>
      )}

      {tab === "notes" && (
        <Card>
          <CardHeader title="Notes"/>
          <Empty>No notes yet. Add an internal note above.</Empty>
        </Card>
      )}
      <Toast msg={toast} onDone={() => setToast(null)}/>
    </div>
  );
};

const Row = ({ label, val }) => (
  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
    <span className="sb-muted">{label}</span>
    <span className="mono">{val}</span>
  </div>
);

window.LoanDetail = LoanDetail;
