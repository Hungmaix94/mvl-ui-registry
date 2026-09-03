export { Table, default as default } from './Table'
export { TableHeader } from './TableHeader'
export { TableBody } from './TableBody'
export { TableFooter } from './TableFooter'
export { TableRow } from './TableRow'
export { TablePagination } from './TablePagination'
export { TableActionMenu } from './TableActionMenu'
export { TableEmpty } from './TableEmpty'
export { TableNoData } from './TableNoData'

// Re-export types
export type { TableConfig, TableAction } from '@/types/table'

// Re-export TanStack types for convenience
export type { ColumnDef, Row, Cell } from '@tanstack/react-table'
