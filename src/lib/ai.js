// Client-side helper for talking to the Claude proxy Netlify Function.
// The browser never sees the API key — it only calls /.netlify/functions/claude.

const ENDPOINT = '/.netlify/functions/claude';

/**
 * Stream a completion. Calls onToken(textChunk) as tokens arrive and resolves
 * with the full concatenated text.
 *
 * @param {object}   opts
 * @param {string}  [opts.system]      system prompt
 * @param {string}   opts.user         the user message (string)
 * @param {number}  [opts.maxTokens]   default 1000
 * @param {function}[opts.onToken]     called with each text chunk
 * @param {AbortSignal}[opts.signal]   optional abort signal
 * @returns {Promise<string>} full text
 */
export async function streamClaude({ system, user, maxTokens = 1000, onToken, signal }) {
  let resp;
  try {
    resp = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        system,
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: user }],
      }),
      signal,
    });
  } catch {
    throw new Error('Could not reach the AI service. Check your connection and try again.');
  }

  // Non-stream error responses come back as JSON.
  const contentType = resp.headers.get('content-type') || '';
  if (!resp.ok || contentType.includes('application/json')) {
    let message = `The AI service returned an error (${resp.status}).`;
    try {
      const data = await resp.json();
      if (data?.error) message = data.error;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }

  if (!resp.body) throw new Error('The AI service returned an empty response.');

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let full = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const events = buffer.split('\n\n');
    buffer = events.pop() || '';

    for (const evt of events) {
      const line = evt.trim();
      if (!line.startsWith('data:')) continue;
      const payload = line.slice(5).trim();
      if (!payload) continue;
      let obj;
      try {
        obj = JSON.parse(payload);
      } catch {
        continue;
      }
      if (obj.error) throw new Error(obj.error);
      if (obj.text) {
        full += obj.text;
        if (onToken) onToken(obj.text);
      }
    }
  }

  return full.trim();
}

/**
 * Convenience wrapper for prompts that must return JSON. Strips markdown
 * fences and parses. Throws a friendly error if parsing fails.
 */
export async function streamClaudeJSON(opts) {
  const text = await streamClaude(opts);
  return parseJSON(text);
}

export function parseJSON(text) {
  if (!text) throw new Error('The AI returned an empty response.');
  let cleaned = text.trim();
  // strip ```json ... ``` fences if present
  cleaned = cleaned.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  // grab the first {...} or [...] block
  const match = cleaned.match(/[{[][\s\S]*[}\]]/);
  const candidate = match ? match[0] : cleaned;
  try {
    return JSON.parse(candidate);
  } catch {
    throw new Error('The AI response could not be read. Try again.');
  }
}
