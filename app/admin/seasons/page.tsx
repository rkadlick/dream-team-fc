import { SeasonsManager, type SeasonItem } from '@/components/admin/SeasonsManager'
import { getMatches, getSeasons } from '@/lib/queries'

export const dynamic = 'force-dynamic'

export default async function AdminSeasonsPage() {
  const [seasons, matches] = await Promise.all([getSeasons(), getMatches()])

  const counts = new Map<string, number>()
  for (const match of matches) {
    counts.set(match.season_id, (counts.get(match.season_id) ?? 0) + 1)
  }

  const items: SeasonItem[] = seasons.map((season) => ({
    id: season.id,
    name: season.name,
    start_date: season.start_date,
    end_date: season.end_date,
    is_current: season.is_current,
    matchCount: counts.get(season.id) ?? 0,
  }))

  return <SeasonsManager seasons={items} />
}
