import { useState, useMemo } from 'react';
import { streamClaudeJSON } from '../lib/ai.js';
import { AUDIT_SYSTEM, auditPrompt } from '../lib/prompts.js';
import { addAudit, updateLead } from '../lib/db.js';
import { useDraft } from '../lib/useDraft.js';
import { useCountUp } from '../lib/useCountUp.js';
import {
  Card,
  SectionTitle,
  PageHeader,
  Eyebrow,
  Button,
  Field,
  Input,
  Select,
  Spinner,
  ErrorBanner,
  CopyBlock,
  Money,
} from '../components/ui.jsx';

const fmt = (n) => '$' + (Number(n) || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });

export default function StatementAudit({ leads, refresh }) {
  const [form, setForm, clearDraft] = useDraft('statement-audit', {
    leadId: '',
    businessName: '',
    processor: '',
    volume: '',
    fees: '',
    monthlyFee: '',
    perTxnFee: '',
    pciFee: '',
    batchFee: '',
    otherFees: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Auto effective rate = fees / volume * 100.
  const effectiveRate = useMemo(() => {
    const v = parseFloat(form.volume);
    const f = parseFloat(form.fees);
    if (!v || !f) return null;
    return (f / v) * 100;
  }, [form.volume, form.fees]);

  // The gap in basis points — the line that closes the deal.
  const bps = useMemo(() => {
    if (effectiveRate == null || result?.mpg_estimated_rate == null) return null;
    return Math.round((effectiveRate - Number(result.mpg_estimated_rate)) * 100);
  }, [effectiveRate, result]);

  const monthly = useCountUp(result?.monthly_savings, !!result);
  const annual = useCountUp(result?.annual_savings, !!result);

  const onPickLead = (id) => {
    const lead = leads.find((l) => l.id === id);
    setForm({
      ...form,
      leadId: id,
      businessName: lead ? lead.business_name : form.businessName,
      processor: lead?.current_processor || form.processor,
      volume: lead?.monthly_volume ? String(lead.monthly_volume) : form.volume,
    });
  };

  const runAudit = async () => {
    setError('');
    setResult(null);
    setSaved(false);
    if (!form.volume || !form.fees) {
      setError('Enter monthly volume and total fees to run the audit.');
      return;
    }
    setBusy(true);
    try {
      const data = await streamClaudeJSON({
        system: AUDIT_SYSTEM,
        user: auditPrompt({
          processor: form.processor,
          volume: form.volume,
          fees: form.fees,
          effectiveRate: effectiveRate ? effectiveRate.toFixed(2) : 'unknown',
          monthlyFee: form.monthlyFee,
          perTxnFee: form.perTxnFee,
          pciFee: form.pciFee,
          batchFee: form.batchFee,
          otherFees: form.otherFees,
        }),
      });
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const saveToLead = async () => {
    setSaveError('');
    if (!result) return;
    try {
      const audit = {
        lead_id: form.leadId || null,
        current_processor: form.processor || null,
        current_effective_rate: effectiveRate ? Number(effectiveRate.toFixed(2)) : null,
        monthly_volume: parseFloat(form.volume) || null,
        current_monthly_cost: parseFloat(form.fees) || null,
        mpg_estimated_cost: result.mpg_estimated_cost ?? null,
        monthly_savings: result.monthly_savings ?? null,
        annual_savings: result.annual_savings ?? null,
        audit_summary: result.summary || null,
      };
      await addAudit(audit);

      // Keep the lead record in sync if one is selected.
      if (form.leadId) {
        await updateLead(form.leadId, {
          current_processor: form.processor || null,
          monthly_volume: parseFloat(form.volume) || null,
          effective_rate: effectiveRate ? Number(effectiveRate.toFixed(2)) : null,
          estimated_monthly_savings: result.monthly_savings ?? null,
          source: 'statement_audit',
        });
        if (refresh) await refresh();
      }
      setSaved(true);
    } catch (e) {
      setSaveError(e.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rise">
        <PageHeader
          eyebrow="Statement audit"
          title="Statement audit"
          sub="Enter their numbers. Show them what they're leaving on the table."
        />
      </div>

      <Card className="rise">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Lead (optional)">
            <Select value={form.leadId} onChange={(e) => onPickLead(e.target.value)}>
              <option value="">— Select a lead —</option>
              {leads.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.business_name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Business name">
            <Input
              value={form.businessName}
              onChange={(e) => setForm({ ...form, businessName: e.target.value })}
              placeholder="Joe's Diner"
            />
          </Field>
          <Field label="Current processor">
            <Input
              value={form.processor}
              onChange={(e) => setForm({ ...form, processor: e.target.value })}
              placeholder="Square, Stripe, Toast…"
            />
          </Field>
          <Field label="Monthly volume ($)">
            <Input
              type="number"
              value={form.volume}
              onChange={(e) => setForm({ ...form, volume: e.target.value })}
              placeholder="45000"
            />
          </Field>
          <Field label="Total fees last month ($)">
            <Input
              type="number"
              value={form.fees}
              onChange={(e) => setForm({ ...form, fees: e.target.value })}
              placeholder="1450"
            />
          </Field>
          <Field label="Current effective rate" hint="Auto-calculated from fees ÷ volume">
            <div className="flex items-center rounded-lg border border-line bg-bg px-3 py-2 font-mono tnum text-sm font-bold text-navy">
              {effectiveRate ? `${effectiveRate.toFixed(2)}%` : '—'}
            </div>
          </Field>
        </div>

        <div className="mt-4 border-t border-line pt-4">
          <Eyebrow className="text-ink/45">Fee breakdown (optional)</Eyebrow>
          <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {[
              ['monthlyFee', 'Monthly fee'],
              ['perTxnFee', 'Per-txn fee'],
              ['pciFee', 'PCI fee'],
              ['batchFee', 'Batch fee'],
              ['otherFees', 'Other fees'],
            ].map(([key, label]) => (
              <Field key={key} label={label}>
                <Input
                  type="number"
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  placeholder="$"
                />
              </Field>
            ))}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <Button variant="gold" onClick={runAudit} disabled={busy}>
            {busy ? 'Auditing…' : 'Run audit'}
          </Button>
          <button
            onClick={() => {
              clearDraft();
              setResult(null);
              setError('');
            }}
            className="text-xs font-medium text-ink/50 hover:underline"
          >
            Clear
          </button>
        </div>
        {busy && (
          <div className="mt-3">
            <Spinner label="Reading the statement…" />
          </div>
        )}
        <div className="mt-3">
          <ErrorBanner message={error} />
        </div>
      </Card>

      {result && (
        <div className="space-y-6">
          {/* Signature: the statement panel — savings totaled like a receipt. */}
          <div className="rise overflow-hidden rounded-xl bg-navy-deep shadow-md">
            <div className="ledger-rule receipt-edge px-6 pb-9 pt-6">
              <div className="flex items-center justify-between">
                <Eyebrow className="text-gold">The gap</Eyebrow>
                {form.businessName && (
                  <span className="font-mono text-xs text-white/40">{form.businessName}</span>
                )}
              </div>

              <div className="mt-5 grid gap-6 sm:grid-cols-2">
                <div>
                  <div className="text-xs uppercase tracking-wide text-white/45">
                    They save monthly
                  </div>
                  <div className="mt-1 font-mono tnum text-4xl font-bold text-gold-bright sm:text-5xl">
                    {fmt(monthly)}
                  </div>
                </div>
                <div className="sm:border-l sm:border-white/10 sm:pl-6">
                  <div className="text-xs uppercase tracking-wide text-white/45">
                    They save a year
                  </div>
                  <div className="mt-1 font-mono tnum text-4xl font-bold text-gold-bright sm:text-5xl">
                    {fmt(annual)}
                  </div>
                </div>
              </div>

              {bps != null && (
                <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-white/10 pt-4">
                  <span className="text-xs uppercase tracking-wide text-white/45">Effective rate</span>
                  <span className="font-mono tnum text-sm text-white/80">
                    {effectiveRate.toFixed(2)}%
                    <span className="mx-2 text-white/30">→</span>
                    {Number(result.mpg_estimated_rate).toFixed(2)}%
                  </span>
                  {bps > 0 && (
                    <span className="font-mono tnum rounded-md bg-gold/15 px-2 py-0.5 text-sm font-bold text-gold-bright">
                      −{bps} bps
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Comparison table */}
          <Card className="rise">
            <SectionTitle className="mb-3">Current vs MPG</SectionTitle>
            <div className="overflow-hidden rounded-lg border border-line">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-bg text-left text-xs uppercase tracking-wide text-ink/50">
                    <th className="px-3 py-2 font-semibold"></th>
                    <th className="px-3 py-2 font-semibold">Current ({form.processor || 'theirs'})</th>
                    <th className="px-3 py-2 font-semibold text-navy">MPG</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  <tr>
                    <td className="px-3 py-2.5 font-medium text-ink/70">Effective rate</td>
                    <td className="px-3 py-2.5 font-mono tnum text-ink/70">
                      {effectiveRate ? `${effectiveRate.toFixed(2)}%` : '—'}
                    </td>
                    <td className="px-3 py-2.5 font-mono tnum font-bold text-navy">
                      {result.mpg_estimated_rate ? `${result.mpg_estimated_rate}%` : '—'}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2.5 font-medium text-ink/70">Monthly cost</td>
                    <td className="px-3 py-2.5 font-mono tnum text-ink/70">{fmt(form.fees)}</td>
                    <td className="px-3 py-2.5 font-mono tnum font-bold text-navy">
                      {fmt(result.mpg_estimated_cost)}
                    </td>
                  </tr>
                  <tr className="bg-win/5">
                    <td className="px-3 py-2.5 font-semibold text-ink">Monthly savings</td>
                    <td className="px-3 py-2.5 text-ink/40">—</td>
                    <td className="px-3 py-2.5">
                      <Money value={result.monthly_savings} sign className="font-bold text-win" />
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2.5 font-medium text-ink/70">Recommended package</td>
                    <td className="px-3 py-2.5 text-ink/40">—</td>
                    <td className="px-3 py-2.5 font-semibold text-navy">
                      {result.recommended_package || '—'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Junk fees + BuyFin flags */}
            {Array.isArray(result.junk_fees) && result.junk_fees.length > 0 && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3">
                <Eyebrow className="text-red-700">Junk fees flagged</Eyebrow>
                <ul className="mt-1.5 list-inside list-disc text-sm text-red-700">
                  {result.junk_fees.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              </div>
            )}
            {result.lead_with_buyfin && (
              <div
                className="mt-3 rounded-lg border border-line bg-gold/10 p-3 text-sm font-medium text-ink"
                style={{ borderLeftColor: '#C9A84C', borderLeftWidth: '3px' }}
              >
                Volume is strong here. Lead with the BuyFin capital offer, then close on payments.
              </div>
            )}
          </Card>

          {/* Summary */}
          <Card className="rise">
            <SectionTitle className="mb-3">Audit summary</SectionTitle>
            <CopyBlock label="Talk track" text={result.summary} />
            <div className="mt-4 flex items-center gap-3">
              <Button variant="primary" onClick={saveToLead} disabled={saved}>
                {saved ? 'Saved ✓' : 'Save audit to lead'}
              </Button>
              {!form.leadId && !saved && (
                <span className="text-xs text-ink/50">
                  Saved on its own. Pick a lead above to link it.
                </span>
              )}
            </div>
            <div className="mt-2">
              <ErrorBanner message={saveError} />
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
