import { useState } from 'react';
import { streamClaudeJSON } from '../lib/ai.js';
import { DRIP_SYSTEM, dripPrompt } from '../lib/prompts.js';
import { useDraft } from '../lib/useDraft.js';
import {
  Card,
  SectionTitle,
  Button,
  Field,
  Input,
  Select,
  Spinner,
  ErrorBanner,
  CopyButton,
} from '../components/ui.jsx';

const SEQUENCES = [
  { value: 'post_meeting', label: 'Post-Meeting' },
  { value: 'statement_followup', label: 'Statement Audit Follow-Up' },
  { value: 'no_response', label: 'No Response Nurture' },
  { value: 'final_attempt', label: 'Final Attempt' },
];

export default function EmailDrip({ leads }) {
  const [form, setForm, clearDraft] = useDraft('email-drip', {
    leadId: '',
    sequenceType: 'post_meeting',
    discussed: '',
    nextStep: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [emails, setEmails] = useState(null);

  const lead = leads.find((l) => l.id === form.leadId);

  const generate = async () => {
    setError('');
    setEmails(null);
    setBusy(true);
    try {
      const data = await streamClaudeJSON({
        system: DRIP_SYSTEM,
        user: dripPrompt({
          businessName: lead?.business_name,
          vertical: lead?.vertical,
          sequenceType: form.sequenceType,
          discussed: form.discussed,
          nextStep: form.nextStep,
        }),
        maxTokens: 1000,
      });
      setEmails(Array.isArray(data.emails) ? data.emails : []);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-navy">Email Drip</h1>
        <p className="text-sm text-ink/60">A 4-touch follow-up sequence that sounds like you wrote it.</p>
      </div>

      <Card>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Lead">
            <Select value={form.leadId} onChange={(e) => setForm({ ...form, leadId: e.target.value })}>
              <option value="">— Select a lead —</option>
              {leads.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.business_name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Sequence type">
            <Select
              value={form.sequenceType}
              onChange={(e) => setForm({ ...form, sequenceType: e.target.value })}
            >
              {SEQUENCES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Key thing discussed">
            <Input
              value={form.discussed}
              onChange={(e) => setForm({ ...form, discussed: e.target.value })}
              placeholder="Held funds on Square"
            />
          </Field>
          <Field label="Agreed next step">
            <Input
              value={form.nextStep}
              onChange={(e) => setForm({ ...form, nextStep: e.target.value })}
              placeholder="Send their statement for an audit"
            />
          </Field>
        </div>
        {lead && (
          <div className="mt-3 text-xs text-ink/50">
            Tailoring for {lead.business_name}
            {lead.vertical ? ` · ${lead.vertical}` : ''}
          </div>
        )}
        <div className="mt-4 flex items-center gap-3">
          <Button variant="gold" onClick={generate} disabled={busy}>
            {busy ? 'Writing...' : 'Generate Sequence'}
          </Button>
          <button
            onClick={() => {
              clearDraft();
              setEmails(null);
            }}
            className="text-xs font-medium text-ink/50 hover:underline"
          >
            Clear
          </button>
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

      {emails && emails.length > 0 && (
        <div className="space-y-4">
          {emails.map((em, i) => (
            <Card key={i}>
              <div className="mb-2 flex items-center justify-between">
                <span className="rounded-full bg-light px-2.5 py-0.5 text-xs font-bold text-navy">
                  Day {em.day}
                </span>
                <CopyButton text={`Subject: ${em.subject}\n\n${em.body}`} label="Copy email" />
              </div>
              <div className="text-sm font-bold text-navy">{em.subject}</div>
              <p className="mt-1.5 whitespace-pre-wrap text-sm text-ink">{em.body}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
