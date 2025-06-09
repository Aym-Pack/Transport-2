/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [], // Add packages from 'packages/' that need transpilation, e.g. ['@samatransport/ui']
  // experimental: {
  //   appDir: true, // Assuming App Router
  // },
};

module.exports = nextConfig;
