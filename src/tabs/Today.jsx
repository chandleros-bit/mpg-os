import { useState, useEffect, useMemo } from 'react';
import { addLead, listCallsSince } from '../lib/db.js';
import { daysSince } from '../lib/useLeads.js';
import { STATUS_ORDER, STATUS_META, VERTICALS } from '../lib/colors.js';
import { useDraft } from '../lib/useDraft.js';
import {
  Card,
  SectionTitle,
  PageHeader,
  Eyebrow,
  FunnelBar,
  Button,
  Field,
  Input,
  Select,
  StatusBadge,
  ErrorBanner,
  Empty,
} from '../components/ui.jsx';

const TIPS = [
  'Lead with the statement audit. Numbers on paper close faster than any pitch.',
  'Square and Stripe make you wait on hold. MPG gives them a real rep, 24/7. Hammer that.',
  'Interchange-plus means no hidden fees. Say it plainly: you see exactly what you pay.',
  'Stuck on price? Pivot to BuyFin capital. Lead with capital, close on payments.',
  'HELPMEADVERTISE gives them 3 months free marketing. Save it for the close.',
  'Every junk fee on their statement is your opening. PCI fees and monthly minimums are gifts.',
  'Restaurants, salons, gyms, retail. Match the talk track to their world and you sound like one of them.',
];

