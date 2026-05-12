// Shared UI primitives for StrongBox prototype.

const cx = (...xs) => xs.filter(Boolean).join(" ");

// ---- Card ----
const Card = ({ className = "", children, ...rest }) => (
  <div className={cx("sb-card", className)} {...rest}>{children}</div>
);
const CardHeader = ({ title, subtitle, action, className = "" }) => (
  <div className={cx("sb-card-header", className)}>
    <div className="sb-card-title">
      <div className="sb-h6">{title}</div>
      {subtitle && <div className="sb-muted sb-sm">{subtitle}</div>}
    </div>
    {action && <div className="sb-card-action">{action}</div>}
  </div>
);

// ---- Button ----
const Button = ({ variant = "default", size = "md", icon, children, className = "", ...rest }) => (
  <button className={cx("sb-btn", `sb-btn-${variant}`, `sb-btn-${size}`, className)} {...rest}>
    {icon && <span className="sb-btn-icon">{icon}</span>}
    {children}
  </button>
);

// ---- Badge ----
const Badge = ({ tone, children, dot, className = "" }) => {
  const t = tone && window.STATUS_TONE[tone];
  const style = t ? { color: t.fg, background: t.bg } : {};
  return (
    <span className={cx("sb-badge", className)} style={style}>
      {dot && <span className="sb-badge-dot" style={{ background: t?.fg }} />}
      {children}
    </span>
  );
};

// ---- Stat ----
const Stat = ({ label, value, delta, sub, mono = true }) => (
  <div className="sb-stat">
    <div className="sb-stat-label">{label}</div>
    <div className={cx("sb-stat-value", mono && "mono")}>{value}</div>
    {(delta || sub) && (
      <div className="sb-stat-sub">
        {delta && <span className={cx("sb-delta", delta.dir)}>{delta.text}</span>}
        {sub && <span className="sb-muted">{sub}</span>}
      </div>
    )}
  </div>
);

// ---- Sparkline ----
const Sparkline = ({ data, w = 120, h = 32, stroke = "currentColor", fill = "none" }) => {
  if (!data || !data.length) return null;
  const max = Math.max(...data), min = Math.min(...data);
  const range = max - min || 1;
  const step = w / (data.length - 1);
  const points = data.map((v, i) => `${i * step},${h - ((v - min) / range) * h}`).join(" ");
  return (
    <svg width={w} height={h} className="sb-spark">
      <polyline points={points} fill={fill} stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/>
    </svg>
  );
};

// ---- Photo placeholder ----
const PropertyPhoto = ({ tag, ratio = "16/10", className = "" }) => (
  <div className={cx("sb-photo", className)} style={{ aspectRatio: ratio }}>
    <svg className="sb-photo-bg" preserveAspectRatio="none" viewBox="0 0 100 60">
      <defs>
        <pattern id={`stripes-${tag}`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="3" height="6" fill="rgba(0,0,0,0.035)"/>
        </pattern>
      </defs>
      <rect width="100" height="60" fill={`url(#stripes-${tag})`}/>
    </svg>
    <span className="sb-photo-label mono">{tag}</span>
  </div>
);

// ---- Tabs ----
const Tabs = ({ items, active, onChange }) => (
  <div className="sb-tabs" role="tablist">
    {items.map((it) => (
      <button key={it.id} role="tab" aria-selected={active === it.id}
        className={cx("sb-tab", active === it.id && "active")}
        onClick={() => onChange(it.id)}>
        {it.label}
        {it.count != null && <span className="sb-tab-count">{it.count}</span>}
      </button>
    ))}
  </div>
);

// ---- Toast ----
const Toast = ({ msg, onDone }) => {
  React.useEffect(() => {
    if (!msg) return;
    const t = setTimeout(onDone, 2400);
    return () => clearTimeout(t);
  }, [msg, onDone]);
  return (
    <div className={cx("sb-toast", msg && "show")}>
      <I.Check size={14}/> <span>{msg}</span>
    </div>
  );
};

// ---- Modal ----
const Modal = ({ open, onClose, title, subtitle, children, width = 480 }) => {
  if (!open) return null;
  return (
    <div className="sb-modal-overlay" onClick={onClose}>
      <div className="sb-modal" style={{ maxWidth: width }} onClick={(e) => e.stopPropagation()}>
        <div className="sb-modal-header">
          <div>
            <div className="sb-h5">{title}</div>
            {subtitle && <div className="sb-muted sb-sm">{subtitle}</div>}
          </div>
          <button className="sb-icon-btn" onClick={onClose}><I.Close/></button>
        </div>
        <div className="sb-modal-body">{children}</div>
      </div>
    </div>
  );
};

// ---- Range w/ live label ----
const RangeRow = ({ label, value, unit = "", min, max, step = 1, onChange, format }) => (
  <div className="sb-range-row">
    <div className="sb-range-head">
      <span className="sb-muted sb-sm">{label}</span>
      <span className="mono sb-sm">{format ? format(value) : `${value}${unit}`}</span>
    </div>
    <input type="range" min={min} max={max} step={step} value={value}
      onChange={(e) => onChange(Number(e.target.value))} className="sb-range"/>
  </div>
);

// ---- Empty placeholder ----
const Empty = ({ children }) => <div className="sb-empty sb-muted">{children}</div>;

Object.assign(window, {
  cx, Card, CardHeader, Button, Badge, Stat, Sparkline, PropertyPhoto, Tabs, Toast, Modal, RangeRow, Empty,
});
