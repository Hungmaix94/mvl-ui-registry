import { describe, expect, it } from 'vitest'

import { FEATURE_KEY, type FeatureKey } from '@/constants/feature-flags'
import {
  isPathForbidden,
  parseForbiddenFeatures,
  resolveFeatureKeyByPath,
} from '@/utils/feature-flags'

const ALL_FEATURE_KEYS: Array<FeatureKey> = Object.values(FEATURE_KEY)

function forbid(...keys: Array<FeatureKey>): ReadonlySet<FeatureKey> {
  return new Set(keys)
}

describe('parseForbiddenFeatures', () => {
  it('trả về tập rỗng khi biến môi trường không được khai báo', () => {
    expect(parseForbiddenFeatures(undefined).size).toBe(0)
    expect(parseForbiddenFeatures(null).size).toBe(0)
    expect(parseForbiddenFeatures('').size).toBe(0)
  })

  it('tách danh sách key ngăn cách bởi dấu phẩy', () => {
    const parsed = parseForbiddenFeatures('elibrary,chat')

    expect(parsed).toEqual(new Set([FEATURE_KEY.ELIBRARY, FEATURE_KEY.CHAT]))
  })

  it('bỏ qua khoảng trắng thừa và chuẩn hoá chữ hoa', () => {
    const parsed = parseForbiddenFeatures('  ELibrary , GROUP-CHAT  ')

    expect(parsed).toEqual(new Set([FEATURE_KEY.ELIBRARY, FEATURE_KEY.GROUP_CHAT]))
  })

  it('bỏ qua key không hợp lệ thay vì ném lỗi', () => {
    const parsed = parseForbiddenFeatures('elibrary,khong-ton-tai,,accounting')

    expect(parsed).toEqual(new Set([FEATURE_KEY.ELIBRARY, FEATURE_KEY.ACCOUNTING]))
  })

  it('nhận diện đủ 5 cụm tính năng', () => {
    const parsed = parseForbiddenFeatures('elibrary,project-secretary,accounting,chat,group-chat')

    expect(parsed.size).toBe(5)
  })
})

describe('resolveFeatureKeyByPath', () => {
  it('khớp đường dẫn gốc của cụm tính năng', () => {
    expect(resolveFeatureKeyByPath('/elibrary')).toBe(FEATURE_KEY.ELIBRARY)
    expect(resolveFeatureKeyByPath('/chat')).toBe(FEATURE_KEY.CHAT)
  })

  it('khớp mọi đường dẫn con, kể cả màn chi tiết không có trong menu', () => {
    expect(resolveFeatureKeyByPath('/elibrary/items/42/access-requests')).toBe(FEATURE_KEY.ELIBRARY)
    expect(resolveFeatureKeyByPath('/project-admin/project/management/7/edit')).toBe(
      FEATURE_KEY.PROJECT_SECRETARY
    )
  })

  it('bỏ qua dấu gạch chéo thừa ở cuối', () => {
    expect(resolveFeatureKeyByPath('/accounting/')).toBe(FEATURE_KEY.ACCOUNTING)
  })

  it('chỉ khớp trên ranh giới segment nên không nuốt nhầm đường dẫn khác', () => {
    expect(resolveFeatureKeyByPath('/chatbot')).toBeUndefined()
    expect(resolveFeatureKeyByPath('/elibrary-archive')).toBeUndefined()
  })

  it('trả về undefined cho đường dẫn không thuộc cụm nào', () => {
    expect(resolveFeatureKeyByPath('/')).toBeUndefined()
    expect(resolveFeatureKeyByPath('/hrm/employee')).toBeUndefined()
  })

  // Va chạm 1: /chat/group-channels nằm trong /chat
  it('ưu tiên tiền tố dài nhất: Group Chat thắng Trò chuyện', () => {
    expect(resolveFeatureKeyByPath('/chat/group-channels')).toBe(FEATURE_KEY.GROUP_CHAT)
    expect(resolveFeatureKeyByPath('/chat/group-channels/12')).toBe(FEATURE_KEY.GROUP_CHAT)
  })

  // Va chạm 2: 3 màn tạm ứng của Thư ký dự án nằm trong /accounting
  it('ưu tiên tiền tố dài nhất: màn tạm ứng thuộc Thư ký dự án, không thuộc Kế toán', () => {
    expect(resolveFeatureKeyByPath('/accounting/commission-advances')).toBe(
      FEATURE_KEY.PROJECT_SECRETARY
    )
    expect(resolveFeatureKeyByPath('/accounting/investor-advances/5/edit')).toBe(
      FEATURE_KEY.PROJECT_SECRETARY
    )
    expect(resolveFeatureKeyByPath('/accounting/investor-advances')).toBe(
      FEATURE_KEY.PROJECT_SECRETARY
    )
  })

  it('các đường dẫn kế toán còn lại vẫn thuộc Kế toán', () => {
    expect(resolveFeatureKeyByPath('/accounting/collaborator/3')).toBe(FEATURE_KEY.ACCOUNTING)
    expect(resolveFeatureKeyByPath('/accounting/config/periods')).toBe(FEATURE_KEY.ACCOUNTING)
  })
})

