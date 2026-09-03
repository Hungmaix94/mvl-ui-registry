import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Select, TextField } from '@/components/ui'
import { ArrowLeft } from 'lucide-react'
import { useProjectSelect } from '@/hooks/useProjectSelect'
import { useInvestorSelect } from '@/hooks/useInvestorSelect'
import { useCreateInvestorAdvanceAccount } from '@/features/accounting/investor-advances/services/investor-advance-service'
import { getRealEstateService } from '@/services/realestate-service'
import toastService from '@/services/toast-service'
import { extractErrorMessage } from '@/utils/error-utils'

export default function InvestorAdvanceCreatePage() {
  const navigate = useNavigate()
  const [projectId, setProjectId] = useState<string | null>(null)
  const [investorId, setInvestorId] = useState<string | null>(null)
  const [note, setNote] = useState('')

  const { loadProjectOptions, loadInitialProjectOptions } = useProjectSelect()
  const { loadInvestorOptions, loadInitialInvestorOptions } = useInvestorSelect({ valueType: 'id' })

  const createMutation = useCreateInvestorAdvanceAccount()

  // Auto-fill Investor when Project is selected
  useEffect(() => {
    if (!projectId) return
    const id = Number(projectId)
    getRealEstateService()
      .getProject(id)
      .then((project) => {
        if (project.investor?.id) {
          setInvestorId(String(project.investor.id))
        }
      })
      .catch((e) => {
        console.error('Failed to auto-fetch project investor:', e)
      })
  }, [projectId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
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
      navigate('/accounting/investor-advances')
    } catch (err) {
      toastService.error(extractErrorMessage(err))
    }
  }

  return (
    <div className="bg-surface-primary-default flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="border-border-1 bg-background-1 flex items-center gap-3 border-b px-7 py-4">
        <Button
          type="button"
          variant="secondary"
          size="small"
          onClick={() => navigate('/accounting/investor-advances')}
          className="p-2"
        >
          <ArrowLeft size={16} />
        </Button>
        <div>
          <h2 className="text-content-dark-1 text-xl font-bold">Khởi tạo tài khoản tạm ứng CĐT</h2>
          <p className="text-content-dark-3 mt-0.5 text-xs">
            Khởi tạo ví tạm ứng cho một dự án của Chủ đầu tư
          </p>
        </div>
      </div>

      {/* Form Content */}
      <div className="flex-1 overflow-y-auto px-7 py-6">
        <form
          onSubmit={handleSubmit}
          className="border-border-1 bg-background-1 mx-auto flex max-w-[640px] flex-col gap-5 rounded-xl border p-6 shadow-sm"
        >
          <Select
            label="Dự án"
            value={projectId ?? undefined}
            onChange={(val) => {
              setProjectId(val ? String(val) : null)
            }}
            placeholder="Chọn dự án"
            loadOptions={loadProjectOptions}
            loadInitialOptions={loadInitialProjectOptions}
            enableSearch
            clearable
            required
          />

          <Select
            label="Chủ đầu tư"
            value={investorId ?? undefined}
            onChange={(val) => setInvestorId(val ? String(val) : null)}
            placeholder="Chọn chủ đầu tư"
            loadOptions={loadInvestorOptions}
            loadInitialOptions={loadInitialInvestorOptions}
            enableSearch
            clearable
            required
          />

          <TextField
            label="Ghi chú"
            placeholder="Ghi chú khởi tạo"
            value={note}
            onChange={(val) => setNote(val)}
          />

          <div className="mt-4 flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate('/accounting/investor-advances')}
            >
              Hủy
            </Button>
            <Button type="submit" variant="primary" loading={createMutation.isPending}>
              Khởi tạo tài khoản
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
