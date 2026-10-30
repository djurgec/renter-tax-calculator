import { useEffect, useState, type RefObject } from 'react'

/** Whether any part of the element is on screen (minus `bottomInset` px hidden by a bar). */
export function useInView(ref: RefObject<Element | null>, bottomInset = 0): boolean {
  const [inView, setInView] = useState(true)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      rootMargin: `0px 0px -${bottomInset}px 0px`,
    })
    io.observe(el)
    return () => io.disconnect()
  }, [ref, bottomInset])
  return inView
}
