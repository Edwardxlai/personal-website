import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

const exec = promisify(execFile);
const psQuote = value => `'${value.replaceAll("'", "''")}'`;

export async function collectOpenCli(sources, directory) {
  const results = [];
  // Browser adapters share a connection; collect sequentially to avoid navigation conflicts.
  for (const source of sources.filter(s => ['douyin-ai', 'xiaohongshu'].includes(s.id))) {
    const profileId = new URL(source.url).pathname.split('/').filter(Boolean).at(-1);
    const args = source.id === 'douyin-ai'
      ? ['douyin', 'user-videos', profileId, '--limit', '20', '--with_comments', 'false']
      : ['xiaohongshu', 'user', profileId, '--limit', '60'];
    args.push('--window', 'background', '-f', 'json');
    try {
      const command = ['&', 'opencli', ...args.map(psQuote)].join(' ');
      const { stdout } = process.platform === 'win32'
        ? await exec('powershell.exe', ['-NoProfile', '-Command', '[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding; ' + command + '; exit $LASTEXITCODE'], { timeout: 55000, maxBuffer: 4000000 })
        : await exec('opencli', args, { timeout: 55000, maxBuffer: 4000000 });
      const items = JSON.parse(stdout);
      if (!Array.isArray(items) || !items.length) throw new Error('No public works');
      const file = `${source.id}-opencli.json`;
      await writeFile(path.join(directory, file), JSON.stringify({ sourceId: source.id, sourceUrl: source.url, checkedAt: new Date().toISOString(), items }, null, 2) + '\n');
      results.push({ sourceId: source.id, status: 'fetched', file });
    } catch {
      results.push({ sourceId: source.id, status: 'unavailable' });
    }
  }
  await writeFile(path.join(directory, 'opencli-manifest.json'), JSON.stringify(results, null, 2) + '\n');
  return results;
}
