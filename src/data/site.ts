/*
  站点内容真源 (Site Source of Truth)
  --------------------------------
  所有首页文案、身份信息、经历、自媒体矩阵和联系方式集中在此。

  ⚠️ 标注 PLACEHOLDER 的字段需要补充真实素材。
  事实层只放可验证内容，包装留给文案措辞本身。
*/

export const identity = {
  // 整站对外统一用 Edward，不出现真名（去实名为风格选择，学校/城市/露脸保留）
  nameZh: 'Edward',
  // 首页超大标识使用的短标记
  mark: 'Edward',
  // 顶部身份短标签：不暗示接单状态，只说明当前身份方向
  roleTag: 'AI CREATOR',
  // 克制版身份（brand-source 首页身份候选）
  roleEn: 'AI product builder & creator',
  // 中文强势版
  roleZh: '用 AI 重新定义自媒体。',
  // 叙事版（用于 About）
  narrative:
    '关注 AI 如何重写内容生产、分发和复用。',
  basedIn: '北京',
  // 教育信息推荐写法（brand-source §1）
  status: '北交本 + 北邮硕',
  email: 'edwardxlaime@gmail.com',
  github: 'https://github.com/Edwardxlai',
  githubHandle: 'Edwardxlai',
} as const;

// Hero 巨型主张（编辑×系统方向）—— 问题即主张
export const hero = {
  thesis: ['你好，我是 Edward', '用 AI 重新定义世界'],
  lead: '',
} as const;

// 主导航锚点
export const nav = [
  { label: 'Hero', href: '#hero' },
  { label: 'Signal', href: '#content' },
  { label: 'Work', href: '#work' },
  { label: 'Output', href: '#output' },
  { label: 'Contact', href: '#contact' },
] as const;

/*
  经历 / 轨迹 (DESIGN §02)
  --------------------------------
  brand-source 明确：不展示旧简历项目、不罗列奖项；ACM 只作人格标签。
  目前没有正式工作经历，这里用可验证的教育轨迹建立可信度。
  PLACEHOLDER: 若有实习 / 团队经历，本人回来后补充为新条目。
*/
export const experience = [
  {
    period: '2026 — NOW',
    index: '02',
    org: '北京邮电大学',
    title: '人工智能方向 硕士（拟 2026.09 入学）',
    note: '下一阶段聚焦 AI 与内容生成方向的研究与产品实践。',
  },
  {
    period: '2022 — 2026',
    index: '01',
    org: '北京交通大学',
    title: '软件工程 本科',
    note: '系统训练工程与算法基础；以 ACMer 身份打磨问题拆解与实现能力。',
  },
] as const;

/*
  全平台信号台 (DESIGN §04 · 结构参考 sac-ai.com 信号台，视觉走本站编辑×系统)
  --------------------------------
  把内容创作当作作品，而不是只放社交图标。
  数据来源 platform.md (2026-07)：抖音为考研 × AI 双账号运营（考研号数据大、主页挂 AI 号，两行都上站）。
  stat = 大数字（mono 巨号展示），statLabel = 数据口径（单条峰值 or 累计，必须写清，不含糊）。
  排序按数字量级降序，制造瀑布感。
*/
export const signalBoard = [
  {
    platform: '抖音',
    status: 'LIVE',
    tag: 'VIDEO',
    blurb: '考研 × AI 双账号运营',
    stat: '40K+',
    statLabel: '累计赞藏 · 4K 粉丝',
    href: 'https://www.douyin.com/user/MS4wLjABAAAAzaMQlMN59ZkwjV2RupWMpp09xgtrJ6HKDlWLGH2l5w4JVzEw1pJkchK90_3Smbkw',
  },
  {
    platform: 'X',
    status: 'LIVE',
    tag: 'GLOBAL',
    blurb: 'AI 产品观察与观点输出',
    stat: '1M+',
    statLabel: '累计曝光',
    href: 'https://x.com/lnxinsh00633331',
  },
  {
    platform: 'Threads',
    status: 'LIVE',
    tag: 'GLOBAL',
    blurb: 'AI 创作的日常碎片',
    stat: '1M+',
    statLabel: '累计浏览',
    href: 'https://www.threads.com/@ledwardsama',
  },
  {
    platform: '小红书',
    status: 'LIVE',
    tag: 'NOTES',
    blurb: 'AI 写作与创作工作流',
    stat: '500K+',
    statLabel: '累计浏览',
    href: 'https://www.xiaohongshu.com/user/profile/62c44930000000001b024533',
  },
  {
    platform: 'GitHub',
    status: 'OPEN',
    tag: 'CODE',
    blurb: '公开仓库与旧项目归档',
    stat: 'CODE',
    statLabel: '公开项目入口',
    href: identity.github,
  },
] as const;

