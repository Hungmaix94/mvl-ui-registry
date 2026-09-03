import React from 'react'
import { Flex } from '@radix-ui/themes'
import { cn } from '@/utils'
import { Check, Clock, Eye, ChevronDown, ChevronUp } from 'lucide-react'
import { formatDate } from '@/utils/date-utils'
import { DealWorkspaceResponse } from '@/features/sales/deals/services/deal-service'
import { APP_PATH } from '@/routes/AppRoute.constant'
import { generatePath } from 'react-router-dom'

const LIFECYCLE_STEP_TRANSLATIONS: Record<string, string> = {
  // Booking
  booking: 'Booking',
  booking_contract: 'HĐ Giữ chỗ',
  // Deposit
  deposit: 'HĐ Cọc',
  deposit_contract: 'HĐ Cọc',
  deposit_signed: 'HĐ Cọc (Ký)',
  deposit_approved: 'HĐ Cọc (Duyệt)',
  // Deal
  deal_created: 'Tạo Deal',
  deal: 'Deal',
  // Purchase contract
  contract: 'HĐMB',
  spa: 'HĐMB',
  purchase_contract: 'HĐMB',
  sale_and_purchase_agreement: 'HĐMB',
  // Notarization
  notarization: 'Công chứng',
  notarize: 'Công chứng',
  notarized: 'Công chứng',
  // Handover
  handover: 'Bàn giao',
  handover_minutes: 'Bàn giao',
  // Certificate
  certificate: 'Sổ đỏ / GCN',
  land_use_right: 'Sổ đỏ / GCN',
  ownership_certificate: 'Sổ đỏ / GCN',
  // Payment / Commission
  payment: 'Thanh toán',
  commission: 'Hoa hồng',
  commission_payment: 'TT Hoa hồng',
  // Reconciliation
  reconciliation: 'Quyết toán',
  reconciliation_started: 'Bắt đầu đối chiếu',
  reconciliation_confirmed: ' Đối chiếu xác nhận',
  reconciliation_completed: 'Đối chiếu hoàn thành',
  investor_reconciliation: 'Đối chiếu CĐT',
  f2_reconciliation: 'Đối chiếu F2',
  agency_reconciliation: 'Đối chiếu Đại lý',
  collaborator_reconciliation: 'Đối chiếu CTV',
  advance: 'Tạm ứng',
  settlement: 'Quyết toán',
  // Transaction sheet
  transaction_sheet: 'TTGD',
  transaction: 'Giao dịch',
  // Completed / Cancelled
  completed: 'Hoàn thành',
  done: 'Hoàn thành',
  cancelled: 'Đã huỷ',
  canceled: 'Đã huỷ',
}

const translateStep = (stepObj: any) => {
  if (!stepObj) return ''
  const stepVal = typeof stepObj === 'string' ? stepObj : stepObj.step
  if (!stepVal) return ''

  const baseTranslation = LIFECYCLE_STEP_TRANSLATIONS[stepVal.toLowerCase()] || stepVal

  if (typeof stepObj === 'object' && stepObj.type === 'reconciliation') {
    let suffix = ''
    if (stepObj.reconciliation_type === 'advance') suffix = ' (Tạm ứng)'
    if (stepObj.reconciliation_type === 'settlement') suffix = ' (Quyết toán)'
    return `${baseTranslation}${suffix}`
  }

  return baseTranslation
}

const getStepUrl = (step: any, workspace?: DealWorkspaceResponse): string | undefined => {
  if (step?.url || step?.link || step?.ref_url || step?.detail_url) {
    return step.url || step.link || step.ref_url || step.detail_url
  }

  const id = step?.id || step?.ref_id || step?.target_id
  const stepKind = step?.kind || step?.step

  if (
    stepKind === 'deposit_contract' ||
    stepKind === 'deposit_signed' ||
    stepKind === 'deposit_approved'
  ) {
    const dcId = id || workspace?.overview?.deposit_contract?.id
    if (dcId) return generatePath(APP_PATH.DEPOSIT_CONTRACT_DETAIL, { id: String(dcId) })
  }

  if (stepKind === 'booking' || stepKind === 'booking_contract') {
    const bcId = id || workspace?.overview?.booking_contract?.id
    if (bcId) return generatePath(APP_PATH.PROJECT_BOOKING_CONTRACT_DETAIL, { id: String(bcId) })
  }

  if (
    stepKind === 'transaction_sheet' ||
    stepKind === 'transaction_sheet_signed' ||
    stepKind === 'transaction_sheet_approved' ||
    stepKind === 'transaction' ||
    stepKind?.includes('transaction_sheet')
  ) {
    const tsId =
      workspace?.overview?.deal?.transaction_sheet_id ||
      workspace?.header?.transaction_sheet_id ||
      workspace?.overview?.transaction_sheet?.id ||
      (!Number.isNaN(Number(id)) ? id : undefined)

    if (tsId) return generatePath(APP_PATH.TRANSACTION_SHEET_DETAIL, { id: String(tsId) })
  }

  if (stepKind === 'investor_reconciliation') {
    if (id) return generatePath(APP_PATH.INVESTOR_RECONCILIATION_DETAIL, { id: String(id) })
  }

  if (stepKind === 'f2_reconciliation') {
    if (id) return generatePath(APP_PATH.F2_RECONCILIATION_DETAIL, { id: String(id) })
  }

  return undefined
}
interface DealLifecycleBlockProps {
  workspace: DealWorkspaceResponse
}

