/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // @react-pdf/renderer must run as a native Node module inside route handlers
    serverComponentsExternalPackages: ['@react-pdf/renderer'],
  },
};

export default nextConfig;
