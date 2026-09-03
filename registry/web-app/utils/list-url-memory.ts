import { SESSION_STORAGE_KEYS } from '@/constants'

/**
 * Bộ nhớ URL của các màn danh sách, trong phạm vi MỘT tab.
 *
 * Bộ lọc / phân trang / từ khoá của màn danh sách đều nằm trên query string. Khi người dùng
 * rời màn đó để xem chi tiết rồi quay lại bằng một đường KHÔNG phải đi lùi history (vào thẳng
 * link chi tiết từ Slack/mail, hoặc bấm breadcrumb), query string đó không còn ở đâu để lấy lại.
 * Module này giữ nó lại, khoá theo `pathname`.
 *
 * Dùng `sessionStorage` chứ không phải `localStorage` là có chủ ý: bộ nhớ phải chết theo tab và
 * sống qua F5. `localStorage` sẽ khiến tab mới kế thừa bộ lọc của tab cũ.
 */

type ListUrlMemory = Record<string, string>

/**
 * Chặn trên số entry để bộ nhớ không phình vô hạn trong một phiên làm việc dài.
 * Entry cũ nhất bị loại trước (thứ tự chèn của object literal).
 */
const MAX_ENTRIES = 50

/**
 * `sessionStorage` có thể ném lỗi (Safari private mode, trình duyệt chặn cookie/storage) hoặc
 * chứa JSON hỏng do phiên bản trước ghi. Bộ nhớ này chỉ là tiện ích — hỏng thì bỏ qua, tuyệt
 * đối không được làm sập điều hướng.
 */
function readMemory(): ListUrlMemory {
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEYS.LIST_URL_MEMORY)
    if (!raw) return {}

    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}

    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>).filter(
        ([, value]) => typeof value === 'string'
      )
    ) as ListUrlMemory
  } catch {
    return {}
  }
}

function writeMemory(memory: ListUrlMemory): void {
  try {
    sessionStorage.setItem(SESSION_STORAGE_KEYS.LIST_URL_MEMORY, JSON.stringify(memory))
  } catch {
    // Hết quota hoặc storage bị chặn — bỏ qua, điều hướng vẫn phải chạy.
  }
}

/**
 * Ghi nhớ query string đang đứng của một `pathname`.
 *
 * `search` rỗng ⇒ **xoá** entry. Đây là nửa quan trọng của luật: người dùng vừa bấm "Xoá bộ lọc"
 * thì lần quay lại sau không được hồi sinh bộ lọc cũ.
 */
export function rememberListUrl(pathname: string, search: string): void {
  if (!pathname) return

  const memory = readMemory()

  if (!search || search === '?') {
    if (!(pathname in memory)) return

    delete memory[pathname]
    writeMemory(memory)
    return
  }

  if (memory[pathname] === search) return

  // Xoá trước khi ghi để entry vừa dùng nhảy về CUỐI thứ tự chèn — nhờ vậy phép loại bên dưới
  // luôn bỏ entry lâu không đụng tới, chứ không bỏ entry đang dùng nhiều nhất.
  delete memory[pathname]
  memory[pathname] = search

  const keys = Object.keys(memory)
  if (keys.length > MAX_ENTRIES) {
    for (const staleKey of keys.slice(0, keys.length - MAX_ENTRIES)) {
      delete memory[staleKey]
    }
  }

  writeMemory(memory)
}

/** Query string đã nhớ của `pathname` (gồm cả dấu `?`), hoặc chuỗi rỗng nếu chưa từng ghi. */
export function getRememberedSearch(pathname: string): string {
  if (!pathname) return ''

  return readMemory()[pathname] ?? ''
}

/**
 * Ghép query string đã nhớ vào một đường dẫn trần.
 *
 * Đường dẫn đã tự mang sẵn `?` thì trả về nguyên trạng — nơi gọi đã nói rõ ý định, bộ nhớ không
 * được phép ghi đè.
 */
export function withRememberedSearch(path: string): string {
  if (!path || path.includes('?')) return path

  return `${path}${getRememberedSearch(path)}`
}

/** Chỉ dùng cho test — xoá sạch bộ nhớ của tab hiện tại. */
export function clearListUrlMemory(): void {
  try {
    sessionStorage.removeItem(SESSION_STORAGE_KEYS.LIST_URL_MEMORY)
  } catch {
    // Không làm gì — xem readMemory.
  }
}
