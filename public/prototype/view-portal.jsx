// Borrower portal — friendlier, more focused
const Portal = () => {
  const loan = LOANS.find((l) => l.id === "SB-2025-0098");
  const [drawModal, setDrawModal] = React.useState(false);
  const [payoffModal, setPayoffModal] = React.useState(false);
  const [toast, setToast] = React.useState(null);
  const nextPaymentDue = "2026-06-01";
  const nextPaymentAmt = (loan.balance * loan.rate) / 12;
  const daysToNext = daysBetween(TODAY, new Date(nextPaymentDue));

  // Draw request
  const [drawAmt, setDrawAmt] = React.useState(15000);
  const [drawItems, setDrawItems] = React.useState("Bathroom tile + fixtures");

  return (
    <div className="borrower-shell">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div className="sb-logo-mark">S</div>
          <span className="sb-logo-name">StrongBox</span>
          <span className="sb-muted sb-sm" style={{ marginLeft: 8 }}>Borrower portal</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="sb-sm sb-muted">Cardinal Build Co</span>
          <div className="sb-avatar">EC</div>
        </div>
      </div>

      <h1 className="sb-h1" style={{ marginBottom: 4 }}>Welcome back, Eliana</h1>
      <p className="sb-muted" style={{ marginBottom: 20 }}>One active loan · next payment in {daysToNext} days</p>

      <Card style={{ marginBottom: 16 }}>
        <div className="borrower-hero">
          <div>
            <Badge tone="current" dot style={{ marginBottom: 10 }}>Current</Badge>
            <div className="sb-h2" style={{ marginBottom: 4 }}>{loan.property.address}</div>
            <div className="sb-muted">{loan.property.city}, {loan.property.state} · <span className="mono">{loan.id}</span></div>
            <div style={{ display: "flex", gap: 28, marginTop: 16 }}>
              <div><div className="sb-muted sb-sm">Balance</div><div className="mono" style={{ fontSize: 18, fontWeight: 600 }}>{fmtUSD(loan.balance)}</div></div>
              <div><div className="sb-muted sb-sm">Rate</div><div className="mono" style={{ fontSize: 18, fontWeight: 600 }}>{fmtPct(loan.rate, 2)}</div></div>
              <div><div className="sb-muted sb-sm">Matures</div><div className="mono" style={{ fontSize: 18, fontWeight: 600 }}>{fmtDate(loan.maturityDate)}</div></div>
            </div>
          </div>
          <div style={{ width: 220 }}>
            <PropertyPhoto tag={loan.property.photo} ratio="4/3"/>
          </div>
        </div>
      </Card>

      <Card style={{ marginBottom: 16, background: "var(--bg)", borderColor: "var(--border)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", padding: 20, gap: 24, alignItems: "center" }}>
          <div>
            <div className="sb-muted sb-sm">Next payment due</div>
            <div className="mono" style={{ fontSize: 32, fontWeight: 600, letterSpacing: "-0.025em", lineHeight: 1.1, marginTop: 4 }}>{fmtUSD(nextPaymentAmt, { cents: true })}</div>
            <div className="sb-sm sb-muted" style={{ marginTop: 4 }}>{fmtDate(nextPaymentDue, { long: true })} · {daysToNext} days · interest-only</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Button variant="outline">Schedule autopay</Button>
            <Button variant="primary" size="lg" icon={<I.Wire/>} onClick={() => setToast("Payment scheduled for June 1")}>Pay now</Button>
          </div>
        </div>
      </Card>

      <div className="borrower-actions-grid" style={{ marginBottom: 16 }}>
        <button className="borrower-action" onClick={() => setDrawModal(true)}>
          <div className="ba-icon"><I.Draws size={16}/></div>
          <div>
            <div className="ba-title">Request draw</div>
            <div className="ba-sub">{fmtUSD(loan.rehabHoldback - loan.rehabDrawn)} remaining</div>
          </div>
        </button>
        <button className="borrower-action" onClick={() => setPayoffModal(true)}>
          <div className="ba-icon"><I.Doc size={16}/></div>
          <div>
            <div className="ba-title">Request payoff</div>
            <div className="ba-sub">PDF in seconds</div>
          </div>
        </button>
        <button className="borrower-action" onClick={() => setToast("Insurance update saved")}>
          <div className="ba-icon"><I.Building size={16}/></div>
          <div>
            <div className="ba-title">Update insurance</div>
            <div className="ba-sub">Renews Dec 15</div>
          </div>
        </button>
        <button className="borrower-action" onClick={() => setToast("Document uploaded")}>
          <div className="ba-icon"><I.Upload size={16}/></div>
          <div>
            <div className="ba-title">Upload documents</div>
            <div className="ba-sub">Invoices, photos</div>
          </div>
        </button>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <CardHeader title="Rehab progress" subtitle={`Draw #4 inspection scheduled Thursday`}/>
        <div style={{ padding: "12px 18px 18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span className="sb-muted sb-sm">Drawn</span>
            <span className="mono sb-sm">{fmtUSD(loan.rehabDrawn)} / {fmtUSD(loan.rehabHoldback)}</span>
          </div>
          <div className="holdback-bar"><i style={{ width: `${(loan.rehabDrawn/loan.rehabHoldback)*100}%` }}/></div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginTop: 18 }}>
            {DRAWS_PRIMARY.slice().reverse().map((d) => (
              <div key={d.id} style={{ padding: 10, border: "1px solid var(--border)", borderRadius: 8 }}>
                <div className="sb-muted sb-xs">Draw #{d.number}</div>
                <div className="mono" style={{ fontSize: 14, fontWeight: 500, marginTop: 2 }}>{fmtUSD(d.amount)}</div>
                <Badge tone={d.status === "funded" ? "current" : "underwriting"} dot style={{ marginTop: 6 }}>{d.status}</Badge>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16 }}>
        <Card>
          <CardHeader title="Recent payments"/>
          <table className="sb-table">
            <thead><tr><th>Date</th><th>Type</th><th className="num">Amount</th></tr></thead>
            <tbody>
              {PAYMENTS_PRIMARY.filter((p) => p.type === "Interest").slice(0, 5).map((p) => (
                <tr key={p.id}>
                  <td><span className="mono sb-sm">{fmtDate(p.date)}</span></td>
                  <td>{p.type}</td>
                  <td className="num">{fmtUSD(p.amount, { cents: true })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card>
          <CardHeader title="Your documents"/>
          <div>
            {DOCUMENTS_PRIMARY.slice(0, 4).map((d) => (
              <div key={d.id} className="doc-row" style={{ gridTemplateColumns: "28px 1fr auto" }}>
                <div className="doc-icon"><I.Doc size={14}/></div>
                <div>
                  <div style={{ fontWeight: 500 }}>{d.name}</div>
                  <div className="sb-muted sb-xs">{fmtDate(d.updated)}</div>
                </div>
                <button className="sb-icon-btn"><I.Download size={14}/></button>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Modal open={drawModal} onClose={() => setDrawModal(false)} title="Request a draw" subtitle={`${fmtUSD(loan.rehabHoldback - loan.rehabDrawn)} available from your rehab holdback`} width={460}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <RangeRow label="Amount" value={drawAmt} min={2500} max={loan.rehabHoldback - loan.rehabDrawn} step={500} onChange={setDrawAmt} format={fmtUSD}/>
          <div>
            <div className="sb-muted sb-sm" style={{ marginBottom: 6 }}>Line items / scope</div>
            <textarea value={drawItems} onChange={(e) => setDrawItems(e.target.value)} style={{ width: "100%", padding: 10, border: "1px solid var(--border)", borderRadius: 8, minHeight: 76, background: "var(--surface)", color: "var(--text)", fontSize: 13, outline: "none", resize: "vertical" }}/>
          </div>
          <div style={{ padding: 12, background: "var(--bg-2)", borderRadius: 8, fontSize: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}><span className="sb-muted">Inspection</span><span>Scheduled within 48h</span></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span className="sb-muted">Funding ETA</span><span>2–3 business days after approval</span></div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Button variant="outline" onClick={() => setDrawModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={() => { setDrawModal(false); setToast("Draw request submitted"); }}>Submit request</Button>
          </div>
        </div>
      </Modal>

      <Modal open={payoffModal} onClose={() => setPayoffModal(false)} title="Payoff quote" subtitle="Banker's interest (360-day)" width={420}>
        <PayoffQuoteInline loan={loan}/>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14 }}>
          <Button variant="outline" onClick={() => setPayoffModal(false)}>Close</Button>
          <Button variant="primary" icon={<I.Download/>} onClick={() => { setPayoffModal(false); setToast("Payoff letter downloaded"); }}>Download PDF</Button>
        </div>
      </Modal>

      <Toast msg={toast} onDone={() => setToast(null)}/>
    </div>
  );
};

const PayoffQuoteInline = ({ loan }) => {
  const [date, setDate] = React.useState(addDays(TODAY, 14).toISOString().slice(0,10));
  const days = Math.max(0, daysBetween(loan.paidThrough, new Date(date)));
  const accrued = perDiem(loan.balance, loan.rate) * days;
  const total = loan.balance + accrued;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
        style={{ padding: 8, border: "1px solid var(--border)", borderRadius: 8, background: "var(--surface)", color: "var(--text)", fontSize: 13 }}/>
      <div className="payoff-row"><span className="label">Principal</span><span className="val mono">{fmtUSD(loan.balance, { cents: true })}</span></div>
      <div className="payoff-row"><span className="label">Interest · {days}d @ {fmtUSD(perDiem(loan.balance, loan.rate), { cents: true })}/d</span><span className="val mono">{fmtUSD(accrued, { cents: true })}</span></div>
      <div className="payoff-row total"><span className="label">Total</span><span className="val mono">{fmtUSD(total, { cents: true })}</span></div>
    </div>
  );
};

window.Portal = Portal;
