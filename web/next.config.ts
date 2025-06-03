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
};

// const withMDX = createMDX({
//   // Add markdown plugins here, as desired
// })

// export default withMDX(withNextIntl(nextConfig));
export default withNextIntl(nextConfig);
