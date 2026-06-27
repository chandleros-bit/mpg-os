import { useState } from 'react';
import { STATUS_META } from '../lib/colors.js';

// ---- Button ---------------------------------------------------------------
export function Button({ variant = 'primary', className = '', children, ...props }) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed';
  const variants = {
    primary: 'bg-navy text-white hover:bg-[#16244e]',
    gold: 'bg-gold text-ink hover:brightness-95 shadow-sm',
    accent: 'bg-accent text-white hover:brightness-95',
    ghost: 'bg-white text-navy border border-slate-200 hover:bg-slate-50',
    subtle: 'bg-light text-navy hover:brightness-95',
  };
  return (
    <button className={`${base} ${variants[variant] || variants.primary} ${className}`} {...props}>
      {children}
    </button>
  );
}

// ---- Card -----------------------------------------------------------------
export function Card({ className = '', children }) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function SectionTitle({ children, className = '' }) {
  return <h2 className={`text-lg font-bold text-navy ${className}`}>{children}</h2>;
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
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/20';

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
      className="inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold"
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
    bg = '#1f9d55';
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
      className="inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold"
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
      className={`rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-navy hover:bg-slate-50 ${className}`}
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
    <div className="rounded-lg border border-slate-200 bg-bg p-3">
      <div className="mb-1.5 flex items-center justify-between">
        {label && <span className="text-xs font-bold uppercase tracking-wide text-accent">{label}</span>}
        <CopyButton text={text} />
      </div>
      <p className="whitespace-pre-wrap text-sm text-ink">{text}</p>
    </div>
  );
}
