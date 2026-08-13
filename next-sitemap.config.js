/** @type {import('next-sitemap').IConfig} */
const siteUrl = process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_APP_URL.includes('yourdomain.com')
  ? process.env.NEXT_PUBLIC_APP_URL
  : 'https://nowbuild.ai';

module.exports = {
  siteUrl,
  generateRobotsTxt: false,
  generateIndexSitemap: false,
  exclude: ['/api/*', '/sign-in*', '/sign-up*'],
  alternateRefs: [
    { href: `${siteUrl}/en`, hreflang: 'en' },
    { href: `${siteUrl}/zh`, hreflang: 'zh' },
  ],
};
