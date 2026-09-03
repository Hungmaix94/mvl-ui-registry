# Hướng dẫn triển khai: Thanh kéo ngang ngay trên footer table (trang danh sách)

Tài liệu tham khảo để refactor các page danh sách, đạt layout: **thanh scroll ngang nằm ngay trên footer (pagination)** thay vì nằm dưới table hoặc trong vùng scroll.

Tham chiếu: `RecruitmentExpensePage.tsx` + `RecruitmentExpenseTable.tsx` + `Table.tsx` (paginationPosition = 'static').

---

## 1. Mục tiêu layout

- Vùng nội dung table có thể scroll ngang/dọc.
- **Thanh kéo ngang (horizontal scroll bar)** và **pagination** cố định ở bottom viewport.
- Thứ tự từ trên xuống: thanh kéo ngang → footer phân trang.
- Header table có thể sticky dưới navbar khi scroll dọc (tùy feature table).

---

## 2. Cấu trúc Page (ví dụ: RecruitmentExpensePage)

```tsx
<PageTitle ... />

<Flex flexGrow={'1'} direction="column" gap="0" className="pb-6">
  <div className="flex-1 overflow-x-auto overflow-y-auto border-solid pt-0 pb-10">
    <YourTable
      data={...}
      ...
    />
  </div>
</Flex>
```

**Điểm quan trọng:**

- Bọc table trong **một** div có:
  - `flex-1` — chiếm phần còn lại của layout.
  - `overflow-x-auto overflow-y-auto` — đây là **scroll container** (vùng scroll ngang/dọc).
  - Có thể thêm `border-solid pt-0 pb-10` theo design.
- Không cần ref cho scroll container khi dùng component `Table` chuẩn (xem mục 4 nếu dùng custom table).

---

## 3. Props Table (feature table dùng `@/components/ui` Table)

Trong component table (ví dụ `RecruitmentExpenseTable`), truyền đủ props sau cho `Table`:

```tsx
<Table
  data={data}
  columns={columns}
  showSTT
  sttFrozen
  showActions
  rowActions={actions}
  enableSorting
  manualSorting
  enablePagination
  manualPagination
  disableInnerOverflow={true} // ← Bắt buộc: scroll ở wrapper page, không tạo overflow trong Table
  pageSize={pageSize}
  currentPageIndex={currentPage - 1}
  pageCount={pageCount}
  totalRecords={totalRecords}
  onPaginationChange={onPaginationChange}
  onSortingChange={onSortingChange}
  isLoading={isLoading}
  hasFilter={hasFilter}
  onClearFilter={onClearFilter}
  paginationPosition="static" // ← Bắt buộc: footer + horizontal scroll bar cố định bottom
/>
```

**Giải thích nhanh:**

| Prop                          | Ý nghĩa                                                                                                                                    |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `disableInnerOverflow={true}` | Table không thêm `overflow-x-auto` bên trong; scroll thực tế do div wrapper ở page (mục 2) đảm nhiệm.                                      |
| `paginationPosition="static"` | Pagination và **HorizontalScrollBar** được render trong một khối cố định bottom (trong `Table.tsx`), theo thứ tự: scroll bar → pagination. |

---

## 4. Cách Table.tsx dùng `paginationPosition="static"`

Trong `Table.tsx`, khi `paginationPosition === 'static'`:

- Render một khối **fixed bottom** chứa:
  1. **HorizontalScrollBar** (sync với scroll container).
  2. **TablePagination** (footer phân trang).
- `HorizontalScrollBar` nhận `containerRef={tableContainerRef}`. `tableContainerRef` hiện trỏ tới wrapper bên trong Table (hoặc `.rt-ScrollAreaViewport` nếu có). Khi scroll thật sự nằm ở **div wrapper ở page** (mục 2), nếu thanh kéo không đồng bộ thì có thể cần mở rộng Table để nhận `scrollContainerRef` từ page và truyền vào HorizontalScrollBar (tương tự cách `TimesheetPage` dùng `tableContainerRef`).

---

## 5. Sticky header (thead) khi scroll dọc - pattern mới (khuyến nghị)

Sau khi áp dụng ở `EmployeeSeniorityTable`, `EmployeeTypeConversionTable`, `EmployeeTable`, pattern mượt hơn là:

- Dùng `useLayoutEffect` (không dùng `useEffect + setTimeout`) để set vị trí trước paint.
- Scope theo đúng table instance bằng class riêng trên `Table` (ví dụ `js-employee-seniority-table`), tránh bắt nhầm container của module khác.
- Tìm phần tử theo thứ tự:
  1. `tableRoot` (`document.querySelector('.js-your-table')`)
  2. `table` (`tableRoot.querySelector('table')`)
  3. `scrollContainer` (`table.closest('[class*="overflow-x-auto"][class*="overflow-y-auto"]')`)
  4. `thead`, `navBar`
