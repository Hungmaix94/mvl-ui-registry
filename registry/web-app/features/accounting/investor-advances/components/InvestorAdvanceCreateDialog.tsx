import { useState } from 'react'
import AppDialog from '@/components/dialog/AppDialog'
import { Select, TextField } from '@/components/ui'
import { useProjectSelect } from '@/hooks/useProjectSelect'
import { useInvestorSelect } from '@/hooks/useInvestorSelect'
import { useCreateInvestorAdvanceAccount } from '../services/investor-advance-service'
import toastService from '@/services/toast-service'
import { extractErrorMessage } from '@/utils/error-utils'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export default function InvestorAdvanceCreateDialog({ open, onOpenChange, onSuccess }: Props) {
  const [projectId, setProjectId] = useState<string | null>(null)
  const [investorId, setInvestorId] = useState<string | null>(null)
  const [note, setNote] = useState('')

  const { loadProjectOptions, loadInitialProjectOptions } = useProjectSelect()
  const { loadInvestorOptions, loadInitialInvestorOptions } = useInvestorSelect({ valueType: 'id' })

  const createMutation = useCreateInvestorAdvanceAccount()

  const handleConfirm = async () => {
    if (!projectId) {
      toastService.error('Vui lòng chọn dự án')
      return
    }
    if (!investorId) {
      toastService.error('Vui lòng chọn chủ đầu tư')
      return
    }

    try {
      await createMutation.mutateAsync({
        project: Number(projectId),
        investor: Number(investorId),
        note: note || undefined,
      })
      toastService.success('Đã khởi tạo tài khoản tạm ứng chủ đầu tư thành công')
      onSuccess()
      onOpenChange(false)
      // Reset
      setProjectId(null)
      setInvestorId(null)
      setNote('')
    } catch (err) {
      toastService.error(extractErrorMessage(err))
    }
  }

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Khởi tạo tài khoản tạm ứng CĐT"
      variant="custom"
      isHideCancelButton={false}
      onCancel={() => onOpenChange(false)}
      onConfirm={handleConfirm}
      confirmText="Khởi tạo"
      loading={createMutation.isPending}
      content={
        <div className="flex min-w-[480px] flex-col gap-4 py-4">
          <Select
            label="Chủ đầu tư"
            value={investorId ?? undefined}
            onChange={(val) => setInvestorId(val ? String(val) : null)}
            placeholder="Chọn chủ đầu tư"
            loadOptions={loadInvestorOptions}
            loadInitialOptions={loadInitialInvestorOptions}
            enableSearch
            clearable
          />

          <Select
            label="Dự án"
            value={projectId ?? undefined}
            onChange={(val) => setProjectId(val ? String(val) : null)}
            placeholder="Chọn dự án"
            loadOptions={loadProjectOptions}
            loadInitialOptions={loadInitialProjectOptions}
            enableSearch
            clearable
          />

          <TextField
            label="Ghi chú"
            placeholder="Ghi chú khởi tạo"
            value={note}
            onChange={(val) => setNote(val)}
          />
        </div>
      }
    />
  )
}
