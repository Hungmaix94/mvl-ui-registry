// --- Add this small util (top of file or separate file)
import { useLayoutEffect, useRef, useState } from 'react'

function useMatchTriggerWidth<T extends HTMLElement>() {
  const triggerRef = useRef<T | null>(null)
  const [width, setWidth] = useState<number>()

  useLayoutEffect(() => {
    const el = triggerRef.current
    if (!el) return

    const update = () => setWidth(el.getBoundingClientRect().width)
    update()

    const observer = new ResizeObserver(update)
    observer.observe(el)
    window.addEventListener('resize', update)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [])

  return { triggerRef, width }
}

export default useMatchTriggerWidth
