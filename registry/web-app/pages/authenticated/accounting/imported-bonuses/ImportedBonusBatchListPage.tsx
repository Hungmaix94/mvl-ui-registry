import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { PageTitle, Button, Table } from '@/components/ui'
import { APP_PATH } from '@/routes'
import Chip from '@/components/ui/chip/Chip'
import { PAGE_SIZE, PAGE_SIZES } from '@/constants/table'
import { parsePositiveInt } from '@/utils/common'
import { formatDate } from '@/utils/date-utils'
import {
  useImportedBonusBatches,
  useCreateImportedBonusBatch,
  useConfirmImportedBonusBatch,
  useVoidImportedBonusBatch,
} from '@/features/accounting/imported-bonuses/services/imported-bonus-service'
import ImportedBonusUploadDialog from '@/features/accounting/imported-bonuses/components/ImportedBonusUploadDialog'
import { useAccountingListExport } from '@/features/accounting/_shares/hooks/useAccountingListExport'
import toastService from '@/services/toast-service'
import { ColoredValueVariant } from '@/api/schema'
import { IconEye, IconPlus, IconCheck, IconX } from '@/assets/icons'
import { type ColumnDef } from '@tanstack/react-table'
import { type TableAction } from '@/types/table'
import { extractErrorMessage } from '@/utils/error-utils'
import { useAbility } from '@/lib/ability'

const statusVariants: Record<string, ColoredValueVariant> = {
  DRAFT: ColoredValueVariant.GREY,
  CONFIRMED: ColoredValueVariant.GREEN,
  VOIDED: ColoredValueVariant.RED,
}

const statusLabels: Record<string, string> = {
  DRAFT: 'Bản nháp',
  CONFIRMED: 'Đã xác nhận',
  VOIDED: 'Đã hủy',
}

