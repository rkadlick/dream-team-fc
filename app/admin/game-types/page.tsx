import { Card, Label, PageTitle, buttonStyles, fieldStyles } from '@/components/ui'
import { getGameTypes } from '@/lib/queries'
import { createGameTypeAction, updateGameTypeAction } from './actions'

export const dynamic = 'force-dynamic'

export default async function AdminGameTypesPage() {
  const gameTypes = await getGameTypes()

  return (
    <>
      <PageTitle>Game types</PageTitle>
      <p className="mb-6 text-sm text-neutral-500">
        Named tournaments (for example “Summer Cup”) are added here as their own
        game type.
      </p>

      <Card className="mb-8 p-4">
        <form action={createGameTypeAction} className="space-y-3">
          <div>
            <Label htmlFor="gt-name">New game type</Label>
            <input
              id="gt-name"
              name="name"
              required
              placeholder="Summer Cup"
              className={fieldStyles}
            />
          </div>
          <button type="submit" className={buttonStyles.primary}>
            Add game type
          </button>
        </form>
      </Card>

      <div className="space-y-3">
        {gameTypes.map((gameType) => (
          <Card key={gameType.id} className="p-4">
            <form action={updateGameTypeAction} className="space-y-3">
              <input type="hidden" name="id" value={gameType.id} />
              <div>
                <Label>Name</Label>
                <input
                  name="name"
                  defaultValue={gameType.name}
                  required
                  className={fieldStyles}
                />
              </div>
              <label className="flex min-h-11 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="is_active"
                  defaultChecked={gameType.is_active}
                  className="h-5 w-5 accent-violet-500"
                />
                Active (shown in the match form)
              </label>
              <button type="submit" className={buttonStyles.primary}>
                Save
              </button>
            </form>
          </Card>
        ))}
      </div>
    </>
  )
}
