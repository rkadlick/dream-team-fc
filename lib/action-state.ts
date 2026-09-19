/**
 * The shape every admin server action returns, so that each form can tell the
 * reader what happened instead of silently re-rendering.
 *
 * `at` changes on every completed submit, which is what lets the UI flash a
 * fresh "Saved" confirmation even when the message text is identical to the
 * previous one.
 */
export type ActionState = {
  status: 'idle' | 'ok' | 'error'
  message: string
  at: number
}

export const idleState: ActionState = { status: 'idle', message: '', at: 0 }

export function ok(message: string): ActionState {
  return { status: 'ok', message, at: Date.now() }
}

export function fail(message: string): ActionState {
  return { status: 'error', message, at: Date.now() }
}
