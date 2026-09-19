import type { Metadata } from 'next'
import './globals.css'
import { TopNav } from '@/components/TopNav'
import { Wordmark } from '@/components/Wordmark'
import { getViewer } from '@/lib/auth'

export const metadata: Metadata = {
  title: 'Dream Team FC',
  description: 'Match results and player stats for Dream Team FC.',
}

/**
 * Runs before first paint so a reader who chose light never sees a dark flash.
 * No stored choice means no attribute, which leaves prefers-color-scheme in
 * charge — see the comment at the top of globals.css.
 */
const THEME_SCRIPT = `try{var t=localStorage.getItem('dtfc-theme');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t)}catch(e){}`

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { isAdmin } = await getViewer()

  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col bg-bg">
        <TopNav isAdmin={isAdmin} />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
          {children}
        </main>
        <footer className="mt-8 border-t border-line">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-6 sm:px-6">
            <Wordmark className="text-sm opacity-60" />
            <span className="text-xs text-faint">
              Match results and player stats
            </span>
          </div>
        </footer>
      </body>
    </html>
  )
}
