import type { NextConfig } from "next";
// import createMDX from '@next/mdx';
import createNextIntlPlugin from 'next-intl/plugin';
const withNextIntl = createNextIntlPlugin();
const nextConfig: NextConfig = {
  // pageExtensions: ['js', 'jsx', 'md', 'mdx', 'ts', 'tsx'],
  // output: 'export',
  distDir: './dist',
  // 防止dev模式下模拟立即卸载组件和重新挂载组件的行为
  reactStrictMode: false,
  async rewrites() {
    return [
      {
        source: '/api/:path*', // 匹配所有以 /api 开头的请求
        // destination: 'http://124.222.70.73:9080/api/:path*', // 代理到指定的外部 API
        destination: 'https://www.light4ai.com/api/:path*', // 代理到指定的外部 API
      },
      {
        source: '/adh/:path*', // 匹配所有以 /adh 开头的请求
        destination: 'http://127.0.0.1:8000/adh/:path*', // 代理到指定的外部 API
        // destination: 'https://www.light4ai.com/adh/:path*', // 代理到指定的外部 API
      }
    ];
  },
};

// const withMDX = createMDX({
//   // Add markdown plugins here, as desired
// })

// export default withMDX(withNextIntl(nextConfig));
export default withNextIntl(nextConfig);
