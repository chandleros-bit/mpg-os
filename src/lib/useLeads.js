import { useState, useEffect, useCallback } from 'react';
import { listLeads } from './db.js';

// Shared leads loader. Many tabs need the pipeline; this gives them the list,
// a loading flag, an error, and a refresh function.
export function useLeads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setLeads(await listLeads());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { leads, loading, error, refresh, setLeads };
}

// Helper: days since a date string (or null if no date).
export function daysSince(dateStr) {
  if (!dateStr) return Infinity;
  const then = new Date(dateStr).getTime();
  if (Number.isNaN(then)) return Infinity;
  return Math.floor((Date.now() - then) / 86400000);
}
