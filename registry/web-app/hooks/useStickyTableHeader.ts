import { useLayoutEffect } from 'react'

/** The app navbar the header must park underneath — same node every list page. */
const NAV_BAR_SELECTOR = '[data-name="Header"]'
/** The page-level wrapper that actually scrolls (see the list-page layout convention). */
const SCROLL_CONTAINER_SELECTOR = '[class*="overflow-x-auto"][class*="overflow-y-auto"]'

/**
 * Pin a list table's `<thead>` under the app navbar while the page scrolls.
 *
 * CSS `position: sticky` alone does NOT work on these pages: Radix Themes wraps every
 * `Table.Root` in a `.rt-ScrollAreaViewport` whose `overflow: scroll` makes it the sticky
 * containing block — even though it never scrolls, because the real scrolling happens on the
 * page-level wrapper above it. The header therefore anchors to a box that never moves and
 * drifts off screen 1:1 with the scroll. So the offset is driven from JS instead, applied as
 * `transform: translateY()` (compositor-only, no reflow per frame).
 *
 * @param scopeSelector class selector on the `Table` instance, e.g. `.js-comm-mgr-monthly-table`.
 *   Scope it per table — a bare structural query grabs another module's container on pages
 *   that render more than one list.
 * @param resyncKey re-run when the rendered rows change (the `<thead>` node is replaced on
 *   re-render, so a stale reference would silently stop updating).
 */
export function useStickyTableHeader(scopeSelector: string, resyncKey?: unknown) {
  useLayoutEffect(() => {
    const tableRoot = document.querySelector<HTMLElement>(scopeSelector)
    const table = tableRoot?.querySelector('table')
    const scrollContainer = table?.closest<HTMLElement>(SCROLL_CONTAINER_SELECTOR)
    const thead = table?.querySelector('thead')
    const navBar = document.querySelector<HTMLElement>(NAV_BAR_SELECTOR)
    if (!table || !scrollContainer || !thead || !navBar) return

    let frameId: number | null = null
    let applied = 0
    // `transform` opens a stacking context. Writing it once up front — even at 0 — keeps the
    // header's paint order identical before and after it starts moving, instead of having it
    // jump above the frozen body cells the first time the user scrolls.
    let hasApplied = false

    const applyStickyTop = () => {
      frameId = null
      const navBarBottom = navBar.getBoundingClientRect().bottom
      const theadRect = thead.getBoundingClientRect()
      const tableRect = table.getBoundingClientRect()

      // `transform` does not affect layout, so subtracting what we already applied recovers
      // where the header would sit untouched. Measuring the header itself (rather than the
      // scroll container's top) is what makes it park flush under the navbar whatever
      // padding the page puts above the table.
      const naturalTop = theadRect.top - applied
      // Never let the header outlive its own table: once the last row has passed, it must
      // ride the table off screen instead of floating over whatever follows.
      const maxOffset = Math.max(0, tableRect.bottom - theadRect.height - naturalTop)
      const nextOffset = Math.round(Math.min(Math.max(0, navBarBottom - naturalTop), maxOffset))

      if (hasApplied && nextOffset === applied) return
      hasApplied = true
      applied = nextOffset
      thead.style.transform = `translateY(${nextOffset}px)`
    }

    const requestUpdate = () => {
      if (frameId !== null) return
      frameId = window.requestAnimationFrame(applyStickyTop)
    }

    // Synchronously, not through rAF: this is a layout effect, and `data` changing tears the
    // effect down and back up. Deferring the first write by a frame would flash the header at
    // translateY(0) every time the user pages while scrolled down.
    applyStickyTop()
    thead.style.willChange = 'transform'
    window.addEventListener('resize', requestUpdate)
    window.addEventListener('scroll', requestUpdate, { passive: true })
    scrollContainer.addEventListener('scroll', requestUpdate, { passive: true })

    return () => {
      if (frameId !== null) window.cancelAnimationFrame(frameId)
      window.removeEventListener('resize', requestUpdate)
      window.removeEventListener('scroll', requestUpdate)
      scrollContainer.removeEventListener('scroll', requestUpdate)
      applied = 0
      thead.style.transform = 'translateY(0px)'
      thead.style.willChange = ''
    }
  }, [scopeSelector, resyncKey])
}

export default useStickyTableHeader
