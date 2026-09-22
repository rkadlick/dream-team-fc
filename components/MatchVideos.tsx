'use client'

import { ActionButton, ManagedForm } from '@/components/ManagedForm'
import { Draft, Empty, Label, Panel, SectionTitle, fieldStyles } from '@/components/ui'
import { VIDEO_KINDS, VIDEO_KIND_LABELS, type VideoKind } from '@/lib/constants'
import { parseYoutubeId, youtubeEmbedUrl } from '@/lib/youtube'
import type { MatchVideo } from '@/lib/queries'
import {
  addMatchVideoAction,
  deleteMatchVideoAction,
} from '@/app/admin/matches/video-actions'

export function MatchVideos({
  matchId,
  videos,
  isAdmin,
}: {
  matchId: string
  videos: MatchVideo[]
  isAdmin: boolean
}) {
  if (videos.length === 0 && !isAdmin) return null

  const groups = VIDEO_KINDS.map((kind) => ({
    kind,
    items: videos.filter((v) => v.kind === kind),
  })).filter((g) => g.items.length > 0)

  return (
    <section>
      <SectionTitle>Videos</SectionTitle>

      {videos.length === 0 ? (
        <Empty>No videos linked yet.</Empty>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.kind}>
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-faint">
                {VIDEO_KIND_LABELS[group.kind]}
                {group.items.length > 1 ? 's' : ''}
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {group.items.map((video) => {
                  const id = parseYoutubeId(video.url)
                  return (
                    <Panel key={video.id} className="overflow-hidden">
                      <div className="aspect-video w-full bg-surface-2">
                        {id ? (
                          <iframe
                            src={youtubeEmbedUrl(id)}
                            title={
                              video.title ??
                              VIDEO_KIND_LABELS[video.kind as VideoKind]
                            }
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                            className="h-full w-full"
                          />
                        ) : (
                          <a
                            href={video.url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex h-full items-center justify-center px-4 text-center text-sm text-accent-text underline"
                          >
                            {video.url}
                          </a>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-2 px-4 py-2.5">
                        <span className="min-w-0 truncate text-sm font-medium">
                          {video.title ||
                            VIDEO_KIND_LABELS[video.kind as VideoKind]}
                        </span>
                        {isAdmin && (
                          <ActionButton
                            action={deleteMatchVideoAction}
                            hidden={{ id: video.id, match_id: matchId }}
                            label="Remove"
                            pendingLabel="…"
                            variant="quiet"
                            confirm="Remove this video?"
                          />
                        )}
                      </div>
                    </Panel>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {isAdmin && (
        <Draft className="mt-4 p-4">
          <ManagedForm
            action={addMatchVideoAction}
            submitLabel="Add video"
            alwaysEnabled
            resetOnSuccess
            highlightDirty={false}
          >
            <input type="hidden" name="match_id" value={matchId} />
            <div>
              <Label htmlFor="video-url">YouTube link</Label>
              <input
                id="video-url"
                name="url"
                required
                placeholder="https://youtube.com/watch?v=..."
                className={fieldStyles}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="video-kind">Type</Label>
                <select
                  id="video-kind"
                  name="kind"
                  defaultValue="highlight"
                  className={fieldStyles}
                >
                  {VIDEO_KINDS.map((kind) => (
                    <option key={kind} value={kind}>
                      {VIDEO_KIND_LABELS[kind]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="video-title">Title (optional)</Label>
                <input
                  id="video-title"
                  name="title"
                  placeholder="2nd half comeback"
                  className={fieldStyles}
                />
              </div>
            </div>
          </ManagedForm>
        </Draft>
      )}
    </section>
  )
}
