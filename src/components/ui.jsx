import { useState } from 'react';
import { STATUS_META, STATUS_ORDER } from '../lib/colors.js';

// ---- Button ---------------------------------------------------------------
export function Button({ variant = 'primary', className = '', children, ...props }) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed';
  const variants = {
    primary: 'bg-navy text-white hover:bg-navy-deep',
    gold: 'bg-gold text-ink hover:bg-gold-bright shadow-sm',
    accent: 'bg-accent text-white hover:bg-accent-deep',
    ghost: 'bg-white text-navy border border-line hover:bg-bg',
    subtle: 'bg-light text-navy hover:brightness-95',
  };
  return (
    <button className={`${base} ${variants[variant] || variants.primary} ${className}`} {...props}>
      {children}
    </button>
  );
}

// ---- Card -----------------------------------------------------------------
// `spine` paints a colored left edge keyed to meaning (status, win/loss).
export function Card({ className = '', spine, children, ...props }) {
  const spineStyle = spine ? { borderLeftColor: spine, borderLeftWidth: '3px' } : undefined;
  return (
    <div
      className={`rounded-xl border border-line bg-white p-5 shadow-sm ${className}`}
      style={spineStyle}
      {...props}
    >
      {children}
    </div>
  );
}

// ---- Headings -------------------------------------------------------------
export function Eyebrow({ children, className = '' }) {
  return (
    <span
      className={`font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-accent ${className}`}
    >
      {children}
    </span>
  );
}

export function SectionTitle({ children, className = '' }) {
  return (
    <h2 className={`font-display text-lg font-bold tracking-tight text-navy ${className}`}>
      {children}
    </h2>
  );
}

// Page-level header: a mono eyebrow categorizes the screen, the display title
// names it. Optional actions sit to the right on wide screens.
export function PageHeader({ eyebrow, title, sub, actions }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h1 className="mt-1.5 font-display text-3xl font-bold tracking-tight text-navy">{title}</h1>
        {sub && <p className="mt-1 text-sm text-ink/55">{sub}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

// ---- Money ----------------------------------------------------------------
// Every dollar figure runs through here so they all share the ledger hand.
export function Money({ value, className = '', sign = false }) {
  const n = Number(value) || 0;
  const str =
    (sign && n > 0 ? '+' : '') +
    '$' +
    Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 0 });
  return <span className={`font-mono tnum ${className}`}>{str}</span>;
}

// ---- Funnel bar -----------------------------------------------------------
// The pipeline as one proportional bar — its shape is the deal flow at a glance.
export function FunnelBar({ counts }) {
  const stages = STATUS_ORDER.filter((s) => s !== 'closed_lost');
  const total = stages.reduce((sum, s) => sum + (counts[s] || 0), 0);
  const lost = counts.closed_lost || 0;

  return (
    <div>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-line">
        {total === 0
          ? null
          : stages.map((s) => {
              const c = counts[s] || 0;
              if (c === 0) return null;
              return (
                <div
                  key={s}
                  className="h-full"
                  style={{ width: `${(c / total) * 100}%`, backgroundColor: STATUS_META[s].bg }}
                  title={`${STATUS_META[s].label}: ${c}`}
                />
              );
            })}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
        {stages.map((s) => (
          <div key={s} className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: STATUS_META[s].bg }}
            />
            <span className="text-xs text-ink/60">{STATUS_META[s].label}</span>
            <span className="font-mono tnum text-xs font-bold text-ink">{counts[s] || 0}</span>
          </div>
        ))}
        {lost > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-loss" />
            <span className="text-xs text-ink/45">Lost</span>
            <span className="font-mono tnum text-xs font-bold text-ink/45">{lost}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Form fields ----------------------------------------------------------
export function Field({ label, children, hint }) {
  return (
    <label className="block">
      {label && <span className="mb-1 block text-sm font-medium text-ink/80">{label}</span>}
      {children}
      {hint && <span className="mt-1 block text-xs text-ink/50">{hint}</span>}
    </label>
  );
}

const inputBase =
  'w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-accent focus:ring-2 focus:ring-accent/20';

export function Input(props) {
  return <input {...props} className={`${inputBase} ${props.className || ''}`} />;
}

export function Textarea(props) {
  return <textarea {...props} className={`${inputBase} min-h-[96px] ${props.className || ''}`} />;
}

export function Select({ children, ...props }) {
  return (
    <select {...props} className={`${inputBase} ${props.className || ''}`}>
      {children}
    </select>
  );
}

// ---- Spinner --------------------------------------------------------------
export function Spinner({ label = 'Thinking...' }) {
  return (
    <div className="flex items-center gap-3 text-sm text-ink/70">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      {label}
    </div>
  );
}

// ---- Status badge ---------------------------------------------------------
export function StatusBadge({ status }) {
  const meta = STATUS_META[status] || { label: status, bg: '#e3e6ec', text: '#6b7280' };
  return (
    <span
      className="inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold"
      style={{ backgroundColor: meta.bg, color: meta.text }}
    >
      {meta.label}
    </span>
  );
}

export function ScoreBadge({ score }) {
  const n = Number(score) || 0;
  let bg = '#e3e6ec';
  let text = '#6b7280';
  if (n >= 8) {
    bg = '#1F9D55';
    text = '#fff';
  } else if (n >= 5) {
    bg = '#C9A84C';
    text = '#1A1A2E';
  } else if (n > 0) {
    bg = '#BFEAF5';
    text = '#1B2B5E';
  }
  return (
    <span
      className="inline-flex h-8 w-8 items-center justify-center rounded-full font-mono tnum text-sm font-bold"
      style={{ backgroundColor: bg, color: text }}
      title="Lead score 1-10"
    >
      {n || '?'}
    </span>
  );
}

// ---- Copy button ----------------------------------------------------------
export function CopyButton({ text, label = 'Copy', className = '' }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };
  return (
    <button
      onClick={copy}
      className={`rounded-md border border-line bg-white px-2.5 py-1 text-xs font-semibold text-navy transition hover:bg-bg ${className}`}
    >
      {copied ? 'Copied' : label}
    </button>
  );
}

// ---- Error / empty banners ------------------------------------------------
export function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
      {message}
    </div>
  );
}

export function Empty({ children }) {
  return <div className="py-8 text-center text-sm text-ink/50">{children}</div>;
}

// ---- Modal ----------------------------------------------------------------
export function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <SectionTitle>{title}</SectionTitle>
          <button onClick={onClose} className="text-2xl leading-none text-ink/40 hover:text-ink">
            &times;
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ---- Copyable text block --------------------------------------------------
export function CopyBlock({ label, text }) {
  return (
    <div className="rounded-lg border border-line bg-bg p-3">
      <div className="mb-1.5 flex items-center justify-between">
        {label && <Eyebrow>{label}</Eyebrow>}
        <CopyButton text={text} />
      </div>
      <p className="whitespace-pre-wrap text-sm text-ink">{text}</p>
    </div>
  );
}
