/**
 * `calculateFrozenOffsets` quyết định cột đông cứng dính ở toạ độ nào khi kéo ngang.
 *
 * Bản đầu chỉ duyệt mảng cột CẤP 1 nên chạy đúng với bảng phẳng và hỏng lặng lẽ với bảng có
 * header nhiều tầng: ô thân bảng thuộc cột LÁ (`project_name_col`) mà map chỉ có key của cột
 * nhóm (`project_name`) ⇒ ô body nhận `left: "undefinedpx"`, trình duyệt bỏ qua, thân bảng trôi
 * theo khi kéo trong khi header đứng yên. Hai màn worksheet kỳ là bảng đầu tiên trong repo vừa
 * có header 3 tầng vừa cần đông cứng cột, nên hành vi đó được khoá ở đây.
 */
import { describe, expect, it } from 'vitest'

import type { ColumnDef } from '@tanstack/react-table'

import { calculateFrozenOffsets, getWidthInPixels } from './columnHelpers'

type Row = Record<string, unknown>

const col = (
  id: string,
  meta?: Record<string, unknown>,
  columns?: ColumnDef<Row>[]
): ColumnDef<Row> => ({ id, meta, ...(columns ? { columns } : {}) }) as ColumnDef<Row>

/** Cột đã đi qua `useTable` — hook đó quy đổi `meta.width` → `size` cho cột cấp 1. */
const sized = (id: string, size: number, frozen = true): ColumnDef<Row> =>
  ({ id, size, meta: frozen ? { frozen: true } : {} }) as ColumnDef<Row>

describe('calculateFrozenOffsets — bảng phẳng (hành vi cũ, không được đổi)', () => {
  it('cộng dồn bề rộng theo thứ tự khai báo', () => {
    const offsets = calculateFrozenOffsets<Row>([
      sized('stt', 64),
      sized('code', 210),
      sized('project', 250),
      sized('amount', 120, false),
    ])

    expect(offsets).toEqual({ stt: 0, code: 64, project: 274 })
  })

  it('bỏ qua cột không đông cứng — cột đó không vào map và không cộng bề rộng', () => {
    const offsets = calculateFrozenOffsets<Row>([
      sized('stt', 64),
      sized('note', 300, false),
      sized('code', 100),
    ])

    expect(offsets).toEqual({ stt: 0, code: 64 })
  })

  it('chuẩn hoá `accessorKey` có dấu chấm giống `cell.column.id` lúc chạy', () => {
    const offsets = calculateFrozenOffsets<Row>([
      { accessorKey: 'employee.fullname', size: 100, meta: { frozen: true } } as ColumnDef<Row>,
    ])

    expect(offsets).toEqual({ employee_fullname: 0 })
  })
})

describe('calculateFrozenOffsets — bề rộng phải phản chiếu `column.getSize()`', () => {
  it('KHÔNG lấy `meta.width`: cột thiếu `size` render 150px dù meta ghi 180px', () => {
    // Đúng hình dạng cột LÁ của bảng header nhiều tầng: `useTable` chỉ quy đổi `meta.width` →
    // `size` cho cột CẤP 1 nên lá không bao giờ có `size`, và bảng render 150px.
    const offsets = calculateFrozenOffsets<Row>([
      col('a', { width: 'w-[180px]', frozen: true }),
      col('b', { width: 'w-[160px]', frozen: true }),
    ])

    // Lấy theo meta.width sẽ ra 180 — lệch 30px so với thực tế, đủ để hở khe cho nội dung
    // đang cuộn lộ qua (đã đo thật trên màn "Chia HH theo tháng").
    expect(offsets).toEqual({ a: 0, b: 150 })
  })

  it('`size` có thì thắng, kể cả khi `meta.width` ghi số khác', () => {
    const offsets = calculateFrozenOffsets<Row>([
      { id: 'a', size: 64, meta: { width: 'w-[999px]', frozen: true } } as ColumnDef<Row>,
      col('b', { width: 'w-[10px]', frozen: true }),
    ])

    expect(offsets).toEqual({ a: 0, b: 64 })
  })
})

