import { redirect } from 'next/navigation'

/**
 * The roster no longer has a separate admin page: /players is the roster, and
 * admins get the add/edit dialogs there. This keeps old links working.
 */
export default function AdminPlayersPage() {
  redirect('/players')
}