/*
  精选代表作 · 输出槽位 (S/04 · 结构参考 sac-ai.com Writing 区)
  --------------------------------
  title 为 null 时渲染「预留槽位」设计态（hint 是占位态对外文案，须适合公开展示）；
  填入 title 即切换为正式卡片。href 存在时占位态整卡也可点击。
  数据与链接来源 platform.md (2026-07)。标题为从链接页面抓取的真实标题。
  备用：另一条考研万赞视频 https://v.douyin.com/Q-7qL8F20R4/
*/
export type WorkSlot = {
  slot: string;
  platform: string;
  /** 占位态展示的内容形态提示（公开可见） */
  hint: string;
  title: string | null;
  href: string | null;
  /** 单条真实数据，如「单条赞藏 7K+」——必须可核验 */
  stat: string | null;
};

export const selectedWorks: readonly WorkSlot[] = [
  {
    slot: '01',
    platform: '抖音作品',
    hint: '短视频讲创作与工作流',
    title: 'vibecoding 最佳实践，大佬都在用的极简工作流',
    href: 'https://v.douyin.com/AwDt_hEYFAc/',
    stat: '单条赞藏 7K+',
  },
  {
    slot: '02',
    platform: '抖音作品',
    hint: '个人网站制作教程',
    title: '如何从 0 到 1 制作自己的个人网站',
    href: 'https://v.douyin.com/tBcT1w3yJRs',
    stat: '单条赞藏 500+',
  },
  {
    slot: '03',
    platform: 'X',
    hint: '英文输出',
    title: '如何成为一颗冉冉升起的学术新星：三个 AI 赋能论文写作的方法',
    href: 'https://x.com/lnxinsh00633331/status/2070782483159732644',
    stat: '赞 + 书签 1K+',
  },
  {
    slot: '04',
    platform: 'X 观点',
    hint: '财富自由路径讨论',
    title: '普通人最快实现财富自由的路径',
    href: 'https://x.com/lnxinsh00633331/status/2072684791095324770?s=20',
    stat: '单篇 20K+ 浏览',
  },
  {
    slot: '05',
    platform: '小红书',
    hint: 'AI PPT 制作教程',
    title: '如何用 AI 做出精美 PPT',
    href: 'https://www.xiaohongshu.com/discovery/item/6a049fd6000000003503a59e?source=webshare&xhsshare=pc_web&xsec_token=ABviu0T7n-sCqwGDGkmaZafeJfPTMFGD38EY2n244LLnY=&xsec_source=pc_share',
    stat: 'AI 创作内容累计 14K+ 赞藏',
  },
];

// 联系方式 (DESIGN §06)。微信为主（号可复制；二维码图待接入），邮箱次级。
export const contact = {
  headline: '有合适的项目、内容合作，或者只是想聊聊？',
  email: identity.email,
  wechat: 'Edwardon23',
  links: [
    { label: 'GitHub', href: identity.github },
    { label: '抖音', href: 'https://www.douyin.com/user/MS4wLjABAAAAQn5DxuKcbNPeh-1dvPJ6YjCUu0dYhSvanWFgI7PBOU7zxidoyL6dSrNFOVISBkaH' },
    { label: '小红书', href: 'https://www.xiaohongshu.com/user/profile/62c44930000000001b024533' },
    { label: 'X', href: 'https://x.com/lnxinsh00633331' },
    { label: 'Threads', href: 'https://www.threads.com/@ledwardsama' },
  ],
} as const;

// 关于页关注领域关键词 (DESIGN §05 About)
export const interests = [
  'AI workflow',
  'Content systems',
  'Creative coding',
  'Agent orchestration',
  'Interactive publishing',
] as const;
