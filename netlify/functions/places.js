// Netlify Function: Google Places proxy.
// Keeps GOOGLE_PLACES_KEY server-side. Runs a Text Search and returns up to 20
// normalized results. The browser never sees the key.
//
// Request body (POST): { query: string }
// Response (JSON): { results: [{ name, address, phone, rating, reviews, website, place_id }] }

const TEXT_SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText';

export default async (request) => {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const apiKey = process.env.GOOGLE_PLACES_KEY;
  if (!apiKey) {
    return json({ error: 'Server is missing GOOGLE_PLACES_KEY.' }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400);
  }

  const query = (body?.query || '').trim();
  if (!query) {
    return json({ error: 'A search query is required.' }, 400);
  }

  let resp;
  try {
    resp = await fetch(TEXT_SEARCH_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        // Ask only for the fields we render — keeps the bill and payload small.
        'X-Goog-FieldMask': [
          'places.displayName',
          'places.formattedAddress',
          'places.nationalPhoneNumber',
          'places.rating',
          'places.userRatingCount',
          'places.websiteUri',
          'places.id',
        ].join(','),
      },
      body: JSON.stringify({ textQuery: query, maxResultCount: 20 }),
    });
  } catch {
    return json({ error: 'Could not reach Google Places.' }, 502);
  }

  if (!resp.ok) {
    let detail = `Google Places returned ${resp.status}.`;
    try {
      const errJson = await resp.json();
      if (errJson?.error?.message) detail = errJson.error.message;
    } catch {
      /* ignore */
    }
    return json({ error: detail }, 502);
  }

  const data = await resp.json();
  const results = (data.places || []).map((p) => ({
    place_id: p.id || null,
    name: p.displayName?.text || 'Unknown business',
    address: p.formattedAddress || '',
    phone: p.nationalPhoneNumber || '',
    rating: typeof p.rating === 'number' ? p.rating : null,
    reviews: typeof p.userRatingCount === 'number' ? p.userRatingCount : 0,
    website: p.websiteUri || '',
  }));

  return json({ results });
};

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
