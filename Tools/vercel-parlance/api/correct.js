/* Parlance : relais de correction en ligne.
 *
 * - La clé API (ANTHROPIC_API_KEY) reste sur le serveur, jamais dans l'application.
 * - Chaque demande doit porter le code d'accès personnel (ACCESS_CODE).
 * - Plafond mensuel bloquant (MONTHLY_CAP_USD, 20 par défaut) : avant chaque appel,
 *   le coût maximal possible est réservé sur le compteur du mois ; s'il ne tient pas
 *   sous le plafond, l'appel n'est pas fait. Après l'appel, la réservation est
 *   remplacée par le coût réel, calculé à partir de l'usage renvoyé par l'API.
 * - Le compteur du mois est un petit fichier JSON dans un magasin Vercel Blob privé.
 */
const AnthropicModule = require('@anthropic-ai/sdk');
const Anthropic = AnthropicModule.default || AnthropicModule;
const { put, get } = require('@vercel/blob');
const crypto = require('crypto');

const CAP = Math.max(0, Number(process.env.MONTHLY_CAP_USD || 20));
const MODELS = { best: 'claude-opus-5-5', economy: 'claude-haiku-5-5' };
// $ par million de jetons (entrée, sortie). Modèles de repli : tarif le plus élevé, par prudence.
const PRICES = {
  'claude-opus-5-5': [4, 20],
  'claude-haiku-5-5': [0.10, 0.50],
  'claude-opus-5': [5, 25],
  'claude-opus-4-8': [5, 25]
};
const PRICE_MAX = [5, 25];
const MAX_TOKENS = { write: 8000, speak: 8000, debrief: 8000, chat: 3000 };
const MAX_CHARS = 6000;
const MAX_TURNS = 16;

const month = () => new Date().toISOString().slice(0, 7);
const PATH = () => 'parlance/spend-' + month() + '.json';
const priceOf = m => PRICES[m] || PRICES[Object.keys(PRICES).find(k => String(m || '').startsWith(k))] || PRICE_MAX;
const costOf = (usage, model) => {
  const [pin, pout] = priceOf(model);
  const u = usage || {};
  const input = (u.input_tokens || 0) + 1.25 * (u.cache_creation_input_tokens || 0) + 0.1 * (u.cache_read_input_tokens || 0);
  return (input * pin + (u.output_tokens || 0) * pout) / 1e6;
};

/* ---------- compteur mensuel ---------- */
async function readSpend() {
  try {
    const r = await get(PATH(), { access: 'private', useCache: false });
    if (!r || r.statusCode !== 200) return { usd: 0, calls: 0, etag: null };
    const o = JSON.parse(await new Response(r.stream).text());
    return { usd: Number(o.usd) || 0, calls: Number(o.calls) || 0, etag: r.blob.etag };
  } catch (e) {
    if (e && /not.?found/i.test(e.name + ' ' + e.message)) return { usd: 0, calls: 0, etag: null };
    throw e;
  }
}
/* Ajoute delta au compteur, de façon atomique (ETag). Refuse si limit est dépassée. */
async function bump(delta, calls, limit) {
  for (let i = 0; i < 6; i++) {
    const cur = await readSpend();
    const next = Math.max(0, cur.usd + delta);
    if (limit != null && next > limit + 1e-9) return { ok: false, usd: cur.usd };
    const body = JSON.stringify({ usd: Math.round(next * 1e6) / 1e6, calls: cur.calls + (calls || 0), month: month(), updated: new Date().toISOString() });
    try {
      await put(PATH(), body, { access: 'private', contentType: 'application/json', addRandomSuffix: false, allowOverwrite: true, ...(cur.etag ? { ifMatch: cur.etag } : {}) });
      return { ok: true, usd: next };
    } catch (e) {
      if (e && /precondition|etag|already exists/i.test(e.name + ' ' + e.message)) { await new Promise(r => setTimeout(r, 120 + 80 * i)); continue; }
      throw e;
    }
  }
  throw new Error('spend counter busy');
}

