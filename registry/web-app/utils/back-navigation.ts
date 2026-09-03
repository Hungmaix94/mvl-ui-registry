/**
 * Nhánh quyết định của nút back dùng chung (`PageTitle`).
 *
 * Tách khỏi component vì đây chính là chỗ từng hỏng: bản cũ đoán "có đi lùi được không" bằng
 * `document.referrer` — thứ vô nghĩa trong SPA — nên phần lớn phiên làm việc rơi vào nhánh
 * fallback và đẩy người dùng về đường dẫn cha TRẦN, mất sạch bộ lọc trên query string.
 *
 * Hàm thuần nên test được thẳng, không phải render `PageTitle` (repo cấm
 * `container.querySelector` / `.closest()` qua ESLint nên test render đo cây cha không lọt CI).
 */

export type BackTarget =
  /** Đi lùi đúng nghĩa trong history — `navigate(-1)`. */
  | { type: 'pop' }
  /** Điều hướng tới một đường dẫn cụ thể — `navigate(to, { state })`. */
  | { type: 'push'; to: string; from?: string }

export type ResolveBackTargetParams = {
  /** `location.state.from` — đường dẫn màn trước, do màn danh sách truyền sang khi mở chi tiết. */
  from?: string
  /** `location.state.parentFrom` — mắt kế tiếp của chuỗi, cho luồng 3 cấp. */
  parentFrom?: string
  /** Kết quả `canGoBackInApp()`. */
  canGoBack: boolean
  /** Đường dẫn cha suy từ pathname (`getParentRoute`) — luôn TRẦN, không có query string. */
  fallbackPath: string
  /** Query string đã nhớ của `fallbackPath` (gồm dấu `?`), rỗng nếu chưa từng ghi. */
  rememberedSearch?: string
}

export function resolveBackTarget({
  from,
  parentFrom,
  canGoBack,
  fallbackPath,
  rememberedSearch = '',
}: ResolveBackTargetParams): BackTarget {
  // 1. Màn trước đã nói rõ chỗ cần quay về (kèm cả query string của nó) — tin nó trước hết.
  //    Giữ nguyên nhánh này để các màn đang truyền `state.from` không bị hồi quy.
  if (from) {
    return { type: 'push', to: from, from: parentFrom }
  }

  // 2. Có entry trong app để lùi ⇒ lùi thật. Đây là đường giữ được bộ lọc mà không cần nhớ gì:
  //    URL của entry cũ vốn đã mang đủ bộ lọc, phân trang và từ khoá.
  if (canGoBack) {
    return { type: 'pop' }
  }

  // 3. Vào thẳng từ ngoài (Slack/mail/bookmark) — không có gì để lùi. Ghép lại query string đã
  //    nhớ nếu tab này từng ghé màn danh sách đó.
  return { type: 'push', to: `${fallbackPath}${rememberedSearch}` }
}
