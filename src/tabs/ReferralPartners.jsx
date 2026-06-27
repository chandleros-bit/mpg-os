import { useState, useEffect } from 'react';
import { listPartners, addPartner, updatePartner } from '../lib/db.js';
import { streamClaude } from '../lib/ai.js';
import { PARTNER_SYSTEM, partnerOutreachPrompt } from '../lib/prompts.js';
import { useDraft } from '../lib/useDraft.js';
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
  Empty,
  Modal,
  CopyButton,
} from '../components/ui.jsx';

const PARTNER_TYPES = [
  { value: 'accountant', label: 'Accountant' },
  { value: 'attorney', label: 'Attorney' },
  { value: 'realtor', label: 'RE Agent' },
  { value: 'equipment_supplier', label: 'Equipment Supplier' },
  { value: 'insurance', label: 'Insurance' },
];

const typeLabel = (v) => PARTNER_TYPES.find((t) => t.value === v)?.label || v;

const TYPE_BADGE = {
  accountant: { bg: '#BFEAF5', text: '#1B2B5E' },
  attorney: { bg: '#1B2B5E', text: '#fff' },
  realtor: { bg: '#169DD1', text: '#fff' },
  equipment_supplier: { bg: '#C9A84C', text: '#1A1A2E' },
  insurance: { bg: '#e3e6ec', text: '#1A1A2E' },
};

export default function ReferralPartners() {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setPartners(await listPartners());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-navy">Referral Partners</h1>
          <p className="text-sm text-ink/60">Your referral network and how to pitch each type.</p>
        </div>
        <Button variant="gold" onClick={() => setModalOpen(true)}>
          + Add Partner
        </Button>
      </div>

      <Card>
        <ErrorBanner message={error} />
        {loading ? (
          <Empty>Loading partners...</Empty>
        ) : partners.length === 0 ? (
          <Empty>No partners yet. Add your first accountant or attorney.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-ink/50">
                  <th className="px-2 py-2">Name</th>
                  <th className="px-2 py-2">Type</th>
                  <th className="px-2 py-2 hidden sm:table-cell">Company</th>
                  <th className="px-2 py-2 hidden sm:table-cell">Phone</th>
                  <th className="px-2 py-2 text-center">Sent</th>
                  <th className="px-2 py-2 text-center">Closed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {partners.map((p) => {
                  const badge = TYPE_BADGE[p.partner_type] || { bg: '#e3e6ec', text: '#1A1A2E' };
                  return (
                    <tr
                      key={p.id}
                      onClick={() => setSelected(p)}
                      className="cursor-pointer hover:bg-bg"
                    >
                      <td className="px-2 py-2 font-semibold text-navy">{p.name}</td>
                      <td className="px-2 py-2">
                        <span
                          className="rounded-full px-2 py-0.5 text-xs font-semibold"
                          style={{ backgroundColor: badge.bg, color: badge.text }}
                        >
                          {typeLabel(p.partner_type)}
                        </span>
                      </td>
                      <td className="px-2 py-2 hidden text-ink/70 sm:table-cell">{p.company || '—'}</td>
                      <td className="px-2 py-2 hidden text-ink/70 sm:table-cell">{p.phone || '—'}</td>
                      <td className="px-2 py-2 text-center">{p.referrals_sent || 0}</td>
                      <td className="px-2 py-2 text-center">{p.deals_closed || 0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <OutreachGenerator />

      <AddPartnerModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={() => {
          setModalOpen(false);
          load();
        }}
      />

      <PartnerDetail
        partner={selected}
        onClose={() => setSelected(null)}
        onUpdated={() => {
          setSelected(null);
          load();
        }}
      />
    </div>
  );
}

// ---- Outreach script generator -------------------------------------------
function OutreachGenerator() {
  const [form, setForm] = useDraft('partner-outreach', {
    partnerType: 'accountant',
    clientProfile: '',
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
        system: PARTNER_SYSTEM,
        user: partnerOutreachPrompt(form),
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
      <SectionTitle className="mb-3">Outreach Script Generator</SectionTitle>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Partner type">
          <Select
            value={form.partnerType}
            onChange={(e) => setForm({ ...form, partnerType: e.target.value })}
          >
            {PARTNER_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Their typical client profile">
          <Input
            value={form.clientProfile}
            onChange={(e) => setForm({ ...form, clientProfile: e.target.value })}
            placeholder="Small restaurants and retail shops"
          />
        </Field>
      </div>
      <div className="mt-4">
        <Button variant="gold" onClick={generate} disabled={busy}>
          {busy ? 'Writing...' : 'Generate Outreach Script'}
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
            <CopyButton text={script} label="Copy script" />
          </div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">{script}</p>
        </div>
      )}
    </Card>
  );
}

// ---- Add partner modal ----------------------------------------------------
function AddPartnerModal({ open, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: '',
    company: '',
    partner_type: 'accountant',
    phone: '',
    email: '',
    notes: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    setError('');
    if (!form.name.trim()) {
      setError('Name is required.');
      return;
    }
    setBusy(true);
    try {
      await addPartner({ ...form, name: form.name.trim() });
      setForm({ name: '', company: '', partner_type: 'accountant', phone: '', email: '', notes: '' });
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Add Referral Partner">
      <div className="space-y-3">
        <Field label="Name">
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Company">
            <Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
          </Field>
          <Field label="Type">
            <Select
              value={form.partner_type}
              onChange={(e) => setForm({ ...form, partner_type: e.target.value })}
            >
              {PARTNER_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Phone">
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Field>
          <Field label="Email">
            <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
        </div>
        <Field label="Notes">
          <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </Field>
        <ErrorBanner message={error} />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="gold" onClick={save} disabled={busy}>
            {busy ? 'Saving...' : 'Save Partner'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ---- Partner detail -------------------------------------------------------
function PartnerDetail({ partner, onClose, onUpdated }) {
  const [sent, setSent] = useState(0);
  const [closed, setClosed] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (partner) {
      setSent(partner.referrals_sent || 0);
      setClosed(partner.deals_closed || 0);
      setError('');
    }
  }, [partner]);

  if (!partner) return null;

  const save = async () => {
    setBusy(true);
    setError('');
    try {
      await updatePartner(partner.id, {
        referrals_sent: Number(sent) || 0,
        deals_closed: Number(closed) || 0,
      });
      onUpdated();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={Boolean(partner)} onClose={onClose} title={partner.name}>
      <div className="space-y-3 text-sm">
        <div className="text-ink/70">
          {typeLabel(partner.partner_type)}
          {partner.company ? ` · ${partner.company}` : ''}
        </div>
        <div className="flex flex-wrap gap-4 text-xs text-ink/60">
          {partner.phone && <span>{partner.phone}</span>}
          {partner.email && <span>{partner.email}</span>}
        </div>
        {partner.notes && (
          <p className="rounded-lg bg-bg p-3 text-sm text-ink/80">{partner.notes}</p>
        )}

        <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
          <Field label="Referrals sent">
            <Input type="number" value={sent} onChange={(e) => setSent(e.target.value)} />
          </Field>
          <Field label="Deals closed">
            <Input type="number" value={closed} onChange={(e) => setClosed(e.target.value)} />
          </Field>
        </div>
        <ErrorBanner message={error} />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button variant="primary" onClick={save} disabled={busy}>
            {busy ? 'Saving...' : 'Update History'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
