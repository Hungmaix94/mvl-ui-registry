/**
 * Guard: header của MỖI mục phải hiện "Tổng nhóm", và con số đó phải trùng dòng cùng số thứ tự
 * ở panel "Diễn giải" (ClickUp 86eynz1a2 — CR STT54).
 *
 * Trước CR này chỉ hai mục có Tổng nhóm; các mục còn lại chỉ có chip đếm số khoản. Kế toán đọc
 * màn này để đối soát từng rổ tiền, mà dòng TỔNG của bảng con **biến mất khi bảng rỗng** (mọi
 * bảng đều early-return "Không có dữ liệu"), nên mục 0 khoản không có chỗ nào đọc ra số.
 *
 * Thứ guard này canh KHÔNG phải "có hiện chữ Tổng nhóm không", mà là **lấy số từ đâu**. Cạm bẫy
 * thật: tự cộng lại `lines` của mục để ra tổng. Làm vậy đẻ ra con số thứ ba lệch với cả "Diễn
 * giải" lẫn dòng TỔNG của bảng, vì hai mục không cộng được ở header:
 *
 * - mục ② (HHQL) nạp dòng qua API riêng `useManagementHhqlLines`, header render lúc chưa có data.
 *
 * (Mục "Thưởng" từng là ca thứ hai — nó trộn đợt thưởng vừa xác nhận ở client nên lệch với
 * `summary.bonus_total` cho tới lần refetch sau. Mục đó đã gỡ khỏi màn 20/08/2026 vì thuộc đợt
 * chi SALE; luật vẫn giữ nguyên cho mọi mục.)
 *
 * Đúng kiểu mâu thuẫn nội bộ mà 86eykq956 đã phải đi sửa trên chính màn này (7 mục hiện 0 đ trong
 * khi tổng ra 809.407 đ). Đây là chứng từ có nút *Xuất PDF* / *Gửi bảng kê* — sai ở đây là sai
 * trên giấy gửi cho nhân viên.
 *
 * Guard đọc source thay vì render, cùng lý do đã ghi ở `CommMgrDetail.backoffice.guard.test.ts`:
 * `breakdown` là biến nội bộ của component, và đo bằng DOM phải đi ngược cây cha — thao tác bị
 * `testing-library/no-node-access` cấm.
 *
 * Thêm mục mới vào màn ⇒ thêm một dòng vào `CAC_MUC`.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const COMPONENT = join(dirname(fileURLToPath(import.meta.url)), 'CommMgrDetail.tsx')
const source = readFileSync(COMPONENT, 'utf8')

type Muc = {
  /** Số thứ tự hiện trên màn, cũng là tiền tố nhãn ở panel Diễn giải. */
  so: number
  /** Comment mốc mở đầu khối JSX của mục trong source. */
  moc: string
  /** Nhãn đầy đủ của dòng tương ứng ở panel "Diễn giải". */
  nhanDienGiai: string
}

/** Mốc kết thúc mục ⑥ — mục cuối cùng, sau nó là các dialog. */
const HET_CAC_MUC = '{summary.status === MonthlyStatus.DRAFT && isTransferDialogOpen'

// Bảng kê này là chứng từ của ĐỢT CHI QUẢN LÝ (wave MGMT). Hai rổ tiền của đợt SALE — "HH bán
// hàng cá nhân" và "Thưởng thực chi trong kỳ" (`WAVE_FOR_ROLE[BONUS] = SALE`) — đã gỡ khỏi màn,
// mỗi rổ có bảng kê riêng ở màn 20.8.1. Các mục còn lại đánh số 1→6.
const CAC_MUC: readonly Muc[] = [
  { so: 1, moc: '{/* Section ①: Thưởng', nhanDienGiai: '1 - Thưởng HH quản lý' },
  { so: 2, moc: '{/* Section ②', nhanDienGiai: '2 - Hoa hồng quản lý KPI/HHQL' },
  { so: 3, moc: '{/* Section ③', nhanDienGiai: '3 - Hoa hồng Sàn liên kết' },
  { so: 4, moc: '{/* Section ④', nhanDienGiai: '4 - Hoa hồng Đầu tư, Xúc tiến & Phát triển Dự án' },
  { so: 5, moc: '{/* Section ⑤', nhanDienGiai: '5 - Hoa hồng Giám đốc dự án' },
  { so: 6, moc: '{/* Section ⑥', nhanDienGiai: '6 - Hoa hồng khối hỗ trợ (Backoffice)' },
]

/**
 * Vị trí của một mốc trong source — NÉM khi không thấy.
 *
 * Không được trả -1 rồi để `slice`/so sánh chạy tiếp: `indexOf` trả -1 vẫn lọt qua mọi phép so
 * sánh kiểu `<`, nên guard sẽ XANH đúng lúc thứ nó canh đã bị gỡ đi. Cùng bài học với commit
 * `2fd5b8681` (assert thứ tự cột bằng `indexOf` trần là test rỗng).
 */
