import { Card, Label, PageTitle, buttonStyles, fieldStyles } from '@/components/ui'
import { formatDate } from '@/lib/format'
import { getSeasons } from '@/lib/queries'
import {
  createSeasonAction,
  setCurrentSeasonAction,
  updateSeasonAction,
} from './actions'

export const dynamic = 'force-dynamic'

export default async function AdminSeasonsPage() {
  const seasons = await getSeasons()

  return (
    <>
      <PageTitle>Seasons</PageTitle>

      <Card className="mb-8 p-4">
        <h2 className="mb-3 text-sm font-semibold">Add a season</h2>
        <form action={createSeasonAction} className="space-y-3">
          <div>
            <Label htmlFor="season-name">Name</Label>
            <input id="season-name" name="name" required className={fieldStyles} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="season-start">Start date</Label>
              <input
                id="season-start"
                name="start_date"
                type="date"
                required
                className={fieldStyles}
              />
            </div>
            <div>
              <Label htmlFor="season-end">End date (optional)</Label>
              <input id="season-end" name="end_date" type="date" className={fieldStyles} />
            </div>
          </div>
          <button type="submit" className={buttonStyles.primary}>
            Add season
          </button>
        </form>
      </Card>

      <div className="space-y-4">
        {seasons.map((season) => (
          <Card key={season.id} className="p-4">
            <div className="mb-3 flex items-baseline justify-between gap-2">
              <h3 className="font-semibold">{season.name}</h3>
              {season.is_current && (
                <span className="rounded-full bg-violet-600/25 px-2.5 py-1 text-xs font-semibold text-violet-300">
                  Current
                </span>
              )}
            </div>
            <p className="mb-3 text-xs text-neutral-500">
              {formatDate(season.start_date)} —{' '}
              {season.end_date ? formatDate(season.end_date) : 'ongoing'}
            </p>

            <form action={updateSeasonAction} className="space-y-3">
              <input type="hidden" name="id" value={season.id} />
              <div>
                <Label>Name</Label>
                <input name="name" defaultValue={season.name} required className={fieldStyles} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Start date</Label>
                  <input
                    name="start_date"
                    type="date"
                    defaultValue={season.start_date}
                    required
                    className={fieldStyles}
                  />
                </div>
                <div>
                  <Label>End date</Label>
                  <input
                    name="end_date"
                    type="date"
                    defaultValue={season.end_date ?? ''}
                    className={fieldStyles}
                  />
                </div>
              </div>
              <button type="submit" className={buttonStyles.primary}>
                Save
              </button>
            </form>

            {!season.is_current && (
              <form
                action={setCurrentSeasonAction}
                className="mt-3 border-t border-[var(--color-line)] pt-3"
              >
                <input type="hidden" name="id" value={season.id} />
                <button type="submit" className={buttonStyles.secondary}>
                  Make this the current season
                </button>
              </form>
            )}
          </Card>
        ))}
      </div>
    </>
  )
}
