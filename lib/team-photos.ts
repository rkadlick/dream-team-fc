import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@/lib/supabase/server'
import { getTeamPhotoUploads } from '@/lib/queries'

const TEAM_PHOTOS_DIR = path.join(process.cwd(), 'public', 'team')
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif'])
const STORAGE_BUCKET = 'team-photos'

// Whichever photo currently leads the rotation; everything else follows
// alphabetically, so dropping a new file into public/team just works.
const FEATURED_FIRST = 'squad.jpg'

/** Photos bundled in the repo under public/team — always shown first. */
function getBundledTeamPhotos(): string[] {
  let files: string[]
  try {
    files = fs.readdirSync(TEAM_PHOTOS_DIR)
  } catch {
    return []
  }

  return files
    .filter((f) => IMAGE_EXTENSIONS.has(path.extname(f).toLowerCase()))
    .sort((a, b) => {
      if (a === FEATURED_FIRST) return -1
      if (b === FEATURED_FIRST) return 1
      return a.localeCompare(b)
    })
    .map((f) => `/team/${f}`)
}

/** Bundled photos, followed by everything admins have uploaded (oldest first). */
export async function getTeamPhotos(): Promise<string[]> {
  const bundled = getBundledTeamPhotos()
  const uploads = await getTeamPhotoUploads()
  if (uploads.length === 0) return bundled

  const supabase = await createClient()
  const uploadUrls = uploads.map(
    (photo) =>
      supabase.storage.from(STORAGE_BUCKET).getPublicUrl(photo.storage_path).data
        .publicUrl
  )
  return [...bundled, ...uploadUrls]
}

export type TeamPhotoForAdmin = {
  id: string
  url: string
  storagePath: string
  createdAt: string
}

/** Only the admin-managed uploads — the admin tool can't touch the bundled photo. */
export async function getTeamPhotosForAdmin(): Promise<TeamPhotoForAdmin[]> {
  const uploads = await getTeamPhotoUploads()
  const supabase = await createClient()
  return uploads.map((photo) => ({
    id: photo.id,
    url: supabase.storage.from(STORAGE_BUCKET).getPublicUrl(photo.storage_path).data
      .publicUrl,
    storagePath: photo.storage_path,
    createdAt: photo.created_at,
  }))
}
