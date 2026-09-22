import path from 'node:path'
import type { NextConfig } from 'next'

// Admin-uploaded team photos are served from Supabase Storage, so next/image
// needs that host allow-listed — scoped to the one bucket it's allowed to read.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseHostname = supabaseUrl ? new URL(supabaseUrl).hostname : undefined

const nextConfig: NextConfig = {
  // Pin the workspace root so Turbopack ignores lockfiles further up the tree.
  turbopack: { root: path.resolve('.') },
  images: {
    remotePatterns: supabaseHostname
      ? [
          {
            protocol: 'https',
            hostname: supabaseHostname,
            pathname: '/storage/v1/object/public/team-photos/**',
          },
        ]
      : [],
  },
}

export default nextConfig
