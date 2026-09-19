import type { Metadata } from 'next'
import './globals.css'
import { TopNav } from '@/components/TopNav'
import { getViewer } from '@/lib/auth'

export const metadata: Metadata = {
  title: 'Dream Team FC',
  description: 'Match results and player stats for Dream Team FC.',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { isAdmin } = await getViewer()

  return (
    <html lang="en" className="h-full">
      <body className="flex min-h-full flex-col">
        <TopNav isAdmin={isAdmin} />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:py-8">
          {children}
        </main>
        <footer className="border-t border-[var(--color-line)] px-4 py-6 text-center text-xs text-neutral-600">
          Dream Team FC
        </footer>
      </body>
    </html>
  )
}
