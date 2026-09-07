// Read structured public page data without executing any page scripts.
export function parseThreads(html, username = 'ledwardsama') {
  const posts = new Map();
  function walk(value) {
    if (!value || typeof value !== 'object') return;
    if (value.code && value.caption?.text && value.user?.username === username && Number.isFinite(value.taken_at)) {
      posts.set(value.code, {
        url: `https://www.threads.com/@${username}/post/${value.code}`,
        text: value.caption.text,
        publishedAt: new Date(value.taken_at * 1000).toISOString(),
        likes: Number.isFinite(value.like_count) ? value.like_count : null,
        author: value.user.username,
      });
    }
    Object.values(value).forEach(walk);
  }
  for (const script of html.matchAll(/<script[^>]*type="application\/json"[^>]*>(.*?)<\/script>/gs)) {
    try { walk(JSON.parse(script[1])); } catch { /* Other script formats are not data. */ }
  }
  return [...posts.values()].sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
}
