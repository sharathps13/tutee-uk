/**
 * UK study news — GET /api/news (Netlify Functions v2, ESM, no dependencies).
 *
 * Reads a few reputable RSS feeds, keeps only stories relevant to studying
 * in the UK, and returns the newest few with a short summary and an image.
 * Browsers can't read other sites' feeds directly (CORS), hence this function.
 *
 * Freshness: Netlify's CDN keeps the response for 30 minutes and serves the
 * previous copy while it refreshes, so visitors never wait on the feeds.
 */

const FEEDS = [
  { source: 'GOV.UK', url: 'https://www.gov.uk/government/organisations/uk-visas-and-immigration.atom', atom: true, official: true },
  { source: 'The Guardian', url: 'https://www.theguardian.com/education/internationalstudents/rss' },
  { source: 'The Guardian', url: 'https://www.theguardian.com/education/universities/rss' },
  { source: 'BBC News', url: 'https://feeds.bbci.co.uk/news/education/rss.xml' },
  { source: 'The PIE News', url: 'https://thepienews.com/feed/', needsUK: true, ogImage: true },
  { source: 'ICEF Monitor', url: 'https://monitor.icef.com/feed/', needsUK: true },
];
// GOV.UK items carry no photo; they use one of the site's own UK images.
const OFFICIAL_IMAGE = '/assets/img/opt/uk-city-640.webp';

const MAX_ITEMS = 8;
const PER_SOURCE = 3;
const FETCH_TIMEOUT_MS = 6000;

// A story must be about higher education / studying / visas …
const RELEVANT = /\b(universit(y|ies)|international students?|overseas students?|international education|student visas?|study visas?|graduate route|post-study|tuition fees?|scholarships?|bursar(y|ies)|ucas|higher education|postgraduate|admissions?|immigration rules|skilled worker|dependants?|ukvi|e-?visas?|brp)\b/i;
// … ICEF covers every country, so its stories must also mention the UK …
const UK = /\b(uk|u\.k\.|britain|british|england|english universities|scotland|scottish|wales|welsh|northern ireland|london)\b/i;
// … and a marketing page is no place for tragedies, crime or school-only news.
const EXCLUDE = /(^tell us\b)|(\|[^|]*\b(letters?|editorial|opinion)\b)|\b(transparency data|archive|death|dead|died|dies|suicide|killed|murder|stabb\w*|rape|sexual|abuse\w*|assault\w*|harass\w*|funeral|inquest|coroner|ofsted|gcses?|pupils?|nurser(y|ies)|primary school|send pupils)\b/i;

