import { useCallback, useRef, useState } from 'react'

/**
 * Measure an element's rendered height and keep it in sync while it resizes.
 *
 * Returns a callback ref rather than a `RefObject` on purpose: the measured element may
 * mount long after the hook runs (e.g. `TablePagination` renders `null` until the first
 * page of data arrives), and a callback ref fires on every attach/detach.
 *
 * Height is `0` while nothing is attached.
 */
export function useElementHeight<TElement extends HTMLElement>(): [
  (node: TElement | null) => void,
  number,
] {
  const [height, setHeight] = useState(0)
  const observerRef = useRef<ResizeObserver | null>(null)

  const measuredRef = useCallback((node: TElement | null) => {
    observerRef.current?.disconnect()
    observerRef.current = null

    if (!node) {
      setHeight(0)
      return
    }

    // getBoundingClientRect covers padding + border; ResizeObserver's contentRect does not,
    // and this chrome (pagination bar) is mostly padding.
    setHeight(node.getBoundingClientRect().height)

    if (typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver(() => {
      setHeight(node.getBoundingClientRect().height)
    })
    observer.observe(node)
    observerRef.current = observer
  }, [])

  // Teardown lives in the callback ref above (React always calls it with null on unmount).
  // It must NOT be a mount-effect cleanup: under StrictMode that fires on the simulated
  // unmount, killing the observer for good — the ref is not re-invoked for the same node,
  // so the height would stay frozen at whatever it measured first.

  return [measuredRef, height]
}

export default useElementHeight
