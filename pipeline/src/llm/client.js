/**
 * Thin wrapper around the Anthropic Messages API. Every call goes through
 * here so the two LLM steps in the pipeline (structured extraction and
 * discrepancy narration) share one place to swap models or add retries.
 */
export async function callLLM({ system, prompt, maxTokens = 2000 }) {
  const apiKey = process.env.LLM_API_KEY;
  const apiUrl = process.env.LLM_API_URL || 'https://api.anthropic.com/v1/messages';
  const model = process.env.LLM_MODEL || 'claude-sonnet-4-6';

  if (!apiKey) {
    throw new Error('LLM_API_KEY is not set');
  }

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`LLM call failed: ${response.status} ${body}`);
  }

  const data = await response.json();
  return data.content?.[0]?.text ?? '';
}

/**
 * Pulls the first JSON value (object or array) out of an LLM response,
 * tolerating markdown code fences or stray prose around it.
 */
export function extractJSON(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.search(/[[{]/);
  if (start === -1) {
    throw new Error('No JSON found in LLM response');
  }
  const end = Math.max(candidate.lastIndexOf('}'), candidate.lastIndexOf(']'));
  return JSON.parse(candidate.slice(start, end + 1));
}