function decode(s) {
  return String(s || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0?39;|&#8217;|&rsquo;/g, '’')
    .replace(/&#8216;|&lsquo;/g, '‘').replace(/&#8220;|&ldquo;/g, '“').replace(/&#8221;|&rdquo;/g, '”')
    .replace(/&#8211;|&ndash;/g, '–').replace(/&#8212;|&mdash;/g, '—').replace(/&#8230;|&hellip;/g, '…')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
}
const text = (html) => decode(html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const tag = (xml, name) => (xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`)) || [])[1] || '';

/** First one or two sentences, at most ~170 characters. */
function summarise(s) {
  s = s.replace(/The post .* appeared first on .*$/i, '').trim();
  if (s.length <= 170) return s;
  const cut = s.slice(0, 170);
  const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('? '), cut.lastIndexOf('! '));
  return end > 80 ? cut.slice(0, end + 1) : cut.replace(/\s+\S*$/, '') + '…';
}

/** Best image an item offers, sized for a ~140px-wide thumbnail at 2x. */
function imageOf(item) {
  // Guardian: several media:content sizes; take the widest up to ~500px
  // attributes come in any order, so read each tag's url and width separately
  const media = [...item.matchAll(/<media:content\b[^>]*>/g)]
    .map(([t]) => ({ url: decode((t.match(/\burl="([^"]+)"/) || [])[1] || ''), w: +((t.match(/\bwidth="(\d+)"/) || [])[1] || 0) }))
    .filter((m) => m.url)
    .sort((a, b) => b.w - a.w);
  const sized = media.find((m) => m.w && m.w <= 500) || media[0];
  if (sized) return sized.url;
  // BBC: one 240px thumbnail; the image service accepts other widths in the path
  const thumb = (item.match(/<media:thumbnail[^>]*\burl="([^"]+)"/) || [])[1];
  if (thumb) return decode(thumb).replace(/\/standard\/\d+\//, '/standard/480/');
  // WordPress (ICEF): first image in the article body
  const body = tag(item, 'content:encoded') || tag(item, 'description');
  const img = (decode(body).match(/<img[^>]+src="([^"]+)"/) || [])[1];
  return img || '';
}

async function readFeed(feed) {
  const res = await fetch(feed.url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TuteeConnectNews/1.0; +https://tuteeconnect.com)' },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`${feed.url} HTTP ${res.status}`);
  const xml = await res.text();
  const blocks = feed.atom ? xml.matchAll(/<entry[\s>][\s\S]*?<\/entry>/g) : xml.matchAll(/<item[\s>][\s\S]*?<\/item>/g);
  const items = [...blocks].map(([item]) => {
    const title = text(tag(item, 'title'));
    // first paragraph only (Guardian puts the standfirst there, then the article)
    const rawDesc = decode(tag(item, feed.atom ? 'summary' : 'description'));
    const summary = summarise(text((rawDesc.match(/<p[^>]*>([\s\S]*?)<\/p>/) || [])[1] || rawDesc));
    const link = feed.atom ? decode((item.match(/<link[^>]*href="([^"]+)"/) || [])[1] || '') : text(tag(item, 'link')).replace(/\?at_medium=RSS.*$/, '');
    const date = new Date(text(tag(item, feed.atom ? 'updated' : 'pubDate')) || text(tag(item, 'dc:date')));
    const cats = [...item.matchAll(/<category[^>]*>([\s\S]*?)<\/category>/g)].map((m) => text(m[1])).join(' ');
    return { title, summary, link, image: feed.official ? OFFICIAL_IMAGE : imageOf(item), source: feed.source, date: isNaN(date) ? null : date.toISOString(), _hay: `${title} ${summary} ${cats}` };
  }).filter((n) => n.title && /^https:\/\//.test(n.link) && n.date && !/\/commentisfree\//.test(n.link) && !/ \| /.test(n.title)
      && RELEVANT.test(n._hay) && !EXCLUDE.test(n._hay) && (!feed.needsUK || UK.test(n._hay)));
  // feeds without images in them: take the article's own preview image (few items, so cheap)
  if (feed.ogImage) {
    await Promise.all(items.slice(0, PER_SOURCE).map(async (n) => {
      try {
        const html = await (await fetch(n.link, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })).text();
        n.image = decode((html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/) || [])[1] || '');
      } catch { /* no image: dropped below */ }
    }));
  }
  return items.filter((n) => n.image);
}

let memo = { at: 0, body: null };

export async function collect() {
  const settled = await Promise.allSettled(FEEDS.map(readFeed));
  settled.forEach((s, i) => { if (s.status === 'rejected') console.error(`news: ${FEEDS[i].url}: ${s.reason?.message}`); });
  const all = settled.flatMap((s) => (s.status === 'fulfilled' ? s.value : []))
    .sort((a, b) => b.date.localeCompare(a.date));
  const seen = new Set(), perSource = {}, out = [];
  for (const n of all) {
    const key = n.title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').slice(0, 60);
    if (seen.has(key) || seen.has(n.link)) continue;
    if ((perSource[n.source] || 0) >= PER_SOURCE) continue;
    seen.add(key); seen.add(n.link);
    perSource[n.source] = (perSource[n.source] || 0) + 1;
    delete n._hay;
    out.push(n);
    if (out.length >= MAX_ITEMS) break;
  }
  return { updated: new Date().toISOString(), items: out };
}

export default async function () {
  try {
    // warm instances answer from memory for 10 minutes
    if (!memo.body || Date.now() - memo.at > 10 * 60 * 1000) {
      const body = await collect();
      if (body.items.length) memo = { at: Date.now(), body };
      else if (!memo.body) memo = { at: Date.now(), body };
    }
    return new Response(JSON.stringify(memo.body), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
        'Netlify-CDN-Cache-Control': 'public, durable, max-age=1800, stale-while-revalidate=86400',
      },
    });
  } catch (exc) {
    console.error(`news: ${exc?.message}`);
    return new Response(JSON.stringify({ updated: null, items: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }
}

export const config = { path: '/api/news' };
