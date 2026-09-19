/**
 * The club logo. Text-only for now — swap the contents of this one component
 * for an <Image /> when there is a real crest.
 */
export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span
      className={`font-bold tracking-tight leading-none ${className}`}
      aria-label="Dream Team FC"
    >
      <span className="text-white">DREAM TEAM</span>{' '}
      <span className="text-violet-400">FC</span>
    </span>
  )
}
