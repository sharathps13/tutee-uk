/**
 * UK landing page — consultation form handler (Netlify Functions v2, ESM).
 *
 * Flow:  browser form ─POST /api/enquiry─▶ this function ─POST─▶ Google Apps Script
 *        Apps Script then (1) appends a row to the Google Sheet and
 *                         (2) emails the lead to digital@tuteeconnect.com.
 *
 * Why a function in the middle rather than posting straight to Apps Script:
 *   * the Apps Script URL and its shared secret stay server-side, so nobody can
 *     read them from the page and spam the sheet directly;
 *   * the source page and timestamp are set here, not trusted from the browser;
 *   * the page's Content-Security-Policy can keep connect-src at 'self'.
 *
 * Environment variables (Netlify → Site configuration → Environment variables):
 *
 *   APPS_SCRIPT_URL     required  the Apps Script web-app URL, ending in /exec
 *   APPS_SCRIPT_SECRET  required  any long random string; the same value goes in
 *                                 the Apps Script project as the script property
 *                                 SHARED_SECRET
 *
 * Zero npm dependencies (Node 18+ global fetch), so Netlify needs no build step.
 */

import dns from 'node:dns/promises';

// Hard-coded so a tampered page cannot relabel where a lead came from.
const SOURCE_PAGE = 'UK Landing Page';

const MAX_BODY_BYTES = 16 * 1024;
const FORWARD_TIMEOUT_MS = 20000;
// Same rules as the form (assets/js/landing.js); kept in step by hand.
const EMAIL_RE = /^[A-Za-z0-9.!#$%&'*+\/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*\.[A-Za-z]{2,}$/;
const BLOCKED_DOMAINS = /^(?:example\.(?:com|org|net)|test\.com|(?:[a-z0-9-]+\.)?(?:mailinator|guerrillamail|10minutemail|tempmail|temp-mail|yopmail|trashmail|sharklasers|getnada|dispostable|maildrop|throwawaymail|fakeinbox|mintemail|moakt|emailondeck)\.[a-z.]+)$/;
// national-number length [min, max] and, where fixed, the leading digit, per calling code
const PHONE_RULES = {
  '+91': [10, 10, /^[6-9]/], '+44': [9, 10, /^[1-37]/], '+1': [10, 10, /^[2-9]/], '+971': [8, 9, /^[2-9]/], '+61': [9, 9, /^[2-478]/],
  '+65': [8, 8, /^[689]/], '+60': [9, 10], '+64': [8, 10], '+353': [9, 9], '+49': [10, 11], '+33': [9, 9], '+966': [9, 9],
  '+974': [8, 8], '+965': [8, 8], '+968': [8, 8], '+92': [10, 10], '+94': [9, 9], '+977': [10, 10], '+880': [10, 10, /^1/],
  '+63': [10, 10], '+62': [9, 12], '+86': [11, 11, /^1/], '+81': [10, 10], '+82': [9, 10], '+27': [9, 9], '+234': [10, 10],
  '+254': [9, 9], '+20': [10, 10], '+90': [10, 10], '+7': [10, 10], '+39': [9, 11], '+34': [9, 9], '+31': [9, 9],
  '+55': [10, 11], '+52': [10, 10], '+230': [7, 8],
};
/** "+91 98765 43210" → null if it passes, otherwise a message. */
export function phoneProblem(phone) {
  const m = String(phone).match(/^\s*(\+\d{1,4})\s*(.*)$/);
  let d = (m ? m[2] : String(phone)).replace(/\D/g, '');
  const code = m ? m[1] : '';
  if (code && d.length > 10 && d.startsWith(code.slice(1))) d = d.slice(code.length - 1);
  if (d.startsWith('0') && code !== '+39') d = d.slice(1);
  const r = PHONE_RULES[code] || [6, 14];
  if (d.length < r[0] || d.length > r[1] || (r[2] && !r[2].test(d)) || /^(\d)\1+$/.test(d) || d === '1234567890') return 'Please enter a valid phone number.';
  return null;
}

const LIMITS = { full_name: 120, phone: 40, email: 200, state: 80, notes: 1000, shortlist: 600, page_url: 200 };

/** Trim, collapse whitespace and cap length. Notes keep their line breaks. */
function clean(value, limit, keepLines = false) {
  if (value === null || value === undefined) return '';
  let text = String(value).replace(/\r\n?/g, '\n');
  text = keepLines
    ? text.split('\n').map((l) => l.replace(/[ \t]+/g, ' ').trim()).join('\n').replace(/\n{3,}/g, '\n\n')
    : text.replace(/\s+/g, ' ');
  return text.trim().slice(0, limit);
}

/** Accept JSON (what the page sends) or urlencoded (a no-JS fallback). */
export function parsePayload(raw) {
  const text = String(raw ?? '').trim();
  let data = {};
  if (text.startsWith('{')) {
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) data = parsed;
    } catch { data = {}; }
  } else if (text) {
    data = Object.fromEntries(new URLSearchParams(text));
  }
  const phone = data.phone || `${data.country_code ?? ''} ${data.phone_number ?? ''}`;
  return {
    full_name: clean(data.full_name ?? data.name, LIMITS.full_name),
    phone: clean(phone, LIMITS.phone),
    email: clean(data.email, LIMITS.email),
    state: clean(data.state, LIMITS.state),
    notes: clean(data.notes, LIMITS.notes, true),
    shortlist: clean(data.shortlist, LIMITS.shortlist),
    page_url: clean(data.page_url ?? data.page, LIMITS.page_url),
    botcheck: data.botcheck,
  };
}

