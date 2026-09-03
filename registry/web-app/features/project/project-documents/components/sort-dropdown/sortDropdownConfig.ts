import {
  PROJECT_DOCUMENT_SORT_OPTION,
  type ProjectDocumentSortOption,
} from '@/constants/project-document'
import { ElibraryNodeType } from '@/constants/api-schema-aliases'
export const SORT_BY_NAME = 'name'
export const SORT_BY_DATE = 'date'
export type SortByValue = typeof SORT_BY_NAME | typeof SORT_BY_DATE

export const ORDER_ASC = 'asc'
export const ORDER_DESC = 'desc'
export type OrderValue = typeof ORDER_ASC | typeof ORDER_DESC

export const DISPLAY_PRIORITY_FOLDER = ElibraryNodeType.folder
export const DISPLAY_PRIORITY_FILE = ElibraryNodeType.file
export type ProjectDocumentDisplayPriority =
  | typeof DISPLAY_PRIORITY_FOLDER
  | typeof DISPLAY_PRIORITY_FILE

export const SORT_BY_LABEL = 'Sắp xếp theo'
export const ORDER_LABEL = 'Thứ tự'
export const DISPLAY_PRIORITY_LABEL = 'Ưu tiên hiển thị'

export const SORT_BY_OPTIONS: ReadonlyArray<{ value: SortByValue; label: string }> = [
  { value: SORT_BY_NAME, label: 'Tên' },
  { value: SORT_BY_DATE, label: 'Ngày tạo' },
]

export const ORDER_OPTIONS_BY_SORT_BY: Record<
  SortByValue,
  ReadonlyArray<{ value: OrderValue; label: string }>
> = {
  [SORT_BY_NAME]: [
    { value: ORDER_ASC, label: 'A-Z' },
    { value: ORDER_DESC, label: 'Z-A' },
  ],
  [SORT_BY_DATE]: [
    { value: ORDER_DESC, label: 'Mới nhất' },
    { value: ORDER_ASC, label: 'Cũ nhất' },
  ],
}

export const DISPLAY_PRIORITY_OPTIONS: ReadonlyArray<{
  value: ProjectDocumentDisplayPriority
  label: string
}> = [
  { value: DISPLAY_PRIORITY_FOLDER, label: 'Thư mục' },
  { value: DISPLAY_PRIORITY_FILE, label: 'Tệp' },
]

export function getSortByAndOrder(sortOption: ProjectDocumentSortOption): {
  sortBy: SortByValue
  order: OrderValue
} {
  switch (sortOption) {
    case PROJECT_DOCUMENT_SORT_OPTION.NAME_ASC:
      return { sortBy: SORT_BY_NAME, order: ORDER_ASC }
    case PROJECT_DOCUMENT_SORT_OPTION.NAME_DESC:
      return { sortBy: SORT_BY_NAME, order: ORDER_DESC }
    case PROJECT_DOCUMENT_SORT_OPTION.UPDATED_ASC:
      return { sortBy: SORT_BY_DATE, order: ORDER_ASC }
    case PROJECT_DOCUMENT_SORT_OPTION.UPDATED_DESC:
    default:
      return { sortBy: SORT_BY_DATE, order: ORDER_DESC }
  }
}

export function toSortOption(sortBy: SortByValue, order: OrderValue): ProjectDocumentSortOption {
  if (sortBy === SORT_BY_NAME) {
    return order === ORDER_ASC
      ? PROJECT_DOCUMENT_SORT_OPTION.NAME_ASC
      : PROJECT_DOCUMENT_SORT_OPTION.NAME_DESC
  }
  return order === ORDER_ASC
    ? PROJECT_DOCUMENT_SORT_OPTION.UPDATED_ASC
    : PROJECT_DOCUMENT_SORT_OPTION.UPDATED_DESC
}
