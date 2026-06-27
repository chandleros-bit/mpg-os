// Sidebar navigation. On desktop it is a fixed rail; on mobile it slides in
// over a backdrop. Tab list is the single source of truth for navigation.
export const TABS = [
  { id: 'today', label: 'Today', icon: '☀️' },
  { id: 'scraper', label: 'Lead Scraper', icon: '🔍' },
  { id: 'calls', label: 'Call Center', icon: '📞' },
  { id: 'audit', label: 'Statement Audit', icon: '🧾' },
  { id: 'proposal', label: 'Proposal Builder', icon: '📄' },
  { id: 'drip', label: 'Email Drip', icon: '✉️' },
  { id: 'partners', label: 'Referral Partners', icon: '🤝' },
  { id: 'review', label: 'Weekly Review', icon: '📈' },
];

export default function Sidebar({ active, onSelect, mobileOpen, onCloseMobile, onSignOut, email }) {
  return (
    <>
      {/* mobile backdrop */}
      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={onCloseMobile} />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-navy text-white transition-transform lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-5 py-5">
          <div className="text-xl font-extrabold">
            MPG <span className="text-gold">OS</span>
          </div>
          <button onClick={onCloseMobile} className="text-2xl leading-none text-white/60 lg:hidden">
            &times;
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3">
          {TABS.map((tab) => {
            const isActive = tab.id === active;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  onSelect(tab.id);
                  onCloseMobile();
                }}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  isActive ? 'bg-gold text-ink' : 'text-white/80 hover:bg-white/10'
                }`}
              >
                <span aria-hidden>{tab.icon}</span>
                {tab.label}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-white/10 px-4 py-4 text-xs">
          {email && <div className="mb-2 truncate text-white/60">{email}</div>}
          <button onClick={onSignOut} className="font-semibold text-gold hover:underline">
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
