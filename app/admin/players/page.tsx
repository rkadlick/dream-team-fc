import { Card, Label, PageTitle, buttonStyles, fieldStyles } from '@/components/ui'
import { POSITIONS } from '@/lib/constants'
import { getViewer } from '@/lib/auth'
import { getPlayers } from '@/lib/queries'
import { createClient } from '@/lib/supabase/server'
import {
  createPlayerAction,
  deletePlayerAction,
  linkPlayerToMeAction,
  updatePlayerAction,
} from './actions'

export const dynamic = 'force-dynamic'

function PositionSelect({ value }: { value: string | null }) {
  return (
    <select name="position" defaultValue={value ?? ''} className={fieldStyles}>
      <option value="">No position</option>
      {POSITIONS.map((p) => (
        <option key={p} value={p}>
          {p}
        </option>
      ))}
    </select>
  )
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
    <label className="flex min-h-11 items-center gap-2 text-sm">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="h-5 w-5 accent-violet-500"
      />
      {label}
    </label>
  )
}

export default async function AdminPlayersPage() {
  const [players, viewer] = await Promise.all([getPlayers(), getViewer()])

  const supabase = await createClient()
  const { data: statRows } = await supabase
    .from('match_player_stats')
    .select('player_id')
  const withStats = new Set((statRows ?? []).map((r) => r.player_id))

  return (
    <>
      <PageTitle>Players</PageTitle>

      <Card className="mb-8 p-4">
        <h2 className="mb-3 text-sm font-semibold">Add a player</h2>
        <form action={createPlayerAction} className="space-y-3">
          <div>
            <Label htmlFor="new-name">Name</Label>
            <input id="new-name" name="name" required className={fieldStyles} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="new-jersey">Jersey number</Label>
              <input
                id="new-jersey"
                name="jersey_number"
                type="number"
                inputMode="numeric"
                className={fieldStyles}
              />
            </div>
            <div>
              <Label htmlFor="new-position">Position</Label>
              <PositionSelect value={null} />
            </div>
          </div>
          <div>
            <Label htmlFor="new-gamertag">Gamertag</Label>
            <input id="new-gamertag" name="gamertag" className={fieldStyles} />
          </div>
          <div className="flex gap-6">
            <Check name="is_human" label="Human player" />
            <Check name="is_active" label="Active" defaultChecked />
          </div>
          <button type="submit" className={buttonStyles.primary}>
            Add player
          </button>
        </form>
      </Card>

      <div className="space-y-4">
        {players.map((player) => {
          const linkedToMe = player.user_id && player.user_id === viewer.userId
          return (
            <Card key={player.id} className="p-4">
              <form action={updatePlayerAction} className="space-y-3">
                <input type="hidden" name="id" value={player.id} />
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="font-semibold">{player.name}</h3>
                  {!player.is_active && (
                    <span className="text-xs text-neutral-500">Inactive</span>
                  )}
                </div>
                <div>
                  <Label>Name</Label>
                  <input name="name" defaultValue={player.name} required className={fieldStyles} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Jersey number</Label>
                    <input
                      name="jersey_number"
                      type="number"
                      inputMode="numeric"
                      defaultValue={player.jersey_number ?? ''}
                      className={fieldStyles}
                    />
                  </div>
                  <div>
                    <Label>Position</Label>
                    <PositionSelect value={player.position} />
                  </div>
                </div>
                <div>
                  <Label>Gamertag</Label>
                  <input
                    name="gamertag"
                    defaultValue={player.gamertag ?? ''}
                    className={fieldStyles}
                  />
                </div>
                <div className="flex gap-6">
                  <Check name="is_human" label="Human player" defaultChecked={player.is_human} />
                  <Check name="is_active" label="Active" defaultChecked={player.is_active} />
                </div>
                <button type="submit" className={buttonStyles.primary}>
                  Save
                </button>
              </form>

              <div className="mt-3 flex flex-wrap gap-2 border-t border-[var(--color-line)] pt-3">
                <form action={linkPlayerToMeAction}>
                  <input type="hidden" name="id" value={player.id} />
                  <input
                    type="hidden"
                    name="unlink"
                    value={linkedToMe ? 'true' : 'false'}
                  />
                  <button type="submit" className={buttonStyles.secondary}>
                    {linkedToMe ? 'Unlink from my login' : 'Link to my login'}
                  </button>
                </form>

                <form action={deletePlayerAction}>
                  <input type="hidden" name="id" value={player.id} />
                  <button type="submit" className={buttonStyles.danger}>
                    {withStats.has(player.id) ? 'Deactivate' : 'Delete'}
                  </button>
                </form>
              </div>

              {withStats.has(player.id) && (
                <p className="mt-2 text-xs text-neutral-600">
                  Has recorded stats, so this player can only be deactivated.
                </p>
              )}
            </Card>
          )
        })}
      </div>
    </>
  )
}
