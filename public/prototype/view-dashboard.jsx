// Dashboard view
const Dashboard = ({ nav }) => {
  const [scope, setScope] = React.useState("all"); // all | mine
  const all = LOANS;
  const filtered = scope === "mine" ? all.filter((l) => l.officer === "Reese A.") : all;
  const active = filtered.filter((l) => l.status === "active");
  const pipeline = filtered.filter((l) => !["active"].includes(l.status));
  const deployed = active.reduce((s, l) => s + l.balance, 0) || 1;
  const wRate = active.reduce((s, l) => s + l.balance * l.rate, 0) / deployed;
  const wLtv = active.reduce((s, l) => s + l.balance * ltv(l.amount, l.property.asIsValue), 0) / deployed;
  const performing = active.filter((l) => l.performance === "current").length;
  const maturities = buildMaturities();

  const monthSpark = [128, 142, 138, 161, 155, 178, 192, 205, 218, 232, 244, 256];
  const rateSpark = [0.115, 0.114, 0.116, 0.113, 0.112, 0.114, 0.113, 0.1125, 0.111, 0.112, 0.111, 0.111];
  const ltvSpark = [0.58, 0.59, 0.62, 0.6, 0.61, 0.63, 0.64, 0.62, 0.61, 0.6, 0.59, 0.62];

  return (
    <div className="sb-content-narrow">
      <div className="sb-page-header">
        <div className="sb-page-title">
          <h1 className="sb-h1">Good afternoon, Reese</h1>
          <span className="sb-muted">Tuesday, May 11 — 4 deals close this week · 2 maturities in 30 days</span>
        </div>
        <div className="sb-page-actions">
          <div className="role-switch">
            <button className={cx(scope === "mine" && "active")} onClick={() => setScope("mine")}>My loans</button>
            <button className={cx(scope === "all" && "active")} onClick={() => setScope("all")}>All loans</button>
          </div>
          <Button variant="outline" icon={<I.Download/>}>Export</Button>
          <Button variant="primary" icon={<I.Plus/>}>New loan</Button>
        </div>
      </div>

      <div className="kpi-grid">
        <Card>
          <Stat label="Deployed capital" value={fmtUSD(deployed)} delta={{ dir: "up", text: "+$412k MoM" }} sub="across 6 active"/>
          <Sparkline data={monthSpark} w={220} h={32}/>
        </Card>
        <Card>
          <Stat label="Weighted avg rate" value={fmtPct(wRate, 2)} delta={{ dir: "down", text: "-12 bps" }} sub="contract"/>
          <Sparkline data={rateSpark} w={220} h={32} stroke="var(--text-2)"/>
        </Card>
        <Card>
          <Stat label="Avg LTV (as-is)" value={fmtPct(wLtv, 1)} sub="cap policy 75%"/>
          <Sparkline data={ltvSpark} w={220} h={32} stroke="var(--text-2)"/>
        </Card>
        <Card>
          <Stat label="Performing" value={`${performing}/${active.length}`} delta={{ dir: "up", text: "1 late-30" }} sub={fmtUSD(active.filter(l => l.performance === "current").reduce((s,l) => s+l.balance, 0)) + " current"}/>
          <Sparkline data={[6,6,5,6,6,6,5,5,6,5,5,5]} w={220} h={32} stroke="var(--text-2)"/>
        </Card>
      </div>

      <div className="dash-grid">
        <Card>
          <CardHeader
            title="Pipeline"
            subtitle={`${pipeline.length} deals in flight · $${(pipeline.reduce((s,l) => s+l.requested, 0)/1e6).toFixed(2)}M requested`}
            action={<Button variant="ghost" size="sm" onClick={() => nav("pipeline")}>Open pipeline →</Button>}
          />
          <div style={{ padding: "8px 18px 16px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
              {PIPELINE_STAGES.map((stage) => {
                const count = pipeline.filter((l) => l.status === stage.id).length;
                const amt = pipeline.filter((l) => l.status === stage.id).reduce((s,l) => s+l.requested, 0);
                return (
                  <div key={stage.id} style={{ padding: "10px 12px", background: "var(--bg-2)", borderRadius: 8 }}>
                    <div className="sb-eyebrow" style={{ marginBottom: 6 }}>{stage.label}</div>
                    <div className="mono" style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.02em" }}>{count}</div>
                    <div className="sb-muted sb-xs mono" style={{ marginTop: 2 }}>{amt ? `$${(amt/1e6).toFixed(2)}M` : "—"}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Activity" subtitle="Today" action={<button className="sb-icon-btn"><I.More/></button>}/>
          <div className="activity-list">
            {ACTIVITY.slice(0,6).map((a) => (
              <div className="activity-item" key={a.id}>
                <span className={`activity-dot ${a.kind}`}/>
                <div className="activity-text"><span className="activity-who">{a.who}</span> {a.text}</div>
                <span className="activity-at">{a.at}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Upcoming maturities" subtitle="Next 90 days" action={<Button variant="ghost" size="sm" onClick={() => nav("servicing")}>Servicing →</Button>}/>
          <div>
            {maturities.slice(0,5).map((m) => {
              const tone = m.daysOut < 30 ? "danger" : m.daysOut < 60 ? "urgent" : "";
              const pct = Math.max(0, Math.min(1, 1 - m.daysOut / 90));
              return (
                <div className="maturity-row" key={m.id} onClick={() => nav("loan", m.id)} style={{ cursor: "pointer" }}>
                  <div>
                    <div style={{ fontWeight: 500 }}>{m.address}</div>
                    <div className="sb-muted sb-sm">{m.borrower} · <span className="mono">{m.id}</span></div>
                  </div>
                  <div className="mono" style={{ textAlign: "right", fontSize: 13 }}>
                    {fmtUSD(m.balance)}
                  </div>
                  <div style={{ width: 120 }}>
                    <div className={`maturity-bar ${tone}`}><i style={{ width: `${pct*100}%` }}/></div>
                    <div className="sb-muted sb-xs mono" style={{ marginTop: 4, textAlign: "right" }}>
                      {m.daysOut}d · {fmtDate(m.maturity)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card style={{ gridColumn: "1 / -1" }}>
          <CardHeader title="Loans by status" subtitle="Across the full lifecycle"/>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(9, 1fr)", padding: "4px 0" }}>
            {[
              { id: "lead", label: "Lead" },
              { id: "application", label: "Application" },
              { id: "underwriting", label: "Underwriting" },
              { id: "approved", label: "Approved" },
              { id: "funded", label: "Funded" },
              { id: "active", label: "Active" },
              { id: "paid_off", label: "Paid off" },
              { id: "defaulted", label: "Defaulted" },
              { id: "foreclosure", label: "Foreclosure" },
            ].map((s, i, arr) => {
              const ct = filtered.filter((l) => l.status === s.id).length;
              return (
                <div key={s.id} style={{ padding: "16px 14px", borderRight: i < arr.length - 1 ? "1px solid var(--border)" : 0, textAlign: "left" }}>
                  <div className="mono" style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-0.02em", color: ct ? "var(--text)" : "var(--muted)" }}>{ct}</div>
                  <div className="sb-muted sb-xs" style={{ marginTop: 4 }}>{s.label}</div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <CardHeader title="This week" subtitle="Actions for you"/>
          <div style={{ padding: "8px 0" }}>
            {[
              { who: "SB-2026-0124", text: "Wire funding approval needed", action: "Approve", tone: "primary" },
              { who: "SB-2025-0061", text: "Late payment — 12 days past due", action: "Contact", tone: "danger" },
              { who: "SB-2025-0098", text: "Draw #4 inspection scheduled Thu", action: "View", tone: "outline" },
              { who: "SB-2026-0131", text: "UW scorecard awaiting your sign-off", action: "Review", tone: "outline" },
            ].map((t, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, padding: "10px 18px", borderTop: i ? "1px solid var(--border)" : 0, alignItems: "center" }}>
                <div>
                  <div className="mono sb-xs sb-muted">{t.who}</div>
                  <div style={{ fontSize: 13, marginTop: 2 }}>{t.text}</div>
                </div>
                <Button variant={t.tone} size="sm">{t.action}</Button>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

window.Dashboard = Dashboard;
