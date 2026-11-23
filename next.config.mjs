/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // @react-pdf/renderer must run as a native Node module inside route handlers
    serverComponentsExternalPackages: ['@react-pdf/renderer'],
    // pdfkit loads its built-in fonts lazily via `require('#standard-fonts/…')`,
    // which Vercel's file tracer can't follow. Ship them with the PDF route explicitly.
    outputFileTracingIncludes: {
      // Also ship the embedded Noto fonts (read from disk at render time).
      '/api/scorecard/**': ['./node_modules/pdfkit/js/standard-fonts/**/*', './lib/pdf/fonts/**/*'],
    },
  },
};

export default nextConfig;
