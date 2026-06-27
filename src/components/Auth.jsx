import { useState } from 'react';
import { supabase, supabaseConfigured } from '../lib/supabase.js';
import { Button, Input, Field, ErrorBanner } from './ui.jsx';

// Email/password sign-in screen. Shown until a Supabase session exists.
export default function Auth() {
  const [mode, setMode] = useState('signin'); // signin | signup
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');
    if (!supabaseConfigured) {
      setError('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setNotice('Account created. If email confirmation is on, check your inbox, then sign in.');
        setMode('signin');
      }
    } catch (err) {
      setError(err.message || 'Sign in failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-7 shadow-xl">
        <div className="mb-6 text-center">
          <div className="text-2xl font-extrabold text-navy">
            MPG <span className="text-gold">OS</span>
          </div>
          <p className="mt-1 text-sm text-ink/60">Media Payments Group sales dashboard</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <Field label="Email">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@mediapaymentsgroup.com"
              required
            />
          </Field>
          <Field label="Password">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </Field>

          <ErrorBanner message={error} />
          {notice && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {notice}
            </div>
          )}

          <Button type="submit" variant="gold" className="w-full" disabled={busy}>
            {busy ? 'Working...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
          </Button>
        </form>

        <button
          onClick={() => {
            setMode(mode === 'signin' ? 'signup' : 'signin');
            setError('');
            setNotice('');
          }}
          className="mt-4 w-full text-center text-xs font-medium text-accent hover:underline"
        >
          {mode === 'signin' ? "Need an account? Create one" : 'Have an account? Sign in'}
        </button>
      </div>
    </div>
  );
}