- Ưu tiên cập nhật bằng `transform: translateY(...)` (thay vì đổi `top` liên tục) để giảm layout/reflow.
- Dùng `requestAnimationFrame` và chỉ set khi giá trị thay đổi.
- Lắng nghe cả:
  - `window.scroll` (scroll toàn page)
  - `scrollContainer.scroll` (scroll trong container)
  - `window.resize`

### Công thức tính offset

```ts
const navBarBottom = Math.round(navBar.getBoundingClientRect().bottom)
const scrollContainerTop = Math.round(scrollContainer.getBoundingClientRect().top)
const offsetY =
  scrollContainerTop < navBarBottom ? Math.max(0, navBarBottom - scrollContainerTop) : 0
```

### Mẫu triển khai rút gọn

```tsx
useLayoutEffect(() => {
  const tableRoot = document.querySelector('.js-your-table') as HTMLElement | null
  if (!tableRoot) return

  const table = tableRoot.querySelector('table') as HTMLElement | null
  if (!table) return

  const scrollContainer = table.closest(
    '[class*="overflow-x-auto"][class*="overflow-y-auto"]'
  ) as HTMLElement | null
  if (!scrollContainer) return

  const thead = table.querySelector('thead') as HTMLElement | null
  const navBar = document.querySelector('[data-name="Header"]') as HTMLElement | null
  if (!thead || !navBar) return

  let frameId: number | null = null
  let lastTranslateOffset = -1

  const applyStickyTop = () => {
    frameId = null
    const navBarBottom = Math.round(navBar.getBoundingClientRect().bottom)
    const scrollContainerTop = Math.round(scrollContainer.getBoundingClientRect().top)
    const nextTranslateOffset =
      scrollContainerTop < navBarBottom ? Math.max(0, navBarBottom - scrollContainerTop) : 0

    if (nextTranslateOffset === lastTranslateOffset) return
    lastTranslateOffset = nextTranslateOffset
    thead.style.transform =
      nextTranslateOffset > 0 ? `translateY(${nextTranslateOffset}px)` : 'translateY(0px)'
  }

  const requestStickyTopUpdate = () => {
    if (frameId !== null) return
    frameId = window.requestAnimationFrame(applyStickyTop)
  }

  requestStickyTopUpdate()
  thead.style.willChange = 'transform'
  window.addEventListener('resize', requestStickyTopUpdate)
  window.addEventListener('scroll', requestStickyTopUpdate, { passive: true })
  scrollContainer.addEventListener('scroll', requestStickyTopUpdate, { passive: true })

  return () => {
    if (frameId !== null) window.cancelAnimationFrame(frameId)
    window.removeEventListener('resize', requestStickyTopUpdate)
    window.removeEventListener('scroll', requestStickyTopUpdate)
    scrollContainer.removeEventListener('scroll', requestStickyTopUpdate)
    thead.style.transform = 'translateY(0px)'
    thead.style.willChange = ''
  }
}, [data])
```

### Lưu ý quan trọng

- Không query global kiểu `document.querySelector('[class*="overflow-x-auto"][class*="overflow-y-auto"]')` nếu page có nhiều bảng.
- Không dùng `setTimeout` để chờ DOM; dễ gây giật/nháy và sai vị trí ban đầu.
- Nhớ thêm class scope vào prop `className` của `Table`, ví dụ: `className="js-your-table"`.
- Nếu dùng `transform`, giữ nguyên sticky mặc định của header (`top: 0` trong class) và chỉ bù thêm bằng `translateY`.

### Pattern nâng cao: Freeze header bằng `position: fixed` (khuyến nghị cho bảng nặng)

Áp dụng khi cần:

- Header hiển thị bình thường lúc mới vào page.
- Chỉ khi bắt đầu sticky mới "tách" header lên fixed dưới app header.
- Scroll ngang mượt và không tràn qua sidebar (kể cả sidebar mở/đóng).

Ý tưởng:

1. Giữ `thead` gốc trong table để layout ban đầu bình thường.
2. Khi đạt điều kiện sticky (`table.top < navBar.bottom`), clone `thead` sang một `fixedHost`.
3. `fixedHost` được đặt theo vùng scroll container (không phải full viewport):
   - `left = scrollContainerRect.left`
   - `width = scrollContainerRect.width`
   - `top = navBar.bottom`
   - `overflow: hidden` để clip không tràn sidebar.
4. Bên trong `fixedHost`, đặt `fixedTable` và dịch ngang theo chênh lệch:
   - `fixedTable.left = tableRect.left - scrollContainerRect.left`
5. Ẩn `thead` gốc bằng `visibility: hidden` trong lúc fixed header hoạt động.
6. Sync lại mỗi khi:
   - `window.scroll`
   - `scrollContainer.scroll` (kéo ngang/dọc trong container)
   - `window.resize`
   - thay đổi kích thước container/table (`ResizeObserver`)
