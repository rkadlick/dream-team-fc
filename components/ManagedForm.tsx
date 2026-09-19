'use client'

import {
  useActionState,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useFormStatus } from 'react-dom'
import { idleState, type ActionState } from '@/lib/action-state'
import { buttonStyles } from '@/components/ui'

/**
 * Every admin form goes through here so that editing always answers three
 * questions the old screens left open:
 *
 *   Am I editing?      — the form outlines itself while there are edits.
 *   Did I save it?     — a "Saved" confirmation flashes after the round trip.
 *   Is it still dirty? — Save stays disabled until something actually changes,
 *                        and an "Unsaved changes" marker sits next to it.
 */

function SubmitRow({
  dirty,
  saved,
  submitLabel,
  dirtyLabel,
  extraActions,
  alwaysEnabled,
}: {
  dirty: boolean
  saved: boolean
  submitLabel: string
  dirtyLabel: string
  extraActions?: ReactNode
  alwaysEnabled: boolean
}) {
  const { pending } = useFormStatus()

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="submit"
        disabled={pending || (!alwaysEnabled && !dirty)}
        className={buttonStyles.primary}
      >
        {pending ? 'Saving…' : submitLabel}
      </button>
      {extraActions}
      <span aria-live="polite" className="text-xs font-medium">
        {pending ? null : saved ? (
          <span className="inline-flex items-center gap-1 text-win">
            <span aria-hidden>✓</span> Saved
          </span>
        ) : dirty ? (
          <span className="inline-flex items-center gap-1 text-warn">
            <span aria-hidden>●</span> {dirtyLabel}
          </span>
        ) : null}
      </span>
    </div>
  )
}

export function ManagedForm({
  action,
  children,
  submitLabel = 'Save',
  dirtyLabel = 'Unsaved changes',
  resetOnSuccess = false,
  onSuccess,
  extraActions,
  /** Create forms have nothing to diff against, so their button starts live. */
  alwaysEnabled = false,
  className = '',
  /** Outline the form while it holds unsaved edits. */
  highlightDirty = true,
  /** 'row' lays fields and the save button out on one line, for compact lists. */
  orientation = 'stack',
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>
  children: ReactNode
  submitLabel?: string
  dirtyLabel?: string
  resetOnSuccess?: boolean
  onSuccess?: () => void
  extraActions?: ReactNode
  alwaysEnabled?: boolean
  className?: string
  highlightDirty?: boolean
  orientation?: 'stack' | 'row'
}) {
  const [state, formAction] = useActionState(action, idleState)
  const formRef = useRef<HTMLFormElement>(null)

  // Dirty/saved are derived rather than stored, so there is no effect racing
  // the action result. `touches` counts edits; `touchesAtSubmit` remembers how
  // many there had been when the form was last sent.
  const [touches, setTouches] = useState(0)
  const [touchesAtSubmit, setTouchesAtSubmit] = useState<number | null>(null)

  const settled = state.status === 'ok' && touchesAtSubmit === touches
  const dirty = touches > 0 && !settled
  const saved = settled && touches > 0

  const handledAt = useRef(0)
  useEffect(() => {
    // Only the genuinely external work lives here: resetting the DOM form and
    // telling the parent (for example, to close its dialog).
    if (state.at === 0 || state.at === handledAt.current) return
    handledAt.current = state.at
    if (state.status !== 'ok') return

    if (resetOnSuccess) formRef.current?.reset()
    onSuccess?.()
  }, [state, resetOnSuccess, onSuccess])

  const markTouched = () => setTouches((n) => n + 1)

  return (
    <form
      ref={formRef}
      action={formAction}
      onInput={markTouched}
      onChange={markTouched}
      onSubmit={() => setTouchesAtSubmit(touches)}
      className={`rounded-xl transition-[box-shadow] ${
        highlightDirty && dirty
          ? 'shadow-[0_0_0_2px_var(--dt-warn-line)]'
          : ''
      } ${className}`}
    >
      <div
        className={
          orientation === 'row'
            ? 'flex flex-wrap items-center gap-x-3 gap-y-2'
            : 'space-y-3'
        }
      >
        {children}

        {state.status === 'error' && state.message && (
          <p
            role="alert"
            className={`rounded-xl border border-loss/40 bg-loss-soft px-3 py-2 text-sm text-loss ${
              orientation === 'row' ? 'w-full' : ''
            }`}
          >
            {state.message}
          </p>
        )}

        <SubmitRow
          dirty={dirty}
          saved={saved}
          submitLabel={submitLabel}
          dirtyLabel={dirtyLabel}
          extraActions={extraActions}
          alwaysEnabled={alwaysEnabled}
        />
      </div>
    </form>
  )
}

/**
 * A single-button form for actions with no fields (make current, unlink,
 * delete). Keeps the same pending/confirmation language as ManagedForm.
 */
export function ActionButton({
  action,
  label,
  pendingLabel,
  variant = 'secondary',
  confirm,
  hidden,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>
  label: string
  pendingLabel?: string
  variant?: keyof typeof buttonStyles
  confirm?: string
  hidden?: Record<string, string>
}) {
  const [state, formAction] = useActionState(action, idleState)

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (confirm && !window.confirm(confirm)) event.preventDefault()
      }}
      className="contents"
    >
      {Object.entries(hidden ?? {}).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <InnerActionButton
        label={label}
        pendingLabel={pendingLabel}
        variant={variant}
      />
      {state.status === 'error' && state.message && (
        <span role="alert" className="text-xs text-loss">
          {state.message}
        </span>
      )}
    </form>
  )
}

function InnerActionButton({
  label,
  pendingLabel,
  variant,
}: {
  label: string
  pendingLabel?: string
  variant: keyof typeof buttonStyles
}) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending} className={buttonStyles[variant]}>
      {pending ? (pendingLabel ?? 'Working…') : label}
    </button>
  )
}
