'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { signInAction, type LoginState } from '@/app/auth-actions'
import { Label, buttonStyles, fieldStyles } from '@/components/ui'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className={`${buttonStyles.primary} w-full`}
    >
      {pending ? 'Signing in…' : 'Sign in'}
    </button>
  )
}

export function LoginForm({
  next,
  initialError,
}: {
  next: string
  initialError: string | null
}) {
  const [state, formAction] = useActionState<LoginState, FormData>(signInAction, {
    error: initialError,
  })

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <div>
        <Label htmlFor="email">Email</Label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className={fieldStyles}
        />
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={fieldStyles}
        />
      </div>
      {state.error && (
        <p
          role="alert"
          className="rounded-xl border border-loss/40 bg-loss-soft px-3 py-2 text-sm text-loss"
        >
          {state.error}
        </p>
      )}
      <SubmitButton />
    </form>
  )
}
