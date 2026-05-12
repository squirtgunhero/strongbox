// Pipeline kanban with drag-and-drop
const Pipeline = ({ nav }) => {
  const [loans, setLoans] = React.useState(() => LOANS.filter((l) => l.status !== "active"));
  const [dragId, setDragId] = React.useState(null);
  const [overCol, setOverCol] = React.useState(null);
  const [toast, setToast] = React.useState(null);

  const onDragStart = (id) => setDragId(id);
  const onDragEnd = () => { setDragId(null); setOverCol(null); };
  const onDropCol = (stageId) => {
    if (!dragId) return;
    setLoans((prev) => prev.map((l) => l.id === dragId ? { ...l, status: stageId, daysInStage: 0 } : l));
    const moved = loans.find((l) => l.id === dragId);
    setToast(`${moved.id} → ${PIPELINE_STAGES.find(s => s.id === stageId).label}`);
    setDragId(null); setOverCol(null);
  };

  const totalRequested = loans.reduce((s, l) => s + l.requested, 0);

  return (
    <>
      <div className="sb-page-header">
        <div className="sb-page-title">
          <h1 className="sb-h1">Pipeline</h1>
          <span className="sb-muted">{loans.length} deals · {fmtUSD(totalRequested)} requested · drag to move between stages</span>
        </div>
        <div className="sb-page-actions">
          <Button variant="outline" icon={<I.Filter/>} size="md">All officers</Button>
          <Button variant="primary" icon={<I.Plus/>}>New deal</Button>
        </div>
      </div>

      <div className="pipe-board">
        {PIPELINE_STAGES.map((stage) => {
          const cards = loans.filter((l) => l.status === stage.id);
          const amt = cards.reduce((s, l) => s + l.requested, 0);
          return (
            <div key={stage.id}
              className={cx("pipe-col", overCol === stage.id && "drag-over")}
              onDragOver={(e) => { e.preventDefault(); setOverCol(stage.id); }}
              onDragLeave={() => setOverCol((c) => c === stage.id ? null : c)}
              onDrop={() => onDropCol(stage.id)}>
              <div className="pipe-col-head">
                <div className="pipe-col-title">
                  <span className="sb-h6">{stage.label}</span>
                  <span className="pipe-col-count">{cards.length}</span>
                </div>
                <span className="sb-muted sb-xs mono">{amt ? `$${(amt/1e6).toFixed(1)}M` : "—"}</span>
              </div>
              <div className="sb-muted sb-xs" style={{ padding: "0 6px 4px" }}>{stage.hint}</div>
              {cards.map((l) => (
                <div key={l.id}
                  className={cx("pipe-card", dragId === l.id && "dragging")}
                  draggable
                  onDragStart={() => onDragStart(l.id)}
                  onDragEnd={onDragEnd}
                  onClick={() => nav("loan", l.id)}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span className="pipe-id">{l.id}</span>
                    <span className="sb-muted sb-xs mono">{l.daysInStage}d</span>
                  </div>
                  <div className="pipe-addr">{l.property.address}<br/>
                    <span className="sb-muted sb-sm" style={{ fontWeight: 400 }}>{l.property.city}, {l.property.state}</span>
                  </div>
                  <div className="pipe-meta">
                    <span>{l.property.type}</span>
                    <span>·</span>
                    <span>LTARV {fmtPct(ltarv(l.requested, l.property.arv), 0)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span className="pipe-amt">{fmtUSD(l.requested)}</span>
                    <span className="sb-muted sb-xs">{l.officer}</span>
                  </div>
                </div>
              ))}
              {cards.length === 0 && (
                <div style={{ padding: "20px 8px", textAlign: "center", color: "var(--muted)", fontSize: 12, border: "1px dashed var(--border)", borderRadius: 8, background: "var(--surface)" }}>
                  Drop here
                </div>
              )}
            </div>
          );
        })}
      </div>
      <Toast msg={toast} onDone={() => setToast(null)}/>
    </>
  );
};

window.Pipeline = Pipeline;
