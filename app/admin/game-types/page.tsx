import {
  GameTypesManager,
  type GameTypeItem,
} from '@/components/admin/GameTypesManager'
import { getGameTypes, getMatches } from '@/lib/queries'

export const dynamic = 'force-dynamic'

export default async function AdminGameTypesPage() {
  const [gameTypes, matches] = await Promise.all([getGameTypes(), getMatches()])

  const counts = new Map<string, number>()
  for (const match of matches) {
    counts.set(match.game_type_id, (counts.get(match.game_type_id) ?? 0) + 1)
  }

  const items: GameTypeItem[] = gameTypes.map((gameType) => ({
    id: gameType.id,
    name: gameType.name,
    is_active: gameType.is_active,
    matchCount: counts.get(gameType.id) ?? 0,
  }))

  return <GameTypesManager gameTypes={items} />
}
