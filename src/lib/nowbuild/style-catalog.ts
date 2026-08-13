export const styleIds = [
  'apple-glass', 'notion-editorial', 'stripe-gradient', 'linear-dark',
  'vercel-mono', 'rams-functional', 'swiss-grid', 'japanese-ma',
  'scandinavian', 'neo-brutalist', 'art-deco', 'neo-memphis',
  'creator-collage', 'portfolio-editorial', 'cinematic-photo', 'consultant-proof',
  'developer-terminal', 'writer-journal', 'academic-folio', 'canva-anti-design',
] as const;

export type StyleId = (typeof styleIds)[number];
export type StyleCategory = 'familiar' | 'minimal' | 'expressive' | 'luxury';

export type StyleProfile = {
  id: StyleId;
  name: string;
  inspiration: string;
  category: StyleCategory;
  note: string;
  bestFor: string;
  principles: string[];
  palette: [string, string, string];
  theme: { bg: string; surface: string; ink: string; muted: string; accent: string; accentInk: string; radius: string };
  preview: { motif: 'glass' | 'document' | 'gradient' | 'dark-grid' | 'mono' | 'grid' | 'space' | 'cards' | 'raw' | 'deco' | 'shapes'; align: 'left' | 'center' | 'offset' };
  typography: string;
  motion: string;
};

