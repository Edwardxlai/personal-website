// Input is evidence-backed, normalized JSON produced by the weekly collection agent.
import { readFile, writeFile, rename } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const target = path.join(root, 'src/data/social-snapshot.json');
const input = process.argv[2];
if (!input) throw new Error('Usage: node scripts/apply-social.mjs <verified-update.json>');
const patch = JSON.parse(await readFile(input, 'utf8'));
const snapshot = JSON.parse(await readFile(target, 'utf8'));
const sources = JSON.parse(await readFile(path.join(root, 'src/data/social-sources.json'), 'utf8'));
const metrics = { followers: '粉丝', likes: '累计获赞', likesAndSaves: '累计获赞与收藏', views: '累计浏览', impressions: '累计曝光' };
function fail(message) { throw new Error(message); }
function text(value, max = 300) {
  return typeof value === 'string' && value.trim() && value.length <= max && !/[<>\u0000-\u001f]/.test(value) ? value.trim() : fail('Invalid text');
}
function date(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(T.*)?$/.test(value) || !Number.isFinite(Date.parse(value)) || Date.parse(value) > Date.now() + 300000) fail('Invalid or future date');
  return new Date(value).toISOString();
}
function sourceFor(id) { return sources.find(s => s.id === id) ?? fail('Unknown source'); }
function url(value, source) {
  const parsed = new URL(value);
  if (parsed.protocol !== 'https:' || !source.hosts.includes(parsed.hostname) || parsed.username || parsed.password) fail('Invalid source URL');
  parsed.hash = '';
  for (const name of [...parsed.searchParams.keys()]) if (name.startsWith('utm_') || name === 's') parsed.searchParams.delete(name);
  return parsed.href;
}
async function evidence(entry) {
  const source = sourceFor(entry.sourceId);
  const quote = typeof entry.quote === 'string' && entry.quote.trim().length >= 3 && entry.quote.length <= 1200 ? entry.quote : fail('Invalid evidence quote');
  const file = path.resolve(root, text(entry.evidenceFile, 800));
  const relative = path.relative(path.join(root, '.cache/social'), file);
  if (relative.startsWith('..') || path.isAbsolute(relative)) fail('Evidence must be in .cache/social');
  const content = await readFile(file, 'utf8');
  if (!content.includes(quote)) fail('Evidence quote not found');
  const evidenceUrl = url(entry.evidenceUrl, source);
  if (!content.includes(evidenceUrl)) fail('Evidence URL not found');
  return { sourceId: source.id, asOf: date(entry.asOf), evidenceUrl, quote };
}
for (const item of patch.sources ?? []) {
  sourceFor(item.sourceId);
  if (!['ok', 'partial', 'unavailable'].includes(item.status)) fail('Invalid collection status');
  const checkedAt = date(item.checkedAt);
  if (snapshot.sources[item.sourceId]?.checkedAt > checkedAt) continue;
  snapshot.sources[item.sourceId] = { checkedAt, status: item.status, ...(item.reason ? { reason: text(item.reason) } : {}) };
}
for (const item of patch.metrics ?? []) {
  if (!Object.hasOwn(metrics, item.key)) fail('Unknown metric');
  const value = text(item.value, 24);
  if (!/^\d[\d,.]*(?:\.\d+)?(?:[KMB万亿])?\+?$/i.test(value)) fail('Invalid metric value');
  if (typeof item.quote !== 'string' || !item.quote.includes(value)) fail('Metric value missing from evidence');
  const entry = { ...await evidence(item), key: item.key, value, label: metrics[item.key] };
  const previous = snapshot.metrics.find(m => m.sourceId === entry.sourceId && m.key === entry.key);
  if (previous && previous.asOf > entry.asOf) continue;
  snapshot.metrics = snapshot.metrics.filter(m => m.sourceId !== entry.sourceId || m.key !== entry.key);
  snapshot.metrics.push(entry);
}
for (const item of patch.works ?? []) {
  const source = sourceFor(item.sourceId);
  const entry = { ...await evidence(item), title: text(item.title, 180), url: url(item.url, source), publishedAt: date(item.publishedAt), stat: item.stat == null ? null : text(item.stat, 60) };
  const previous = snapshot.works.find(w => w.url === entry.url);
  if (previous && previous.asOf > entry.asOf) continue;
  snapshot.works = snapshot.works.filter(w => w.url !== entry.url);
  snapshot.works.push(entry);
}
snapshot.works.sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
snapshot.works = snapshot.works.slice(0, 80);
const serialized = JSON.stringify(snapshot, null, 2) + '\n';
if (serialized === await readFile(target, 'utf8')) console.log('No changes');
else {
  await writeFile(`${target}.tmp`, serialized, 'utf8');
  await rename(`${target}.tmp`, target);
  console.log(`Saved ${snapshot.works.length} works and ${snapshot.metrics.length} metrics`);
}