/* ---------- consignes et formats de réponse ---------- */
const SYSTEM = `You are an expert coach of professional English for a French senior HR and labour-relations director (French employment law explained in English; she reports to US, UK and other foreign head offices). She is an upper-intermediate learner who wants elegant, natural English such as an educated native professional would write or say, never textbook English, never calques from French.

When you correct her English:
- Keep her meaning and intent. Do not add content she did not write.
- Correct grammar, vocabulary, register, linking words, French calques, spelling and punctuation.
- Explain every correction in French, briefly and precisely, as a demanding but kind teacher would.
- Then give the version a native professional would have written, in the requested variety (British or American spelling, vocabulary and tone: British understatement, a more direct American style).
- Assess the register (too informal, appropriate, too stiff) and the fluency, in French.
- End with two or three priorities for her progress, in French.
- If the text is already excellent, say so and keep the changes list short or empty.
Texts may contain placeholders such as [Name] or [Company]: keep them as they are.`;

const CHANGE_TYPES = ['grammar', 'vocabulary', 'register', 'linking', 'calque', 'spelling', 'punctuation', 'style'];
const CORRECTION_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['corrected', 'changes', 'native_version', 'register_fr', 'fluency_fr', 'priorities_fr'],
  properties: {
    corrected: { type: 'string', description: 'Her text with only the necessary corrections.' },
    changes: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        required: ['original', 'corrected', 'type', 'explanation_fr'],
        properties: {
          original: { type: 'string' }, corrected: { type: 'string' },
          type: { type: 'string', enum: CHANGE_TYPES }, explanation_fr: { type: 'string' }
        }
      }
    },
    native_version: { type: 'string' },
    register_fr: { type: 'string' }, fluency_fr: { type: 'string' },
    priorities_fr: { type: 'array', items: { type: 'string' } }
  }
};
const CHAT_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['reply', 'tip_fr'],
  properties: {
    reply: { type: 'string', description: 'Your next line in the role play, 1 to 4 sentences, natural spoken English.' },
    tip_fr: { type: 'string', description: 'One short coaching tip in French on her last line, or an empty string.' }
  }
};

const clip = s => String(s == null ? '' : s).slice(0, MAX_CHARS);
function buildRequest(kind, b, variety) {
  const v = variety === 'us' ? 'American English' : 'British English';
  if (kind === 'write' || kind === 'speak') {
    const what = kind === 'speak' ? 'a transcript of what she SAID out loud (judge it as spoken English: hesitations, naturalness, spoken register)' : 'a text she WROTE';
    return {
      schema: CORRECTION_SCHEMA,
      messages: [{ role: 'user', content: `Variety: ${v}.\nSituation: ${clip(b.context) || 'professional HR context'}\n\nHere is ${what}:\n<learner_text>\n${clip(b.text)}\n</learner_text>` }]
    };
  }
  const turns = (Array.isArray(b.history) ? b.history : []).slice(-MAX_TURNS).map(t => (t.role === 'me' ? 'HER: ' : 'YOU: ') + clip(t.text)).join('\n');
  if (kind === 'chat') {
    return {
      schema: CHAT_SCHEMA,
      messages: [{ role: 'user', content: `Role play in ${v}. Scenario: ${clip(b.context)}\nYou play the other person (stay in character, be realistic, push back when it fits). Conversation so far:\n${turns || '(none: open the conversation)'}` }]
    };
  }
  return { // debrief
    schema: CORRECTION_SCHEMA,
    messages: [{ role: 'user', content: `Variety: ${v}. Debrief of a spoken role play. Scenario: ${clip(b.context)}\nCorrect ONLY her lines (marked HER), as one text; 'corrected' and 'native_version' are her lines, corrected or rewritten, one per paragraph.\n${turns}` }]
  };
}

/* ---------- requête HTTP ---------- */
function codeOk(given) {
  const want = process.env.ACCESS_CODE || '';
  if (!want || typeof given !== 'string') return false;
  const a = crypto.createHash('sha256').update(given).digest(), b = crypto.createHash('sha256').update(want).digest();
  return crypto.timingSafeEqual(a, b);
}
const send = (res, status, obj) => { res.statusCode = status; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', 'no-store'); res.end(JSON.stringify(obj)); };
async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks = []; let size = 0;
  for await (const c of req) { size += c.length; if (size > 200000) throw new Error('too large'); chunks.push(c); }
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {};
}

