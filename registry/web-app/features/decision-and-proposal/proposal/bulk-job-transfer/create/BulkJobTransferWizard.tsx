import { useCallback, useState } from 'react'
import { useToast } from '@/hooks/useToast.ts'
import { useAuth } from '@/hooks/useAuth.ts'
import { useEmployee } from '@/features/employee/services/employee-service'
import { handleApiError } from '@/utils/error-utils'
import { formatDateToApi } from '@/utils/date-utils.ts'
import { FullScreenLoading } from '@/components/Loading.tsx'
import {
  useCreateProposalBulkJobTransfer,
  useUpdateProposalBulkJobTransfer,
  type ProposalBulkJobTransfer,
  type ProposalBulkJobTransferRequest,
} from '@/features/decision-and-proposal/services/proposal-misc-service'
import SourceStep from './SourceStep.tsx'
import AssignStep from './AssignStep.tsx'
import {
  buildInitialCardsFromLines,
  buildLineConflictsFromError,
  buildLinesPayload,
  type LineConflict,
  type ResultCard,
} from './wizard-logic'

type BulkJobTransferWizardProps = {
  proposalId?: number
  initialProposal?: ProposalBulkJobTransfer
  onSuccess: (id: number) => void
  onCancel: () => void
}

const BulkJobTransferWizard = ({
  proposalId,
  initialProposal,
  onSuccess,
  onCancel,
}: BulkJobTransferWizardProps) => {
  const { success: showSuccessToast } = useToast()
  const createMutation = useCreateProposalBulkJobTransfer()
  const updateMutation = useUpdateProposalBulkJobTransfer()
  const isEditMode = !!proposalId

  const { user } = useAuth()
  const employeeId = user?.employee?.id ?? 0
  const { data: employee, isLoading: isLoadingEmployee } = useEmployee(employeeId)
  const sourceDepartmentId = employee?.department.id ?? null

  const [effectiveDate, setEffectiveDate] = useState(
    initialProposal?.job_transfer_effective_date ?? ''
  )
  const [note, setNote] = useState(initialProposal?.note ?? '')
  const [cards, setCards] = useState<ResultCard[]>(() =>
    initialProposal ? buildInitialCardsFromLines(initialProposal.job_transfer_lines ?? []) : []
  )
  const [lineConflicts, setLineConflicts] = useState<Record<number, LineConflict>>({})

  const isSubmitting = createMutation.isPending || updateMutation.isPending
  const canSubmit = !!effectiveDate && cards.some((card) => card.lines.length > 0) && !isSubmitting

  const handleClearLineConflict = useCallback((employeeId: number) => {
    setLineConflicts((prev) => {
      if (!(employeeId in prev)) return prev
      const next = { ...prev }
      delete next[employeeId]
      return next
    })
  }, [])

  const handleSubmit = useCallback(async () => {
    const payload: ProposalBulkJobTransferRequest = {
      job_transfer_effective_date: formatDateToApi(effectiveDate),
      whole_department: false,
      lines: buildLinesPayload(cards),
      note: note.trim() || undefined,
    }

    setLineConflicts({})

    try {
      if (isEditMode && proposalId) {
        await updateMutation.mutateAsync({ id: proposalId, data: payload })
        showSuccessToast('Cập nhật đề xuất điều chuyển hàng loạt thành công')
        onSuccess(proposalId)
      } else {
        const created = await createMutation.mutateAsync(payload)
        showSuccessToast('Tạo đề xuất điều chuyển hàng loạt thành công')
        onSuccess(created.id)
      }
    } catch (error) {
      // Flag the specific conflicting employee row (see AssignStep/ResultCardView) in addition
      // to the generic toast — `active_transfer_conflict` errors are otherwise easy to miss
      // since the message names the employee but not which card/row they're in.
      setLineConflicts(buildLineConflictsFromError(error))
      handleApiError(error)
    }
  }, [
    cards,
    effectiveDate,
    note,
    isEditMode,
    proposalId,
    createMutation,
    updateMutation,
    showSuccessToast,
    onSuccess,
  ])

  if (isLoadingEmployee || sourceDepartmentId === null) {
    return <FullScreenLoading className="h-['unset'] min-h-['unset'] flex-1" />
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <SourceStep
        effectiveDate={effectiveDate}
        onEffectiveDateChange={setEffectiveDate}
        employee={employee}
        disabled={isSubmitting}
      />

      <AssignStep
        sourceDepartmentId={sourceDepartmentId}
        cards={cards}
        onCardsChange={setCards}
        note={note}
        onNoteChange={setNote}
        onCancel={onCancel}
        onSubmit={handleSubmit}
        canSubmit={canSubmit}
        isSubmitting={isSubmitting}
        lineConflicts={lineConflicts}
        onClearLineConflict={handleClearLineConflict}
      />
    </div>
  )
}

export default BulkJobTransferWizard
