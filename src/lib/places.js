// Client-side helper for the Google Places proxy Netlify Function.

const ENDPOINT = '/.netlify/functions/places';

/**
 * Run a text search. Returns an array of normalized business results.
 * @param {string} query e.g. "restaurants in Houston TX"
 */
export async function searchPlaces(query) {
  let resp;
  try {
    resp = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query }),
    });
  } catch {
    throw new Error('Could not reach the lead search service. Check your connection.');
  }

  let data;
  try {
    data = await resp.json();
  } catch {
    throw new Error('The lead search service returned an unexpected response.');
  }

  if (!resp.ok || data?.error) {
    throw new Error(data?.error || `Lead search failed (${resp.status}).`);
  }

  return Array.isArray(data.results) ? data.results : [];
}
