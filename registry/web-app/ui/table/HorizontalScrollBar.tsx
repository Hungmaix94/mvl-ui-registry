import { useEffect, useRef, useState, useCallback } from 'react'
import { cn } from '@/utils'

type HorizontalScrollBarProps = {
  containerRef: React.RefObject<HTMLElement | null>
  className?: string
}

export default function HorizontalScrollBar({ containerRef, className }: HorizontalScrollBarProps) {
  const scrollBarRef = useRef<HTMLDivElement>(null)
  const thumbRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [thumbPosition, setThumbPosition] = useState(0)
  const [thumbWidth, setThumbWidth] = useState(0)
  const dragStartXRef = useRef(0)
  const dragStartScrollLeftRef = useRef(0)

  const updateScrollBar = useCallback(() => {
    const container = containerRef.current
    const scrollBar = scrollBarRef.current

    if (!container || !scrollBar) {
      return
    }

    const containerScrollWidth = container.scrollWidth
    const containerClientWidth = container.clientWidth
    const containerScrollLeft = container.scrollLeft

    // Calculate if scrolling is needed
    if (containerScrollWidth <= containerClientWidth) {
      // No scroll needed, hide scroll bar
      setThumbWidth(0)
      return
    }

    // Calculate thumb width based on visible area vs total scrollable width
    const scrollBarWidth = scrollBar.clientWidth
    const thumbWidthRatio = containerClientWidth / containerScrollWidth
    const newThumbWidth = Math.max(20, scrollBarWidth * thumbWidthRatio)
    setThumbWidth(newThumbWidth)

    // Calculate thumb position based on scroll position
    const maxScrollLeft = containerScrollWidth - containerClientWidth
    const scrollRatio = maxScrollLeft > 0 ? containerScrollLeft / maxScrollLeft : 0
    const maxThumbPosition = scrollBarWidth - newThumbWidth
    const newThumbPosition = scrollRatio * maxThumbPosition
    setThumbPosition(newThumbPosition)
  }, [containerRef])

  // Update scroll bar when container scrolls.
  //
  // Lưu ý quan trọng: `containerRef.current` có thể CÒN NULL tại thời điểm effect này
  // chạy, vì với chế độ pagination "static" của Table, `containerRef` (== tableContainerRef)
  // được resolve tới `.rt-ScrollAreaViewport` ở effect CHA trong Table.tsx — mà effect cha
  // chạy SAU effect con này (React chạy effect con trước cha). Deps của effect này lại
  // stable nên nó KHÔNG chạy lại. Ở dev, React.StrictMode chạy effect 2 lần nên lần 2 vô
  // tình bắt được container đã resolve; ở prod build (không StrictMode) effect chạy đúng 1
  // lần → nếu return sớm khi container null thì thanh kéo KHÔNG BAO GIỜ khởi tạo (thumb=0).
  //
  // → Poll bằng requestAnimationFrame tới khi container sẵn sàng rồi mới gắn listener + đo.
  useEffect(() => {
    let rafId: number | null = null
    let timeoutId: NodeJS.Timeout | null = null
    let resizeObserver: ResizeObserver | null = null
    let attachedContainer: HTMLElement | null = null
    let cancelled = false
    let attempts = 0
    const MAX_ATTEMPTS = 120 // ~2s @60fps — đủ để Table resolve xong viewport

    const handleScroll = () => updateScrollBar()
    const handleResize = () => updateScrollBar()

    const init = () => {
      if (cancelled) return
      const container = containerRef.current
      if (!container) {
        if (attempts++ < MAX_ATTEMPTS) {
          rafId = requestAnimationFrame(init)
        }
        return
      }

      attachedContainer = container
      container.addEventListener('scroll', handleScroll)

      // Use ResizeObserver to detect when container size changes
      resizeObserver = new ResizeObserver(() => updateScrollBar())
      resizeObserver.observe(container)

      // Đo ngay + đo lại sau khi layout ổn định
      updateScrollBar()
      timeoutId = setTimeout(() => updateScrollBar(), 100)
    }

    window.addEventListener('resize', handleResize)
    rafId = requestAnimationFrame(init)

    return () => {
      cancelled = true
      if (rafId !== null) cancelAnimationFrame(rafId)
      if (timeoutId) clearTimeout(timeoutId)
      window.removeEventListener('resize', handleResize)
      if (attachedContainer) attachedContainer.removeEventListener('scroll', handleScroll)
      if (resizeObserver) resizeObserver.disconnect()
    }
  }, [containerRef, updateScrollBar])

  // Handle mouse down on thumb
  const handleThumbMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()

      const container = containerRef.current
      if (!container) return

      setIsDragging(true)
      dragStartXRef.current = e.clientX
      dragStartScrollLeftRef.current = container.scrollLeft

      const handleMouseMove = (e: MouseEvent) => {
        const scrollBar = scrollBarRef.current
        if (!scrollBar || !container) return

        const deltaX = e.clientX - dragStartXRef.current
        const scrollBarWidth = scrollBar.clientWidth
        const containerScrollWidth = container.scrollWidth
        const containerClientWidth = container.clientWidth
        const maxScrollLeft = containerScrollWidth - containerClientWidth

        if (maxScrollLeft <= 0) return

        // Calculate scroll distance based on thumb movement
        const scrollRatio = deltaX / scrollBarWidth
        const scrollDelta = scrollRatio * containerScrollWidth
        const newScrollLeft = Math.max(
          0,
          Math.min(maxScrollLeft, dragStartScrollLeftRef.current + scrollDelta)
        )

        container.scrollLeft = newScrollLeft
      }

      const handleMouseUp = () => {
        setIsDragging(false)
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    },
    [containerRef]
  )

  // Handle click on track (scroll bar area)
  const handleTrackClick = useCallback(
    (e: React.MouseEvent) => {
      // Don't handle click if clicking on thumb
      if (thumbRef.current?.contains(e.target as Node)) {
        return
      }

      const container = containerRef.current
      const scrollBar = scrollBarRef.current
      if (!container || !scrollBar) return

      const scrollBarRect = scrollBar.getBoundingClientRect()
      const clickX = e.clientX - scrollBarRect.left
      const scrollBarWidth = scrollBar.clientWidth
      const containerScrollWidth = container.scrollWidth
      const containerClientWidth = container.clientWidth
      const maxScrollLeft = containerScrollWidth - containerClientWidth

      if (maxScrollLeft <= 0) return

      // Calculate target scroll position
      const clickRatio = clickX / scrollBarWidth
      const targetScrollLeft = clickRatio * maxScrollLeft

      container.scrollTo({
        left: Math.max(0, Math.min(maxScrollLeft, targetScrollLeft)),
        behavior: 'smooth',
      })
    },
    [containerRef]
  )

  // Always render the container so scrollBarRef gets set, but hide thumb if no scroll needed
  return (
    <div
      ref={scrollBarRef}
      className={cn(
        'relative h-2 w-full',
        thumbWidth > 0 && 'cursor-pointer',
        'bg-data-light-grey-default',
        className
      )}
      onClick={thumbWidth > 0 ? handleTrackClick : undefined}
    >
      {thumbWidth > 0 && (
        <div
          ref={thumbRef}
          className={cn(
            'absolute top-0 h-full rounded-full',
            'bg-content-dark-4',
            'hover:bg-content-dark-3',
            'cursor-grab active:cursor-grabbing',
            'transition-colors',
            isDragging && 'bg-content-dark-2'
          )}
          style={{
            left: `${thumbPosition}px`,
            width: `${thumbWidth}px`,
          }}
          onMouseDown={handleThumbMouseDown}
        />
      )}
    </div>
  )
}
