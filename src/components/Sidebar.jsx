// Sidebar navigation. On desktop it is a fixed rail; on mobile it slides in
// over a backdrop. Tab list is the single source of truth for navigation.
export const TABS = [
  { id: 'today', label: 'Today' },
  { id: 'scraper', label: 'Lead Scraper' },
  { id: 'calls', label: 'Call Center' },
  { id: 'audit', label: 'Statement Audit' },
  { id: 'proposal', label: 'Proposal Builder' },
  { id: 'drip', label: 'Email Drip' },
  { id: 'partners', label: 'Referral Partners' },
  { id: 'review', label: 'Weekly Review' },
];

// Monoline icons, one per tab. Stroke uses currentColor so active/inactive
// coloring is handled by the button's text color.
const I = (paths) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {paths}
  </svg>
);

const ICONS = {
  today: I(
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  scraper: I(
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </>
  ),
  calls: I(
    <path d="M5 4h3l1.5 4-2 1.5a11 11 0 0 0 5 5l1.5-2 4 1.5v3a2 2 0 0 1-2.2 2A16 16 0 0 1 3 6.2 2 2 0 0 1 5 4z" />
  ),
  audit: I(
    <>
      <path d="M7 3h10a1 1 0 0 1 1 1v17l-3-2-3 2-3-2-3 2V4a1 1 0 0 1 1-1z" />
      <path d="M9 8h6M9 12h6M9 16h3" />
    </>
  ),
  proposal: I(
    <>
      <path d="M14 3H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7z" />
      <path d="M14 3v4h4M9 13h6M9 17h6" />
    </>
  ),
  drip: I(
    <>
      <rect x="3" y="5" width="18" height="14" rx="1.5" />
      <path d="M4 6.5l8 6 8-6" />
    </>
  ),
  partners: I(
    <>
      <circle cx="8" cy="9" r="3" />
      <circle cx="17" cy="10" r="2.5" />
      <path d="M2.5 19a5.5 5.5 0 0 1 11 0M14.5 19a4.5 4.5 0 0 1 7 0" />
    </>
  ),
  review: I(
    <>
      <path d="M4 4v16h16" />
      <path d="M7 14l3.5-4 3 2.5L21 6" />
    </>
  ),
};

// Stages that count as live pipeline (not yet won/lost).
const OPEN = ['new', 'contacted', 'demo_scheduled', 'proposal_sent'];

export default function Sidebar({
  active,
  onSelect,
  mobileOpen,
  onCloseMobile,
  onSignOut,
  email,
  leads = [],
}) {
  const openCount = leads.filter((l) => OPEN.includes(l.status)).length;

  return (
    <>
      {/* mobile backdrop */}
      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={onCloseMobile} />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-navy-deep text-white transition-transform lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-start justify-between px-5 py-5">
          <div>
            <div className="font-display text-xl font-bold tracking-tight">
              MPG <span className="text-gold">OS</span>
            </div>
            <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-white/35">
              Media Payments Group
            </div>
          </div>
          <button
            onClick={onCloseMobile}
            className="text-2xl leading-none text-white/60 lg:hidden"
            aria-label="Close menu"
          >
            &times;
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
          {TABS.map((tab) => {
            const isActive = tab.id === active;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  onSelect(tab.id);
                  onCloseMobile();
                }}
                className={`relative flex w-full items-center gap-3 rounded-lg py-2.5 pl-4 pr-3 text-sm transition ${
                  isActive
                    ? 'bg-white/10 font-semibold text-white'
                    : 'font-medium text-white/65 hover:bg-white/5 hover:text-white'
                }`}
              >
                {isActive && (
                  <span className="absolute inset-y-1.5 left-0 w-[3px] rounded-full bg-gold" />
                )}
                <span className={isActive ? 'text-gold' : 'text-white/45'}>{ICONS[tab.id]}</span>
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Live pipeline tally — always in view, set in the ledger hand. */}
        <div className="mx-4 flex items-center justify-between rounded-lg border border-white/10 px-3 py-2.5">
          <span className="text-[11px] uppercase tracking-wide text-white/45">Open leads</span>
          <span className="font-mono tnum text-lg font-bold text-gold">{openCount}</span>
        </div>

        <div className="mt-3 border-t border-white/10 px-4 py-4 text-xs">
          {email && <div className="mb-2 truncate text-white/50">{email}</div>}
          <button onClick={onSignOut} className="font-semibold text-gold hover:underline">
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
