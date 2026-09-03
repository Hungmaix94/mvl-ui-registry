import { useNavigate, useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { PageTitle, Button, Chip, Table, type TableAction } from '@/components/ui'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper'
import {
  useDepartmentCommissionPool,
  useConfirmDepartmentCommissionPool,
  useConfirmDepartmentCommissionPoolLine,
  useConfirmDepartmentCommissionPoolLines,
  useExportDepartmentCommissionPool,
} from '@/features/accounting/department-commission-pools/services/department-commission-pools-service'
import { useDeptPoolImportUploadDialog } from '@/features/accounting/department-commission-pools/hooks/useDeptPoolImportUploadDialog'
import {
  buildSkippedRows,
  selectDraftLines,
} from '@/features/accounting/department-commission-pools/utils/confirm-lines-outcome'
import { useDialog } from '@/hooks/useDialog'
import { revenueLines } from '@/features/accounting/department-commission-pools/utils/contribution-true-up'
import { formatCurrencyVND, formatPct as formatPctCommon } from '@/utils/common'
import { useMemo, useRef } from 'react'
import { APP_PATH } from '@/routes'
import { ColoredValueVariant, type components } from '@/api/schema'
import { IconCheck } from '@/assets/icons'
import {
  POOL_STATUS_DISPLAY,
  SPLIT_STATUS_DISPLAY,
  resolveStatusDisplay,
} from '@/features/accounting/department-monthly-kpi/constants/department-monthly-kpi-status'
import { Flex, Grid, Text } from '@radix-ui/themes'
import DisplayField from '@/components/commons/DisplayField'
import { ReferenceCode } from '@/components/commons/ReferenceCode'
import toastService from '@/services/toast-service'
import { QUERY_KEYS } from '@/constants'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import useAppConstant from '@/hooks/useAppConstant'
import { ColumnDef } from '@tanstack/react-table'
import { PayoutSplitLineStatus as LineStatus } from '@/constants/api-schema-aliases'
import { useAbility } from '@/lib/ability'
import { COMMISSION_ACTION_PERMISSION } from '@/features/accounting/commissions/constants/commission-permissions'

// Schema types — không tự khai lại shape của API.
type DepartmentCommissionPoolLineRow = components['schemas']['DepartmentCommissionPoolLine']
type DepartmentCommissionContributionRow = components['schemas']['DepartmentCommissionContribution']

// Upstream commission system each contribution originates from (BE: detail.origin).
const ORIGIN_LABELS: Record<string, string> = {
  MANAGEMENT: 'Hoa hồng quản lý',
  LINKED_EXCHANGE: 'Hoa hồng sàn liên kết',
  PROMOTION: 'Hoa hồng Đầu tư, Xúc tiến & Phát triển Dự án',
}

const LINE_STATUS_LABELS: Record<string, { label: string; variant: ColoredValueVariant }> = {
  DRAFT: { label: 'Bản nháp', variant: ColoredValueVariant.GREY },
  CONFIRMED: { label: 'Đã xác nhận', variant: ColoredValueVariant.GREEN },
  PAID: { label: 'Đã thanh toán', variant: ColoredValueVariant.GREEN },
  VOIDED: { label: 'Đã huỷ', variant: ColoredValueVariant.RED },
}

function formatPct(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  const num = Number(value)
  if (Number.isNaN(num)) return '—'
  return `${num}%`
}

function formatBasis(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  const num = Number(value)
  if (Number.isNaN(num)) return '—'
  return formatCurrencyVND(num)
}

export function DepartmentMonthlyKpiDetailPage() {
  const ability = useAbility()
  const { id } = useParams<{ id: string }>()
  const poolId = Number(id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { keysMap: sourceKindKeysMap } = useAppConstant({
    module: 'accounting',
    keys: [APP_CONSTANT_KEY.ACCOUNTING.DEPT_COMMISSION_SOURCE_KIND],
  })
  const sourceKindLabels = sourceKindKeysMap.get(
    APP_CONSTANT_KEY.ACCOUNTING.DEPT_COMMISSION_SOURCE_KIND
  ) as Record<string, string> | undefined

  const { data, isLoading, error } = useDepartmentCommissionPool(poolId)

  const confirmPoolMutation = useConfirmDepartmentCommissionPool()
  const confirmLineMutation = useConfirmDepartmentCommissionPoolLine()
  const confirmLinesMutation = useConfirmDepartmentCommissionPoolLines()
  const exportPoolMutation = useExportDepartmentCommissionPool()
  const { openUploadDialog } = useDeptPoolImportUploadDialog()
  const { displayConfirm, alert } = useDialog()
  const confirmAllInFlightRef = useRef(false)

  const handleConfirmPool = async () => {
    try {
      await confirmPoolMutation.mutateAsync(poolId)
      toastService.success('Đã xác nhận pool thành công')
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.ACCOUNTING.DEPARTMENT_COMMISSION_POOLS.DETAIL(poolId),
      })
    } catch (err) {
      toastService.error('Xác nhận pool thất bại')
    }
  }

  const handleConfirmLine = async (lineId: number) => {
    try {
      await confirmLineMutation.mutateAsync({
        id: poolId,
        data: {
          line_id: lineId,
        },
      })
      toastService.success('Đã xác nhận dòng hoa hồng nhân viên')
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.ACCOUNTING.DEPARTMENT_COMMISSION_POOLS.DETAIL(poolId),
      })
    } catch (err) {
      toastService.error('Xác nhận dòng thất bại')
    }
  }

  // Duyệt tất cả dòng nhân sự (CR 86eyqgr5h). Duyệt pool ở header CHỈ đóng băng pool —
  // nó không đụng tới các dòng, mà dòng còn Bản nháp thì tiền không sang bảng tổng kết
  // tháng của nhân sự. Trước CR này kế toán phải mở menu ⋯ từng dòng một.
  const handleConfirmAllLines = () => {
    const draftLines = selectDraftLines(data?.lines ?? [])
    if (draftLines.length === 0) return

    displayConfirm({
      title: 'Duyệt tất cả dòng hoa hồng nhân viên',
      content: `Duyệt ${draftLines.length} dòng đang ở trạng thái Bản nháp? Số tiền của từng nhân sự sẽ được ghi vào bảng tổng kết hoa hồng theo tháng của họ.`,
      confirmText: 'Duyệt tất cả',
      cancelText: 'Huỷ',
      onConfirm: async () => {
        // `GlobalDialog.handleConfirm` await `onConfirm()` mà KHÔNG khoá nút xác nhận, nên
        // bấm đúp là bắn hai lượt POST. Lượt thứ hai vô hại về dữ liệu (BE chỉ đụng dòng
        // DRAFT nên nó thành no-op) nhưng trả `confirmed: []` và hiện toast "Đã duyệt 0
        // dòng" ngay sau toast báo thành công — đọc như vừa có gì đó hỏng.
        // Dùng ref chứ không dùng `confirmLinesMutation.isPending`: closure này giữ giá trị
        // của lượt render lúc mở dialog, nên `isPending` ở đây vĩnh viễn là false.
        if (confirmAllInFlightRef.current) return
        confirmAllInFlightRef.current = true
        try {
          const result = await confirmLinesMutation.mutateAsync(poolId)
          // Ghép tên nhân sự từ bảng đang hiển thị TRƯỚC khi invalidate: sau khi refetch,
          // dòng bị bỏ qua vẫn còn nhưng dòng đã duyệt đổi trạng thái, và ta cần đúng ảnh
          // chụp lúc bấm để câu thông báo khớp với thứ người dùng vừa nhìn thấy.
          const skippedRows = buildSkippedRows(result, data?.lines ?? [])
          queryClient.invalidateQueries({
            queryKey: QUERY_KEYS.ACCOUNTING.DEPARTMENT_COMMISSION_POOLS.DETAIL(poolId),
          })

          if (skippedRows.length === 0) {
            toastService.success(`Đã duyệt ${result.confirmed.length} dòng hoa hồng nhân viên`)
            return
          }

          // Chỉ mở dialog khi THỰC SỰ có dòng bị bỏ qua — mở vô điều kiện thì lượt duyệt
          // trọn vẹn cũng bắt người dùng đóng một hộp thoại không có tin gì để báo.
          alert({
            title: 'Duyệt tất cả — có dòng chưa duyệt được',
            content: (
              <div className="flex flex-col gap-3 py-1">
                <p className="text-content-dark-1 text-sm">
                  Đã duyệt {result.confirmed.length} dòng. Còn {skippedRows.length} dòng chưa duyệt
                  được:
                </p>
                <ul className="border-border-1 divide-border-1 max-h-[40vh] divide-y overflow-y-auto rounded-lg border">
                  {skippedRows.map((row) => (
                    <li key={row.lineId} className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                        {row.employeeCode && <ReferenceCode code={row.employeeCode} />}
                        <span className="text-content-dark-2 text-sm">{row.employeeName}</span>
                      </div>
                      <p className="text-data-red-default mt-1.5 text-sm">{row.reason}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ),
            confirmText: 'Đã hiểu',
          })
        } catch (err) {
          toastService.error('Duyệt tất cả dòng hoa hồng thất bại')
        } finally {
          confirmAllInFlightRef.current = false
        }
      },
    })
  }

  const handleImportExcel = async () => {
    try {
      await openUploadDialog(poolId)
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.ACCOUNTING.DEPARTMENT_COMMISSION_POOLS.DETAIL(poolId),
      })
    } catch (err) {
      // Dialog cancelled or import failed
    }
  }

  const handleExportExcel = async () => {
    try {
      await exportPoolMutation.mutateAsync(poolId)
      toastService.success('Đang chuẩn bị xuất Excel...')
    } catch (err) {
      toastService.error('Xuất Excel thất bại')
    }
  }

  const breadcrumb = useMemo(() => {
    return [
      { label: 'Kế toán', href: '/accounting/dashboard' },
      { label: 'Hoa hồng quản lý' },
      { label: 'Hoa hồng quản lý khối back', href: APP_PATH.DEPARTMENT_MONTHLY_KPI },
      { label: data?.department_name || 'Chi tiết' },
    ]
  }, [data])

  const poolStatus = data?.status || ''

  const poolStatusBadge = useMemo(() => {
    const info = resolveStatusDisplay(POOL_STATUS_DISPLAY, data?.status)
    return <Chip label={info.label} variant={info.variant} />
  }, [data?.status])

  const splitStatusBadge = useMemo(() => {
    const info = resolveStatusDisplay(SPLIT_STATUS_DISPLAY, data?.split_status)
    return <Chip label={info.label} variant={info.variant} />
  }, [data?.split_status])

  const isNotFound = !isLoading && !data && !!error
  const isError = !isLoading && !!error && !isNotFound

  // Table columns for contributions
  const contributionColumns = useMemo<ColumnDef<DepartmentCommissionContributionRow>[]>(
    () => [
      {
        id: 'source_kind',
        header: 'Nguồn tiền',
        size: 260,
        cell: ({ row }) => {
          const origin = row.original.detail?.origin
          return (
            <div className="flex flex-col">
              <span className="font-medium text-neutral-900">
                {sourceKindLabels?.[row.original.source_kind] ?? row.original.source_kind}
              </span>
              {origin && (
                <span className="text-xs text-neutral-500">{ORIGIN_LABELS[origin] || origin}</span>
              )}
            </div>
          )
        },
      },
      {
        id: 'basis',
        header: () => <div className="text-right">Gốc tính</div>,
        size: 240,
        cell: ({ row }) => {
          const lines = revenueLines(row.original.detail)
          return (
            <div className="flex flex-col items-end">
              <span className="text-neutral-700">
                {formatBasis(row.original.detail?.basis_amount)}
              </span>
              {/* Names this period's own revenue and each settled period folded into it, so
                  the reader can see why the basis is bigger (or smaller) than this month. */}
              {lines && (
                <span className="flex flex-col items-end text-xs text-neutral-500">
                  {lines.map((line) => (
                    <span key={line.label}>
                      {line.label}: {formatCurrencyVND(line.amount)}
                    </span>
                  ))}
                </span>
              )}
            </div>
          )
        },
        meta: { align: 'right' },
      },
      {
        id: 'rate',
        header: () => <div className="text-right">Tỷ lệ</div>,
        size: 100,
        cell: ({ row }) => (
          <div className="text-right text-neutral-700">
            {formatPct(row.original.detail?.rate_pct)}
          </div>
        ),
        meta: { align: 'right' },
      },
      {
        id: 'amount',
        header: () => <div className="text-right">Số tiền</div>,
        size: 160,
        cell: ({ row }) => (
          <div className="text-right font-semibold text-neutral-900">
            {formatCurrencyVND(Number(row.original.amount || 0))}
          </div>
        ),
        meta: { align: 'right' },
      },
      {
        id: 'reference',
        header: 'Tham chiếu',
        size: 200,
        cell: ({ row }) => row.original.detail?.reference || '—',
      },
    ],
    [sourceKindLabels]
  )

  // Table columns for employee split lines (<Table> auto-renders STT via showSTT=true default)
  const lineColumns = useMemo<ColumnDef<DepartmentCommissionPoolLineRow>[]>(
    () => [
      {
        id: 'employee_code',
        header: 'Mã nhân viên',
        size: 140,
        cell: ({ row }) => <ReferenceCode code={row.original.employee_code} />,
      },
      {
        id: 'employee_name',
        header: 'Tên nhân viên',
        size: 220,
        cell: ({ row }) => (
          <span className="text-sm font-medium text-neutral-900">
            {row.original.employee_name || '—'}
          </span>
        ),
      },
      {
        id: 'amount',
        header: () => <div className="text-right">Số tiền</div>,
        size: 160,
        cell: ({ row }) => (
          <div className="text-right font-semibold text-neutral-900">
            {formatCurrencyVND(Number(row.original.amount || 0))}
          </div>
        ),
        meta: { align: 'right' },
      },
      {
        id: 'pct_of_pool',
        header: () => <div className="text-right">Tỷ lệ</div>,
        size: 100,
        cell: ({ row }) => (
          <div className="pr-2 text-right font-medium text-neutral-600">
            {formatPctCommon(row.original.pct_of_pool, 2)}
          </div>
        ),
        meta: { align: 'right' },
      },
      {
        id: 'status',
        header: 'Trạng thái',
        size: 130,
        cell: ({ row }) => {
          const info = LINE_STATUS_LABELS[row.original.status] || {
            label: row.original.status,
            variant: ColoredValueVariant.GREY,
          }
          return <Chip label={info.label} variant={info.variant} />
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [poolId]
  )

  // Dùng `rowActions` của <Table> thay vì tự dựng DropdownMenu: trigger khi đó là
  // `IconDotsthreeoutline` chuẩn (giống bảng danh sách) thay cho ký tự thô `⋮`, và menu item
  // có icon — cùng một action menu context trên toàn tính năng (CR 86eyj407z).
  const lineRowActions = useMemo<TableAction<DepartmentCommissionPoolLineRow>[]>(
    () => [
      {
        label: 'Xác nhận dòng',
        icon: <IconCheck size={16} />,
        variant: 'success',
        // `POST .../department-commission-pools/{id}/confirm-line/` (SỐ ÍT) — khác hẳn
        // `confirm-lines` (số nhiều, xác nhận cả bảng) và khác `confirm` (chốt cả pool). Ba
        // endpoint, ba mã quyền; gate nhầm sang `confirm` là mở nút cho người chỉ được chốt pool.
        show: (line) =>
          ability.can(
            COMMISSION_ACTION_PERMISSION.CONFIRM_DEPT_POOL_LINE.action,
            COMMISSION_ACTION_PERMISSION.CONFIRM_DEPT_POOL_LINE.subject
          ) && line.status === LineStatus.DRAFT,
        onClick: (line) => handleConfirmLine(line.id),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [poolId, ability]
  )

  // Không đánh dấu `readonly`: `<Table data>` nhận `TData[]`, nên ReadonlyArray không gán được.
  // Schema chỉ để `lines` là thuộc tính readonly, bản thân mảng vẫn là kiểu mutable.
  const linesData: DepartmentCommissionPoolLineRow[] = data?.lines ?? []

  // Cùng một hàm với hàm handler dùng, nên số in trên dialog xác nhận không thể lệch với
  // điều kiện hiện nút.
  const draftLineCount = selectDraftLines(linesData).length

  return (
    <div className="bg-surface-primary-default flex h-full flex-col overflow-hidden">
      <PageTitle
        title={data ? `Pool HH — ${data.department_name}` : 'Chi tiết Pool HH'}
        breadcrumb={breadcrumb}
        // Không truyền `handleBackButton`: mặc định của PageTitle đi lùi theo history nên
        // quay lại đúng danh sách kèm kỳ/bộ lọc user đang xem, chỉ rơi về route cha khi mở
        // thẳng bằng link.
        enableBackButton
        // Xuất file và Lịch sử là hai action chuẩn của PageTitle — dùng đúng slot của chúng
        // để ra icon-button giống mọi màn chi tiết khác, `customActions` chỉ giữ nút nghiệp vụ.
        handleExportBtnIcon={data ? handleExportExcel : undefined}
        titleExportBtnIcon="Xuất Excel"
        handleShowHistory={
          data ? () => navigate(`${APP_PATH.DEPARTMENT_MONTHLY_KPI}/${poolId}/history`) : undefined
        }
        titleShowHistory="Lịch sử thay đổi"
        customActions={
          data && (
            <Flex gap="3" align="center">
              {poolStatus === 'DRAFT' && (
                <Button
                  color="green"
                  onClick={handleConfirmPool}
                  loading={confirmPoolMutation.isPending}
                >
                  Duyệt Pool
                </Button>
              )}

              {(poolStatus === 'DRAFT' || poolStatus === 'CONFIRMED') && (
                <Button variant="secondary" onClick={handleImportExcel}>
                  Nhập chia hoa hồng
                </Button>
              )}
            </Flex>
          )
        }
      />

      <DetailPageWrapper
        isLoading={isLoading}
        isNotFound={isNotFound}
        isError={isError}
        hasPermission={ability.can('retrieve', 'departmentcommissionpool')}
      >
        {data && (
          <div className="bg-background-2 flex-grow overflow-y-auto px-[28px] pt-[16px] pb-[80px]">
            <Flex direction="column" gap="5">
              {/* Information Panel */}
              <div className="border-border-1 bg-surface-primary-default flex flex-col rounded-xl border p-6">
                <Text className="typo-body-xl-semibold text-content-dark-1 mb-4">
                  Thông tin chung
                </Text>
                <Grid columns={{ initial: '1', md: '2', lg: '3' }} gap="6">
                  <DisplayField label="Phòng ban" value={data.department_name} />
                  <DisplayField label="Khối" value={data.block_name} />
                  <DisplayField label="Chi nhánh" value={data.branch_name} />
                  <DisplayField
                    label="Tổng"
                    value={
                      <span className="text-purple-70 font-semibold">
                        {formatCurrencyVND(Number(data.total_amount))}
                      </span>
                    }
                  />
                  <DisplayField label="Trạng thái duyệt" value={poolStatusBadge} />
                  <DisplayField label="Trạng thái chia" value={splitStatusBadge} />
                </Grid>
              </div>

              {/* Contributions Panel */}
              <div className="border-border-1 bg-surface-primary-default flex flex-col overflow-hidden rounded-xl border">
                <div className="border-b border-gray-100 bg-gray-50/50 px-6 py-4">
                  <Text className="typo-body-lg-semibold text-content-dark-1">
                    Danh sách nguồn tiền đóng góp
                  </Text>
                </div>
                <Table
                  columns={contributionColumns}
                  data={
                    (data.contributions || []) as unknown as DepartmentCommissionContributionRow[]
                  }
                  className="px-0"
                  tableContainerClassName="border-0"
                  bordered={false}
                  enablePagination={false}
                />
              </div>

              {/* Split Lines Panel */}
              <div className="border-border-1 bg-surface-primary-default flex flex-col overflow-hidden rounded-xl border">
                <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/50 px-6 py-4">
                  <Text className="typo-body-lg-semibold text-content-dark-1">
                    Phân bổ hoa hồng cho nhân viên
                  </Text>
                  <Flex gap="3" align="center">
                    {linesData.length > 0 && (
                      <Text className="text-xs font-medium text-neutral-500">
                        Tổng số: {linesData.length} nhân sự
                      </Text>
                    )}
                    {/* Nút nằm ở header của chính bảng nó tác động, không lên toolbar trang:
                        toolbar trang là chỗ của hành động cấp pool (Duyệt Pool, Nhập chia).
                        Dùng `variant`, KHÔNG phải `color="green"` như nút Duyệt Pool ở toolbar:
                        `Button` của repo không có prop `color`, nó chỉ lọt qua type-check vì
                        `ButtonProps extends HTMLAttributes` — tức nút kia đang không xanh thật.
                        Và secondary là đúng thứ bậc: đây là hành động trong bảng, không phải
                        CTA của cả trang. */}
                    {draftLineCount > 0 && (
                      <Button
                        variant="secondary"
                        size="small"
                        onClick={handleConfirmAllLines}
                        loading={confirmLinesMutation.isPending}
                      >
                        Duyệt tất cả ({draftLineCount})
                      </Button>
                    )}
                  </Flex>
                </div>
                {linesData.length > 0 ? (
                  <Table
                    columns={lineColumns}
                    data={linesData}
                    showSTT={true}
                    showActions
                    rowActions={lineRowActions}
                    className="px-0"
                    tableContainerClassName="border-0"
                    bordered={false}
                    enablePagination={false}
                  />
                ) : (
                  <div className="p-8 text-center text-xs text-neutral-400">
                    Chưa có danh sách chia hoa hồng cho nhân sự. Vui lòng nhập dữ liệu từ Excel.
                  </div>
                )}
              </div>
            </Flex>
          </div>
        )}
      </DetailPageWrapper>
    </div>
  )
}

export default DepartmentMonthlyKpiDetailPage
