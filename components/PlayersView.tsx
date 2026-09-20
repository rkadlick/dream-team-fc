'use client'

import { useCallback, useState } from 'react'
import { Empty, PageTitle, Pill, SectionTitle } from '@/components/ui'
import { SeasonTabs } from '@/components/SeasonTabs'
import { PlayersTable, type LeaderboardRow } from '@/components/PlayersTable'
import {
  AddPlayerButton,
  RosterAdmin,
  type EditablePlayer,
} from '@/components/RosterAdmin'

export function PlayersView({
  rows,
  seasons,
  currentSeason,
  isAdmin,
  editablePlayers,
}: {
  rows: LeaderboardRow[]
  seasons: { value: string; label: string }[]
  currentSeason: string
  isAdmin: boolean
  editablePlayers: EditablePlayer[]
}) {
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const closeAdd = useCallback(() => setAdding(false), [])
  const closeEdit = useCallback(() => setEditingId(null), [])

  // Shown by default; hiding is a per-visit convenience, not a setting.
  const [showInactive, setShowInactive] = useState(true)

  const activeRows = rows.filter((r) => r.isActive)
  const inactiveRows = rows.filter((r) => !r.isActive)
  const activeCount = activeRows.length

  return (
    <>
      <PageTitle
        sub={
          isAdmin
            ? 'Tap the pencil on any row to edit that player.'
            : undefined
        }
        action={
          <>
            <Pill>
              {activeCount} active{activeCount !== rows.length && ` · ${rows.length} total`}
            </Pill>
            {isAdmin && <AddPlayerButton onClick={() => setAdding(true)} />}
          </>
        }
      >
        Players
      </PageTitle>

      <SeasonTabs
        seasons={seasons}
        current={currentSeason}
        basePath="/players"
      />

      {rows.length === 0 ? (
        <Empty>
          No players on the roster yet.
          {isAdmin && ' Use “Add player” to start one.'}
        </Empty>
      ) : (
        <div className="space-y-8">
          <section>
            <SectionTitle>
              <span className="inline-flex items-center gap-2 text-sm tracking-[0.12em] text-fg">
                <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-accent" />
                Active
                <Pill tone="accent">{activeRows.length}</Pill>
              </span>
            </SectionTitle>
            {activeRows.length === 0 ? (
              <Empty>No active players.</Empty>
            ) : (
              <PlayersTable
                rows={activeRows}
                onEdit={isAdmin ? setEditingId : undefined}
              />
            )}
          </section>

          {inactiveRows.length > 0 && (
            <section>
              <SectionTitle
                action={
                  <button
                    type="button"
                    onClick={() => setShowInactive((v) => !v)}
                    aria-expanded={showInactive}
                    className="text-xs font-medium text-accent-text"
                  >
                    {showInactive ? 'Hide' : 'Show'}
                  </button>
                }
              >
                <span className="inline-flex items-center gap-2 text-sm tracking-[0.12em] text-muted">
                  <span
                    aria-hidden
                    className="h-2.5 w-2.5 rounded-full border-2 border-faint"
                  />
                  Inactive
                  <Pill>{inactiveRows.length}</Pill>
                </span>
              </SectionTitle>
              {showInactive && (
                <>
                  <p className="mb-2 text-xs text-faint">
                    Not on the current roster and left out of new matches.
                    Their stats are kept.
                  </p>
                  <PlayersTable
                    rows={inactiveRows}
                    onEdit={isAdmin ? setEditingId : undefined}
                    inactive
                  />
                </>
              )}
            </section>
          )}
        </div>
      )}

      <p className="mt-3 text-xs text-faint">
        Games played counts every match a player was listed in, AI teammates
        included. AI appearances were only recorded from the point that tracking
        began, so their earlier games are not counted. A “—” means the stat was
        never recorded, which is not the same as zero.
      </p>

      {isAdmin && (
        <RosterAdmin
          players={editablePlayers}
          adding={adding}
          onCloseAdd={closeAdd}
          editingId={editingId}
          onCloseEdit={closeEdit}
        />
      )}
    </>
  )
}
