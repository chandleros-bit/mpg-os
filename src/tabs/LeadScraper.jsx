import { useState } from 'react';
import { searchPlaces } from '../lib/places.js';
import { streamClaudeJSON } from '../lib/ai.js';
import { SCORE_SYSTEM, scorePrompt } from '../lib/prompts.js';
import { addLead } from '../lib/db.js';
import { useDraft } from '../lib/useDraft.js';
import { VERTICALS } from '../lib/colors.js';
import {
  Card,
  SectionTitle,
  Button,
  Field,
  Input,
  Select,
  Spinner,
  ErrorBanner,
  ScoreBadge,
  Empty,
} from '../components/ui.jsx';

export default function LeadScraper({ refresh }) {
  const [form, setForm] = useDraft('lead-scraper', {
    location: '',
    vertical: 'restaurant',
    radius: '5',
    llcBlitz: false,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState([]);
  const [added, setAdded] = useState({}); // place_id -> true

  const buildQuery = () => {
    const v = form.vertical;
    const where = form.location.trim();
    if (form.llcBlitz) {
      return `newly opened ${v} businesses in ${where}`;
    }
    return `${v} in ${where} within ${form.radius} miles`;
  };

  const scrape = async () => {
    setError('');
    setResults([]);
    setAdded({});
    if (!form.location.trim()) {
      setError('Enter a city or ZIP code first.');
      return;
    }
    setBusy(true);
    try {
      const places = await searchPlaces(buildQuery());
      if (places.length === 0) {
        setError('No businesses found. Try a broader area or a different vertical.');
        setBusy(false);
        return;
      }
      // Show unscored results immediately, then fill in scores as they return.
      setResults(places.map((p) => ({ ...p, vertical: form.vertical, scoring: true })));

      const scored = await Promise.all(
        places.map(async (p) => {
          try {
            const s = await streamClaudeJSON({
              system: SCORE_SYSTEM,
              user: scorePrompt({ ...p, vertical: form.vertical }),
              maxTokens: 400,
            });
            return {
              ...p,
              scoring: false,
              score: s.score,
              estimated_monthly_volume: s.estimated_monthly_volume,
              vertical: s.vertical || form.vertical,
              reasoning: s.reasoning,
              suggested_opener: s.suggested_opener,
            };
          } catch {
            return { ...p, scoring: false, score: null, vertical: form.vertical };
          }
        })
      );
      // Highest score first.
      scored.sort((a, b) => (b.score || 0) - (a.score || 0));
      setResults(scored);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const addToPipeline = async (place) => {
    try {
      await addLead({
        business_name: place.name,
        phone: place.phone,
        address: place.address,
        vertical: place.vertical,
        lead_score: place.score || null,
        monthly_volume: place.estimated_monthly_volume || null,
        notes: place.suggested_opener ? `Opener: ${place.suggested_opener}` : null,
        status: 'new',
        source: 'scraper',
      });
      setAdded((prev) => ({ ...prev, [place.place_id || place.name]: true }));
      if (refresh) await refresh();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-navy">Lead Scraper</h1>
        <p className="text-sm text-ink/60">Find prospects, score them, and load your pipeline.</p>
      </div>

      <Card>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="City or ZIP">
            <Input
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="Houston TX"
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
          <Field label="Radius (miles)">
            <Input
              type="number"
              value={form.radius}
              onChange={(e) => setForm({ ...form, radius: e.target.value })}
              placeholder="5"
            />
          </Field>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4">
          <Button variant="gold" onClick={scrape} disabled={busy}>
            {busy ? 'Scraping...' : 'Scrape Leads'}
          </Button>
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-ink/80">
            <input
              type="checkbox"
              checked={form.llcBlitz}
              onChange={(e) => setForm({ ...form, llcBlitz: e.target.checked })}
              className="h-4 w-4 accent-[#C9A84C]"
            />
            New LLC Blitz
            <span className="text-xs text-ink/40">(target newly opened businesses)</span>
          </label>
        </div>
        {busy && (
          <div className="mt-3">
            <Spinner label="Searching and scoring leads..." />
          </div>
        )}
        <div className="mt-3">
          <ErrorBanner message={error} />
        </div>
      </Card>

      {results.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {results.map((r) => {
            const key = r.place_id || r.name;
            const isAdded = added[key];
            return (
              <Card key={key}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-bold text-navy">{r.name}</div>
                    <div className="mt-0.5 text-xs text-ink/50">{r.address}</div>
                    <div className="mt-1 text-xs text-ink/60">
                      {r.phone || 'no phone'}
                      {r.rating ? ` · ★ ${r.rating} (${r.reviews})` : ''}
                    </div>
                    <div className="mt-1 inline-block rounded-full bg-light px-2 py-0.5 text-xs font-semibold text-navy">
                      {r.vertical}
                    </div>
                  </div>
                  <div className="shrink-0 text-center">
                    {r.scoring ? (
                      <span className="text-xs text-ink/40">scoring...</span>
                    ) : (
                      <ScoreBadge score={r.score} />
                    )}
                  </div>
                </div>

                {r.estimated_monthly_volume ? (
                  <div className="mt-2 text-xs text-ink/60">
                    Est. volume: ${Number(r.estimated_monthly_volume).toLocaleString()}/mo
                  </div>
                ) : null}
                {r.suggested_opener && (
                  <div className="mt-2 rounded-lg bg-bg p-2 text-xs italic text-ink/70">
                    “{r.suggested_opener}”
                  </div>
                )}

                <div className="mt-3">
                  <Button
                    variant={isAdded ? 'ghost' : 'primary'}
                    onClick={() => !isAdded && addToPipeline(r)}
                    disabled={isAdded}
                    className="w-full"
                  >
                    {isAdded ? 'Added ✓' : 'Add to Pipeline'}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
