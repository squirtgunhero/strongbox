// Main app: shell, sidebar, top bar, view switcher, tweaks, cmd-k

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "forest",
  "density": "comfortable",
  "dark": false,
  "showCmdK": true,
  "borrowerHeader": "minimal"
}/*EDITMODE-END*/;

const ACCENTS = {
  forest: { name: "Forest", value: "oklch(0.45 0.09 155)", bg: "oklch(0.96 0.03 155)" },
  ink:    { name: "Ink",    value: "oklch(0.22 0 0)",      bg: "oklch(0.94 0 0)"      },
  cobalt: { name: "Cobalt", value: "oklch(0.45 0.13 250)", bg: "oklch(0.96 0.03 250)" },
  rust:   { name: "Rust",   value: "oklch(0.50 0.13 35)",  bg: "oklch(0.96 0.04 35)"  },
};

const NAV = [
  { id: "dashboard",  label: "Dashboard",     icon: "Dashboard",  count: null },
  { id: "pipeline",   label: "Pipeline",      icon: "Pipeline",   count: LOANS.filter(l => l.status !== "active").length },
  { id: "servicing",  label: "Servicing",     icon: "Servicing",  count: LOANS.filter(l => l.status === "active").length },
  { id: "draws",      label: "Draws",         icon: "Draws",      count: 1 },
  { id: "loans",      label: "All loans",     icon: "Loans" },
  { id: "borrowers",  label: "Borrowers",     icon: "Borrowers" },
  { id: "properties", label: "Properties",    icon: "Properties" },
  { id: "investors",  label: "Investors",     icon: "Investors" },
  { id: "reports",    label: "Reports",       icon: "Reports" },
  { id: "audit",      label: "Audit log",     icon: "Audit" },
  { id: "settings",   label: "Settings",      icon: "Settings" },
];

const Sidebar = ({ view, nav }) => (
  <aside className="sb-sidebar" data-screen-label="Sidebar">
    <div className="sb-sidebar-header">
      <div className="sb-logo-mark">S</div>
      <span className="sb-logo-name">StrongBox</span>
    </div>
    <div className="sb-sidebar-nav">
      <div className="sb-nav-section">
        <div className="sb-nav-label sb-eyebrow">Workspace</div>
        {NAV.slice(0,4).map((n) => {
          const Ico = I[n.icon];
          const active = view === n.id || (view === "loan" && n.id === "servicing");
          return (
            <button key={n.id} className={cx("sb-nav-item", active && "active")} onClick={() => nav(n.id)}>
              <Ico size={15}/>
              <span>{n.label}</span>
              {n.count != null && <span className="sb-count mono">{n.count}</span>}
            </button>
          );
        })}
      </div>
      <div className="sb-nav-section">
        <div className="sb-nav-label sb-eyebrow">Records</div>
        {NAV.slice(4,8).map((n) => {
          const Ico = I[n.icon];
          return (
            <button key={n.id} className={cx("sb-nav-item", view === n.id && "active")} onClick={() => nav(n.id)}>
              <Ico size={15}/><span>{n.label}</span>
            </button>
          );
        })}
      </div>
      <div className="sb-nav-section">
        <div className="sb-nav-label sb-eyebrow">Admin</div>
        {NAV.slice(8).map((n) => {
          const Ico = I[n.icon];
          return (
            <button key={n.id} className={cx("sb-nav-item", view === n.id && "active")} onClick={() => nav(n.id)}>
              <Ico size={15}/><span>{n.label}</span>
            </button>
          );
        })}
      </div>
    </div>
    <div className="sb-sidebar-footer">
      <div className="sb-user">
        <div className="sb-avatar">RA</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500 }}>Reese Anand</div>
          <div className="sb-muted sb-xs">Loan officer · Admin</div>
        </div>
        <button className="sb-icon-btn"><I.ChevronDown size={14}/></button>
      </div>
    </div>
  </aside>
);

