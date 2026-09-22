'use client'

import Image from 'next/image'
import { ActionButton, ManagedForm } from '@/components/ManagedForm'
import { Empty, Label, PageTitle, Panel } from '@/components/ui'
import {
  deleteTeamPhotoAction,
  uploadTeamPhotoAction,
} from '@/app/admin/team-photos/actions'
import type { TeamPhotoForAdmin } from '@/lib/team-photos'

export function TeamPhotosManager({ photos }: { photos: TeamPhotoForAdmin[] }) {
  return (
    <>
      <PageTitle sub="Shown in rotation on the dashboard banner, after the bundled squad photo. JPEG, PNG, WEBP, AVIF, or GIF, up to 8MB.">
        Team photos
      </PageTitle>

      <Panel className="mb-6 p-4">
        <ManagedForm
          action={uploadTeamPhotoAction}
          submitLabel="Upload"
          alwaysEnabled
          resetOnSuccess
          highlightDirty={false}
        >
          <div>
            <Label htmlFor="tp-photo">Photo</Label>
            <input
              id="tp-photo"
              name="photo"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
              required
              className="block w-full text-sm text-muted file:mr-3 file:min-h-10 file:rounded-xl file:border-0 file:bg-accent file:px-3.5 file:text-sm file:font-semibold file:text-accent-fg hover:file:bg-accent-hover"
            />
          </div>
        </ManagedForm>
      </Panel>

      {photos.length === 0 ? (
        <Empty>No uploaded photos yet — the bundled squad photo is shown alone.</Empty>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {photos.map((photo) => (
            <Panel key={photo.id} className="overflow-hidden">
              <div className="relative aspect-square bg-surface-2">
                <Image
                  src={photo.url}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 25vw, 50vw"
                  className="object-cover"
                />
              </div>
              <div className="flex items-center justify-end p-2">
                <ActionButton
                  action={deleteTeamPhotoAction}
                  hidden={{ id: photo.id, storage_path: photo.storagePath }}
                  label="Remove"
                  pendingLabel="…"
                  variant="danger"
                  confirm="Remove this photo from the banner?"
                />
              </div>
            </Panel>
          ))}
        </div>
      )}
    </>
  )
}
