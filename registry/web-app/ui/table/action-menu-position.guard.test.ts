import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Menu hành động phải mở TẠI CON TRỎ khi người dùng bấm vào một dòng.
 *
 * `<Table>` mặc định đã là `actionMenuPosition="cursor"`, nên hầu hết bảng trong repo không khai
 * gì và tự động đúng. Rủi ro nằm ở việc ai đó khai đè thành `"cell"` — menu khi ấy neo cứng vào
 * ô kebab cuối dòng, và với những bảng rộng vài nghìn px thì người dùng phải kéo ngang hết bảng
 * chỉ để bấm một hành động.
 *
 * Đó không phải giả thuyết: bảy bảng kế toán từng mang `"cell"`, tất cả vào cùng một lượt ở
 * commit `4c1aefb43` (21/05/2026, "Refine receipt voucher wizard UI and logic") — không màn nào
 * có lý do riêng, và một trong số đó còn ghi hẳn comment "chọn `cell` cho khớp 6 bảng anh em",
 * tức lý do duy nhất là bắt chước lẫn nhau. Người dùng báo lỗi sau đó 3 tháng.
 *
 * Guard này quét source thay vì render: đây là luật về CÁCH KHAI BÁO, và cách khai báo sai thì
 * không test render nào của từng màn bắt được — mỗi màn nhìn riêng vẫn "chạy".
 *
 * Cần `"cell"` thật cho một màn cụ thể? Thêm nó vào `ALLOWED_CELL` kèm lý do — bắt buộc phải là
 * lý do của CHÍNH màn đó, không phải "cho khớp các bảng khác".
 */

const SRC = join(process.cwd(), 'src')

/** Màn được phép dùng `cell`, kèm lý do riêng. Rỗng = mọi bảng đều mở menu tại con trỏ. */
const ALLOWED_CELL: Record<string, string> = {}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) return walk(full)
    return full.endsWith('.tsx') ? [full] : []
  })
}

function offenders() {
  return walk(SRC)
    .filter((file) => readFileSync(file, 'utf8').includes('actionMenuPosition="cell"'))
    .map((file) => file.slice(SRC.length + 1).replace(/\\/g, '/'))
    .filter((rel) => !(rel in ALLOWED_CELL))
}

describe('actionMenuPosition — menu hành động mở tại con trỏ', () => {
  it('không màn nào khai đè thành "cell" ngoài danh sách được phép', () => {
    expect(offenders()).toEqual([])
  })

  // Đối chứng cho phép so ở trên. Không có nó thì một lỗi đường dẫn / glob hỏng cũng cho ra mảng
  // rỗng, và test xanh trong khi thật ra nó chưa đọc được file nào.
  it('phép quét thật sự đọc được source (tiền đề)', () => {
    const files = walk(SRC)
    expect(files.length).toBeGreaterThan(500)
    // Chuỗi này chắc chắn tồn tại: đó là giá trị ĐÚNG mà các màn đang khai tường minh.
    const withCursor = files.filter((f) =>
      readFileSync(f, 'utf8').includes('actionMenuPosition="cursor"')
    )
    expect(withCursor.length).toBeGreaterThan(0)
  })
})
