/**
 * The public website, exported as static HTML into out/ and laid over the
 * ERP's dist/ by ../scripts/merge-site.mjs: each page keeps its old address
 * (app/about -> /about.html) next to the ERP at /computercentre/.
 */
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  trailingSlash: false,
  images: { unoptimized: true },
};

export default nextConfig;