describe('isPathForbidden', () => {
  it('không chặn gì khi danh sách tắt rỗng', () => {
    expect(isPathForbidden('/elibrary', forbid())).toBe(false)
  })

  it('chặn cụm đã tắt cùng toàn bộ đường dẫn con', () => {
    const forbidden = forbid(FEATURE_KEY.ELIBRARY)

    expect(isPathForbidden('/elibrary', forbidden)).toBe(true)
    expect(isPathForbidden('/elibrary/my-documents', forbidden)).toBe(true)
  })

  // Hồi quy: `/docs/:token` là trang xem tài liệu public DÙNG CHUNG — share-link.ts dựng
  // link này cho cả elibrary lẫn tài liệu dự án (cụm Thư ký dự án). Chặn nó khi tắt Thư viện
  // điện tử sẽ giết mọi link đã gửi ra ngoài của cụm khác đang bật.
  it('KHÔNG chặn trang xem tài liệu public dùng chung, dù tắt cụm nào', () => {
    expect(isPathForbidden('/docs/abc-token', forbid(FEATURE_KEY.ELIBRARY))).toBe(false)
    expect(isPathForbidden('/docs/abc-token', forbid(FEATURE_KEY.PROJECT_SECRETARY))).toBe(false)
    expect(isPathForbidden('/docs/abc-token', forbid(...ALL_FEATURE_KEYS))).toBe(false)
  })

  it('không chặn cụm còn bật', () => {
    expect(isPathForbidden('/hrm/employee', forbid(FEATURE_KEY.ELIBRARY))).toBe(false)
    expect(isPathForbidden('/accounting/collaborator', forbid(FEATURE_KEY.ELIBRARY))).toBe(false)
  })

  it('tắt Trò chuyện không kéo theo Group Chat', () => {
    const forbidden = forbid(FEATURE_KEY.CHAT)

    expect(isPathForbidden('/chat', forbidden)).toBe(true)
    expect(isPathForbidden('/chat/group-channels', forbidden)).toBe(false)
  })

  it('tắt Group Chat không kéo theo Trò chuyện', () => {
    const forbidden = forbid(FEATURE_KEY.GROUP_CHAT)

    expect(isPathForbidden('/chat/group-channels', forbidden)).toBe(true)
    expect(isPathForbidden('/chat', forbidden)).toBe(false)
  })

  it('tắt Kế toán không giết 3 màn tạm ứng của Thư ký dự án', () => {
    const forbidden = forbid(FEATURE_KEY.ACCOUNTING)

    expect(isPathForbidden('/accounting/collaborator', forbidden)).toBe(true)
    expect(isPathForbidden('/accounting/commission-advances', forbidden)).toBe(false)
    expect(isPathForbidden('/accounting/investor-advances', forbidden)).toBe(false)
    expect(isPathForbidden('/accounting/investor-advances', forbidden)).toBe(false)
  })

  it('tắt Thư ký dự án chặn cả 3 màn tạm ứng nằm dưới /accounting', () => {
    const forbidden = forbid(FEATURE_KEY.PROJECT_SECRETARY)

    expect(isPathForbidden('/project-admin/project/management', forbidden)).toBe(true)
    expect(isPathForbidden('/accounting/commission-advances', forbidden)).toBe(true)
    expect(isPathForbidden('/accounting/collaborator', forbidden)).toBe(false)
  })
})