export const styleCatalog: StyleProfile[] = [
  { id: 'apple-glass', name: 'Precision Glass', inspiration: 'Apple-inspired', category: 'familiar', note: '精密留白、半透明材质与克制动效', bestFor: '高端 AI、消费级效率产品', principles: ['layered material', 'quiet scale', 'restrained motion'], palette: ['#f5f5f7', '#0071e3', '#1d1d1f'], theme: { bg: '#f5f5f7', surface: '#ffffffcc', ink: '#1d1d1f', muted: '#6e6e73', accent: '#0071e3', accentInk: '#ffffff', radius: '24px' }, preview: { motif: 'glass', align: 'center' }, typography: 'large quiet grotesk', motion: 'smooth material transitions' },
  { id: 'notion-editorial', name: 'Document Warmth', inspiration: 'Notion-inspired', category: 'familiar', note: '文档感、暖白底与内容优先的块式布局', bestFor: '知识、写作、团队协作', principles: ['content first', 'compact utility', 'warm paper'], palette: ['#fbfbfa', '#2f3437', '#e16259'], theme: { bg: '#fbfbfa', surface: '#ffffff', ink: '#2f3437', muted: '#787774', accent: '#e16259', accentInk: '#ffffff', radius: '8px' }, preview: { motif: 'document', align: 'left' }, typography: 'humanist sans with editorial rhythm', motion: 'direct and calm' },
  { id: 'stripe-gradient', name: 'Gradient Commerce', inspiration: 'Stripe-inspired', category: 'familiar', note: '技术网格、光谱渐变与强转化层级', bestFor: '金融、支付、API 产品', principles: ['technical confidence', 'spectral accent', 'conversion hierarchy'], palette: ['#0a2540', '#635bff', '#00d4ff'], theme: { bg: '#f6f9fc', surface: '#ffffff', ink: '#0a2540', muted: '#425466', accent: '#635bff', accentInk: '#ffffff', radius: '14px' }, preview: { motif: 'gradient', align: 'left' }, typography: 'confident neo-grotesk', motion: 'layered gradient drift' },
  { id: 'linear-dark', name: 'Focused Dark', inspiration: 'Linear-inspired', category: 'familiar', note: '冷黑界面、发丝边框与键盘优先密度', bestFor: '开发者与生产力工具', principles: ['focus', 'dense utility', 'subtle glow'], palette: ['#0f1014', '#8b7cff', '#f7f8f8'], theme: { bg: '#0f1014', surface: '#17181d', ink: '#f7f8f8', muted: '#92939b', accent: '#8b7cff', accentInk: '#ffffff', radius: '10px' }, preview: { motif: 'dark-grid', align: 'left' }, typography: 'compact modern sans', motion: 'fast precise reveals' },
  { id: 'vercel-mono', name: 'Monochrome Launch', inspiration: 'Vercel-inspired', category: 'familiar', note: '纯黑白、Mono 细节与硬朗发布状态', bestFor: '开发平台与基础设施', principles: ['monochrome', 'proof through state', 'hard grid'], palette: ['#000000', '#ffffff', '#888888'], theme: { bg: '#ffffff', surface: '#fafafa', ink: '#000000', muted: '#666666', accent: '#000000', accentInk: '#ffffff', radius: '8px' }, preview: { motif: 'mono', align: 'center' }, typography: 'geometric sans plus mono', motion: 'minimal state transitions' },
  { id: 'rams-functional', name: 'Less, but Better', inspiration: 'Dieter Rams', category: 'minimal', note: '严格功能层级、单一强调色与精确节奏', bestFor: 'B2B 工具与运营系统', principles: ['useful', 'understandable', 'as little design as possible'], palette: ['#f2f1ed', '#e12d2d', '#20211f'], theme: { bg: '#f2f1ed', surface: '#ffffff', ink: '#20211f', muted: '#696a66', accent: '#e12d2d', accentInk: '#ffffff', radius: '2px' }, preview: { motif: 'grid', align: 'left' }, typography: 'precise functional sans', motion: 'only when informative' },
  { id: 'swiss-grid', name: 'International Grid', inspiration: 'Swiss Style', category: 'minimal', note: '非对称网格、巨大字阶与结构线', bestFor: '设计机构、数据与研究产品', principles: ['objective grid', 'type contrast', 'flat structure'], palette: ['#f4f1ea', '#ff3b30', '#111111'], theme: { bg: '#f4f1ea', surface: '#ffffff', ink: '#111111', muted: '#5f5f5a', accent: '#ff3b30', accentInk: '#ffffff', radius: '0px' }, preview: { motif: 'grid', align: 'offset' }, typography: 'international grotesk', motion: 'grid-respecting reveals' },
  { id: 'japanese-ma', name: 'Quiet Ma', inspiration: 'Japanese minimalism', category: 'minimal', note: '大量负空间、暖中性色与极细边界', bestFor: '健康、生活方式与高端服务', principles: ['negative space', 'quiet hierarchy', 'natural material'], palette: ['#f2efe8', '#647264', '#252723'], theme: { bg: '#f2efe8', surface: '#faf8f2', ink: '#252723', muted: '#74766f', accent: '#647264', accentInk: '#ffffff', radius: '1px' }, preview: { motif: 'space', align: 'offset' }, typography: 'light sans or restrained serif', motion: 'slow gentle fades' },
  { id: 'scandinavian', name: 'Human Utility', inspiration: 'Scandinavian', category: 'minimal', note: '友好字体、自然配色与柔和功能卡片', bestFor: '团队与消费级 SaaS', principles: ['warm function', 'accessible', 'open layout'], palette: ['#f7f3eb', '#427a6b', '#25312e'], theme: { bg: '#f7f3eb', surface: '#fffdfa', ink: '#25312e', muted: '#6d7772', accent: '#427a6b', accentInk: '#ffffff', radius: '18px' }, preview: { motif: 'cards', align: 'left' }, typography: 'friendly rounded sans', motion: 'gentle natural easing' },
  { id: 'neo-brutalist', name: 'Raw Signal', inspiration: 'Neo Brutalism', category: 'expressive', note: '粗边框、硬阴影与不绕弯的表达', bestFor: '创作者、社区与年轻产品', principles: ['visible structure', 'direct copy', 'hard contrast'], palette: ['#fff86a', '#ff5c35', '#111111'], theme: { bg: '#fff86a', surface: '#ffffff', ink: '#111111', muted: '#4a4a3a', accent: '#ff5c35', accentInk: '#111111', radius: '0px' }, preview: { motif: 'raw', align: 'left' }, typography: 'bold grotesk plus mono', motion: 'hard cuts and tactile shifts' },
  { id: 'art-deco', name: 'Geometric Prestige', inspiration: 'Art Deco', category: 'luxury', note: '轴线对称、建筑边框与深色金属感', bestFor: '奢侈品、活动与高客单服务', principles: ['symmetry', 'ornamental geometry', 'statement type'], palette: ['#071d25', '#d8b56b', '#f4efe5'], theme: { bg: '#071d25', surface: '#0d2a34', ink: '#f4efe5', muted: '#b9b4a7', accent: '#d8b56b', accentInk: '#071d25', radius: '0px' }, preview: { motif: 'deco', align: 'center' }, typography: 'geometric display plus serif', motion: 'elegant staggered reveals' },
  { id: 'neo-memphis', name: 'Playful Motion', inspiration: 'Neo Memphis', category: 'expressive', note: '破格网格、大胆色块与富有性格的形状', bestFor: '教育、儿童与创意工具', principles: ['playful chaos', 'flat color', 'expressive shapes'], palette: ['#fff4d8', '#ff4da6', '#1e4dff'], theme: { bg: '#fff4d8', surface: '#ffffff', ink: '#151515', muted: '#5c574f', accent: '#ff4da6', accentInk: '#151515', radius: '22px' }, preview: { motif: 'shapes', align: 'offset' }, typography: 'oversized expressive sans', motion: 'bouncy tactile motion' },
  { id: 'creator-collage', name: 'Creator Collage', inspiration: 'Digital scrapbook', category: 'expressive', note: '贴纸、手写注释与作品拼贴形成强个人感', bestFor: '内容创作者、插画师、独立艺术家', principles: ['layered collage', 'handwritten notes', 'work-first storytelling'], palette: ['#f4eddf', '#ef5b38', '#1725d1'], theme: { bg: '#f4eddf', surface: '#fffaf0', ink: '#191714', muted: '#726a60', accent: '#ef5b38', accentInk: '#111111', radius: '4px' }, preview: { motif: 'shapes', align: 'offset' }, typography: 'condensed display plus handwritten accent', motion: 'paper-like staggered reveals' },
  { id: 'portfolio-editorial', name: 'Portfolio Issue', inspiration: 'Independent magazine', category: 'luxury', note: '把履历与案例做成一期高端人物杂志', bestFor: '设计师、创意总监、建筑师', principles: ['editorial spread', 'dramatic serif', 'project captions'], palette: ['#efe9df', '#b72f29', '#161513'], theme: { bg: '#efe9df', surface: '#f9f5ed', ink: '#161513', muted: '#746e66', accent: '#b72f29', accentInk: '#ffffff', radius: '0px' }, preview: { motif: 'document', align: 'left' }, typography: 'dramatic serif plus narrow grotesk', motion: 'cinematic page turns' },
  { id: 'cinematic-photo', name: 'Cinematic Portrait', inspiration: 'Film title sequence', category: 'luxury', note: '全屏肖像、电影字幕与缓慢叙事节奏', bestFor: '摄影师、导演、模特、音乐人', principles: ['full-bleed portrait', 'title-sequence type', 'minimal chrome'], palette: ['#0d0d0e', '#e3ff64', '#eee9df'], theme: { bg: '#0d0d0e', surface: '#181819', ink: '#eee9df', muted: '#98948c', accent: '#e3ff64', accentInk: '#10110c', radius: '0px' }, preview: { motif: 'dark-grid', align: 'center' }, typography: 'cinematic condensed display', motion: 'slow cross-fades and parallax' },
  { id: 'consultant-proof', name: 'Proof-led Expert', inspiration: 'Strategy memo', category: 'minimal', note: '先展示结果、方法和可信证据，再引导预约', bestFor: '顾问、教练、自由职业专家', principles: ['proof before bio', 'clear offer', 'case-study metrics'], palette: ['#f7f2e7', '#1f604f', '#1b2824'], theme: { bg: '#f7f2e7', surface: '#fffdf7', ink: '#1b2824', muted: '#68756f', accent: '#1f604f', accentInk: '#ffffff', radius: '12px' }, preview: { motif: 'cards', align: 'left' }, typography: 'credible humanist sans plus serif accent', motion: 'calm evidence reveals' },
  { id: 'developer-terminal', name: 'Terminal Identity', inspiration: 'CLI and source control', category: 'familiar', note: '终端叙事、提交记录与项目证据替代传统简历', bestFor: '开发者、独立黑客、技术创始人', principles: ['terminal narrative', 'shipping evidence', 'keyboard utility'], palette: ['#080b09', '#7cff8a', '#e7ede9'], theme: { bg: '#080b09', surface: '#101612', ink: '#e7ede9', muted: '#7e9184', accent: '#7cff8a', accentInk: '#071008', radius: '8px' }, preview: { motif: 'dark-grid', align: 'left' }, typography: 'monospace-first with bold grotesk', motion: 'cursor and command reveals' },
  { id: 'writer-journal', name: 'Writer Journal', inspiration: 'Literary journal', category: 'minimal', note: '文章、书摘与个人观点构成可持续更新的主页', bestFor: '作者、记者、研究者、播客主', principles: ['reading rhythm', 'issue archive', 'quiet voice'], palette: ['#f6f0e5', '#335f8a', '#28231f'], theme: { bg: '#f6f0e5', surface: '#fffaf2', ink: '#28231f', muted: '#756d65', accent: '#335f8a', accentInk: '#ffffff', radius: '2px' }, preview: { motif: 'document', align: 'left' }, typography: 'literary serif plus utilitarian sans', motion: 'subtle ink fades' },
  { id: 'academic-folio', name: 'Research Folio', inspiration: 'Academic index', category: 'minimal', note: '研究成果、论文和演讲按索引组织，严谨但不沉闷', bestFor: '学者、研究员、科学传播者', principles: ['searchable index', 'citation hierarchy', 'dense clarity'], palette: ['#f8f8f5', '#2746a8', '#161a23'], theme: { bg: '#f8f8f5', surface: '#ffffff', ink: '#161a23', muted: '#687080', accent: '#2746a8', accentInk: '#ffffff', radius: '4px' }, preview: { motif: 'grid', align: 'left' }, typography: 'scholarly serif plus data sans', motion: 'minimal index transitions' },
  { id: 'canva-anti-design', name: 'Bold Personal Poster', inspiration: 'Canva anti-design trend', category: 'expressive', note: '海报级大字、强烈撞色与不规则个人品牌版式', bestFor: '时尚、营销、Gen-Z 个人品牌', principles: ['poster composition', 'clashing color', 'personality over polish'], palette: ['#f7edcf', '#f044a7', '#161616'], theme: { bg: '#f7edcf', surface: '#fff8e5', ink: '#161616', muted: '#615b50', accent: '#f044a7', accentInk: '#111111', radius: '0px' }, preview: { motif: 'raw', align: 'offset' }, typography: 'oversized poster sans plus expressive script', motion: 'hard-cut poster transitions' },
];

export const styleCatalogById = Object.fromEntries(styleCatalog.map((style) => [style.id, style])) as Record<StyleId, StyleProfile>;

export function isStyleId(value: string): value is StyleId {
  return (styleIds as readonly string[]).includes(value);
}

export function normalizeStyleId(value: string): StyleId {
  if (isStyleId(value)) return value;
  if (value === 'signal') return 'linear-dark';
  if (value === 'editorial') return 'notion-editorial';
  return 'scandinavian';
}

export function styleCatalogPrompt() {
  return styleCatalog.map(({ id, name, note, bestFor, principles }) => `${id}: ${name}; ${note}; best for ${bestFor}; rules: ${principles.join(', ')}`).join('\n');
}
