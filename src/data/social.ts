import snapshotJson from './social-snapshot.json';
import curatedWorks from './social-featured.json';
import overridesJson from './social-overrides.json';
import { signalBoard } from './site';

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
// Collection is a candidate pool. Only editorial selections reach the page.
export const featuredWorks = curatedWorks
  .filter((work, i, all) => all.findIndex(other => other.contentKey === work.contentKey || other.href === work.href) === i)
  .slice(0, 7)
  .map((work, i) => ({ ...work, slot: String(i + 1).padStart(2, '0') }));

function milestone(value: string) {
  const match = value.replaceAll(',', '').match(/^(\d+(?:\.\d+)?)([KMB万亿])?\+?$/i);
  if (!match) return value;
  const units: Record<string, number> = { K: 1e3, M: 1e6, B: 1e9, '万': 1e4, '亿': 1e8 };
  const count = Number(match[1]) * (units[match[2]?.toUpperCase()] ?? 1);
  // Show earned milestones, never round an exact count up to the next milestone.
  for (const [unit, size] of [['M', 1e6], ['K', 1e3]] as const) {
    if (count >= size) return `${Math.floor(count / size)}${unit}+`;
  }
  return value;
}
const sourceIds: Record<string, string> = { '抖音': 'douyin-study', X: 'x', Threads: 'threads', '小红书': 'xiaohongshu' };
export const socialSignals = signalBoard.map(s => {
  const id = sourceIds[s.platform];
  const metrics = snapshot.metrics.filter(m => m.sourceId === id);
  // Existing cumulative milestones keep their own meaning and historical date.
  const key = s.platform === '抖音' ? 'likesAndSaves' : s.platform === 'X' ? 'impressions' : 'views';
  const verified = metrics.find(m => m.key === key);
  const reported = overrides[id];
  const primary = verified && (!reported || Date.parse(verified.asOf) >= Date.parse(reported.asOf)) ? verified : reported ?? verified;
  return {
    ...s,
    stat: primary ? milestone(primary.value) : s.stat,
    statLabel: s.statLabel,
  };
});