7. Khi không còn sticky, ẩn `fixedHost` và restore `thead` gốc.

Snippet rút gọn:

```tsx
const fixedHost = document.createElement('div')
fixedHost.className = 'pointer-events-none fixed hidden overflow-hidden'

const fixedTable = document.createElement('table')
fixedTable.className = 'absolute border-collapse'
const fixedThead = thead.cloneNode(true) as HTMLTableSectionElement
fixedTable.appendChild(fixedThead)
fixedHost.appendChild(fixedTable)
document.body.appendChild(fixedHost)

const syncHeader = () => {
  const navBarBottom = Math.round(navBar.getBoundingClientRect().bottom)
  const scrollContainerRect = scrollContainer.getBoundingClientRect()
  const tableRect = table.getBoundingClientRect()
  const theadRect = thead.getBoundingClientRect()
  const shouldStick =
    tableRect.top < navBarBottom && tableRect.bottom > navBarBottom + theadRect.height

  if (!shouldStick) {
    fixedHost.style.display = 'none'
    thead.style.visibility = ''
    return
  }

  fixedHost.style.display = 'block'
  fixedHost.style.top = `${navBarBottom}px`
  fixedHost.style.left = `${Math.round(scrollContainerRect.left)}px`
  fixedHost.style.width = `${Math.round(scrollContainerRect.width)}px`
  fixedHost.style.height = `${Math.round(theadRect.height)}px`
  fixedHost.style.zIndex = '45'

  fixedTable.style.left = `${Math.round(tableRect.left - scrollContainerRect.left)}px`
  fixedTable.style.width = `${Math.round(tableRect.width)}px`
  thead.style.visibility = 'hidden'
}
```

Ghi chú triển khai:

- Dùng `requestAnimationFrame` để batch `syncHeader`.
- Trước khi show clone, sync width từng `th` từ `thead` gốc -> `fixedThead` để tránh lệch cột.
- `z-index` fixed header phải thấp hơn `Header` app nhưng cao hơn row data.
- Cleanup bắt buộc: remove listeners, disconnect `ResizeObserver`, remove node clone, restore `thead.style.visibility`.

---

## 6. Checklist refactor một page danh sách

- [ ] **Page:** Bọc table trong một div duy nhất với `flex-1 overflow-x-auto overflow-y-auto` (và class khác nếu cần).
- [ ] **Feature table:** Truyền `disableInnerOverflow={true}` và `paginationPosition="static"` cho `Table`.
- [ ] **Sticky header (nếu cần):** Chọn 1 trong 2 pattern ở mục 5:
  - `translateY` (nhẹ, đơn giản)
  - `fixed clone header` (ổn định hơn cho bảng nặng/scroll ngang phức tạp).
- [ ] **Kiểm tra:** Scroll ngang/dọc mượt, thanh kéo ngang và pagination cố định bottom, thanh kéo nằm ngay trên pagination.

---

## 7. Trường hợp dùng TableTree (màn hình report)

Các màn hình report dùng `TableTree` (cây phân cấp, freeze columns) có hướng dẫn riêng:

- **Xem:** `@/components/ui/table-tree/TABLE_TREE_REPORT_IMPLEMENTATION_GUIDE.md`
- **Tính năng:** Freeze header, scrollbar bottom, freeze columns
- **Tham chiếu:** `ReportRecruitmentSourcePage` + `ReportRecruitmentSourceTable`

---

## 8. Trường hợp dùng custom table (không dùng Table từ ui)

Ví dụ: `TimesheetPage` dùng `TimesheetTable` và tự render footer.

- Page tạo `tableContainerRef` và gắn vào **div scroll** (div có `overflow-x-auto overflow-y-auto`).
- Page render **HorizontalScrollBar** với `containerRef={tableContainerRef}` trong khối fixed bottom.
- Page render component phân trang ngay dưới HorizontalScrollBar.
- Đảm bảo chỉ có một scroll container và ref trỏ đúng vào nó để thanh kéo đồng bộ.

---

## 9. Tóm tắt

- **Page:** 1 wrapper scroll (`flex-1 overflow-x-auto overflow-y-auto`) bọc table.
- **Table (ui):** `disableInnerOverflow={true}` + `paginationPosition="static"` để có thanh kéo ngang + pagination cố định bottom, thanh kéo nằm ngay trên footer.
- **Sticky header:** Feature table dùng `useLayoutEffect`, scope theo class của chính table và ưu tiên cập nhật `thead.style.transform = translateY(...)` bằng RAF trên `window/container scroll` + `resize`.

Áp dụng đúng ba phần trên sẽ đạt layout “thanh kéo ngang ngay trên footer” cho các trang danh sách dùng Table chuẩn hoặc custom tương tự.
