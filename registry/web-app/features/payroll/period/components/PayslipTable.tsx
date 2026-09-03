import { useCallback, useEffect, useMemo, useRef } from 'react'
import { Text } from '@radix-ui/themes'
import { cn } from '@/utils'
import { formatCurrencyVND } from '@/utils/common'
import { formatDate } from '@/utils/date-utils'
import Chip from '@/components/ui/chip/Chip'
import { ColoredValueVariant } from '@/api/schema'
import {
  IconArchivebox,
  IconArrowlineupright,
  IconCurrencydollarsimple,
  IconEnvelopesimple,
  IconEye,
} from '@/assets/icons'
import { type PayrollSlip } from '@/features/payroll/services/payroll-slip-service'
import { useNavigate, useParams } from 'react-router-dom'
import { TableAction } from '@/types/table'
import { APP_PATH } from '@/routes'
import { TableActionMenu } from '@/components/ui/table/TableActionMenu'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import useAppConstant from '@/hooks/useAppConstant'
import { useAbility } from '@/lib/ability'

// Extend the base PayrollSlip type with runtime fields
export interface PayrollSlipData extends PayrollSlip {
  name: string
  department: { name: string } | string
  position: { name: string } | string

  // UI helper fields
  mail_status: string
  payslip_status: string
  contract_status: string // mapped from employment_status
  email: string

  // Note: Most financial and count fields are now directly inherited from PayrollSlip
  // We keep the interface extension for any UI-computed properties or overrides

  employee: {
    id: number
    code: string
    fullname: string
    avatar?: {
      file_path?: string
    }
    branch?: { name: string }
    block?: { name: string }
    department?: { name: string }
  }

  // Optional note field for UI display (may be populated from other sources or future API updates)
  note?: string | null
}

interface PayslipTableProps {
  data: PayrollSlipData[]
  showFull?: boolean
  pagination?: {
    page: number
    pageSize: number
  }
}

// ... imports
import {
  useExportPayrollSlipDocument,
  useHoldPayrollSlip,
  useReadyPayrollSlip,
  useRecalculatePayrollSlip,
} from '@/features/payroll/services/payroll-slip-service'
import { useSalaryConfigCurrent } from '@/features/payroll/services/salary-config-service'
import { useSendPayrollSlipEmailAsync } from '@/features/payroll/period/hooks/useSendPayrollSlipEmailAsync'
import toastService from '@/services/toast-service'
import { extractErrorMessage } from '@/utils/error-utils'
import { DATETIME_FORMAT } from '@/constants'

// ... (keep interface PayrollSlipData)

interface PayslipTableProps {
  data: PayrollSlipData[]
  showFull?: boolean
  pagination?: {
    page: number
    pageSize: number
  }
  activeTab?: 'eligible' | 'ineligible'
  onActionSuccess?: () => void
}

