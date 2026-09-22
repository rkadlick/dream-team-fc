import { TeamPhotosManager } from '@/components/admin/TeamPhotosManager'
import { getTeamPhotosForAdmin } from '@/lib/team-photos'

export const dynamic = 'force-dynamic'

export default async function AdminTeamPhotosPage() {
  const photos = await getTeamPhotosForAdmin()
  return <TeamPhotosManager photos={photos} />
}
