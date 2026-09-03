import { useCallback, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import {
  collaboratorService,
  type CollaboratorDropdown,
  type GetCollaboratorsDropdownParams,
} from '@/features/accounting/collaborators/services/collaborator-service.ts'
import { buildCollaboratorOption } from '@/features/accounting/collaborators/_shares/utils/collaborator-option.ts'
import { QUERY_KEYS } from '@/constants'
import { SelectOption, LoadOptionsParams, LoadOptionsResult } from '../ui/select/Select'

/**
 * Nguồn options cho mọi ô chọn "Cộng tác viên" trong app.
 *
 * Dùng endpoint `/api/sales/collaborators/dropdown/` — payload gọn (`id, code, name, phone,
 * id_number`) và `search` khớp cả mã, họ tên lẫn CMND/CCCD (verify trên API thật 2026-08-03:
 * `search=78945132132` và `search=789451` đều trúng). Trước đây hook gọi endpoint list nặng và
 * còn nạp sẵn 100 CTV mà KHÔNG nơi gọi nào dùng tới.
 *
 * Màn danh sách CTV không dùng hook này — nó cần đủ trường nên vẫn gọi `useCollaborators` (list).
 */
export const useCollaboratorSelect = () => {
  const queryClient = useQueryClient()

  // Lần `loadCollaboratorOptions` gần nhất có lỗi không. Dùng ref chứ không dùng state: cờ này chỉ
  // được đọc trong lúc render empty-state (sau khi `Select` đã setItems([]) và re-render).
  const lastLoadFailedRef = useRef(false)

  // `GetCollaboratorsDropdownParams` sinh ra là `{...} | undefined` (query optional), trong khi
  // query-key builder nhận `Record<string, unknown>` → bỏ nhánh undefined ở đây.
  const fetchDropdown = useCallback(
    (params: NonNullable<GetCollaboratorsDropdownParams>, staleTime: number) =>
      queryClient.fetchQuery({
        queryKey: QUERY_KEYS.COLLABORATORS.DROPDOWN(params),
        queryFn: () => collaboratorService.getCollaboratorsDropdown(params),
        staleTime,
      }),
    [queryClient]
  )

  const loadCollaboratorOptions = useCallback(
    async (loadParams: LoadOptionsParams): Promise<LoadOptionsResult<SelectOption>> => {
      const search = (loadParams?.query || '').trim()
      const page = loadParams.page || 1
      const pageSize = loadParams.pageSize || 20

      try {
        // `staleTime: 0` là BẮT BUỘC ở nhánh tìm kiếm. Người dùng tạo CTV mới (tab khác / màn CTV)
        // rồi quay lại mở dropdown với cùng từ khoá: nếu còn cache "tươi" thì `fetchQuery` trả cache
        // và CTV vừa tạo KHÔNG xuất hiện — đúng luồng CR STT26. Vẫn giữ dedupe request đang bay.
        const response = await fetchDropdown(
          {
            ...(search ? { search } : {}),
            page,
            page_size: pageSize,
          },
          0
        )

        const results: CollaboratorDropdown[] = response?.results || []
        const hasNextPage = !!response?.next

        lastLoadFailedRef.current = false
        return {
          items: results.map((c) => buildCollaboratorOption(c)),
          hasNextPage,
          nextPage: hasNextPage ? page + 1 : null,
        }
      } catch {
        // `Select` nuốt lỗi của `loadOptions` (chỉ setItems([])), nên nơi gọi không thể phân biệt
        // "API hỏng" với "không có kết quả". Ghi cờ lại để empty-state không mời tạo mới nhầm.
        lastLoadFailedRef.current = true
        return { items: [], hasNextPage: false, nextPage: null }
      }
    },
    [fetchDropdown]
  )

  const loadInitialCollaboratorOptions = useCallback(
    async (values: (string | number)[]): Promise<SelectOption[]> => {
      const ids = (values || []).map(Number).filter((id) => Number.isFinite(id) && id > 0)
      if (ids.length === 0) return []

      try {
        // Một request `id__in` cho tất cả id thay vì N request chi tiết như trước. Nhãn của CTV đã
        // chọn gần như không đổi nên cache 5 phút là an toàn (khác nhánh tìm kiếm ở trên).
        const response = await fetchDropdown({ id__in: ids, page_size: ids.length }, 1000 * 60 * 5)
        return (response?.results || []).map((c: CollaboratorDropdown) =>
          buildCollaboratorOption(c)
        )
      } catch {
        return []
      }
    },
    [fetchDropdown]
  )

  return {
    loadCollaboratorOptions,
    loadInitialCollaboratorOptions,
    /** Lần tải danh sách gần nhất có lỗi không — để empty-state phân biệt "hỏng" với "không có". */
    hasLoadFailed: () => lastLoadFailedRef.current,
  }
}