export default function Today({ leads, loading, error, refresh, goToTab }) {
  const [calls, setCalls] = useState([]);
  const [form, setForm, clearDraft] = useDraft('today-quickadd', {
    business_name: '',
    phone: '',
    vertical: 'restaurant',
    source: 'manual',
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Pull recent calls so we can tell who has gone cold and what is booked.
  useEffect(() => {
    const since = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    listCallsSince(since)
      .then(setCalls)
      .catch(() => setCalls([]));
  }, [leads]);

  const counts = useMemo(() => {
    const c = {};
    for (const s of STATUS_ORDER) c[s] = 0;
    for (const l of leads) if (c[l.status] !== undefined) c[l.status] += 1;
    return c;
  }, [leads]);

  const openTotal = counts.new + counts.contacted + counts.demo_scheduled + counts.proposal_sent;

  // Map lead_id -> most recent call date.
  const lastCallByLead = useMemo(() => {
    const map = {};
    for (const call of calls) {
      const prev = map[call.lead_id];
      if (!prev || call.call_date > prev) map[call.lead_id] = call.call_date;
    }
    return map;
  }, [calls]);

  const toCall = useMemo(() => {
    return leads.filter((l) => {
      if (!['new', 'contacted'].includes(l.status)) return false;
      const last = lastCallByLead[l.id];
      return daysSince(last || l.created_at) >= 3;
    });
  }, [leads, lastCallByLead]);

  const today = new Date().toISOString().slice(0, 10);
  const demosToday = useMemo(() => {
    const ids = new Set(
      calls.filter((c) => c.outcome === 'demo_booked' && c.call_date === today).map((c) => c.lead_id)
    );
    return leads.filter((l) => ids.has(l.id));
  }, [calls, leads, today]);

  const tip = TIPS[new Date().getDay() % TIPS.length];

  const submit = async (e) => {
    e.preventDefault();
    setSaveError('');
    if (!form.business_name.trim()) {
      setSaveError('Enter a business name to add the lead.');
      return;
    }
    setSaving(true);
    try {
      await addLead({
        business_name: form.business_name.trim(),
        phone: form.phone.trim(),
        vertical: form.vertical,
        source: form.source,
        status: 'new',
      });
      clearDraft();
      await refresh();
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rise">
        <PageHeader
          eyebrow="Daily desk"
          title="Today"
          sub="Work the cold ones first. The statement closes the rest."
        />
      </div>

      {/* Pipeline funnel */}
      <Card className="rise">
        <div className="mb-4 flex items-center justify-between">
          <SectionTitle>Pipeline</SectionTitle>
          <div className="text-right">
            <span className="font-mono tnum text-2xl font-bold text-navy">{openTotal}</span>
            <span className="ml-1.5 text-xs text-ink/50">open</span>
          </div>
        </div>
        {loading ? (
          <Empty>Loading pipeline…</Empty>
        ) : (
          <FunnelBar counts={counts} />
        )}
        <ErrorBanner message={error} />
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Call list */}
        <Card className="rise">
          <div className="mb-1 flex items-center justify-between">
            <SectionTitle>Call today</SectionTitle>
            <span className="font-mono tnum rounded-full bg-light px-2.5 py-0.5 text-xs font-bold text-navy">
              {toCall.length}
            </span>
          </div>
          <p className="mb-3 text-xs text-ink/50">New or contacted, no call in 3+ days.</p>
          {toCall.length === 0 ? (
            <Empty>Nobody is cold right now. Scrape fresh leads to keep the desk full.</Empty>
          ) : (
            <ul className="space-y-2">
              {toCall.slice(0, 12).map((l) => (
                <li
                  key={l.id}
                  className="flex items-center justify-between rounded-lg border border-line py-2 pl-3 pr-3 transition hover:bg-bg"
                  style={{ borderLeftColor: STATUS_META[l.status].bg, borderLeftWidth: '3px' }}
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-ink">{l.business_name}</div>
                    <div className="truncate font-mono text-xs text-ink/50">
                      {l.phone || 'no phone'} · {l.vertical || 'unsorted'}
                    </div>
                  </div>
                  <StatusBadge status={l.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Demos today */}
        <Card className="rise">
          <div className="mb-3 flex items-center justify-between">
            <SectionTitle>Demos booked today</SectionTitle>
            <span className="font-mono tnum rounded-full bg-gold px-2.5 py-0.5 text-xs font-bold text-ink">
              {demosToday.length}
            </span>
          </div>
          {demosToday.length === 0 ? (
            <Empty>No demos booked yet today. Go book one.</Empty>
          ) : (
            <ul className="space-y-2">
              {demosToday.map((l) => (
                <li
                  key={l.id}
                  className="rounded-lg border border-line py-2 pl-3 pr-3"
                  style={{ borderLeftColor: STATUS_META.demo_scheduled.bg, borderLeftWidth: '3px' }}
                >
                  <div className="text-sm font-semibold text-ink">{l.business_name}</div>
                  <div className="font-mono text-xs text-ink/50">{l.phone || 'no phone'}</div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Quick add */}
        <Card className="rise">
          <SectionTitle className="mb-3">Quick add lead</SectionTitle>
          <form onSubmit={submit} className="space-y-3">
            <Field label="Business name">
              <Input
                value={form.business_name}
                onChange={(e) => setForm({ ...form, business_name: e.target.value })}
                placeholder="Joe's Diner"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Phone">
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="(555) 123-4567"
                />
              </Field>
              <Field label="Vertical">
                <Select
                  value={form.vertical}
                  onChange={(e) => setForm({ ...form, vertical: e.target.value })}
                >
                  {VERTICALS.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label="Source">
              <Select
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value })}
              >
                <option value="manual">manual</option>
                <option value="scraper">scraper</option>
                <option value="referral">referral</option>
                <option value="statement_audit">statement_audit</option>
              </Select>
            </Field>
            <ErrorBanner message={saveError} />
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? 'Adding…' : 'Add to pipeline'}
            </Button>
          </form>
        </Card>

        {/* Statement teaser + tip */}
        <div className="space-y-6">
          <div className="rise overflow-hidden rounded-xl bg-navy-deep text-white shadow-sm">
            <div className="ledger-rule p-5">
              <Eyebrow className="text-gold">Highest-converting move</Eyebrow>
              <p className="mb-1 mt-2 font-display text-lg font-bold leading-snug">
                Put a statement on the table.
              </p>
              <p className="mb-4 text-sm text-white/65">
                It closes faster than any pitch. Run their numbers and show the gap in basis points.
              </p>
              <Button variant="gold" onClick={() => goToTab('audit')}>
                Run a statement audit →
              </Button>
            </div>
          </div>

          <Card className="rise" spine="#C9A84C">
            <Eyebrow className="text-gold">From the floor</Eyebrow>
            <p className="mt-2 text-sm font-medium text-ink">{tip}</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
