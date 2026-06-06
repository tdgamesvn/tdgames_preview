/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow building into a side directory (e.g. `.next-build`) during atomic
  // deploys so the live `.next` keeps serving until the new build is swapped in.
  // Defaults to `.next` for normal `next build` / `next start`.
  distDir: process.env.NEXT_DIST_DIR || '.next',

  // shadcn/ui components generated for @base-ui/react have type mismatches
  // in their className prop handling — suppress until shadcn ships a fix.
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
