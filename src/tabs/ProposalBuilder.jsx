import { useState } from 'react';
import { streamClaudeJSON } from '../lib/ai.js';
import { PROPOSAL_SYSTEM, proposalPrompt } from '../lib/prompts.js';
import { useDraft } from '../lib/useDraft.js';
import {
  Card,
  SectionTitle,
  PageHeader,
  Eyebrow,
  Button,
  Field,
  Select,
  Textarea,
  Spinner,
  ErrorBanner,
  CopyBlock,
  CopyButton,
} from '../components/ui.jsx';

export default function ProposalBuilder({ leads }) {
  const [form, setForm, clearDraft] = useDraft('proposal-builder', { leadId: '', notes: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [proposal, setProposal] = useState(null);

  const lead = leads.find((l) => l.id === form.leadId);

  const build = async () => {
    setError('');
    setProposal(null);
    if (!form.notes.trim()) {
      setError('Paste your discovery call notes first.');
      return;
    }
    setBusy(true);
    try {
      const data = await streamClaudeJSON({
        system: PROPOSAL_SYSTEM,
        user: proposalPrompt({
          businessName: lead?.business_name,
          vertical: lead?.vertical,
          notes: form.notes,
        }),
      });
      setProposal(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rise">
        <PageHeader
          eyebrow="Closing"
          title="Proposal builder"
          sub="Turn messy discovery notes into a clean proposal."
        />
      </div>

      <Card className="rise">
        <div className="grid gap-4">
          <Field label="Lead (optional, helps tailor it)">
            <Select value={form.leadId} onChange={(e) => setForm({ ...form, leadId: e.target.value })}>
              <option value="">— Select a lead —</option>
              {leads.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.business_name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Discovery call notes">
            <Textarea
              className="min-h-[160px]"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Owner runs a 2-location taco shop, does about $60k/mo on Square, hates the held funds and no phone support, busy season starts in May..."
            />
          </Field>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <Button variant="gold" onClick={build} disabled={busy}>
            {busy ? 'Building...' : 'Build Proposal'}
          </Button>
          <button
            onClick={() => {
              clearDraft();
              setProposal(null);
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

      {proposal && (
        <Card className="rise">
          <Eyebrow>Proposal</Eyebrow>
          <SectionTitle className="mb-4 mt-1">
            For {lead?.business_name || 'this business'}
          </SectionTitle>

          <div className="grid gap-4 sm:grid-cols-2">
            <Detail label="Recommended package" value={proposal.recommended_package} />
            <Detail label="Recommended hardware" value={proposal.recommended_hardware} />
          </div>

          <div className="mt-4">
            <Eyebrow>Why this package</Eyebrow>
            <p className="mt-1 text-sm text-ink">{proposal.package_justification}</p>
          </div>

          {Array.isArray(proposal.top_features) && (
            <div className="mt-4">
              <Eyebrow>Top 3 features to highlight</Eyebrow>
              <ul className="mt-1 list-inside list-disc text-sm text-ink">
                {proposal.top_features.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-4">
            <CopyBlock label="Pricing summary" text={proposal.pricing_summary} />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Flag on={proposal.offer_promo} onText="Offer HELPMEADVERTISE" offText="Hold the promo" />
            <Flag on={proposal.lead_with_buyfin} onText="Lead with BuyFin capital" offText="Lead with payments" />
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Detail label="Suggested next step" value={proposal.next_step} />
            <Detail label="Follow-up timeline" value={proposal.follow_up_timeline} />
          </div>

          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between">
              <Eyebrow>Draft proposal email</Eyebrow>
              <CopyButton text={proposal.proposal_email} />
            </div>
            <p className="whitespace-pre-wrap rounded-lg border border-line bg-bg p-3 text-sm text-ink">
              {proposal.proposal_email}
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div className="rounded-lg border border-line bg-bg p-3">
      <Eyebrow className="text-ink/45">{label}</Eyebrow>
      <div className="mt-1 text-sm font-semibold text-navy">{value || '—'}</div>
    </div>
  );
}

function Flag({ on, onText, offText }) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${
        on ? 'bg-gold text-ink' : 'bg-bg text-ink/50 border border-line'
      }`}
    >
      {on ? `✓ ${onText}` : offText}
    </span>
  );
}
