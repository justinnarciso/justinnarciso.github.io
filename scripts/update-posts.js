// Fetch the Substack RSS feed and rewrite posts.json.
// No external dependencies — uses Node's built-in fetch and regex parsing.

const fs = require('fs');
const path = require('path');

const FEED_URL = 'https://designlayer.substack.com/feed';
const SOURCE_NAME = 'The Design Layer';
const POSTS_PATH = path.join(__dirname, '..', 'posts.json');
const EXCERPT_LEN = 160;

function decodeEntities(s) {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(parseInt(n, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&hellip;/g, '…')
    .replace(/&nbsp;/g, ' ')
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function stripTags(s) {
  return decodeEntities(s).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

function pick(item, tag) {
  const re = new RegExp('<' + tag + '[^>]*>([\\s\\S]*?)</' + tag + '>');
  const m = item.match(re);
  return m ? decodeEntities(m[1]).trim() : '';
}

function firstRealParagraph(contentHtml) {
  if (!contentHtml) return '';
  const paragraphs = contentHtml.match(/<p[^>]*>([\s\S]*?)<\/p>/g) || [];
  for (const p of paragraphs) {
    const inner = p.replace(/^<p[^>]*>/, '').replace(/<\/p>$/, '');
    // Skip paragraphs that are entirely a heading (wrapped in <strong> or <em>)
    const stripped = inner.trim();
    if (/^<strong>[\s\S]*<\/strong>$/.test(stripped)) continue;
    if (/^<em>[\s\S]*<\/em>$/.test(stripped)) continue;
    const text = stripTags(inner);
    if (text.length < 40) continue; // skip very short paragraphs (subheads, etc.)
    return text;
  }
  return '';
}

function toIsoDate(rfc822) {
  const d = new Date(rfc822);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function truncate(text) {
  if (text.length <= EXCERPT_LEN) return text;
  return text.slice(0, EXCERPT_LEN - 3).trimEnd() + '...';
}

(async () => {
  const res = await fetch(FEED_URL, { headers: { 'User-Agent': 'portfolio-feed-sync' } });
  if (!res.ok) {
    console.error('Feed fetch failed:', res.status, res.statusText);
    process.exit(1);
  }
  const xml = await res.text();

  const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
  if (!items.length) {
    console.error('No items found in feed');
    process.exit(1);
  }

  const posts = items.map(item => {
    const title = stripTags(pick(item, 'title'));
    const link = stripTags(pick(item, 'link'));
    const pubDate = pick(item, 'pubDate');
    const description = pick(item, 'description');
    const content = pick(item, 'content:encoded');
    // Prefer first real paragraph of body; fall back to description.
    const bodyExcerpt = firstRealParagraph(content);
    const raw = bodyExcerpt || stripTags(description);
    return {
      title: title,
      date: toIsoDate(pubDate),
      excerpt: truncate(raw),
      source: SOURCE_NAME,
      url: link
    };
  }).filter(p => p.title && p.url && p.date);

  posts.sort((a, b) => new Date(b.date) - new Date(a.date));

  const next = JSON.stringify(posts, null, 2) + '\n';
  let prev = '';
  try { prev = fs.readFileSync(POSTS_PATH, 'utf8'); } catch (e) {}

  if (prev === next) {
    console.log('No changes.');
    return;
  }

  fs.writeFileSync(POSTS_PATH, next);
  console.log('Updated posts.json with', posts.length, 'posts.');
})().catch(err => {
  console.error(err);
  process.exit(1);
});
