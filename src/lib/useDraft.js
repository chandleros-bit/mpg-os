import { useState, useEffect, useRef } from 'react';

// Persist a form's state to localStorage so nothing is lost on refresh.
// Returns [value, setValue, clearDraft] just like useState plus a reset.
//
// key should be unique per form, e.g. "draft:statement-audit".
export function useDraft(key, initial) {
  const storageKey = `mpgos:${key}`;

  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) return { ...initial, ...JSON.parse(raw) };
    } catch {
      /* ignore corrupt drafts */
    }
    return initial;
  });

  // Debounce writes a touch so we are not hammering localStorage on each keypress.
  const timer = useRef(null);
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(value));
      } catch {
        /* storage full or blocked — fail quietly */
      }
    }, 250);
    return () => timer.current && clearTimeout(timer.current);
  }, [storageKey, value]);

  const clearDraft = () => {
    try {
      localStorage.removeItem(storageKey);
    } catch {
      /* ignore */
    }
    setValue(initial);
  };

  return [value, setValue, clearDraft];
}