function viTri(moc: string, tu = 0): number {
  const i = source.indexOf(moc, tu)
  if (i < 0) throw new Error(`không tìm thấy mốc "${moc}" trong CommMgrDetail.tsx`)
  return i
}

/** Khối JSX của một mục: từ comment mốc của nó tới mốc của mục kế tiếp trong source. */
function khoiCuaMuc(muc: Muc): string {
  const batDau = viTri(muc.moc)
  const mocSau = CAC_MUC.map((m) => m.moc)
    .map((m) => source.indexOf(m, batDau + muc.moc.length))
    .filter((i) => i > -1)
  const ketThuc = mocSau.length > 0 ? Math.min(...mocSau) : viTri(HET_CAC_MUC, batDau)
  return source.slice(batDau, ketThuc)
}

/** Biểu thức trong `<SectionTotal value={...} />` của một mục. */
function bieuThucHeader(muc: Muc): string {
  const khoi = khoiCuaMuc(muc)
  const m = khoi.match(/<SectionTotal\s+value=\{([^}]+)\}\s*\/>/)
  if (!m) throw new Error(`mục ${muc.so} không có <SectionTotal /> ở header`)
  return m[1].trim()
}

/** Biểu thức trong `value={...}` của dòng Diễn giải mang nhãn đã cho. */
function bieuThucDienGiai(muc: Muc): string {
  const iNhan = viTri(`label="${muc.nhanDienGiai}"`)
  const m = source.slice(iNhan).match(/value=\{([^}]+)\}/)
  if (!m) throw new Error(`dòng Diễn giải "${muc.nhanDienGiai}" không có value={...}`)
  return m[1].trim()
}

describe('CommMgrDetail — Tổng nhóm ở header mỗi mục (CR 86eynz1a2)', () => {
  it('mọi mục còn lại đều có <SectionTotal /> ở header', () => {
    const thieu = CAC_MUC.filter((muc) => !khoiCuaMuc(muc).includes('<SectionTotal')).map(
      (muc) => muc.so
    )

    expect(
      thieu,
      `mục thiếu Tổng nhóm ở header: ${thieu.join(', ')} — mục rỗng sẽ không có chỗ nào đọc ra số vì bảng con early-return "Không có dữ liệu"`
    ).toEqual([])
  })

  it.each(CAC_MUC)('mục $so lấy số cùng nguồn với dòng Diễn giải "$nhanDienGiai"', (muc) => {
    expect(
      bieuThucHeader(muc),
      `Tổng nhóm ở header mục ${muc.so} phải dùng đúng biểu thức của dòng Diễn giải số ${muc.so}; lệch nguồn là màn tự mâu thuẫn với chính nó`
    ).toBe(bieuThucDienGiai(muc))
  })

  it('không mục nào tự cộng lại lines để ra Tổng nhóm', () => {
    // Chặn đúng cạm bẫy: `<SectionTotal value={linesX.reduce(...)} />`. Dòng TỔNG *bên trong*
    // các bảng con vẫn được phép reduce — chúng nằm ngoài khối header của mục.
    const pham = CAC_MUC.filter((muc) =>
      /<SectionTotal\s+value=\{[^}]*reduce/.test(khoiCuaMuc(muc))
    ).map((muc) => muc.so)

    expect(
      pham,
      `mục ${pham.join(', ')} tự cộng lines ở header — mục ② nạp dòng qua API riêng nên lúc header render chưa có dữ liệu, cộng lại sẽ ra số thứ ba lệch với Diễn giải`
    ).toEqual([])
  })

  it('SectionTotal là nguồn dùng chung duy nhất, không còn bản inline nào', () => {
    // Trước CR, mục ② và ⑥ mỗi chỗ chép một bản markup "Tổng nhóm". Để chúng tồn tại song song
    // là lần sau sửa một chỗ quên chỗ kia — đúng kiểu trôi đã gặp ở 86eymkje9.
    const soLanKhaiBao = source.split("Tổng nhóm{' '}").length - 1

    expect(
      soLanKhaiBao,
      'chuỗi "Tổng nhóm" chỉ được xuất hiện MỘT lần, bên trong component SectionTotal'
    ).toBe(1)
  })

  it('Tổng nhóm hiện vô điều kiện, kể cả mục 0 khoản', () => {
    // Lý do CR tồn tại: bảng rỗng thì dòng TỔNG biến mất. Nếu ai đó bọc SectionTotal vào
    // `lines.length > 0 &&` thì mục rỗng lại mất số y như cũ.
    const pham = CAC_MUC.filter((muc) =>
      /length\s*>\s*0\s*&&\s*(\(\s*)?<SectionTotal/.test(khoiCuaMuc(muc))
    ).map((muc) => muc.so)

    expect(
      pham,
      `mục ${pham.join(', ')} chỉ hiện Tổng nhóm khi có dòng — mục 0 khoản lại không đọc được số, đúng cái CR này đi sửa`
    ).toEqual([])
  })
})