describe('calculateFrozenOffsets — header nhiều tầng (hai màn worksheet kỳ)', () => {
  /**
   * Đúng hình dạng thật: nhóm chữ cái Excel → tầng mang nhãn → lá chứa cell.
   *
   * Lá cố ý CHỈ có `meta.width`, không có `size` — y như trên màn thật, vì `useTable` không đệ
   * quy xuống lá. Bảng vì thế render lá ở 150px, và offset phải theo con số đó.
   */
  const tiered = (id: string, width: string, frozen: boolean): ColumnDef<Row> =>
    col(id, { align: 'center', ...(frozen ? { frozen: true } : {}) }, [
      col(`${id}_tier1`, { width, ...(frozen ? { frozen: true } : {}) }, [
        col(`${id}_col`, { width, ...(frozen ? { frozen: true } : {}) }),
      ]),
    ])

  const columns: ColumnDef<Row>[] = [
    sized('stt', 64),
    tiered('project_name', 'w-[180px]', true),
    tiered('unit_number', 'w-[160px]', true),
    tiered('investor_name', 'w-[200px]', false),
  ]

  it('CẢ BA id của một cột (nhóm, tầng nhãn, lá) đều có offset', () => {
    const offsets = calculateFrozenOffsets<Row>(columns)

    for (const id of ['project_name', 'project_name_tier1', 'project_name_col']) {
      expect(
        offsets,
        `thiếu offset cho '${id}' — ô tương ứng sẽ trôi khi kéo ngang`
      ).toHaveProperty(id)
    }
  })

  it('ba tầng của cùng một cột dùng CHUNG một offset (mép trái của nhóm)', () => {
    const offsets = calculateFrozenOffsets<Row>(columns)

    expect(offsets.project_name).toBe(64)
    expect(offsets.project_name_tier1).toBe(64)
    expect(offsets.project_name_col).toBe(64)
  })

  it('bề rộng cộng dồn lấy ở LÁ, theo bề rộng RENDER (150px) chứ không theo meta.width', () => {
    const offsets = calculateFrozenOffsets<Row>(columns)

    // stt 64 + Dự án 150 (bề rộng render thật) = 214. Lấy theo `meta.width` sẽ ra 64 + 180 = 244
    // và cột "Mã BĐS" dính lệch 30px so với chỗ nó thực sự nằm ⇒ hở khe.
    expect(offsets.unit_number).toBe(214)
    expect(offsets.unit_number_col).toBe(214)
  })

  it('cột nhóm KHÔNG đông cứng thì cả nhánh không vào map', () => {
    const offsets = calculateFrozenOffsets<Row>(columns)

    expect(offsets).not.toHaveProperty('investor_name')
    expect(offsets).not.toHaveProperty('investor_name_col')
  })

  it('nhóm cha đông cứng thì lá thừa hưởng, không cần khai lại ở từng tầng', () => {
    const offsets = calculateFrozenOffsets<Row>([
      sized('stt', 64),
      col('grp', { frozen: true }, [
        col('grp_tier1', {}, [{ id: 'grp_col', size: 180 } as ColumnDef<Row>]),
      ]),
      sized('next', 10),
    ])

    expect(offsets.grp_col).toBe(64)
    // Bề rộng của lá vẫn được cộng dù lá không tự khai `frozen`.
    expect(offsets.next).toBe(244)
  })

  it('nhóm nhiều lá cộng đủ bề rộng của mọi lá', () => {
    const offsets = calculateFrozenOffsets<Row>([
      col('grp', { frozen: true }, [
        { id: 'a', size: 100 } as ColumnDef<Row>,
        { id: 'b', size: 50 } as ColumnDef<Row>,
      ]),
      sized('after', 10),
    ])

    expect(offsets).toMatchObject({ grp: 0, a: 0, b: 100, after: 150 })
  })
})

describe('getWidthInPixels', () => {
  it.each([
    ['w-16', 64],
    ['w-[180px]', 180],
    ['w-[180]', 180],
    ['240px', 240],
    ['', 120],
    ['w-khong-biet', 120],
  ])('%s → %ipx', (input, expected) => {
    expect(getWidthInPixels(input)).toBe(expected)
  })
})