export const DealLifecycleBlock: React.FC<DealLifecycleBlockProps> = ({ workspace }) => {
  const [isCollapsed, setIsCollapsed] = React.useState(true)
  const lifecycle = workspace?.lifecycle || []

  const stepsToRender = Array.isArray(lifecycle) && lifecycle.length > 0 ? lifecycle : []

  const groupedSteps = React.useMemo(() => {
    const groups: any[] = []
    let currentSeqGroup: any = null

    stepsToRender.forEach((step: any) => {
      const isReconciliation = typeof step === 'object' && step.type === 'reconciliation'

      if (isReconciliation && step.sequence) {
        if (!currentSeqGroup || currentSeqGroup.sequence !== step.sequence) {
          currentSeqGroup = {
            isGroup: true,
            type: 'reconciliation_group',
            sequence: step.sequence,
            steps: [step],
            status: step.status,
          }
          groups.push(currentSeqGroup)
        } else {
          currentSeqGroup.steps.push(step)
          if (step.status === 'active') currentSeqGroup.status = 'active'
          else if (step.status === 'done' && currentSeqGroup.status !== 'active')
            currentSeqGroup.status = 'done'
          else if (step.status === 'pending' && currentSeqGroup.status === 'empty')
            currentSeqGroup.status = 'pending'
        }
      } else {
        currentSeqGroup = null
        groups.push(step)
      }
    })

    return groups
  }, [stepsToRender])

  return (
    <Flex direction="column" gap="4">
      <div
        className="flex cursor-pointer items-center justify-between"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <Flex align="center" gap="2">
          <h3 className="text-content-dark-1 border-none text-lg font-semibold">
            Vòng đời giao dịch
          </h3>
          {isCollapsed ? (
            <ChevronDown className="text-content-dark-3 h-5 w-5" />
          ) : (
            <ChevronUp className="text-content-dark-3 h-5 w-5" />
          )}
        </Flex>
      </div>
      {!isCollapsed && (
        <div className="border-border-1 bg-surface-primary-default flex flex-col rounded-xl border p-6">
          <div className="w-full overflow-x-auto py-2">
            <div className="relative flex min-w-[700px] items-start justify-between">
              {groupedSteps.map((step: any, index: number) => {
                const isLast = index === groupedSteps.length - 1
                const isDone = step.status === 'done'
                const isActive = step.status === 'active'
                const isPending = step.status === 'pending'
                const isEmpty = step.status === 'empty'

                const stepUrl = getStepUrl(step, workspace)
                const stepLabel = translateStep(step)

                if (!stepUrl) {
                  console.warn('Missing stepUrl for step:', step)
                }

                return (
                  <div key={index} className="group relative flex flex-1 flex-col items-center">
                    {/* Connecting Line */}
                    {!isLast && (
                      <div
                        className={cn(
                          'absolute top-5 z-0 h-[2px]',
                          isDone || isActive ? 'bg-data-green-default' : 'bg-border-1'
                        )}
                        style={{
                          left: 'calc(50% + 20px)',
                          width: 'calc(100% - 40px)',
                        }}
                      />
                    )}

                    {/* Step Node */}
                    <div
                      className="bg-surface-primary-default relative z-10 cursor-pointer rounded-full p-1"
                      onClick={() => {
                        if (stepUrl) {
                          window.open(stepUrl, '_blank')
                        } else if (step.isGroup) {
                          const firstUrl = step.steps
                            .map((s: any) => getStepUrl(s, workspace))
                            .find(Boolean)
                          if (firstUrl) window.open(firstUrl, '_blank')
                        }
                      }}
                    >
                      <div
                        className={cn(
                          'flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all duration-300',
                          isDone && 'bg-data-green-default border-data-green-default text-white',
                          isActive &&
                            'border-data-green-default text-data-green-default bg-white ring-4 ring-green-50',
                          isPending &&
                            'bg-surface-secondary-default border-border-1 text-content-dark-3',
                          isEmpty &&
                            'bg-surface-secondary-default border-border-1 text-content-dark-4 border-dashed'
                        )}
                      >
                        {isDone ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <span className="text-xs font-semibold">{index + 1}</span>
                        )}
                      </div>
                    </div>

                    {/* Step Text */}
                    <div className="mt-3 w-full max-w-[140px] space-y-3 text-center">
                      {step.isGroup ? (
                        step.steps.map((subStep: any, idx: number) => {
                          const subUrl = getStepUrl(subStep, workspace)
                          const subLabel = translateStep(subStep)
                          const sDone = subStep.status === 'done'
                          const sActive = subStep.status === 'active'

                          return (
                            <div key={idx} className="space-y-1">
                              <div
                                className={cn(
                                  'flex items-center justify-center gap-1 text-[13px] font-semibold',
                                  sDone || sActive ? 'text-content-dark-1' : 'text-content-dark-3'
                                )}
                                title={subLabel}
                              >
                                <span className="truncate">{subLabel}</span>
                                {subUrl && !subStep.ref_code && (
                                  <a
                                    href={subUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-action-primary-blue-default hover:text-action-primary-blue-hover flex-shrink-0 transition-colors"
                                  >
                                    <Eye className="h-3 w-3" />
                                  </a>
                                )}
                              </div>

                              {subStep.ref_code && (
                                <div className="text-content-dark-3 flex items-center justify-center gap-1 text-[11px]">
                                  {subUrl ? (
                                    <a
                                      href={subUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-action-primary-blue-default hover:text-action-primary-blue-hover flex items-center gap-1 transition-colors"
                                    >
                                      <span className="truncate">{subStep.ref_code}</span>
                                      <Eye className="h-3 w-3 flex-shrink-0" />
                                    </a>
                                  ) : (
                                    <span className="truncate">{subStep.ref_code}</span>
                                  )}
                                </div>
                              )}

                              <div className="mt-1 flex items-center justify-center gap-1">
                                {sDone || sActive ? (
                                  <>
                                    <Clock
                                      className={cn(
                                        'h-3 w-3',
                                        sActive ? 'text-data-green-default' : 'text-content-dark-4'
                                      )}
                                    />
                                    <span
                                      className={cn(
                                        'text-[11px]',
                                        sActive
                                          ? 'text-data-green-default font-medium'
                                          : 'text-content-dark-4'
                                      )}
                                    >
                                      {subStep.date ? formatDate(subStep.date, 'dd/MM/yyyy') : '-'}
                                    </span>
                                  </>
                                ) : (
                                  <span className="text-content-dark-4 text-[11px]">
                                    {subStep.date ? formatDate(subStep.date, 'dd/MM/yyyy') : '-'}
                                  </span>
                                )}
                              </div>
                            </div>
                          )
                        })
                      ) : (
                        <div className="space-y-1">
                          <div
                            className={cn(
                              'flex items-center justify-center gap-1 text-[13px] font-semibold',
                              isDone || isActive ? 'text-content-dark-1' : 'text-content-dark-3'
                            )}
                            title={stepLabel}
                          >
                            <span className="truncate">{stepLabel}</span>
                            {stepUrl && !step.ref_code && (
                              <a
                                href={stepUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-action-primary-blue-default hover:text-action-primary-blue-hover flex-shrink-0 transition-colors"
                              >
                                <Eye className="h-3 w-3" />
                              </a>
                            )}
                          </div>

                          {step.ref_code && (
                            <div className="text-content-dark-3 flex items-center justify-center gap-1 text-[11px]">
                              {stepUrl ? (
                                <a
                                  href={stepUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-action-primary-blue-default hover:text-action-primary-blue-hover flex items-center gap-1 transition-colors"
                                >
                                  <span className="truncate">{step.ref_code}</span>
                                  <Eye className="h-3 w-3 flex-shrink-0" />
                                </a>
                              ) : (
                                <span className="truncate">{step.ref_code}</span>
                              )}
                            </div>
                          )}

                          <div className="mt-1 flex items-center justify-center gap-1">
                            {isDone || isActive ? (
                              <>
                                <Clock
                                  className={cn(
                                    'h-3 w-3',
                                    isActive ? 'text-data-green-default' : 'text-content-dark-4'
                                  )}
                                />
                                <span
                                  className={cn(
                                    'text-[11px]',
                                    isActive
                                      ? 'text-data-green-default font-medium'
                                      : 'text-content-dark-4'
                                  )}
                                >
                                  {step.date ? formatDate(step.date, 'dd/MM/yyyy') : '-'}
                                </span>
                              </>
                            ) : (
                              <span className="text-content-dark-4 text-[11px]">
                                {step.date ? formatDate(step.date, 'dd/MM/yyyy') : '-'}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Legend */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-6">
              <div className="typo-body-base-regular text-content-dark-3 flex items-center gap-2">
                <Check className="text-data-green-default h-4 w-4" />
                <span>Hoàn thành</span>
              </div>
              <div className="typo-body-base-regular text-content-dark-3 flex items-center gap-2">
                <div className="bg-data-red-default h-2.5 w-2.5 rounded-full" />
                <span>Đang hoạt động</span>
              </div>
              <div className="typo-body-base-regular text-content-dark-3 flex items-center gap-2">
                <Clock className="text-data-orange-default h-4 w-4" />
                <span>Đang xử lý</span>
              </div>
              <div className="typo-body-base-regular text-content-dark-3 flex items-center gap-2">
                <div className="bg-surface-secondary-default border-border-1 h-2.5 w-2.5 rounded-full border-2" />
                <span>Chưa có</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </Flex>
  )
}