const TopBar = ({ view, loanId, nav, role, setRole, openCmd }) => {
  const crumb = (() => {
    if (view === "loan") {
      const l = LOANS.find(x => x.id === loanId);
      return <>
        <span className="sb-crumb-clickable" onClick={() => nav("servicing")} style={{ cursor: "pointer" }}>Servicing</span>
        <I.Chevron size={12}/>
        <span className="sb-crumb-active mono">{loanId}</span>
      </>;
    }
    const item = NAV.find(n => n.id === view);
    return <span className="sb-crumb-active">{item ? item.label : view}</span>;
  })();
  return (
    <header className="sb-topbar">
      <div className="sb-crumb">{crumb}</div>
      <div className="sb-topbar-spacer"/>
      <button className="sb-search" onClick={openCmd} style={{ cursor: "pointer" }}>
        <I.Search size={14}/>
        <span style={{ flex: 1, textAlign: "left" }}>Search loans, borrowers, properties…</span>
        <span className="sb-kbd">⌘K</span>
      </button>
      <div className="role-switch">
        <button className={cx(role === "admin" && "active")} onClick={() => setRole("admin")}>Admin</button>
        <button className={cx(role === "borrower" && "active")} onClick={() => setRole("borrower")}>Borrower</button>
      </div>
      <button className="sb-icon-btn"><I.Bell/></button>
    </header>
  );
};

const CmdK = ({ open, onClose, nav }) => {
  const [q, setQ] = React.useState("");
  const [idx, setIdx] = React.useState(0);
  const inputRef = React.useRef(null);

  React.useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
    setQ(""); setIdx(0);
  }, [open]);

  const items = React.useMemo(() => {
    const all = [
      ...NAV.map(n => ({ kind: "nav", id: n.id, label: n.label, sub: "Navigate" })),
      ...LOANS.map(l => ({ kind: "loan", id: l.id, label: `${l.id} · ${l.property.address}`, sub: l.borrower.name })),
    ];
    if (!q) return all.slice(0, 12);
    const Q = q.toLowerCase();
    return all.filter(it => it.label.toLowerCase().includes(Q) || it.sub.toLowerCase().includes(Q)).slice(0, 12);
  }, [q]);

  const run = (it) => {
    if (it.kind === "loan") nav("loan", it.id);
    else nav(it.id);
    onClose();
  };

  const onKey = (e) => {
    if (e.key === "Escape") onClose();
    else if (e.key === "ArrowDown") { e.preventDefault(); setIdx(i => Math.min(items.length - 1, i + 1)); }
    else if (e.key === "ArrowUp")   { e.preventDefault(); setIdx(i => Math.max(0, i - 1)); }
    else if (e.key === "Enter")     { e.preventDefault(); items[idx] && run(items[idx]); }
  };

  if (!open) return null;
  return (
    <div className="cmdk-overlay" onClick={onClose}>
      <div className="cmdk-panel" onClick={(e) => e.stopPropagation()}>
        <div className="cmdk-input">
          <I.Search size={16} stroke="var(--muted)"/>
          <input ref={inputRef} value={q} onChange={(e) => { setQ(e.target.value); setIdx(0); }} onKeyDown={onKey} placeholder="Search loans, borrowers, properties…"/>
          <span className="sb-kbd">esc</span>
        </div>
        <div className="cmdk-list">
          <div className="cmdk-section">{q ? "Results" : "Quick actions"}</div>
          {items.map((it, i) => (
            <div key={`${it.kind}-${it.id}`} className={cx("cmdk-item", i === idx && "active")} onMouseEnter={() => setIdx(i)} onClick={() => run(it)}>
              {it.kind === "loan" ? <I.Loans size={14}/> : <I.Arrow size={14}/>}
              <span>{it.label}</span>
              <span className="cmdk-sub">{it.sub}</span>
            </div>
          ))}
          {items.length === 0 && <div className="cmdk-item sb-muted">No matches</div>}
        </div>
      </div>
    </div>
  );
};

// Tweaks panel
const Tweaks = ({ tweaks, setTweak }) => (
  <TweaksPanel title="Tweaks">
    <TweakSection title="Theme">
      <TweakColor label="Accent" value={tweaks.accent}
        options={Object.keys(ACCENTS).map(k => ACCENTS[k].value)}
        onChange={(v) => {
          const key = Object.keys(ACCENTS).find(k => ACCENTS[k].value === v) || "forest";
          setTweak("accent", key);
        }}/>
      <TweakToggle label="Dark mode" value={tweaks.dark} onChange={(v) => setTweak("dark", v)}/>
    </TweakSection>
    <TweakSection title="Layout">
      <TweakRadio label="Density" value={tweaks.density} options={["compact", "comfortable"]} onChange={(v) => setTweak("density", v)}/>
      <TweakToggle label="Command-K hint" value={tweaks.showCmdK} onChange={(v) => setTweak("showCmdK", v)}/>
    </TweakSection>
    <TweakSection title="Borrower portal">
      <TweakRadio label="Header" value={tweaks.borrowerHeader} options={["minimal", "branded"]} onChange={(v) => setTweak("borrowerHeader", v)}/>
    </TweakSection>
  </TweaksPanel>
);

