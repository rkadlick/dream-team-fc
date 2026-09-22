'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'

const ROTATE_MS = 5000

export function TeamPhotoBanner({ photos }: { photos: string[] }) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (photos.length < 2) return
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % photos.length)
    }, ROTATE_MS)
    return () => clearInterval(id)
  }, [photos.length])

  if (photos.length === 0) return null

  return (
    <div className="relative mb-8 aspect-[16/9] w-full overflow-hidden rounded-2xl border border-line shadow-card sm:aspect-[21/9]">
      {photos.map((src, i) => (
        <Image
          key={src}
          src={src}
          alt="Dream Team FC squad photo"
          fill
          priority={i === 0}
          sizes="(min-width: 1024px) 1152px, 100vw"
          className={`object-cover transition-opacity duration-700 ease-in-out ${
            i === index ? 'opacity-100' : 'opacity-0'
          }`}
        />
      ))}

      {photos.length > 1 && (
        <>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/40 to-transparent"
          />
          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
            {photos.map((src, i) => (
              <button
                key={src}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Show photo ${i + 1} of ${photos.length}`}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? 'w-5 bg-white' : 'w-1.5 bg-white/50'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
