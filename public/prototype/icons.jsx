// Tiny inline SVG icon set. Pure stroke, 1.5px, 20x20 viewBox.
const Icon = ({ d, size = 16, stroke = "currentColor", fill = "none", strokeWidth = 1.6, children, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill={fill} stroke={stroke}
       strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...rest}>
    {d && <path d={d} />}
    {children}
  </svg>
);

const I = {
  Dashboard:  (p) => <Icon {...p}><rect x="2.5" y="2.5" width="6" height="6" rx="1.2"/><rect x="11.5" y="2.5" width="6" height="6" rx="1.2"/><rect x="2.5" y="11.5" width="6" height="6" rx="1.2"/><rect x="11.5" y="11.5" width="6" height="6" rx="1.2"/></Icon>,
  Pipeline:   (p) => <Icon {...p}><rect x="2.5" y="3.5" width="4" height="13" rx="0.8"/><rect x="8" y="3.5" width="4" height="9" rx="0.8"/><rect x="13.5" y="3.5" width="4" height="6" rx="0.8"/></Icon>,
  Servicing:  (p) => <Icon {...p}><path d="M2.5 6.5h15M2.5 10h15M2.5 13.5h9"/></Icon>,
  Draws:      (p) => <Icon {...p}><path d="M3 17l3.5-3.5M5.5 14.5L13 7l3 3-7.5 7.5H5.5v-3z"/></Icon>,
  Loans:      (p) => <Icon {...p}><rect x="3.5" y="2.5" width="11" height="15" rx="1.2"/><path d="M6.5 6.5h5M6.5 9.5h5M6.5 12.5h3"/></Icon>,
  Borrowers:  (p) => <Icon {...p}><circle cx="10" cy="7" r="3"/><path d="M3.5 17c1-3 3.5-4.5 6.5-4.5s5.5 1.5 6.5 4.5"/></Icon>,
  Investors:  (p) => <Icon {...p}><rect x="2.5" y="5.5" width="15" height="10" rx="1"/><path d="M6.5 5.5V4a2 2 0 012-2h3a2 2 0 012 2v1.5"/><path d="M2.5 9h15"/></Icon>,
  Properties: (p) => <Icon {...p}><path d="M3 17V8.5L10 3l7 5.5V17"/><path d="M8 17v-5h4v5"/></Icon>,
  Reports:    (p) => <Icon {...p}><path d="M3 16.5V10M7.5 16.5V6M12 16.5v-4M16.5 16.5V3"/></Icon>,
  Audit:      (p) => <Icon {...p}><path d="M10 2l6 2v5c0 4-3 7-6 9-3-2-6-5-6-9V4l6-2z"/><path d="M7.5 10l2 2 3.5-4"/></Icon>,
  Settings:   (p) => <Icon {...p}><circle cx="10" cy="10" r="2.5"/><path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.3 4.3l1.4 1.4M14.3 14.3l1.4 1.4M4.3 15.7l1.4-1.4M14.3 5.7l1.4-1.4"/></Icon>,
  Bell:       (p) => <Icon {...p}><path d="M5 8.5a5 5 0 0110 0v3l1.5 3h-13L5 11.5v-3z"/><path d="M8 16.5a2 2 0 004 0"/></Icon>,
  Search:     (p) => <Icon {...p}><circle cx="9" cy="9" r="5"/><path d="M13 13l4 4"/></Icon>,
  Plus:       (p) => <Icon {...p}><path d="M10 4v12M4 10h12"/></Icon>,
  Chevron:    (p) => <Icon {...p}><path d="M7.5 5l5 5-5 5"/></Icon>,
  ChevronDown:(p) => <Icon {...p}><path d="M5 7.5l5 5 5-5"/></Icon>,
  Arrow:      (p) => <Icon {...p}><path d="M4 10h12M11 5l5 5-5 5"/></Icon>,
  Check:      (p) => <Icon {...p}><path d="M4 10.5l4 4 8-9"/></Icon>,
  Close:      (p) => <Icon {...p}><path d="M5 5l10 10M15 5L5 15"/></Icon>,
  Filter:     (p) => <Icon {...p}><path d="M3 4.5h14l-5 6.5v5l-4 1v-6L3 4.5z"/></Icon>,
  Download:   (p) => <Icon {...p}><path d="M10 3v10M5.5 9l4.5 4 4.5-4M3.5 17h13"/></Icon>,
  Upload:     (p) => <Icon {...p}><path d="M10 14V4M5.5 8l4.5-4 4.5 4M3.5 17h13"/></Icon>,
  Dot:        (p) => <Icon {...p}><circle cx="10" cy="10" r="2"/></Icon>,
  More:       (p) => <Icon {...p}><circle cx="5" cy="10" r="1"/><circle cx="10" cy="10" r="1"/><circle cx="15" cy="10" r="1"/></Icon>,
  Calendar:   (p) => <Icon {...p}><rect x="3" y="4.5" width="14" height="12" rx="1.2"/><path d="M3 8h14M7 3v3M13 3v3"/></Icon>,
  Doc:        (p) => <Icon {...p}><path d="M5 2.5h7l3 3V17.5H5z"/><path d="M12 2.5v3h3M7.5 9h5M7.5 12h5M7.5 15h3"/></Icon>,
  Pen:        (p) => <Icon {...p}><path d="M3 17l3.5-1 9-9-2.5-2.5-9 9-1 3.5z"/></Icon>,
  Building:   (p) => <Icon {...p}><rect x="3.5" y="3.5" width="13" height="13" rx="1"/><path d="M6.5 7h2M11.5 7h2M6.5 10h2M11.5 10h2M6.5 13h7"/></Icon>,
  Wire:       (p) => <Icon {...p}><path d="M3 10h11M10 6l4 4-4 4"/><circle cx="16.5" cy="10" r="1.2"/></Icon>,
  Sun:        (p) => <Icon {...p}><circle cx="10" cy="10" r="3"/><path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.3 4.3l1.4 1.4M14.3 14.3l1.4 1.4M4.3 15.7l1.4-1.4M14.3 5.7l1.4-1.4"/></Icon>,
  Moon:       (p) => <Icon {...p}><path d="M16 11.5A6 6 0 018.5 4a6 6 0 108 7.5z"/></Icon>,
  Logo:       (p) => <Icon {...p}><rect x="3" y="3.5" width="14" height="13" rx="2"/><path d="M6.5 8.5l3.5 2 3.5-2M6.5 12l3.5 2 3.5-2"/></Icon>,
  CmdK:       (p) => <Icon {...p}><rect x="3" y="3" width="14" height="14" rx="2"/><path d="M7.5 8L7 7.5h-.7a.8.8 0 100 1.6H10v-2"/><path d="M12.5 12l.5.5h.7a.8.8 0 100-1.6H10v2"/></Icon>,
};

window.I = I;
