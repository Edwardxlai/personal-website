import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// 精选项目 (Work)
const projects = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/projects' }),
  // image() 让封面/画廊走 Astro 图片优化（自动 webp/avif + 宽高，消除布局偏移）
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      // 一句问题定义 / 首页一句话
      tagline: z.string(),
      // 列表展示顺序，数字越小越靠前
      order: z.number(),
      cover: image().optional(),
      gallery: z.array(image()).default([]),
      draft: z.boolean().default(false),
    }),
});

export const collections = { projects };
