import { useState, useEffect } from 'react';
import { supabase, supabaseConfigured } from './lib/supabase.js';
import { useLeads } from './lib/useLeads.js';
import Auth from './components/Auth.jsx';
import Sidebar, { TABS } from './components/Sidebar.jsx';
import { Spinner } from './components/ui.jsx';

import Today from './tabs/Today.jsx';
import LeadScraper from './tabs/LeadScraper.jsx';
import CallCenter from './tabs/CallCenter.jsx';
import StatementAudit from './tabs/StatementAudit.jsx';
import ProposalBuilder from './tabs/ProposalBuilder.jsx';
import EmailDrip from './tabs/EmailDrip.jsx';
import ReferralPartners from './tabs/ReferralPartners.jsx';
import WeeklyReview from './tabs/WeeklyReview.jsx';

export default function App() {
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [active, setActive] = useState('today');
  const [mobileOpen, setMobileOpen] = useState(false);

  // Pipeline lives at the top so adding a lead in one tab updates them all.
  const leadsState = useLeads();

  useEffect(() => {
    if (!supabaseConfigured) {
      setAuthReady(true);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <Spinner label="Loading..." />
      </div>
    );
  }

  // If Supabase is configured, require a session. If it is not configured we
  // still show the app (with clear in-tab errors) so the UI can be reviewed.
  if (supabaseConfigured && !session) {
    return <Auth />;
  }

  const go = (tabId) => setActive(tabId);
  const shared = { ...leadsState, goToTab: go };

  const tabContent = {
    today: <Today {...shared} />,
    scraper: <LeadScraper {...shared} />,
    calls: <CallCenter {...shared} />,
    audit: <StatementAudit {...shared} />,
    proposal: <ProposalBuilder {...shared} />,
    drip: <EmailDrip {...shared} />,
    partners: <ReferralPartners />,
    review: <WeeklyReview {...shared} />,
  };

  const activeLabel = TABS.find((t) => t.id === active)?.label || '';

  return (
    <div className="min-h-screen bg-bg">
      <Sidebar
        active={active}
        onSelect={go}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        onSignOut={() => supabase.auth.signOut()}
        email={session?.user?.email}
      />

      <div className="lg:pl-64">
        {/* mobile top bar */}
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="text-2xl leading-none text-navy"
            aria-label="Open menu"
          >
            ☰
          </button>
          <span className="font-bold text-navy">{activeLabel}</span>
        </header>

        <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
          {!supabaseConfigured && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Supabase is not configured. Add <code>VITE_SUPABASE_URL</code> and{' '}
              <code>VITE_SUPABASE_ANON_KEY</code> to enable saving and loading data.
            </div>
          )}
          {tabContent[active]}
        </main>
      </div>
    </div>
  );
}
