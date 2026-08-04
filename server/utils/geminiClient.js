/**
 * Thin wrapper around Google's Gemini API. Uses Node's built-in `https`
 * module rather than fetch/undici - some Windows setups (antivirus doing
 * TLS inspection, certain ISP boxes) fail undici's HTTP/2 negotiation with
 * a "tlsv1 alert internal error" even though plain curl works fine. The
 * https module uses a different, more compatible TLS path.
 *
 * Model names can shift as Google updates its lineup - if you get a 404 or
 * "model not found" error, check https://ai.google.dev/gemini-api/docs/models
 * for current model names and swap them into GEMINI_EMBED_MODEL /
 * GEMINI_GENERATE_MODEL below.
 */

const https = require('https');

const GEMINI_EMBED_MODEL = 'gemini-embedding-001';
const GEMINI_GENERATE_MODEL = 'gemini-flash-lite-latest';
const HOST = 'generativelanguage.googleapis.com';

/**
 * POSTs a JSON body to a Gemini API path and resolves with the parsed
 * JSON response. Rejects on non-2xx status or network/TLS errors.
 */
function postJSON(path, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);

    const req = https.request(
      {
        hostname: HOST,
        path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(data);
          } catch {
            return reject(new Error(`Gemini returned non-JSON response: ${data.slice(0, 200)}`));
          }
          if (res.statusCode < 200 || res.statusCode >= 300) {
            return reject(new Error(`Gemini API error ${res.statusCode}: ${JSON.stringify(parsed)}`));
          }
          resolve(parsed);
        });
      }
    );

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

/**
 * Converts a piece of text into a vector embedding.
 */
async function embedText(text) {
  const path = `/v1beta/models/${GEMINI_EMBED_MODEL}:embedContent?key=${process.env.GEMINI_API_KEY}`;
  const data = await postJSON(path, {
    model: `models/${GEMINI_EMBED_MODEL}`,
    content: { parts: [{ text }] },
  });
  return data.embedding.values; // array of floats
}

/**
 * Sends a prompt (optionally with retrieved context already folded in) to
 * Gemini and returns the generated text.
 */
async function generateContent(prompt) {
  const path = `/v1beta/models/${GEMINI_GENERATE_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`;
  const data = await postJSON(path, {
    contents: [{ parts: [{ text: prompt }] }],
  });
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

module.exports = { embedText, generateContent };

