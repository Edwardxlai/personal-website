import snapshotJson from './social-snapshot.json';
import sources from './social-sources.json';
import overridesJson from './social-overrides.json';
import { signalBoard, selectedWorks } from './site';

type Evidence = { sourceId: string; asOf: string; evidenceUrl: string; quote: string };
type Metric = Evidence & { key: string; value: string; label: string };
type Work = Evidence & { title: string; url: string; publishedAt: string; stat: string | null };
type Snapshot = {
  sources: Record<string, { checkedAt: string; status: string; reason?: string }>;
  works: Work[];
  metrics: Metric[];
};
const snapshot = snapshotJson as Snapshot;
const overrides: Record<string, { key: string; value: string; label: string; asOf: string }> = overridesJson;
export const formatDate = (value: string) => new Date(value).toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' });
export const recentWorks = [...snapshot.works]
  .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
  .slice(0, 8)
  .map((w, i) => ({ ...w, slot: String(i + 1).padStart(2, '0'), href: w.url, platform: sources.find(s => s.id === w.sourceId)?.platform ?? '', date: formatDate(w.publishedAt) }));
export const featuredWorks = selectedWorks;
export const hasRecentWorks = recentWorks.length > 0;
const sourceIds: Record<string, string> = { '抖音': 'douyin-study', X: 'x', Threads: 'threads', '小红书': 'xiaohongshu' };
export const socialSignals = signalBoard.map(s => {
  const id = sourceIds[s.platform];
  const metrics = snapshot.metrics.filter(m => m.sourceId === id);
  // Existing cumulative milestones keep their own meaning and historical date.
  const key = s.platform === '抖音' ? 'likesAndSaves' : s.platform === 'X' ? 'impressions' : 'views';
  const verified = metrics.find(m => m.key === key);
  const reported = overrides[id];
  const primary = verified && (!reported || Date.parse(verified.asOf) >= Date.parse(reported.asOf)) ? verified : reported ?? verified;
  const extra = snapshot.metrics.filter(m => (m.sourceId === id && m.key !== key) || (s.platform === '抖音' && m.sourceId === 'douyin-ai'));
  const historical = s.platform !== 'GitHub';
  return {
    ...s,
    stat: primary?.value ?? s.stat,
    statLabel: primary?.label ?? s.statLabel,
    status: primary ? 'UPDATED' : historical ? 'ARCHIVE' : s.status,
    asOf: primary ? `数据截至 ${formatDate(primary.asOf)}` : historical ? '2026.07 记录' : null,
    extra: extra.map(m => `${s.platform === '抖音' ? (m.sourceId === 'douyin-ai' ? 'AI 号 ' : '考研号 ') : ''}${m.value} ${m.label} · ${formatDate(m.asOf)}`),
  };
});
export const syncDates = Object.values(snapshot.sources).map(s => s.checkedAt).sort();
export const lastChecked = syncDates.at(-1);
