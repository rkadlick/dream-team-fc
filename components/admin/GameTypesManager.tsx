'use client'

import { useCallback, useState } from 'react'
import { Modal } from '@/components/Modal'
import { ActionButton, ManagedForm } from '@/components/ManagedForm'
import {
  Button,
  Empty,
  Label,
  PageTitle,
  Panel,
  fieldStyles,
  iconButtonStyles,
} from '@/components/ui'
import {
  createGameTypeAction,
  toggleGameTypeAction,
  updateGameTypeAction,
} from '@/app/admin/game-types/actions'

export type GameTypeItem = {
  id: string
  name: string
  is_active: boolean
  matchCount: number
}

export function GameTypesManager({ gameTypes }: { gameTypes: GameTypeItem[] }) {
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const closeAdd = useCallback(() => setAdding(false), [])
  const closeEdit = useCallback(() => setEditingId(null), [])

  const editing = gameTypes.find((g) => g.id === editingId) ?? null
  const active = gameTypes.filter((g) => g.is_active)
  const inactive = gameTypes.filter((g) => !g.is_active)

  // One line per game type. A game type is a name and a yes/no — it never
  // needed a card each.
  const row = (gameType: GameTypeItem) => (
    <div
      key={gameType.id}
      className="flex items-center gap-3 px-4 py-2.5"
    >
      <span
        aria-hidden
        className={`h-2 w-2 shrink-0 rounded-full ${
          gameType.is_active ? 'bg-accent' : 'bg-line-strong'
        }`}
      />
      <span
        className={`min-w-0 flex-1 truncate font-medium ${
          gameType.is_active ? '' : 'text-faint'
        }`}
      >
        {gameType.name}
      </span>
      <span className="shrink-0 text-xs tabular-nums text-faint">
        {gameType.matchCount}
      </span>
      <div className="flex shrink-0 items-center gap-1.5">
        <ActionButton
          action={toggleGameTypeAction}
          hidden={{ id: gameType.id, next: gameType.is_active ? 'false' : 'true' }}
          label={gameType.is_active ? 'Active' : 'Inactive'}
          pendingLabel="…"
          variant={gameType.is_active ? 'secondary' : 'quiet'}
        />
        <button
          type="button"
          onClick={() => setEditingId(gameType.id)}
          aria-label={`Rename ${gameType.name}`}
          className={iconButtonStyles()}
        >
          <span aria-hidden>✎</span>
        </button>
      </div>
    </div>
  )

  return (
    <>
      <PageTitle
        sub="Named tournaments (for example “Summer Cup”) are their own game type. Only active ones appear in the match form."
        action={
          <Button onClick={() => setAdding(true)}>
            <span aria-hidden>＋</span> New game type
          </Button>
        }
      >
        Game types
      </PageTitle>

      {gameTypes.length === 0 ? (
        <Empty>No game types yet.</Empty>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <section>
            <div className="mb-2 flex items-baseline justify-between px-1">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-faint">
                Active
              </h2>
              <span className="text-[11px] text-faint">matches</span>
            </div>
            {active.length === 0 ? (
              <Empty>None active.</Empty>
            ) : (
              <Panel className="divide-y divide-line">{active.map(row)}</Panel>
            )}
          </section>

          <section>
            <div className="mb-2 flex items-baseline justify-between px-1">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-faint">
                Inactive
              </h2>
              <span className="text-[11px] text-faint">matches</span>
            </div>
            {inactive.length === 0 ? (
              <Empty>None retired.</Empty>
            ) : (
              <Panel className="divide-y divide-line">{inactive.map(row)}</Panel>
            )}
          </section>
        </div>
      )}

      <Modal open={adding} onClose={closeAdd} title="New game type" size="sm">
        <ManagedForm
          action={createGameTypeAction}
          submitLabel="Add"
          alwaysEnabled
          resetOnSuccess
          highlightDirty={false}
          onSuccess={closeAdd}
        >
          <div>
            <Label htmlFor="gt-name">Name</Label>
            <input
              id="gt-name"
              name="name"
              required
              placeholder="Summer Cup"
              className={fieldStyles}
            />
          </div>
        </ManagedForm>
      </Modal>

      <Modal
        open={editing !== null}
        onClose={closeEdit}
        title={editing ? `Edit ${editing.name}` : 'Edit game type'}
        size="sm"
      >
        {editing && (
          <ManagedForm
            key={editing.id}
            action={updateGameTypeAction}
            submitLabel="Save changes"
            onSuccess={closeEdit}
          >
            <input type="hidden" name="id" value={editing.id} />
            <div>
              <Label htmlFor={`gt-${editing.id}`}>Name</Label>
              <input
                id={`gt-${editing.id}`}
                name="name"
                defaultValue={editing.name}
                required
                className={fieldStyles}
              />
            </div>
            <label className="flex min-h-10 items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="is_active"
                defaultChecked={editing.is_active}
                className="h-5 w-5 accent-[var(--dt-accent)]"
              />
              Active (shown in the match form)
            </label>
          </ManagedForm>
        )}
      </Modal>
    </>
  )
}