module.exports = async (req, res) => {
  const configured = !!(process.env.ANTHROPIC_API_KEY && process.env.ACCESS_CODE && process.env.BLOB_READ_WRITE_TOKEN);
  if (req.method === 'OPTIONS') return send(res, 204, {});
  const code = req.headers['x-access-code'];

  if (req.method === 'GET') {
    if (!configured) return send(res, 200, { configured: false, cap: CAP });
    if (!codeOk(code)) return send(res, 401, { error: 'code' });
    const s = await readSpend();
    return send(res, 200, { configured: true, cap: CAP, spent: s.usd, calls: s.calls, month: month() });
  }
  if (req.method !== 'POST') return send(res, 405, { error: 'method' });
  if (!configured) return send(res, 503, { error: 'not_configured' });
  if (!codeOk(code)) return send(res, 401, { error: 'code' });

  let b;
  try { b = await readBody(req); } catch (e) { return send(res, 400, { error: 'body' }); }
  const kind = ['write', 'speak', 'chat', 'debrief'].includes(b.kind) ? b.kind : null;
  if (!kind) return send(res, 400, { error: 'kind' });
  if ((kind === 'write' || kind === 'speak') && !String(b.text || '').trim()) return send(res, 400, { error: 'empty' });
  if (String(b.text || '').length > MAX_CHARS) return send(res, 413, { error: 'too_long', max: MAX_CHARS });

  const model = MODELS[b.quality] || MODELS.best;
  const { schema, messages } = buildRequest(kind, b, b.variety);
  const maxTokens = MAX_TOKENS[kind];

  // Réserve le pire cas avant d'appeler l'API : le plafond ne peut pas être franchi.
  const promptChars = SYSTEM.length + JSON.stringify(messages).length + JSON.stringify(schema).length;
  const worst = ((promptChars / 2.5) * PRICE_MAX[0] + maxTokens * PRICE_MAX[1]) / 1e6 * (model === MODELS.economy ? priceOf(model)[1] / PRICE_MAX[1] : 1);
  const reserved = await bump(worst, 0, CAP);
  if (!reserved.ok) return send(res, 402, { error: 'cap', spent: reserved.usd, cap: CAP });

  let actual = 0;
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, maxRetries: 1, timeout: 55000 });
    const params = {
      model, max_tokens: maxTokens, system: SYSTEM, messages,
      output_config: { effort: 'low', format: { type: 'json_schema', schema } }
    };
    let msg;
    if (model === MODELS.best) {
      msg = await client.beta.messages.create({ ...params, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' });
    } else {
      msg = await client.messages.create(params);
    }
    actual = costOf(msg.usage, msg.model === model ? model : msg.model);
    if (msg.stop_reason === 'refusal') throw Object.assign(new Error('refusal'), { publicCode: 'refusal' });
    if (msg.stop_reason === 'max_tokens') throw Object.assign(new Error('truncated'), { publicCode: 'truncated' });
    const textBlock = (msg.content || []).find(c => c.type === 'text');
    const result = JSON.parse(textBlock ? textBlock.text : '');
    const after = await bump(actual - worst, 1, null);
    return send(res, 200, { result, cost: actual, spent: after.usd, cap: CAP, model: msg.model });
  } catch (e) {
    try { await bump(actual - worst, actual > 0 ? 1 : 0, null); } catch (e2) { /* le compteur garde la réservation : prudent */ }
    let status = 502, error = e.publicCode || 'upstream';
    if (e instanceof Anthropic.AuthenticationError) { status = 503; error = 'api_key'; }
    else if (e instanceof Anthropic.RateLimitError) { status = 429; error = 'rate_limit'; }
    else if (e instanceof Anthropic.BadRequestError) { status = 502; error = 'bad_request'; }
    else if (e instanceof SyntaxError) { error = 'bad_output'; }
    console.error('parlance relay:', error, e && e.message);
    return send(res, status, { error });
  }
};
