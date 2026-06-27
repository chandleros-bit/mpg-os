import { useState, useEffect, useMemo } from 'react';
import { listCallsSince } from '../lib/db.js';
import { streamClaudeJSON } from '../lib/ai.js';
import { REVIEW_SYSTEM, weeklyReviewPrompt } from '../lib/prompts.js';
import { daysSince } from '../lib/useLeads.js';
import { useDraft } from '../lib/useDraft.js';
import {
  Card,
  SectionTitle,
  Button,
  Field,
  Textarea,
  Spinner,
  ErrorBanner,
} from '../components/ui.jsx';

const ACTIVE_STATUSES = ['new', 'contacted', 'demo_scheduled', 'proposal_sent'];

export default function WeeklyReview({ leads }) {
  const [calls, setCalls] = useState([]);
  const [form, setForm] = useDraft('weekly-review', { extra: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [review, setReview] = useState(null);

  const weekAgo = useMemo(() => new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10), []);
  const monthAgo = useMemo(() => new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10), []);

  useEffect(() => {
    listCallsSince(monthAgo)
      .then(setCalls)
      .catch(() => setCalls([]));
  }, [monthAgo, leads]);

  // This-week scoreboard.
  const stats = useMemo(() => {
    const weekCalls = calls.filter((c) => c.call_date >= weekAgo);
    const demos = weekCalls.filter((c) => c.outcome === 'demo_booked').length;
    const proposals = leads.filter(
      (l) => l.status === 'proposal_sent' && daysSince(l.updated_at) <= 7
    ).length;
    const closed = leads.filter(
      (l) => l.status === 'closed_won' && daysSince(l.updated_at) <= 7
    ).length;
    return { calls: weekCalls.length, demos, proposals, closed };
  }, [calls, leads, weekAgo]);

  // Last call per lead, for stale detection.
  const staleLeads = useMemo(() => {
    const lastCall = {};
    for (const c of calls) {
      if (!lastCall[c.lead_id] || c.call_date > lastCall[c.lead_id]) lastCall[c.lead_id] = c.call_date;
    }
    return leads
      .filter((l) => ACTIVE_STATUSES.includes(l.status))
      .filter((l) => daysSince(lastCall[l.id] || l.created_at) >= 3);
  }, [calls, leads]);

  const run = async () => {
    setError('');
    setReview(null);
    setBusy(true);
    try {
      const data = await streamClaudeJSON({
        system: REVIEW_SYSTEM,
        user: weeklyReviewPrompt({ stats, staleLeads, extra: form.extra }),
      });
      setReview(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const board = [
    { label: 'Calls logged', value: stats.calls, color: '#169DD1' },
    { label: 'Demos booked', value: stats.demos, color: '#1B2B5E' },
    { label: 'Proposals sent', value: stats.proposals, color: '#C9A84C' },
    { label: 'Deals closed', value: stats.closed, color: '#1f9d55' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-navy">Weekly Review</h1>
        <p className="text-sm text-ink/60">Your week by the numbers, plus a plan for Monday.</p>
      </div>

      {/* Scoreboard */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {board.map((b) => (
          <Card key={b.label} className="text-center">
            <div className="text-3xl font-extrabold" style={{ color: b.color }}>
              {b.value}
            </div>
            <div className="mt-1 text-xs font-medium text-ink/60">{b.label}</div>
          </Card>
        ))}
      </div>

      <Card>
        <Field label="Anything else to add about your week? (optional)">
          <Textarea
            value={form.extra}
            onChange={(e) => setForm({ ...form, extra: e.target.value })}
            placeholder="Two big restaurants are warm, lost one to a contract..."
          />
        </Field>
        <div className="mt-4">
          <Button variant="gold" onClick={run} disabled={busy}>
            {busy ? 'Reviewing...' : 'Get Weekly Review'}
          </Button>
        </div>
        {busy && (
          <div className="mt-3">
            <Spinner />
          </div>
        )}
        <div className="mt-3">
          <ErrorBanner message={error} />
        </div>
      </Card>

      {review && (
        <Card className="space-y-4">
          <Block title="What went well" body={review.performance_summary} />
          <Block title="One thing to improve" body={review.one_improvement} accent />

          {Array.isArray(review.priority_leads) && review.priority_leads.length > 0 && (
            <div>
              <div className="text-xs font-bold uppercase tracking-wide text-accent">
                Priority leads
              </div>
              <ul className="mt-1 list-inside list-disc text-sm text-ink">
                {review.priority_leads.map((l, i) => (
                  <li key={i}>{l}</li>
                ))}
              </ul>
            </div>
          )}

          {Array.isArray(review.monday_plan) && (
            <div>
              <div className="text-xs font-bold uppercase tracking-wide text-accent">
                Monday plan
              </div>
              <ol className="mt-1 list-inside list-decimal text-sm text-ink">
                {review.monday_plan.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ol>
            </div>
          )}

          <div className="rounded-lg bg-navy p-4 text-sm font-medium text-white">
            {review.motivational_close}
          </div>
        </Card>
      )}
    </div>
  );
}

function Block({ title, body, accent }) {
  return (
    <div>
      <div
        className={`text-xs font-bold uppercase tracking-wide ${accent ? 'text-gold' : 'text-accent'}`}
      >
        {title}
      </div>
      <p className="mt-1 text-sm text-ink">{body}</p>
    </div>
  );
}
