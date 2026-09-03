import { useEffect, useState } from 'react'
import AppDialog from '@/components/dialog/AppDialog.tsx'
import { TextArea } from '@/components/ui'
import { useInvalidateQueries } from '@/hooks/useApiQuery.ts'
import toastService from '@/services/toast-service.tsx'
import { handleApiError } from '@/utils/error-utils.ts'
import {
  type BrokerCertificate,
  useRevokeBrokerCertificate,
} from '@/features/accounting/broker-certificates/services/broker-certificate-service'
import { collaboratorNameOf } from '@/features/accounting/broker-certificates/types/broker-certificate-types'

type Props = { target: BrokerCertificate | null; onClose: () => void; onSuccess?: () => void }

export default function BrokerCertificateRevokeDialog({ target, onClose, onSuccess }: Props) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const revokeMutation = useRevokeBrokerCertificate()
  const invalidateQueries = useInvalidateQueries()

  useEffect(() => {
    setReason('')
    setError(null)
  }, [target])

  const handleConfirm = async () => {
    if (!target) return
    if (!reason.trim()) {
      setError('Vui lòng ghi rõ lý do thu hồi')
      return
    }
    try {
      await revokeMutation.mutateAsync({ id: target.id, data: { reason: reason.trim() } })
      await invalidateQueries.invalidateByPrefix('accounting/broker-certificates')
      toastService.success('Đã thu hồi chứng chỉ')
      onSuccess?.()
      onClose()
    } catch (err) {
      handleApiError(err)
    }
  }

  return (
    <AppDialog
      variant="custom"
      isHideCancelButton={false}
      open={!!target}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title="Thu hồi chứng chỉ"
      content={
        <div className="flex flex-col gap-3">
          {target && (
            <p className="typo-body-base-regular text-content-dark-2">
              Thu hồi chứng chỉ của <b>{collaboratorNameOf(target)}</b>. Chứng chỉ vẫn được giữ lại
              để tra cứu, nhưng không còn giá trị miễn giữ hoa hồng.
            </p>
          )}
          <TextArea
            label="Lý do thu hồi"
            required
            placeholder="VD: Không tra cứu được tại cơ quan cấp phép, nghi giả mạo"
            rows={4}
            value={reason}
            onChange={(value: string) => {
              setReason(value)
              if (error) setError(null)
            }}
            error={error ?? undefined}
            maxCharacters={1000}
          />
        </div>
      }
      confirmText="Thu hồi"
      onConfirm={handleConfirm}
      onCancel={onClose}
      disableConfirm={revokeMutation.isPending}
    />
  )
}
