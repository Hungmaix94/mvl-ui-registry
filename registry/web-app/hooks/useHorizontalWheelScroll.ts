import { useEffect, type RefObject } from 'react'

const VIEWPORT_SELECTOR = '[data-radix-scroll-area-viewport]'

const useHorizontalWheelScroll = (ref: RefObject<HTMLElement | null>) => {
  useEffect(() => {
    const root = ref.current
    if (!root) return

    const viewport = root.querySelector(VIEWPORT_SELECTOR) as HTMLElement | null
    if (!viewport) return

    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY === 0 || e.deltaX !== 0) return

      const maxScroll = viewport.scrollWidth - viewport.clientWidth
      if (maxScroll <= 0) return

      const canScrollLeft = viewport.scrollLeft > 0
      const canScrollRight = viewport.scrollLeft < maxScroll

      if ((e.deltaY > 0 && canScrollRight) || (e.deltaY < 0 && canScrollLeft)) {
        e.preventDefault()
        viewport.scrollLeft += e.deltaY
      }
    }

    viewport.addEventListener('wheel', handleWheel, { passive: false })
    return () => viewport.removeEventListener('wheel', handleWheel)
  }, [ref])
}

export default useHorizontalWheelScroll
