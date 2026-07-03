// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// 站点地址：sitemap / RSS / OG 卡片都依赖这个值，所以单独提出来。
const SITE = 'https://www.edwardai.me';

// https://astro.build/config
export default defineConfig({
  site: SITE,
  integrations: [sitemap()],
  // 静态输出，没有服务端逻辑。
  output: 'static',
});
