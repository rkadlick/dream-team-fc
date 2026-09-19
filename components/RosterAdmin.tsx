'use client'

import { Modal } from '@/components/Modal'
import { ActionButton, ManagedForm } from '@/components/ManagedForm'
import { Button, Label, fieldStyles } from '@/components/ui'
import { POSITIONS } from '@/lib/constants'
import {
  createPlayerAction,
  deletePlayerAction,
  linkPlayerToMeAction,
  updatePlayerAction,
} from '@/app/admin/players/actions'

export type EditablePlayer = {
  id: string
  name: string
  jersey_number: number | null
  position: string | null
  is_human: boolean
  gamertag: string | null
  is_active: boolean
  linkedToMe: boolean
  hasStats: boolean
}

function Check({
  name,
  label,
  defaultChecked,
}: {
  name: string
  label: string
  defaultChecked?: boolean
}) {
  return (
    <label className="flex min-h-10 items-center gap-2 text-sm">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="h-5 w-5 accent-[var(--dt-accent)]"
      />
      {label}
    </label>
  )
}

function PlayerFields({ player }: { player?: EditablePlayer }) {
  const prefix = player ? player.id : 'new'
  return (
    <>
      {player && <input type="hidden" name="id" value={player.id} />}
      <div>
        <Label htmlFor={`${prefix}-name`}>Name</Label>
        <input
          id={`${prefix}-name`}
          name="name"
          defaultValue={player?.name}
          required
          className={fieldStyles}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor={`${prefix}-jersey`}>Jersey number</Label>
          <input
            id={`${prefix}-jersey`}
            name="jersey_number"
            type="number"
            inputMode="numeric"
            defaultValue={player?.jersey_number ?? ''}
            className={fieldStyles}
          />
        </div>
        <div>
          <Label htmlFor={`${prefix}-position`}>Position</Label>
          <select
            id={`${prefix}-position`}
            name="position"
            defaultValue={player?.position ?? ''}
            className={fieldStyles}
          >
            <option value="">No position</option>
            {POSITIONS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <Label htmlFor={`${prefix}-gamertag`}>Gamertag</Label>
        <input
          id={`${prefix}-gamertag`}
          name="gamertag"
          defaultValue={player?.gamertag ?? ''}
          className={fieldStyles}
        />
      </div>
      <div className="flex gap-6">
        <Check
          name="is_human"
          label="Human player"
          defaultChecked={player ? player.is_human : true}
        />
        <Check
          name="is_active"
          label="Active"
          defaultChecked={player ? player.is_active : true}
        />
      </div>
    </>
  )
}

/**
 * The roster's admin surface. It lives on /players so adding a player is a
 * dialog on the page you are already looking at, rather than a page of its own.
 */
export function RosterAdmin({
  players,
  editingId,
  onCloseEdit,
  adding,
  onCloseAdd,
}: {
  players: EditablePlayer[]
  editingId: string | null
  onCloseEdit: () => void
  adding: boolean
  onCloseAdd: () => void
}) {
  const editing = players.find((p) => p.id === editingId) ?? null

  return (
    <>
      <Modal
        open={adding}
        onClose={onCloseAdd}
        title="Add a player"
        description="They appear on the roster and in the match entry form straight away."
      >
        <ManagedForm
          action={createPlayerAction}
          submitLabel="Add player"
          alwaysEnabled
          resetOnSuccess
          highlightDirty={false}
          onSuccess={onCloseAdd}
        >
          <PlayerFields />
        </ManagedForm>
      </Modal>

      <Modal
        open={editing !== null}
        onClose={onCloseEdit}
        title={editing ? `Edit ${editing.name}` : 'Edit player'}
        description={
          editing?.hasStats
            ? 'This player has recorded stats, so they can only be deactivated.'
            : undefined
        }
      >
        {editing && (
          <>
            <ManagedForm
              key={editing.id}
              action={updatePlayerAction}
              submitLabel="Save changes"
              onSuccess={onCloseEdit}
            >
              <PlayerFields player={editing} />
            </ManagedForm>

            <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-4">
              <ActionButton
                action={linkPlayerToMeAction}
                hidden={{
                  id: editing.id,
                  unlink: editing.linkedToMe ? 'true' : 'false',
                }}
                label={
                  editing.linkedToMe ? 'Unlink from my login' : 'Link to my login'
                }
                variant="quiet"
              />
              <ActionButton
                action={deletePlayerAction}
                hidden={{ id: editing.id }}
                label={editing.hasStats ? 'Deactivate' : 'Delete'}
                pendingLabel="Removing…"
                variant="danger"
                confirm={
                  editing.hasStats
                    ? `Deactivate ${editing.name}? Their recorded stats are kept.`
                    : `Delete ${editing.name}? This cannot be undone.`
                }
              />
            </div>
          </>
        )}
      </Modal>
    </>
  )
}

/** The button that opens the add dialog, for pages that render their own toolbar. */
export function AddPlayerButton({ onClick }: { onClick: () => void }) {
  return (
    <Button onClick={onClick}>
      <span aria-hidden>＋</span> Add player
    </Button>
  )
}
