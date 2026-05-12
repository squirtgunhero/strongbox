// Servicing dashboard — portfolio view
const Servicing = ({ nav }) => {
  const active = LOANS.filter((l) => l.status === "active");
  const deployed = active.reduce((s, l) => s + l.balance, 0);
  const monthlyInterest = active.reduce((s, l) => s + (l.balance * l.rate) / 12, 0);
  const wRate = active.reduce((s, l) => s + l.balance * l.rate, 0) / deployed;
  const performing = active.filter((l) => l.performance === "current");
  const performingPct = performing.length / active.length;

  // Aging buckets
  const aging = {
    current: active.filter((l) => l.performance === "current").reduce((s, l) => s + l.balance, 0),
    d30: active.filter((l) => l.performance === "late-30").reduce((s, l) => s + l.balance, 0),
    d60: 0, d90: 0,
  };

  const maturities = buildMaturities();
  const [filter, setFilter] = React.useState("all");
  const shown = filter === "all" ? active : active.filter((l) => filter === "late" ? l.performance !== "current" : l.performance === "current");

  return (
    <div className="sb-content-narrow">
      <div className="sb-page-header">
        <div className="sb-page-title">
          <h1 className="sb-h1">Servicing</h1>
          <span className="sb-muted">{active.length} active loans · {fmtUSD(monthlyInterest)} monthly interest scheduled</span>
        </div>
        <div className="sb-page-actions">
          <Button variant="outline" icon={<I.Download/>}>Export ledger</Button>
          <Button variant="primary" icon={<I.Doc/>}>Generate statements</Button>
        </div>
      </div>

      <div className="servicing-summary">
        <Card style={{ padding: "16px 18px" }}><Stat label="Deployed" value={fmtUSD(deployed)} sub={`${active.length} loans`}/></Card>
        <Card style={{ padding: "16px 18px" }}><Stat label="Monthly interest" value={fmtUSD(monthlyInterest)} sub={`@ ${fmtPct(wRate, 2)} weighted`}/></Card>
        <Card style={{ padding: "16px 18px" }}><Stat label="Performing" value={fmtPct(performingPct, 0)} sub={`${performing.length}/${active.length} current`}/></Card>
        <Card style={{ padding: "16px 18px" }}><Stat label="Per-diem (today)" value={fmtUSD(active.reduce((s,l) => s + perDiem(l.balance, l.rate), 0), { cents: true })} sub="across portfolio"/></Card>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <CardHeader title="Aging" subtitle="As of today"/>
        <div className="aging-grid">
          <div className="aging-cell"><div className="sb-muted sb-sm">Current</div><div className="aging-val mono">{fmtUSD(aging.current)}</div><div className="sb-muted sb-xs">{fmtPct(aging.current/deployed, 0)} of book</div></div>
          <div className="aging-cell warn"><div className="sb-muted sb-sm">30 days</div><div className="aging-val mono">{fmtUSD(aging.d30)}</div><div className="sb-muted sb-xs">1 loan</div></div>
          <div className="aging-cell"><div className="sb-muted sb-sm">60 days</div><div className="aging-val mono">$0</div><div className="sb-muted sb-xs">—</div></div>
          <div className="aging-cell"><div className="sb-muted sb-sm">90+ days</div><div className="aging-val mono">$0</div><div className="sb-muted sb-xs">—</div></div>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Active book"
          subtitle="Click a loan to open detail"
          action={
            <div className="role-switch">
              {[["all","All"],["current","Current"],["late","Late"]].map(([id,l]) => (
                <button key={id} className={cx(filter === id && "active")} onClick={() => setFilter(id)}>{l}</button>
              ))}
            </div>
          }
        />
        <table className="sb-table">
          <thead><tr>
            <th>Loan</th><th>Property</th><th>Borrower</th><th className="num">Balance</th><th className="num">Rate</th><th className="num">LTV</th><th className="num">Matures</th><th>Status</th>
          </tr></thead>
          <tbody>
            {shown.map((l) => {
              const days = daysBetween(TODAY, new Date(l.maturityDate));
              return (
                <tr key={l.id} className="clickable" onClick={() => nav("loan", l.id)}>
                  <td><span className="mono sb-sm">{l.id}</span></td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{l.property.address}</div>
                    <div className="sb-muted sb-xs">{l.property.city}, {l.property.state}</div>
                  </td>
                  <td>{l.borrower.name}</td>
                  <td className="num">{fmtUSD(l.balance)}</td>
                  <td className="num">{fmtPct(l.rate, 2)}</td>
                  <td className="num">{fmtPct(ltv(l.amount, l.property.asIsValue), 0)}</td>
                  <td className="num"><span>{fmtDate(l.maturityDate)}</span><div className="sb-muted sb-xs">{days}d</div></td>
                  <td><Badge tone={l.performance} dot>{l.performance === "current" ? "current" : "late 30"}</Badge></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
};

window.Servicing = Servicing;
