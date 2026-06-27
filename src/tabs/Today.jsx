import { useState, useEffect, useMemo } from 'react';
import { addLead, listCallsSince } from '../lib/db.js';
import { daysSince } from '../lib/useLeads.js';
import { STATUS_ORDER, STATUS_META, VERTICALS } from '../lib/colors.js';
import { useDraft } from '../lib/useDraft.js';
import {
  Card,
  SectionTitle,
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
      setSaveError('Business name is required.');
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
      <div>
        <h1 className="text-2xl font-extrabold text-navy">Today</h1>
        <p className="text-sm text-ink/60">Your daily focus. Work the cold ones first.</p>
      </div>

      {/* Pipeline counts */}
      <Card>
        <SectionTitle className="mb-3">Pipeline</SectionTitle>
        {loading ? (
          <Empty>Loading pipeline...</Empty>
        ) : (
          <div className="flex flex-wrap gap-2">
            {STATUS_ORDER.map((s) => (
              <div
                key={s}
                className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2"
              >
                <span
                  className="inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-sm font-bold"
                  style={{ backgroundColor: STATUS_META[s].bg, color: STATUS_META[s].text }}
                >
                  {counts[s]}
                </span>
                <span className="text-xs font-medium text-ink/70">{STATUS_META[s].label}</span>
              </div>
            ))}
          </div>
        )}
        <ErrorBanner message={error} />
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Call list */}
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <SectionTitle>Call Today</SectionTitle>
            <span className="rounded-full bg-light px-2.5 py-0.5 text-xs font-bold text-navy">
              {toCall.length}
            </span>
          </div>
          <p className="mb-3 text-xs text-ink/50">New or contacted leads with no call in 3+ days.</p>
          {toCall.length === 0 ? (
            <Empty>Nobody is cold right now. Go scrape fresh leads.</Empty>
          ) : (
            <ul className="space-y-2">
              {toCall.slice(0, 12).map((l) => (
                <li
                  key={l.id}
                  className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-ink">{l.business_name}</div>
                    <div className="truncate text-xs text-ink/50">
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
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <SectionTitle>Demos Booked Today</SectionTitle>
            <span className="rounded-full bg-gold px-2.5 py-0.5 text-xs font-bold text-ink">
              {demosToday.length}
            </span>
          </div>
          {demosToday.length === 0 ? (
            <Empty>No demos booked today yet. Go book one.</Empty>
          ) : (
            <ul className="space-y-2">
              {demosToday.map((l) => (
                <li key={l.id} className="rounded-lg border border-slate-100 px-3 py-2">
                  <div className="text-sm font-semibold text-ink">{l.business_name}</div>
                  <div className="text-xs text-ink/50">{l.phone || 'no phone'}</div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Quick add */}
        <Card>
          <SectionTitle className="mb-3">Quick Add Lead</SectionTitle>
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
              {saving ? 'Adding...' : 'Add to Pipeline'}
            </Button>
          </form>
        </Card>

        {/* CTA + tip */}
        <div className="space-y-6">
          <Card className="bg-navy text-white">
            <SectionTitle className="mb-1 text-white">Highest-converting move</SectionTitle>
            <p className="mb-4 text-sm text-white/70">
              A statement on the table closes faster than any pitch. Run the numbers.
            </p>
            <Button variant="gold" onClick={() => goToTab('audit')}>
              Run Statement Audit →
            </Button>
          </Card>

          <Card>
            <div className="mb-1 text-xs font-bold uppercase tracking-wide text-gold">
              Closer tip of the day
            </div>
            <p className="text-sm font-medium text-ink">{tip}</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