export default function ImportedBonusBatchListPage() {
  const ability = useAbility()
  const [searchParams, setSearchParams] = useSearchParams()
  const [isUrlReady, setIsUrlReady] = useState(false)
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const navigate = useNavigate()

  const currentPage = parsePositiveInt(searchParams.get('page')) ?? 1
  const pageSizeFromUrl = parsePositiveInt(searchParams.get('page_size'))
  const pageSize =
    pageSizeFromUrl && PAGE_SIZES.includes(pageSizeFromUrl) ? pageSizeFromUrl : PAGE_SIZE

  const apiParams = useMemo(() => {
    if (!isUrlReady) return undefined
    return { page: currentPage, page_size: pageSize }
  }, [isUrlReady, currentPage, pageSize])

  const {
    data: listResponse,
    isLoading,
    refetch,
  } = useImportedBonusBatches(apiParams, {
    enabled: isUrlReady && !!apiParams,
  })

  const { openExportDialog } = useAccountingListExport(
    '/api/accounting/imported-bonus-batches/export/',
    'dot-import-thuong.xlsx'
  )
  const handleExport = useCallback(() => {
    const { page: _page, page_size: _pageSize, ...filters } = apiParams ?? {}
    openExportDialog(filters)
  }, [apiParams, openExportDialog])

  const { mutateAsync: createBatch, isPending: isCreating } = useCreateImportedBonusBatch()
  const { mutateAsync: confirmBatch } = useConfirmImportedBonusBatch()
  const { mutateAsync: voidBatch } = useVoidImportedBonusBatch()

  const handleConfirmBatch = useCallback(
    async (record: any) => {
      try {
        await confirmBatch(record.id)
        toastService.success('Đã xác nhận đợt thưởng thành công')
        refetch()
      } catch (err) {
        toastService.error(extractErrorMessage(err))
      }
    },
    [confirmBatch, refetch]
  )

  const handleVoidBatch = useCallback(
    async (record: any) => {
      try {
        await voidBatch({
          id: record.id,
          data: {
            year: record.year,
            month: record.month,
            note: 'Hủy đợt thưởng imported',
          },
        })
        toastService.success('Đã hủy đợt thưởng thành công')
        refetch()
      } catch (err) {
        toastService.error(extractErrorMessage(err))
      }
    },
    [voidBatch, refetch]
  )

  useEffect(() => {
    const actualUrlParams = new URLSearchParams(window.location.search)
    const isUrlEmpty = actualUrlParams.toString() === '' && searchParams.toString() === ''
    const hasPage = searchParams.has('page') || actualUrlParams.has('page')
    const hasPageSize = searchParams.has('page_size') || actualUrlParams.has('page_size')

    if (isUrlEmpty) {
      const newParams = new URLSearchParams()
      newParams.set('page', '1')
      newParams.set('page_size', String(PAGE_SIZE))
      setSearchParams(newParams, { replace: true })
    } else if (!hasPage || !hasPageSize) {
      const newParams = new URLSearchParams(searchParams)
      if (!hasPage) newParams.set('page', '1')
      if (!hasPageSize) newParams.set('page_size', String(PAGE_SIZE))
      setSearchParams(newParams, { replace: true })
    }
    setIsUrlReady(true)
  }, [])

  const handlePaginationChange = useCallback(
    (pageIndex: number, newPageSize: number) => {
      const nextPage = pageIndex + 1
      const urlPage = parsePositiveInt(searchParams.get('page')) ?? 1
      const urlPageSizeRaw = parsePositiveInt(searchParams.get('page_size'))
      const effectiveUrlPageSize =
        urlPageSizeRaw && PAGE_SIZES.includes(urlPageSizeRaw) ? urlPageSizeRaw : PAGE_SIZE
      if (nextPage === urlPage && newPageSize === effectiveUrlPageSize) return

      const newParams = new URLSearchParams(searchParams)
      newParams.set('page', String(nextPage))
      newParams.set('page_size', String(newPageSize))
      setSearchParams(newParams, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  const handleImportSuccess = async (payload: any) => {
    // Không tự bắt lỗi ở đây — để lỗi propagate lên ImportedBonusUploadDialog, nơi đang throw
    // kèm cờ isApiError cho AppDialog giữ dialog mở (xem comment trong dialog đó).
    await createBatch(payload)
    toastService.success('Đã import đợt thưởng thành công')
    setUploadDialogOpen(false)
    refetch()
  }

  const columns = useMemo<ColumnDef<any>[]>(
    () => [
      {
        accessorKey: 'code',
        header: 'Mã đợt',
        meta: { width: 'w-[150px]' },
      },
      {
        id: 'period',
        header: 'Kỳ tháng',
        cell: ({ row }) => `${String(row.original.month).padStart(2, '0')}/${row.original.year}`,
        meta: { width: 'w-[100px]' },
      },
      {
        accessorKey: 'note',
        header: 'Ghi chú',
        cell: ({ row }) => row.original.note || '—',
      },
      {
        id: 'status',
        header: 'Trạng thái',
        cell: ({ row }) => (
          <Chip
            label={statusLabels[row.original.status] || row.original.status}
            variant={statusVariants[row.original.status] || ColoredValueVariant.GREY}
          />
        ),
        meta: { width: 'w-[150px]' },
      },
      {
        id: 'confirmed_at',
        header: 'Ngày xác nhận',
        cell: ({ row }) =>
          row.original.confirmed_at ? formatDate(row.original.confirmed_at) : '—',
        meta: { width: 'w-[150px]' },
      },
    ],
    []
  )

  // Mỗi mục gate bằng đúng thứ nó gọi tới (ClickUp 86eync7g0):
  //   Chi tiết → route `IMPORTED_BONUS_BATCH_DETAIL` (`imported_bonus_batch.retrieve`)
  //   Duyệt    → `POST /api/accounting/imported-bonus-batches/{id}/confirm/`
  //   Hủy      → `POST /api/accounting/imported-bonus-batches/{id}/void/`
  // Duyệt và Hủy là hai endpoint riêng ⇒ hai mã riêng: người chỉ được duyệt không được huỷ.
  const actions = useMemo<TableAction<any>[]>(
    () => [
      {
        label: 'Chi tiết',
        icon: <IconEye size={16} />,
        show: () => ability.can('retrieve', 'imported_bonus_batch'),
        onClick: (record: any) => {
          navigate(APP_PATH.IMPORTED_BONUS_BATCH_DETAIL.replace(':id', record.id.toString()))
        },
      },
      {
        label: 'Duyệt',
        icon: <IconCheck size={16} />,
        variant: 'success',
        show: (record: any) =>
          ability.can('confirm', 'imported_bonus_batch') && record.status === 'DRAFT',
        onClick: handleConfirmBatch,
      },
      {
        label: 'Hủy',
        icon: <IconX size={16} />,
        variant: 'danger',
        show: (record: any) =>
          ability.can('void', 'imported_bonus_batch') && record.status === 'DRAFT',
        onClick: handleVoidBatch,
      },
    ],
    [ability, navigate, handleConfirmBatch, handleVoidBatch]
  )

  const totalRecords = listResponse?.count ?? 0
  const pageCount = pageSize ? Math.ceil(totalRecords / pageSize) : 0

  return (
    <div className="bg-surface-primary-default flex h-full flex-col overflow-hidden">
      <PageTitle
        title="Thưởng vinh danh & Hỗ trợ chạy Ads"
        handleExportBtnFull={handleExport}
        titleExportBtnIcon="Xuất Excel"
        customActions={
          <Button
            variant="primary"
            onClick={() => setUploadDialogOpen(true)}
            leftIcon={<IconPlus />}
          >
            Import Excel
          </Button>
        }
      />

      <div className="flex flex-grow flex-col gap-6 overflow-y-auto px-7 pt-4 pb-6">
        <Table
          data={listResponse?.results ?? []}
          columns={columns}
          showActions
          rowActions={actions}
          isLoading={isLoading}
          totalRecords={totalRecords}
          pageSize={pageSize}
          pageCount={pageCount}
          currentPageIndex={currentPage - 1}
          onPaginationChange={handlePaginationChange}
          enablePagination
          manualPagination
          disableInnerOverflow
          paginationPosition="static"
          stickyHeader
        />
      </div>

      {uploadDialogOpen && (
        <ImportedBonusUploadDialog
          open={uploadDialogOpen}
          onOpenChange={setUploadDialogOpen}
          onSuccess={handleImportSuccess}
          loading={isCreating}
        />
      )}
    </div>
  )
}
