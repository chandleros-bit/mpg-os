import { useState } from 'react';
import { streamClaude, streamClaudeJSON } from '../lib/ai.js';
import {
  TALK_TRACK_SYSTEM,
  talkTrackPrompt,
  OBJECTION_SYSTEM,
  objectionPrompt,
} from '../lib/prompts.js';
import { addCall, updateLead } from '../lib/db.js';
import { useDraft } from '../lib/useDraft.js';
import { VERTICALS, CALL_OUTCOMES, OUTCOME_TO_STATUS } from '../lib/colors.js';
import {
  Card,
  SectionTitle,
  Button,
  Field,
  Input,
  Select,
  Textarea,
  Spinner,
  ErrorBanner,
  CopyButton,
} from '../components/ui.jsx';

const QUICK_OBJECTIONS = [
  "We're happy with Square",
  'Your rates seem higher',
  'We need to think about it',
  "We're locked into a contract",
  'Send me info by email',
];

export default function CallCenter({ leads, refresh }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-navy">Call Center</h1>
        <p className="text-sm text-ink/60">Scripts, rebuttals, and call logging in one place.</p>
      </div>
      <TalkTrack />
      <ObjectionHandler />
      <CallLogger leads={leads} refresh={refresh} />
    </div>
  );
}

// ---- A. Talk Track Generator ---------------------------------------------
function TalkTrack() {
  const [form, setForm] = useDraft('talk-track', {
    vertical: 'restaurant',
    processor: 'Square',
    painPoint: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [script, setScript] = useState('');

  const generate = async () => {
    setError('');
    setScript('');
    setBusy(true);
    try {
      await streamClaude({
        system: TALK_TRACK_SYSTEM,
        user: talkTrackPrompt(form),
        onToken: (t) => setScript((s) => s + t),
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <SectionTitle className="mb-3">A · Talk Track Generator</SectionTitle>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Vertical">
          <Select value={form.vertical} onChange={(e) => setForm({ ...form, vertical: e.target.value })}>
            {VERTICALS.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Current processor">
          <Select
            value={form.processor}
            onChange={(e) => setForm({ ...form, processor: e.target.value })}
          >
            {['Square', 'Stripe', 'Toast', 'Clover', 'Other'].map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Pain point (optional)">
          <Input
            value={form.painPoint}
            onChange={(e) => setForm({ ...form, painPoint: e.target.value })}
            placeholder="Held funds, bad support..."
          />
        </Field>
      </div>
      <div className="mt-4">
        <Button variant="gold" onClick={generate} disabled={busy}>
          {busy ? 'Writing...' : 'Generate Talk Track'}
        </Button>
      </div>
      {busy && !script && (
        <div className="mt-3">
          <Spinner />
        </div>
      )}
      <div className="mt-3">
        <ErrorBanner message={error} />
      </div>
      {script && (
        <div className="mt-4 rounded-lg border border-slate-200 bg-bg p-4">
          <div className="mb-2 flex justify-end">
            <CopyButton text={script} label="Copy full script" />
          </div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">{script}</p>
        </div>
      )}
    </Card>
  );
}

// ---- B. Objection Handler -------------------------------------------------
function ObjectionHandler() {
  const [objection, setObjection] = useDraft('objection', { text: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [rebuttals, setRebuttals] = useState(null);

  const handle = async (text) => {
    const value = (text ?? objection.text).trim();
    if (!value) {
      setError('Type an objection or pick a quick one.');
      return;
    }
    setObjection({ text: value });
    setError('');
    setRebuttals(null);
    setBusy(true);
    try {
      const data = await streamClaudeJSON({
        system: OBJECTION_SYSTEM,
        user: objectionPrompt(value),
      });
      setRebuttals(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <SectionTitle className="mb-3">B · Objection Handler</SectionTitle>
      <div className="mb-3 flex flex-wrap gap-2">
        {QUICK_OBJECTIONS.map((q) => (
          <button
            key={q}
            onClick={() => handle(q)}
            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-navy hover:bg-slate-50"
          >
            {q}
          </button>
        ))}
      </div>
      <Field label="Or type the objection">
        <Input
          value={objection.text}
          onChange={(e) => setObjection({ text: e.target.value })}
          placeholder="They said..."
        />
      </Field>
      <div className="mt-3">
        <Button variant="gold" onClick={() => handle()} disabled={busy}>
          {busy ? 'Thinking...' : 'Handle This'}
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
      {rebuttals && (
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            ['Soft', rebuttals.soft, 'border-light'],
            ['Direct', rebuttals.direct, 'border-accent'],
            ['Hard Close', rebuttals.hard, 'border-gold'],
          ].map(([label, body, border]) => (
            <div key={label} className={`rounded-lg border-2 ${border} bg-white p-3`}>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wide text-navy">{label}</span>
                <CopyButton text={body} />
              </div>
              <p className="text-sm text-ink">{body}</p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// ---- C. Call Logger -------------------------------------------------------
function CallLogger({ leads, refresh }) {
  const [form, setForm, clearDraft] = useDraft('call-logger', {
    leadId: '',
    outcome: 'no_answer',
    notes: '',
    talkTrack: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const log = async () => {
    setError('');
    setDone(false);
    if (!form.leadId) {
      setError('Select a lead to log the call against.');
      return;
    }
    setBusy(true);
    try {
      await addCall({
        lead_id: form.leadId,
        outcome: form.outcome,
        notes: form.notes || null,
        talk_track_used: form.talkTrack || null,
      });
      const nextStatus = OUTCOME_TO_STATUS[form.outcome];
      if (nextStatus) await updateLead(form.leadId, { status: nextStatus });
      clearDraft();
      setDone(true);
      if (refresh) await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <SectionTitle className="mb-3">C · Call Logger</SectionTitle>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Lead">
          <Select
            value={form.leadId}
            onChange={(e) => setForm({ ...form, leadId: e.target.value })}
          >
            <option value="">— Select a lead —</option>
            {leads.map((l) => (
              <option key={l.id} value={l.id}>
                {l.business_name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Outcome">
          <Select value={form.outcome} onChange={(e) => setForm({ ...form, outcome: e.target.value })}>
            {CALL_OUTCOMES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="mt-4">
        <Field label="Notes">
          <Textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="What did they say? Next step?"
          />
        </Field>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <Button variant="primary" onClick={log} disabled={busy}>
          {busy ? 'Logging...' : 'Log Call + Update Lead Status'}
        </Button>
        {done && <span className="text-sm font-semibold text-emerald-600">Logged ✓</span>}
      </div>
      <div className="mt-3">
        <ErrorBanner message={error} />
      </div>
    </Card>
  );
}
