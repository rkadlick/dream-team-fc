'use client'

import { useCallback, useState } from 'react'
import { Modal } from '@/components/Modal'
import { ActionButton, ManagedForm } from '@/components/ManagedForm'
import {
  Button,
  Label,
  Panel,
  PageTitle,
  Pill,
  SectionTitle,
  Empty,
  fieldStyles,
  iconButtonStyles,
} from '@/components/ui'
import { formatDate } from '@/lib/format'
import {
  createSeasonAction,
  setCurrentSeasonAction,
  updateSeasonAction,
} from '@/app/admin/seasons/actions'

export type SeasonItem = {
  id: string
  name: string
  start_date: string
  end_date: string | null
  is_current: boolean
  matchCount: number
}

function SeasonFields({ season }: { season?: SeasonItem }) {
  const prefix = season ? season.id : 'new'
  return (
    <>
      {season && <input type="hidden" name="id" value={season.id} />}
      <div>
        <Label htmlFor={`${prefix}-name`}>Name</Label>
        <input
          id={`${prefix}-name`}
          name="name"
          defaultValue={season?.name}
          placeholder="Season 12"
          required
          className={fieldStyles}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor={`${prefix}-start`}>Start date</Label>
          <input
            id={`${prefix}-start`}
            name="start_date"
            type="date"
            defaultValue={season?.start_date}
            required
            className={fieldStyles}
          />
        </div>
        <div>
          <Label htmlFor={`${prefix}-end`}>End date (optional)</Label>
          <input
            id={`${prefix}-end`}
            name="end_date"
            type="date"
            defaultValue={season?.end_date ?? ''}
            className={fieldStyles}
          />
        </div>
      </div>
    </>
  )
}

function SeasonDates({ season }: { season: SeasonItem }) {
  return (
    <span className="text-sm text-muted">
      {formatDate(season.start_date)} —{' '}
      {season.end_date ? formatDate(season.end_date) : 'ongoing'}
    </span>
  )
}

export function SeasonsManager({ seasons }: { seasons: SeasonItem[] }) {
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const closeAdd = useCallback(() => setAdding(false), [])
  const closeEdit = useCallback(() => setEditingId(null), [])

  const current = seasons.find((s) => s.is_current) ?? null
  const others = seasons.filter((s) => !s.is_current)
  const editing = seasons.find((s) => s.id === editingId) ?? null

  return (
    <>
      <PageTitle
        sub="One season is current at a time; the dashboard follows it."
        action={
          <Button onClick={() => setAdding(true)}>
            <span aria-hidden>＋</span> New season
          </Button>
        }
      >
        Seasons
      </PageTitle>

      {/* The current season is a different object from the archive, so it gets
          a different surface rather than another identical box. */}
      <SectionTitle>Current season</SectionTitle>
      {current ? (
        <Panel tone="accent" className="mb-8 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-xl font-bold">{current.name}</h3>
                <Pill tone="accent">Live</Pill>
              </div>
              <div className="mt-1">
                <SeasonDates season={current} />
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold tabular-nums">
                {current.matchCount}
              </div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-accent-text">
                matches
              </div>
            </div>
          </div>

          <div className="mt-4 border-t border-accent-line pt-4">
            <ManagedForm
              action={updateSeasonAction}
              submitLabel="Save changes"
              dirtyLabel="Unsaved changes"
            >
              <SeasonFields season={current} />
            </ManagedForm>
          </div>
        </Panel>
      ) : (
        <div className="mb-8">
          <Empty>
            No current season. Pick one below, or add a new one.
          </Empty>
        </div>
      )}

      <SectionTitle>
        {others.length > 0 ? 'Other seasons' : 'Archive'}
      </SectionTitle>
      {others.length === 0 ? (
        <Empty>Nothing else on record yet.</Empty>
      ) : (
        <Panel className="divide-y divide-line">
          {others.map((season) => (
            <div
              key={season.id}
              className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{season.name}</div>
                <SeasonDates season={season} />
              </div>
              <span className="text-sm tabular-nums text-faint">
                {season.matchCount} {season.matchCount === 1 ? 'match' : 'matches'}
              </span>
              <div className="flex items-center gap-2">
                <ActionButton
                  action={setCurrentSeasonAction}
                  hidden={{ id: season.id }}
                  label="Make current"
                  pendingLabel="Switching…"
                  variant="quiet"
                />
                <button
                  type="button"
                  onClick={() => setEditingId(season.id)}
                  aria-label={`Edit ${season.name}`}
                  className={iconButtonStyles()}
                >
                  <span aria-hidden>✎</span>
                </button>
              </div>
            </div>
          ))}
        </Panel>
      )}

      <Modal
        open={adding}
        onClose={closeAdd}
        title="New season"
        description="It will not become the current season until you say so."
      >
        <ManagedForm
          action={createSeasonAction}
          submitLabel="Add season"
          alwaysEnabled
          resetOnSuccess
          highlightDirty={false}
          onSuccess={closeAdd}
        >
          <SeasonFields />
        </ManagedForm>
      </Modal>

      <Modal
        open={editing !== null}
        onClose={closeEdit}
        title={editing ? `Edit ${editing.name}` : 'Edit season'}
      >
        {editing && (
          <ManagedForm
            key={editing.id}
            action={updateSeasonAction}
            submitLabel="Save changes"
            onSuccess={closeEdit}
          >
            <SeasonFields season={editing} />
          </ManagedForm>
        )}
      </Modal>
    </>
  )
}
