// Fetch evidence only. The weekly agent reads it before applying verified records.
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { parseThreads } from './parse-threads.mjs';
import { collectOpenCli } from './collect-opencli.mjs';

const exec = promisify(execFile);
const root = fileURLToPath(new URL('../', import.meta.url));
const sources = JSON.parse(await readFile(path.join(root, 'src/data/social-sources.json'), 'utf8'));
const directory = path.join(root, '.cache/social', new Date().toISOString().replaceAll(':', '-'));
await mkdir(directory, { recursive: true });
const browserSources = await collectOpenCli(sources, directory);
let proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
if (!proxy && process.platform === 'win32') {
  const { stdout } = await exec('powershell.exe', ['-NoProfile', '-Command', "$p = Get-ItemProperty 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings'; if ($p.ProxyEnable -eq 1) { $p.ProxyServer }"]);
  const address = stdout.trim();
  if (/^(localhost|127\.0\.0\.1):\d+$/.test(address)) proxy = `http://${address}`;
}
const results = await Promise.all(sources.map(async source => {
  const checkedAt = new Date().toISOString();
  try {
    const args = ['--fail-with-body', '--location', '--silent', '--show-error', '--max-time', '45', '--max-filesize', '3000000', '-H', 'X-With-Links-Summary: true'];
    if (proxy) args.push('--proxy', proxy);
    args.push(`https://r.jina.ai/${source.url}`);
    const { stdout } = await exec(process.platform === 'win32' ? 'curl.exe' : 'curl', args, { timeout: 50000, maxBuffer: 4000000 });
    if (!stdout.includes('Markdown Content:') || stdout.length < 250) throw new Error('No readable profile returned');
    const filename = `${source.id}.md`;
    await writeFile(path.join(directory, filename), stdout, 'utf8');
    if (source.id === 'threads') {
      try {
        const { stdout: html } = await exec(process.platform === 'win32' ? 'curl.exe' : 'curl', [...args, '-H', 'X-Return-Format: html'], { timeout: 50000, maxBuffer: 4000000 });
        await writeFile(path.join(directory, 'threads.html'), html, 'utf8');
        await writeFile(path.join(directory, 'threads-posts.json'), JSON.stringify({ sourceUrl: source.url, checkedAt, posts: parseThreads(html) }, null, 2) + '\n');
      } catch { /* Keep the readable profile even when structured posts fail. */ }
    }
    return { sourceId: source.id, url: source.url, checkedAt, status: 'fetched', file: filename };
  } catch {
    return { sourceId: source.id, url: source.url, checkedAt, status: 'unavailable', reason: 'Public page unavailable; try the authorized platform reader' };
  }
}));
await writeFile(path.join(directory, 'manifest.json'), JSON.stringify(results, null, 2) + '\n');
console.log(JSON.stringify({ directory, browserSources, sources: results.map(({ sourceId, status }) => ({ sourceId, status })) }, null, 2));
