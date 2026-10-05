/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export keeps hosting free (GitHub Pages, Netlify, Cloudflare Pages, a USB stick + any static server).
  output: 'export',
  trailingSlash: true,
  reactStrictMode: true,
  images: { unoptimized: true },
};

export default nextConfig;