const Stub = ({ title, body }) => (
  <div className="sb-content-narrow">
    <div className="sb-page-header">
      <div className="sb-page-title">
        <h1 className="sb-h1">{title}</h1>
        <span className="sb-muted">{body}</span>
      </div>
    </div>
    <Card>
      <Empty>This section is sketched. Open the Dashboard, Pipeline, a Loan, Servicing, or switch to Borrower mode to see polished surfaces.</Empty>
    </Card>
  </div>
);

const App = () => {
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [view, setView] = React.useState("dashboard");
  const [loanId, setLoanId] = React.useState("SB-2025-0098");
  const [role, setRole] = React.useState("admin");
  const [cmdOpen, setCmdOpen] = React.useState(false);

  const nav = (v, id) => {
    setView(v);
    if (v === "loan" && id) setLoanId(id);
    window.scrollTo({ top: 0 });
  };

  // Theme
  React.useEffect(() => {
    document.documentElement.classList.toggle("dark", tweaks.dark);
    const a = ACCENTS[tweaks.accent] || ACCENTS.forest;
    document.documentElement.style.setProperty("--accent", a.value);
    document.documentElement.style.setProperty("--accent-bg", a.bg);
    document.documentElement.dataset.density = tweaks.density;
  }, [tweaks.accent, tweaks.dark, tweaks.density]);

  // Cmd-K shortcut
  React.useEffect(() => {
    const h = (e) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault(); setCmdOpen(true);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const renderView = () => {
    if (role === "borrower") return <Portal/>;
    switch (view) {
      case "dashboard": return <Dashboard nav={nav}/>;
      case "pipeline":  return <Pipeline nav={nav}/>;
      case "servicing": return <Servicing nav={nav}/>;
      case "loan":      return <LoanDetail loanId={loanId} nav={nav}/>;
      case "draws":     return <Stub title="Draws" body="Cross-loan draw queue"/>;
      case "loans":     return <Stub title="All loans" body="Unified table view"/>;
      case "borrowers": return <Stub title="Borrowers" body="Entities and individuals"/>;
      case "properties":return <Stub title="Properties" body="Subject + comps"/>;
      case "investors": return <Stub title="Investors" body="Capital partners and positions"/>;
      case "reports":   return <Stub title="Reports" body="Portfolio · originations · defaults"/>;
      case "audit":     return <Stub title="Audit log" body="Append-only, every state change"/>;
      case "settings":  return <Stub title="Settings" body="Org · users · workflow"/>;
      default: return null;
    }
  };

  if (role === "borrower") {
    return (
      <div className="sb-app borrower" data-screen-label={`Borrower portal`}>
        <div/>
        <div className="sb-main">
          <div style={{ padding: "8px 16px", display: "flex", justifyContent: "flex-end", gap: 8, borderBottom: "1px solid var(--border)" }}>
            <div className="role-switch">
              <button onClick={() => setRole("admin")}>Admin</button>
              <button className="active">Borrower</button>
            </div>
          </div>
          <div className="sb-content"><Portal/></div>
        </div>
        <Tweaks tweaks={tweaks} setTweak={setTweak}/>
      </div>
    );
  }

  return (
    <div className="sb-app" data-screen-label={`Admin · ${view}`}>
      <Sidebar view={view} nav={nav}/>
      <div className="sb-main">
        <TopBar view={view} loanId={loanId} nav={nav} role={role} setRole={setRole} openCmd={() => setCmdOpen(true)}/>
        <div className="sb-content">{renderView()}</div>
      </div>
      <CmdK open={cmdOpen} onClose={() => setCmdOpen(false)} nav={nav}/>
      <Tweaks tweaks={tweaks} setTweak={setTweak}/>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
