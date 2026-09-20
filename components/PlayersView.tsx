'use client'

import { useCallback, useState } from 'react'
import { Empty, PageTitle, Pill } from '@/components/ui'
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

  const activeCount = rows.filter((r) => r.isActive).length

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
        <PlayersTable
          rows={rows}
          onEdit={isAdmin ? setEditingId : undefined}
        />
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