export default function PayslipTable({
  data,
  showFull = true,
  pagination,
  activeTab = 'eligible',
  onActionSuccess,
}: PayslipTableProps) {
  const { id: periodId } = useParams()
  const navigate = useNavigate()
  const theadRef = useRef<HTMLTableSectionElement>(null)
  const tableRef = useRef<HTMLTableElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Mutations
  const ability = useAbility()
  const recalculateMutation = useRecalculatePayrollSlip()
  const { data: salaryConfigData } = useSalaryConfigCurrent()

  const { keysMapOptions: keysMapOptionsHrm } = useAppConstant({
    module: 'hrm',
    keys: [
      APP_CONSTANT_KEY.HRM.EMPLOYEE_TYPE,
      APP_CONSTANT_KEY.HRM.CONTRACT_TYPE_TAX_CALCULATION_METHOD,
    ],
  })

  const { keysMapOptions: keysMapOptionsPayroll } = useAppConstant({
    module: 'payroll',
    keys: [APP_CONSTANT_KEY.PAYROLL.PAYROLL_SLIP_STATUS],
  })

  const keysMapOptions = useMemo(() => {
    return new Map([...keysMapOptionsHrm, ...keysMapOptionsPayroll])
  }, [keysMapOptionsHrm, keysMapOptionsPayroll])
  const exportMutation = useExportPayrollSlipDocument()
  const holdMutation = useHoldPayrollSlip()
  const readyMutation = useReadyPayrollSlip()
  const sendEmailAsync = useSendPayrollSlipEmailAsync()

  // Define row actions
  const actions: TableAction<PayrollSlipData>[] = useMemo(() => {
    const baseActions: TableAction<PayrollSlipData>[] = [
      {
        label: 'Xem chi tiết',
        icon: <IconEye size={16} />,
        onClick: (record) =>
          navigate(
            `${APP_PATH.PAYROLL_PERIOD_DETAIL_EMPLOYEE.replace(':id', String(periodId)).replace(
              ':employeeId',
              String(record.employee.id)
            )}`,
            {
              state: { from: window.location.pathname + window.location.search },
            }
          ),
      },
      {
        label: 'Tính lại lương',
        icon: <IconCurrencydollarsimple size={16} />,
        onClick: (record) => {
          recalculateMutation.mutate(record.id, {
            onSuccess: () => {
              toastService.success('Đã tính lại lương thành công')
              onActionSuccess?.()
            },
            onError: (error: unknown) => {
              toastService.error(extractErrorMessage(error, 'Tính lại lương thất bại'))
            },
          })
        },
      },
      {
        label: 'Gửi mail lương',
        icon: <IconEnvelopesimple size={16} />,
        onClick: (record) => {
          sendEmailAsync.sendEmail(record.id).then(() => {
            onActionSuccess?.()
          })
        },
      },
      /*
      {
        label: 'Xuất phiếu lương',
        icon: <IconArrowlineupright size={16} className="rotate-180" />, // Use arrow up or similar for export
        onClick: (record) => {
          exportMutation.mutate(record.id, {
            onSuccess: (response: any) => {
              // Assuming response.data contains the file blob or link
              // If it's a blob, we need to create a download link. 
              // BUT, the useExport hook handles this automatically usually.
              // Since I'm not using useExport hook directly here due to "one-off" nature inside a loop,
              // I will use a simple file download helper if available, or just toast success if backend sends email.
              // Checking API: It returns "export_document". Often this redirects or returns a url.
              // Let's assume standard blob download for now or just success toast.

              // Wait, previous patterns use useExport. Let's look at usePayrollPayslipExport.tsx
              // It uses useExport which handles loading state and openExportDialog.
              // For a single click action, I might just blindly download.

              // Actually, I'll check response structure. 
              // Without knowing exact response, I will implement a safe "Open URL" if it's a link, or "Download" if blob.
              // For now, I will use window.open if it returns a URL, or just download logic.

              // Simple approach first:
              if (response?.data?.url) {
                window.open(response.data.url, '_blank')
              } else {
                toastService.success('Đã gửi yêu cầu xuất phiếu lương')
              }
              onActionSuccess?.()
            },
            onError: (error: unknown) => {
              toastService.error(extractErrorMessage(error, 'Xuất phiếu lương thất bại'))
            },
          })
        },
      },
      */
    ]

    // Filter actions based on permissions
    const filteredActions = baseActions.filter((action) => {
      switch (action.label) {
        case 'Tính lại lương':
          return ability.can('recalculate', 'payroll_slip')
        case 'Gửi mail lương':
          return ability.can('send_email', 'payroll_slip')
        default:
          return true
      }
    })

    if (activeTab === 'eligible') {
      if (ability.can('hold', 'payroll_slip')) {
        filteredActions.push({
          label: 'Tạm giữ lương',
          icon: <IconArchivebox size={16} className="text-action-primary-red-default" />,
          variant: 'danger',
          onClick: (record) => {
            holdMutation.mutate(
              { id: record.id, data: { reason: 'Tạm giữ lương' } },
              {
                onSuccess: () => {
                  toastService.success('Đã tạm giữ lương')
                  onActionSuccess?.()
                },
                onError: (error: unknown) => {
                  toastService.error(extractErrorMessage(error, 'Tạm giữ lương thất bại'))
                },
              }
            )
          },
        })
      }
    } else if (activeTab === 'ineligible') {
      if (ability.can('ready', 'payroll_slip')) {
        filteredActions.push({
          label: 'Chi trả lương',
          icon: <IconArrowlineupright size={16} className="text-action-primary-green-default" />,
          onClick: (record) => {
            readyMutation.mutate(
              {
                id: record.id,
                data: { id: record.id, status: 'READY', status_note: 'Sẵn sàng chi trả' },
              },
              {
                onSuccess: () => {
                  toastService.success('Đã cập nhật trạng thái chi trả')
                  onActionSuccess?.()
                },
                onError: (error: unknown) => {
                  toastService.error(extractErrorMessage(error, 'Chi trả lương thất bại'))
                },
              }
            )
          },
        })
      }
    }

    return filteredActions
  }, [
    navigate,
    periodId,
    activeTab,
    recalculateMutation,
    exportMutation,
    holdMutation,
    readyMutation,
    sendEmailAsync,
    onActionSuccess,
    ability,
  ])

  const dragStateRef = useRef<{
    isActive: boolean
    startX: number
    startScrollLeft: number
    hasMoved: boolean
    clickedElement: HTMLElement | null
  } | null>(null)

  // Get scroll container
  const getScrollContainer = useCallback(() => {
    if (!tableRef.current) return null
    return tableRef.current.closest('[class*="overflow"]') as HTMLElement
  }, [])

  // Drag to scroll handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return

      const scrollContainer = getScrollContainer()
      if (!scrollContainer) return

      const target = e.target as HTMLElement
      const clickedElement = target.closest('[role="button"]') || target

      dragStateRef.current = {
        isActive: true,
        startX: e.clientX,
        startScrollLeft: scrollContainer.scrollLeft,
        hasMoved: false,
        clickedElement: clickedElement as HTMLElement,
      }
    },
    [getScrollContainer]
  )

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStateRef.current?.isActive) return

      const scrollContainer = getScrollContainer()
      if (!scrollContainer) return

      const deltaX = e.clientX - dragStateRef.current.startX
      const DRAG_THRESHOLD = 5

      if (Math.abs(deltaX) > DRAG_THRESHOLD) {
        if (!dragStateRef.current.hasMoved) {
          dragStateRef.current.hasMoved = true
          if (wrapperRef.current) {
            wrapperRef.current.style.cursor = 'grabbing'
            wrapperRef.current.style.userSelect = 'none'
          }
          e.preventDefault()
        }

        const newScrollLeft = dragStateRef.current.startScrollLeft - deltaX
        const maxScrollLeft = Math.max(0, scrollContainer.scrollWidth - scrollContainer.clientWidth)
        scrollContainer.scrollLeft = Math.max(0, Math.min(maxScrollLeft, newScrollLeft))
      }
    }

    const handleMouseUp = () => {
      if (!dragStateRef.current) return

      const wasDragging = dragStateRef.current.hasMoved
      const clickedElement = dragStateRef.current.clickedElement

      if (wrapperRef.current) {
        wrapperRef.current.style.cursor = ''
        wrapperRef.current.style.userSelect = ''
      }

      if (wasDragging) {
        const preventClick = (clickEvent: MouseEvent) => {
          const target = clickEvent.target as HTMLElement
          if (clickedElement && (target === clickedElement || clickedElement.contains(target))) {
            clickEvent.preventDefault()
            clickEvent.stopImmediatePropagation()
          }
          window.removeEventListener('click', preventClick, true)
        }
        window.addEventListener('click', preventClick, true)
        setTimeout(() => {
          window.removeEventListener('click', preventClick, true)
        }, 100)
      }

      dragStateRef.current = null
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [getScrollContainer])

  useEffect(() => {
    if (theadRef.current && tableRef.current) {
      const thead = theadRef.current
      const table = tableRef.current
      const scrollContainer = table.closest('[class*="overflow"]') as HTMLElement
      const navBar = document.querySelector('[data-name="Header"]') as HTMLElement

      const updateStickyTop = () => {
        if (!scrollContainer || !navBar) return

        const scrollContainerRect = scrollContainer.getBoundingClientRect()
        const navBarRect = navBar.getBoundingClientRect()
        const scrollContainerTop = scrollContainerRect.top
        const navBarBottom = navBarRect.bottom

        // Calculate top offset: header should stick right below navbar
        let topOffset: number
        if (scrollContainerTop < navBarBottom) {
          topOffset = Math.max(0, navBarBottom - scrollContainerTop)
        } else {
          topOffset = 0
        }

        thead.style.top = `${topOffset}px`
      }

      updateStickyTop()

      const scrollHandler = () => {
        updateStickyTop()
      }
      scrollContainer?.addEventListener('scroll', scrollHandler)
      window.addEventListener('scroll', scrollHandler)
      window.addEventListener('resize', updateStickyTop)

      return () => {
        scrollContainer?.removeEventListener('scroll', scrollHandler)
        window.removeEventListener('scroll', scrollHandler)
        window.removeEventListener('resize', updateStickyTop)
      }
    }
  }, [data])

  // Header styles
  const thBase =
    'text-content-dark-2 typo-body-base border-r border-b border-border-1 px-2 py-2 text-center font-medium bg-background-2'
  const tdBase =
    'text-content-dark-1 typo-body-base border-r border-b border-border-1 px-4 py-3 text-center bg-background-1 group-hover:bg-data-light-grey-hover'

  // Sticky styles
  const stickyHeader = 'sticky z-50 bg-background-2'
  const stickyBody = 'sticky z-15 bg-background-1 group-hover:bg-data-light-grey-hover'

  return (
    <div ref={wrapperRef} className="w-full pr-0" onMouseDown={handleMouseDown}>
      <table
        ref={tableRef}
        className={cn(
          'bg-background-1 w-full border-separate border-spacing-0',
          'border-border-1 border-t-[1px] border-solid',
          'mt-0'
        )}
      >
        <thead ref={theadRef} className="bg-background-2 sticky z-40 pt-0">
          {/* Row 1 */}
          <tr className="bg-background-2">
            <th
              rowSpan={3}
              className={cn(
                thBase,
                stickyHeader,
                'z-[52]',
                'border-border-1 border-l', // Add left border to first column
                '!font-body-base-semibold left-0 min-w-[60px]' // Reset to left-0
              )}
            >
              STT
            </th>
            <th
              rowSpan={3}
              className={cn(
                thBase,
                stickyHeader,
                'z-[52]',
                '!font-body-base-semibold left-[60px] w-[140px] min-w-[140px]' // Reset to left-[60px]
              )}
            >
              Mã nhân viên
            </th>
            <th
              rowSpan={3}
              className={cn(
                thBase,
                stickyHeader,
                'z-[51]',
                // Drop shadow for the last sticky/pinned column to indicate scroll depth
                // stickyShadow,
                '!font-body-base-semibold left-[200px] min-w-[200px]'
              )}
            >
              Họ và tên
            </th>

            <th rowSpan={3} className={cn(thBase, '!font-body-base-semibold min-w-[200px]')}>
              Phòng ban
            </th>
            <th rowSpan={3} className={cn(thBase, '!font-body-base-semibold min-w-[150px]')}>
              Chức vụ
            </th>
            <th rowSpan={3} className={cn(thBase, '!font-body-base-semibold min-w-[180px]')}>
              Tình trạng HĐ
            </th>
            <th rowSpan={3} className={cn(thBase, '!font-body-base-semibold min-w-[180px]')}>
              Nhân viên kinh doanh
            </th>
            <th rowSpan={3} className={cn(thBase, '!font-body-base-semibold min-w-[150px]')}>
              Tổng lương
            </th>
            <th rowSpan={3} className={cn(thBase, '!font-body-base-semibold min-w-[120px]')}>
              Kỳ lương
            </th>
            <th rowSpan={3} className={cn(thBase, '!font-body-base-semibold min-w-[150px]')}>
              Cần gửi lại mail
            </th>
            <th rowSpan={3} className={cn(thBase, '!font-body-base-semibold min-w-[180px]')}>
              Trạng thái phiếu lương
            </th>
            <th rowSpan={3} className={cn(thBase, '!font-body-base-semibold min-w-[200px]')}>
              Email
            </th>

            {showFull && (
              <>
                <th rowSpan={3} className={cn(thBase, '!font-body-base-semibold min-w-[100px]')}>
                  Số giao dịch
                </th>
                <th rowSpan={3} className={cn(thBase, '!font-body-base-semibold min-w-[150px]')}>
                  Doanh số
                </th>

                <th colSpan={9} className={cn(thBase, '!font-body-base-semibold')}>
                  Thu nhập theo vị trí
                </th>

                <th colSpan={5} className={cn(thBase, '!font-body-base-semibold')}>
                  Ngày công
                </th>
                <th rowSpan={3} className={cn(thBase, '!font-body-base-semibold min-w-[150px]')}>
                  Thu nhập theo ngày công thực tế
                </th>

                <th colSpan={7} className={cn(thBase, '!font-body-base-semibold')}>
                  Giờ làm thêm
                </th>
                <th colSpan={2} className={cn(thBase, '!font-body-base-semibold')}>
                  Chi phí đi lại
                </th>
                <th rowSpan={3} className={cn(thBase, '!font-body-base-semibold min-w-[150px]')}>
                  Tổng thu nhập
                </th>
                <th rowSpan={3} className={cn(thBase, '!font-body-base-semibold min-w-[150px]')}>
                  Bảo hiểm xã hội
                </th>
                <th rowSpan={3} className={cn(thBase, '!font-body-base-semibold min-w-[150px]')}>
                  Lương đóng BHXH
                </th>

                <th colSpan={5} className={cn(thBase, '!font-body-base-semibold')}>
                  Các khoản trích từ DN
                </th>
                <th colSpan={4} className={cn(thBase, '!font-body-base-semibold')}>
                  Các khoản trích vào lương
                </th>
                <th rowSpan={3} className={cn(thBase, '!font-body-base-semibold min-w-[150px]')}>
                  Mã số thuế
                </th>
                <th rowSpan={3} className={cn(thBase, '!font-body-base-semibold min-w-[150px]')}>
                  Phương pháp tính thuế
                </th>

                <th colSpan={6} className={cn(thBase, '!font-body-base-semibold')}>
                  Thuế TNCN
                </th>

                <th rowSpan={3} className={cn(thBase, '!font-body-base-semibold min-w-[150px]')}>
                  Truy thu
                </th>
                <th rowSpan={3} className={cn(thBase, '!font-body-base-semibold min-w-[150px]')}>
                  Truy lĩnh
                </th>
              </>
            )}

            {activeTab === 'ineligible' && (
              <>
                <th rowSpan={3} className={cn(thBase, '!font-body-base-semibold min-w-[200px]')}>
                  Ghi chú trạng thái
                </th>
                <th rowSpan={3} className={cn(thBase, '!font-body-base-semibold min-w-[200px]')}>
                  Lý do tạm giữ
                </th>
                <th rowSpan={3} className={cn(thBase, '!font-body-base-semibold min-w-[150px]')}>
                  Người tạm giữ
                </th>
                <th rowSpan={3} className={cn(thBase, '!font-body-base-semibold min-w-[180px]')}>
                  Thời gian tạm giữ
                </th>
              </>
            )}

            <th
              rowSpan={3}
              className={cn(
                thBase,
                stickyHeader,
                '!font-body-base-semibold right-0 min-w-[80px] px-2'
              )}
            ></th>
          </tr>

          {/* Row 2 */}
          <tr className="bg-background-2">
            {showFull && (
              <>
                <th rowSpan={2} className={cn(thBase, 'min-w-[150px]')}>
                  Lương vị trí
                </th>
                <th colSpan={7} className={cn(thBase)}>
                  Các khoản thu nhập khác
                </th>

                <th rowSpan={2} className={cn(thBase, 'min-w-[100px]')}>
                  Tổng
                </th>

                <th rowSpan={2} className={cn(thBase, 'min-w-[100px]')}>
                  Tiêu chuẩn
                </th>
                <th rowSpan={2} className={cn(thBase, 'min-w-[100px]')}>
                  Thực tế
                </th>
                <th rowSpan={2} className={cn(thBase, 'min-w-[100px]')}>
                  Thử việc
                </th>
                <th rowSpan={2} className={cn(thBase, 'min-w-[100px]')}>
                  Chính thức
                </th>
                <th rowSpan={2} className={cn(thBase, 'min-w-[100px]')}>
                  % Lương thử việc
                </th>

                <th colSpan={4} className={cn(thBase)}>
                  Thời gian làm ngoài giờ
                </th>
                <th rowSpan={2} className={cn(thBase, 'min-w-[150px]')}>
                  Đơn giá lương giờ
                </th>
                <th rowSpan={2} className={cn(thBase, 'min-w-[150px]')}>
                  Tổng tiền ngoài giờ tham chiếu
                </th>

                <th rowSpan={2} className={cn(thBase, 'min-w-[100px]')}>
                  Số giờ làm thêm
                </th>

                <th rowSpan={2} className={cn(thBase, 'min-w-[150px]')}>
                  Chịu thuế
                </th>
                <th rowSpan={2} className={cn(thBase, 'min-w-[150px]')}>
                  Không chịu thuế
                </th>

                <th colSpan={5} className={cn(thBase)}>
                  BHXH,BHYT,BHTN, KPCĐ trích từ DN
                </th>

                <th colSpan={4} className={cn(thBase)}>
                  BHXH, BHYT, BHTN, KPCĐ trích lương NLD
                </th>

                <th colSpan={2} className={cn(thBase)}>
                  Giảm trừ gia cảnh
                </th>
                <th rowSpan={2} className={cn(thBase, 'min-w-[180px]')}>
                  Phụ cấp không tính thuế TNCN
                </th>
                <th rowSpan={2} className={cn(thBase, 'min-w-[180px]')}>
                  Mức thu nhập tối thiểu khấu trừ 10%
                </th>
                <th rowSpan={2} className={cn(thBase, 'min-w-[150px]')}>
                  Thu nhập tính thuế
                </th>
                <th rowSpan={2} className={cn(thBase, 'min-w-[150px]')}>
                  Thuế TNCN
                </th>
              </>
            )}
          </tr>

          {/* Row 3 */}
          <tr className="bg-background-2">
            {showFull && (
              <>
                <th className={cn(thBase, 'min-w-[120px]')}>Ăn trưa</th>
                <th className={cn(thBase, 'min-w-[120px]')}>Điện thoại</th>
                <th className={cn(thBase, 'min-w-[120px]')}>Công tác</th>
                <th className={cn(thBase, 'min-w-[150px]')}>Lương KPI</th>
                <th className={cn(thBase, 'min-w-[100px]')}>Mức KPI</th>
                <th className={cn(thBase, 'min-w-[150px]')}>Lương đạt KPI</th>
                <th className={cn(thBase, 'min-w-[150px]')}>Thưởng DS</th>

                <th className={cn(thBase, 'min-w-[100px]')}>Thứ 7 và trong tuần</th>
                <th className={cn(thBase, 'min-w-[100px]')}>Chủ nhật</th>
                <th className={cn(thBase, 'min-w-[100px]')}>Ngày lễ</th>
                <th className={cn(thBase, 'min-w-[100px]')}>Tổng</th>

                <th className={cn(thBase, 'min-w-[120px]')}>BHXH (17%)</th>
                <th className={cn(thBase, 'min-w-[120px]')}>BHYT (3%)</th>
                <th className={cn(thBase, 'min-w-[120px]')}>BH TNLĐ-BNN (0,5%)</th>
                <th className={cn(thBase, 'min-w-[120px]')}>BHTN (1%)</th>
                <th className={cn(thBase, 'min-w-[120px]')}>Đoàn phí công đoàn (2%)</th>
                <th className={cn(thBase, 'min-w-[120px]')}>BHXH (8%)</th>
                <th className={cn(thBase, 'min-w-[120px]')}>BHYT (1.5%)</th>

                <th className={cn(thBase, 'min-w-[120px]')}>BHTN (1%)</th>
                <th className={cn(thBase, 'min-w-[120px]')}>Đoàn phí công đoàn (1%)</th>

                <th className={cn(thBase, 'min-w-[120px]')}>Người phụ thuộc</th>
                <th className={cn(thBase, 'min-w-[150px]')}>Tổng giảm trừ</th>
              </>
            )}
          </tr>
        </thead>

        <tbody>
          {data.map((item, index) => (
            <tr
              key={item.id}
              className="border-border-1 hover:bg-data-light-grey-hover group border-b"
            >
              <td
                className={cn(
                  tdBase,
                  stickyBody,
                  'z-[19]',
                  'border-border-1 border-l',
                  'left-0 w-[60px]',
                  'stt'
                )}
              >
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {(pagination as any)?.page
                  ? ((pagination as any).page - 1) * (pagination as any).pageSize + index + 1
                  : index + 1}
              </td>
              <td
                className={cn(
                  tdBase,
                  stickyBody,
                  'z-[19]',
                  'left-[60px] w-[180px]',
                  'employee_code'
                )}
              >
                {item.employee_code}
              </td>
              <td
                className={cn(
                  tdBase,
                  stickyBody,
                  'z-[18]',
                  // stickyShadow,
                  'left-[200px] w-[200px] px-4 text-left',
                  'employee_name'
                )}
              >
                <Text className="text-content-dark-1 typo-body-base truncate" title={item.name}>
                  {item.name}
                </Text>
              </td>

              <td className={cn(tdBase, 'department')}>
                {typeof item.department === 'object' ? item.department.name : item.department}
              </td>
              <td className={cn(tdBase, 'position')}>
                {typeof item.position === 'object' ? item.position.name : item.position}
              </td>
              <td className={cn(tdBase, 'employment_status')}>
                {keysMapOptions
                  .get(APP_CONSTANT_KEY.HRM.EMPLOYEE_TYPE)
                  ?.find((opt) => opt.value === item.employment_status)?.label ||
                  item.employment_status}
              </td>
              <td className={cn(tdBase, 'is_sale_employee')}>
                {item.is_sale_employee ? 'Có' : 'Không'}
              </td>
              <td className={cn(tdBase, 'net_salary')}>{formatCurrencyVND(item.net_salary)}</td>
              <td className={cn(tdBase, 'salary_period')}>{item.salary_period?.month}</td>
              <td className={cn(tdBase, 'mail_status')}>
                <Chip
                  label={item.mail_status}
                  variant={
                    item.mail_status === 'Đã gửi mail'
                      ? ColoredValueVariant.GREEN
                      : ColoredValueVariant.GREY
                  }
                  type="outlined"
                  size="small"
                />
              </td>
              <td className={cn(tdBase, 'payslip_status')}>
                <Chip
                  label={
                    keysMapOptions
                      .get(APP_CONSTANT_KEY.PAYROLL.PAYROLL_SLIP_STATUS)
                      ?.find((opt) => opt.value === item.payslip_status)?.label ||
                    item?.colored_status?.value ||
                    item.payslip_status
                  }
                  variant={item?.colored_status?.variant}
                  type="outlined"
                  size="small"
                />
              </td>
              <td className={cn(tdBase, 'email', 'text-left')}>{item.email}</td>

              {showFull && (
                <>
                  <td className={cn(tdBase, 'sales_transaction_count')}>
                    {item.sales_transaction_count}
                  </td>
                  <td className={cn(tdBase, 'sales_revenue')}>
                    {formatCurrencyVND(item.sales_revenue)}
                  </td>

                  <td className={cn(tdBase, 'base_salary')}>
                    {formatCurrencyVND(item.base_salary)}
                  </td>
                  <td className={cn(tdBase, 'lunch_allowance')}>
                    {formatCurrencyVND(item.lunch_allowance)}
                  </td>
                  <td className={cn(tdBase, 'phone_allowance')}>
                    {formatCurrencyVND(item.phone_allowance)}
                  </td>
                  <td className={cn(tdBase, 'travel_expense_by_working_days')}>
                    {formatCurrencyVND(item.travel_expense_by_working_days)}
                  </td>

                  <td className={cn(tdBase, 'kpi_salary')}>{formatCurrencyVND(item.kpi_salary)}</td>
                  <td className={cn(tdBase, 'kpi_grade')}>{item.kpi_grade}</td>
                  <td className={cn(tdBase, 'kpi_bonus')}>{formatCurrencyVND(item.kpi_bonus)}</td>
                  <td className={cn(tdBase, 'business_progressive_salary')}>
                    {formatCurrencyVND(item.business_progressive_salary)}
                  </td>
                  <td className={cn(tdBase, 'total_position_income')}>
                    {formatCurrencyVND(item.total_position_income)}
                  </td>

                  <td className={cn(tdBase, 'standard_working_days')}>
                    {item.standard_working_days}
                  </td>
                  <td className={cn(tdBase, 'total_working_days')}>{item.total_working_days}</td>
                  <td className={cn(tdBase, 'probation_working_days')}>
                    {item.probation_working_days}
                  </td>
                  <td className={cn(tdBase, 'official_working_days')}>
                    {item.official_working_days}
                  </td>

                  <td className={cn(tdBase, 'net_percentage')}>{item.net_percentage ?? '---'}%</td>
                  <td className={cn(tdBase, 'actual_working_days_income')}>
                    {formatCurrencyVND(item.actual_working_days_income)}
                  </td>
                </>
              )}

              {showFull && (
                <>
                  <td className={cn(tdBase, 'tc1_overtime_hours')}>{item.tc1_overtime_hours}</td>
                  <td className={cn(tdBase, 'tc2_overtime_hours')}>{item.tc2_overtime_hours}</td>
                  <td className={cn(tdBase, 'tc3_overtime_hours')}>{item.tc3_overtime_hours}</td>
                  <td className={cn(tdBase, 'total_overtime_hours')}>
                    {item.total_overtime_hours}
                  </td>
                  <td className={cn(tdBase, 'hourly_rate')}>
                    {formatCurrencyVND(item.hourly_rate)}
                  </td>
                  <td className={cn(tdBase, 'overtime_pay')}>
                    {formatCurrencyVND(item.overtime_pay)}
                  </td>

                  <td className={cn(tdBase, 'total_overtime_hours')}>
                    {item.total_overtime_hours}
                  </td>

                  <td className={cn(tdBase, 'taxable_travel_expense')}>
                    {formatCurrencyVND(item.taxable_travel_expense)}
                  </td>
                  <td className={cn(tdBase, 'non_taxable_travel_expense')}>
                    {formatCurrencyVND(item.non_taxable_travel_expense)}
                  </td>

                  <td className={cn(tdBase, 'gross_income')}>
                    {formatCurrencyVND(item.gross_income)}
                  </td>
                  <td className={cn(tdBase, 'has_social_insurance')}>
                    {item.has_social_insurance ? 'Có' : 'Không'}
                  </td>
                  <td className={cn(tdBase, 'social_insurance_base')}>
                    {formatCurrencyVND(item.social_insurance_base)}
                  </td>

                  <td className={cn(tdBase, 'employer_social_insurance')}>
                    {formatCurrencyVND(item.employer_social_insurance)}
                  </td>
                  <td className={cn(tdBase, 'employer_health_insurance')}>
                    {formatCurrencyVND(item.employer_health_insurance)}
                  </td>
                  <td className={cn(tdBase, 'employer_accident_insurance')}>
                    {formatCurrencyVND(item.employer_accident_insurance)}
                  </td>
                  <td className={cn(tdBase, 'employer_unemployment_insurance')}>
                    {formatCurrencyVND(item.employer_unemployment_insurance)}
                  </td>
                  <td className={cn(tdBase, 'employer_union_fee')}>
                    {formatCurrencyVND(item.employer_union_fee)}
                  </td>

                  <td className={cn(tdBase, 'employee_social_insurance')}>
                    {formatCurrencyVND(item.employee_social_insurance)}
                  </td>
                  <td className={cn(tdBase, 'employee_health_insurance')}>
                    {formatCurrencyVND(item.employee_health_insurance)}
                  </td>

                  <td className={cn(tdBase, 'employee_unemployment_insurance')}>
                    {formatCurrencyVND(item.employee_unemployment_insurance)}
                  </td>
                  <td className={cn(tdBase, 'employee_union_fee')}>
                    {formatCurrencyVND(item.employee_union_fee)}
                  </td>

                  <td className={cn(tdBase, 'tax_code')}>{item.tax_code}</td>
                  <td className={cn(tdBase, 'tax_calculation_method')}>
                    {keysMapOptions
                      .get(APP_CONSTANT_KEY.HRM.CONTRACT_TYPE_TAX_CALCULATION_METHOD)
                      ?.find((opt) => opt.value === item.tax_calculation_method)?.label ||
                      item.tax_calculation_method}
                  </td>

                  <td className={cn(tdBase, 'dependent_count')}>{item.dependent_count}</td>
                  <td className={cn(tdBase, 'total_family_deduction')}>
                    {formatCurrencyVND(Number(item.total_family_deduction))}
                  </td>
                  <td className={cn(tdBase, 'non_taxable_allowance')}>
                    {formatCurrencyVND(Number(item.non_taxable_allowance))}
                  </td>
                  <td className={cn(tdBase, 'minimum_flat_tax_threshold')}>
                    {formatCurrencyVND(
                      salaryConfigData?.config?.personal_income_tax?.minimum_flat_tax_threshold ?? 0
                    )}
                  </td>
                  <td className={cn(tdBase, 'taxable_income')}>
                    {formatCurrencyVND(item.taxable_income)}
                  </td>

                  <td className={cn(tdBase, 'personal_income_tax')}>
                    {formatCurrencyVND(item.personal_income_tax)}
                  </td>

                  <td className={cn(tdBase, 'recovery_amount')}>
                    {formatCurrencyVND(item.recovery_amount)}
                  </td>
                  <td className={cn(tdBase, 'back_pay_amount')}>
                    {formatCurrencyVND(item.back_pay_amount)}
                  </td>
                </>
              )}

              {activeTab === 'ineligible' && (
                <>
                  <td className={cn(tdBase, 'status_note')}>{item.status_note || '---'}</td>
                  <td className={cn(tdBase, 'hold_reason')}>{item.hold_reason || '---'}</td>
                  <td className={cn(tdBase, 'held_by')}>{item.held_by?.fullname || '---'}</td>
                  <td className={cn(tdBase, 'held_at')}>
                    {item.held_at ? formatDate(item.held_at, DATETIME_FORMAT) : '---'}
                  </td>
                </>
              )}

              <td className={cn(tdBase, stickyBody, 'right-0 w-[80px] p-0 px-2', 'actions')}>
                <div className="flex justify-center gap-2">
                  <TableActionMenu row={item} actions={actions} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
