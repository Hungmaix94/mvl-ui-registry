import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

import { useStickyTableHeader } from './useStickyTableHeader'

const SCOPE = 'js-test-table'
const NAVBAR_BOTTOM = 64
const THEAD_HEIGHT = 40
const CONTAINER_PADDING_TOP = 16

/** Moved between assertions to simulate the page scrolling. */
const state = { scrollY: 0, theadTop: 240, tableHeight: 600 }

/**
 * The layout the hook reads: an app navbar with a known bottom, a page-level scroll wrapper,
 * and the table inside it. It also calls the hook, so the DOM is committed before the layout
 * effect runs — exactly the real ordering.
 */
function Harness() {
  useStickyTableHeader(`.${SCOPE}`)
  return (
    <>
      <div data-name="Header" data-testid="navbar" />
      <div className="overflow-x-auto overflow-y-auto" data-testid="scroll-container">
        <div className={SCOPE}>
          <table data-testid="table">
            <thead data-testid="thead">
              <tr>
                <th>Nhân viên</th>
              </tr>
            </thead>
            <tbody />
          </table>
        </div>
      </div>
    </>
  )
}

/**
 * jsdom reports a zero rect for everything, so each node gets a stub driven by `state`.
 *
 * `transform` does not affect layout, so the stubs return *untransformed* geometry — which is
 * what the browser reports for `table`, and what the hook must recover for `thead` by
 * subtracting back out the offset it applied.
 */
function stubGeometry() {
  const navBar = screen.getByTestId('navbar')
  const scrollContainer = screen.getByTestId('scroll-container')
  const table = screen.getByTestId('table')
  const thead = screen.getByTestId('thead')

  navBar.getBoundingClientRect = () => ({ top: 0, bottom: NAVBAR_BOTTOM }) as DOMRect
  scrollContainer.getBoundingClientRect = () =>
    ({ top: state.theadTop - CONTAINER_PADDING_TOP - state.scrollY }) as DOMRect
  table.getBoundingClientRect = () =>
    ({
      top: state.theadTop - state.scrollY,
      bottom: state.theadTop + state.tableHeight - state.scrollY,
    }) as DOMRect

  const appliedOffset = () => {
    const match = /translateY\((-?\d+)px\)/.exec(thead.style.transform)
    return match ? Number(match[1]) : 0
  }
  thead.getBoundingClientRect = () =>
    ({
      top: state.theadTop - state.scrollY + appliedOffset(),
      height: THEAD_HEIGHT,
    }) as DOMRect

  return { thead, scrollContainer, appliedOffset }
}

/**
 * Mount, then stub geometry and force one recalculation — the very first pass runs against
 * jsdom's zero rects, before the stubs exist.
 */
function mount(overrides: Partial<typeof state> = {}) {
  Object.assign(state, { scrollY: 0, theadTop: 240, tableHeight: 600 }, overrides)
  const view = render(<Harness />)
  const nodes = stubGeometry()
  scrollTo(0)
  return { ...nodes, unmount: view.unmount }
}

/** Scroll, then flush the hook's rAF batch so the assertion sees the applied transform. */
function scrollTo(y: number, target: EventTarget = window) {
  state.scrollY = y
  target.dispatchEvent(new Event('scroll'))
  vi.advanceTimersByTime(32)
}

describe('useStickyTableHeader', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal(
      'requestAnimationFrame',
      (cb: FrameRequestCallback) => setTimeout(() => cb(0), 16) as unknown as number
    )
    vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('không dịch header khi bảng còn nằm dưới navbar', () => {
    const { thead } = mount()

    expect(thead.style.transform).toBe('translateY(0px)')
  })

  it('ghim header sát đáy navbar, không phụ thuộc padding phía trên bảng', () => {
    // Vùng cuộn có pt-4 (16px) phía trên bảng; neo theo mép container sẽ hụt đúng 16px đó.
    const { thead, scrollContainer } = mount({ theadTop: 240 })

    scrollTo(400, scrollContainer)

    // Vị trí gốc của thead lúc này là 240 - 400 = -160 ⇒ cần đẩy xuống 64 - (-160) = 224.
    expect(thead.style.transform).toBe('translateY(224px)')
    expect(Math.round(thead.getBoundingClientRect().top)).toBe(NAVBAR_BOTTOM)
  })

  it('bám cả khi cuộn window, không chỉ cuộn trong container', () => {
    const { thead } = mount({ theadTop: 240 })

    scrollTo(300)

    expect(Math.round(thead.getBoundingClientRect().top)).toBe(NAVBAR_BOTTOM)
  })

  it('chưa ghim khi header mới chỉ đi lên nhưng chưa chạm navbar', () => {
    const { thead } = mount({ theadTop: 240 })

    scrollTo(100)

    expect(thead.style.transform).toBe('translateY(0px)')
    expect(Math.round(thead.getBoundingClientRect().top)).toBe(140)
  })

  it('dừng lại ở đáy bảng — không trôi đè lên nội dung phía dưới', () => {
    const { appliedOffset } = mount({ theadTop: 240, tableHeight: 600 })

    // Cuộn quá đáy bảng: không chặn thì offset tăng vô hạn theo scroll.
    scrollTo(5000)

    expect(appliedOffset()).toBe(600 - THEAD_HEIGHT)
  })

  it('trả header về vị trí gốc và gỡ listener khi unmount', () => {
    const { thead, scrollContainer, unmount } = mount()
    const removeSpy = vi.spyOn(scrollContainer, 'removeEventListener')

    scrollTo(300, scrollContainer)
    expect(thead.style.transform).not.toBe('translateY(0px)')

    unmount()

    expect(thead.style.transform).toBe('translateY(0px)')
    expect(thead.style.willChange).toBe('')
    expect(removeSpy).toHaveBeenCalledWith('scroll', expect.any(Function))
  })

  it('bỏ qua im lặng khi không tìm thấy bảng — trang lỗi vẫn render bình thường', () => {
    function NoTable() {
      useStickyTableHeader('.js-missing-table')
      return <div data-name="Header" />
    }

    expect(() => {
      render(<NoTable />)
      vi.advanceTimersByTime(32)
    }).not.toThrow()
  })
})