/** Same rules as the browser. The browser check is for UX; this one counts. */
export function validate(f) {
  if (f.botcheck) return 'Rejected.';
  if (f.full_name.length < 2 || /\d/.test(f.full_name)) return 'Please enter your full name.';
  const phone = phoneProblem(f.phone);
  if (phone) return phone;
  if (!EMAIL_RE.test(f.email) || /\.\./.test(f.email)) return 'Please enter a valid email address.';
  if (BLOCKED_DOMAINS.test(f.email.split('@').pop().toLowerCase())) return 'Please use an email address you check; temporary or example addresses can’t receive our reply.';
  return null;
}

/** Can this domain receive email? true / false, or null when DNS can't say
 * (timeouts, resolver trouble) so a flaky lookup never blocks a real lead.
 * MX first; a domain with no MX but an address record can still take mail. */
const DOMAIN_RE = /^(?=.{3,253}$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;
export async function domainAcceptsMail(domain) {
  const d = String(domain || '').trim().toLowerCase();
  if (!DOMAIN_RE.test(d)) return false;
  const withTimeout = (p) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 2500))]);
  const gone = (e) => ['ENOTFOUND', 'ENODATA', 'NXDOMAIN'].includes(e?.code);
  try {
    const mx = await withTimeout(dns.resolveMx(d));
    if (mx.some((r) => r.exchange && r.exchange !== '.')) return true;   // "." = null MX: refuses mail
    if (mx.length) return false;
  } catch (e) {
    if (!gone(e)) return null;
  }
  try {
    const a = await withTimeout(dns.resolve4(d));
    return a.length > 0;
  } catch (e) {
    return gone(e) ? false : null;
  }
}

async function forwardToAppsScript(lead) {
  const url = (process.env.APPS_SCRIPT_URL || '').trim();
  const secret = (process.env.APPS_SCRIPT_SECRET || '').trim();
  if (!url || !secret) throw new Error('not configured (APPS_SCRIPT_URL / APPS_SCRIPT_SECRET missing)');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FORWARD_TIMEOUT_MS);
  try {
    // Apps Script answers a POST with a 302 to the result; fetch follows it.
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, ...lead }),
      redirect: 'follow',
      signal: controller.signal,
    });
    const body = await res.text();
    let parsed = null;
    try { parsed = JSON.parse(body); } catch { /* HTML error page */ }
    if (!res.ok || !parsed || parsed.ok !== true) {
      throw new Error(`apps script refused: HTTP ${res.status} ${(parsed && parsed.error) || body.slice(0, 200)}`);
    }
  } finally {
    clearTimeout(timer);
  }
}

const OK_MESSAGE = 'Profile submitted successfully! We will contact you soon.';
const FAIL_MESSAGE = 'We could not send your details right now. Please try again, '
  + 'or WhatsApp us on +91 73583 64959.';

/** Core logic. Returns { status, payload }. */
export async function handle(rawBody) {
  const f = parsePayload(rawBody);
  const problem = validate(f);
  if (problem) return { status: 400, payload: { success: false, message: problem } };
  if (await domainAcceptsMail(f.email.split('@').pop()) === false) {
    return { status: 400, payload: { success: false, message: 'That email domain can’t receive mail. Please check your email address.' } };
  }

  const lead = {
    submitted_at: new Date().toISOString(),
    full_name: f.full_name,
    phone: f.phone,
    email: f.email,
    notes: f.notes,
    shortlist: f.shortlist,
    state: f.state,
    source_page: SOURCE_PAGE,
    page_url: f.page_url,
  };

  try {
    await forwardToAppsScript(lead);
  } catch (exc) {
    console.error(`enquiry: ${exc.message}`);
    return { status: 502, payload: { success: false, message: FAIL_MESSAGE } };
  }
  console.log('enquiry: forwarded to apps script');
  return { status: 200, payload: { success: true, message: OK_MESSAGE } };
}

function json(status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

/** Netlify Functions v2 entry point. GET reports whether config is present (never its value). */
export default async function (req) {
  if (req.method === 'GET') {
    // live email check from the form: GET /api/enquiry?mx=example.com
    const mxDomain = new URL(req.url).searchParams.get('mx');
    if (mxDomain !== null) return json(200, { mx: await domainAcceptsMail(mxDomain.slice(0, 253)) });
    return json(200, {
      success: true,
      endpoint: 'enquiry',
      source_page: SOURCE_PAGE,
      apps_script_configured: Boolean((process.env.APPS_SCRIPT_URL || '').trim()
        && (process.env.APPS_SCRIPT_SECRET || '').trim()),
    });
  }
  if (req.method !== 'POST') return json(405, { success: false, message: 'Method not allowed.' });

  if (Number(req.headers.get('content-length') || 0) > MAX_BODY_BYTES) {
    return json(413, { success: false, message: 'Submission too large.' });
  }
  let raw = '';
  try { raw = await req.text(); } catch {
    return json(400, { success: false, message: 'Could not read the submission.' });
  }
  if (raw.length > MAX_BODY_BYTES) return json(413, { success: false, message: 'Submission too large.' });

  try {
    const { status, payload } = await handle(raw);
    return json(status, payload);
  } catch (exc) {
    console.error(`enquiry: unhandled: ${exc?.name}: ${exc?.message}`);
    return json(500, { success: false, message: FAIL_MESSAGE });
  }
}

export const config = { path: '/api/enquiry' };
