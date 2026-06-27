// Netlify Function: Claude API proxy.
// Keeps ANTHROPIC_API_KEY server-side. Streams the model's text back to the
// browser as Server-Sent Events so the UI can render tokens as they arrive.
//
// Request body (POST): { system?: string, messages: [{role, content}], max_tokens?: number }
// Response: text/event-stream of `data: {"text": "..."}` chunks, ending with
//           `data: {"done": true}`. On error, a single `data: {"error": "..."}`.

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-6';

export default async (request) => {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'content-type': 'application/json' },
    });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Server is missing ANTHROPIC_API_KEY.' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body.' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const { system, messages, max_tokens } = body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: 'messages array is required.' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  let upstream;
  try {
    upstream = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: max_tokens || 1000,
        stream: true,
        ...(system ? { system } : {}),
        messages,
      }),
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Could not reach the AI service.' }), {
      status: 502,
      headers: { 'content-type': 'application/json' },
    });
  }

  if (!upstream.ok || !upstream.body) {
    let detail = `AI service returned ${upstream.status}.`;
    try {
      const errJson = await upstream.json();
      if (errJson?.error?.message) detail = errJson.error.message;
    } catch {
      /* ignore */
    }
    return new Response(JSON.stringify({ error: detail }), {
      status: 502,
      headers: { 'content-type': 'application/json' },
    });
  }

  // Re-emit Anthropic's SSE as a simplified text stream the client can parse.
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const stream = new ReadableStream({
    async start(controller) {
      const reader = upstream.body.getReader();
      let buffer = '';
      const send = (obj) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) continue;
            const payload = trimmed.slice(5).trim();
            if (!payload || payload === '[DONE]') continue;
            try {
              const evt = JSON.parse(payload);
              if (evt.type === 'content_block_delta' && evt.delta?.text) {
                send({ text: evt.delta.text });
              } else if (evt.type === 'message_stop') {
                send({ done: true });
              } else if (evt.type === 'error') {
                send({ error: evt.error?.message || 'AI stream error.' });
              }
            } catch {
              /* skip malformed event */
            }
          }
        }
        send({ done: true });
      } catch (err) {
        send({ error: 'The AI stream was interrupted.' });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache',
      connection: 'keep-alive',
    },
  });
};
