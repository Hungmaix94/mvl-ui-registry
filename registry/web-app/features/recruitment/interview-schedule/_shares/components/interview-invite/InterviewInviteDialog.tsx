import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { format } from 'date-fns'
import { DATETIME_FORMAT } from '@/constants/date-format.ts'
import { Table, TextField, Button } from '@/components/ui'
import type { ColumnDef } from '@tanstack/react-table'
import type {
  InterviewCandidate,
  InterviewSchedule,
} from '@/features/recruitment/services/interview-service'
import {
  useInterviewCandidates,
  usePreviewInterviewInvite,
  useInterviewSchedule,
} from '@/features/recruitment/services/interview-service'
import { useToast } from '@/hooks/useToast.ts'
import { FullScreenLoading } from '@/components/Loading.tsx'
import { cn } from '@/utils'
import { extractErrorMessage } from '@/utils/error-utils'
import { useSubmitOnce } from '@/hooks/useSubmitOnce'

type InterviewInviteDialogProps = {
  schedule: InterviewSchedule
  onCancel: () => void
  onSend: (payload: { candidateIds: number[]; subject?: string }) => Promise<void>
}

type EmailPreviewState = {
  html?: string | null
  text?: string | null
  subject?: string | null
}

const DEFAULT_PREVIEW_HEIGHT = 384
const MAX_PREVIEW_HEIGHT = 600

const formatCandidateDateTime = (value?: string | null) => {
  if (!value) {
    return '-'
  }

  const parsedDate = new Date(value)
  if (Number.isNaN(parsedDate.getTime())) {
    return '-'
  }

  return format(parsedDate, DATETIME_FORMAT)
}

export default function InterviewInviteDialog({
  schedule,
  onCancel,
  onSend,
}: InterviewInviteDialogProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const { error: showErrorToast } = useToast()

  const { data: scheduleResponse } = useInterviewSchedule(schedule.id)
  const currentSchedule = scheduleResponse || schedule

  const {
    data: candidatesResponse,
    isLoading: isCandidatesLoading,
    error: candidatesError,
  } = useInterviewCandidates({ interview_schedule_id: schedule.id })

  const candidates = useMemo(() => candidatesResponse?.results || [], [candidatesResponse?.results])

  const [selectedCandidates, setSelectedCandidates] = useState<InterviewCandidate[]>([])
  const [preview, setPreview] = useState<EmailPreviewState | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [subject, setSubject] = useState<string>('')
  const subjectInitializedRef = useRef(false)

  const { mutateAsync: previewInterviewInvite, isPending: isPreviewPending } =
    usePreviewInterviewInvite()

  useEffect(() => {
    setSelectedCandidates([])
  }, [schedule.id, candidates.length])

  // Fetch preview on mount or when schedule changes
  useEffect(() => {
    let isCancelled = false

    const fetchPreview = async () => {
      setPreviewError(null)
      try {
        const previewData = await previewInterviewInvite({
          id: schedule.id,
        })
        if (isCancelled) {
          return
        }
        if (previewData) {
          setPreview(previewData)
          if (!subjectInitializedRef.current) {
            setSubject(previewData.subject ?? '')
            subjectInitializedRef.current = true
          }
        } else {
          setPreview(null)
        }
      } catch (error: unknown) {
        if (isCancelled) {
          return
        }
        const message = extractErrorMessage(error, 'Không thể tải nội dung email')
        setPreviewError(message)
        showErrorToast(message)
      }
    }

    void fetchPreview()

    return () => {
      isCancelled = true
    }
  }, [previewInterviewInvite, schedule.id, showErrorToast])

  // Update iframe content whenever preview HTML changes
  useEffect(() => {
    if (!iframeRef.current || !preview?.html) {
      return
    }

    const iframeDoc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document
    if (!iframeDoc) {
      return
    }

    iframeDoc.open()
    iframeDoc.write(`
      <!DOCTYPE html>
      <html lang="vi">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              margin: 0;
              padding: 16px;
              font-family: 'Inter', sans-serif;
              font-size: 14px;
              line-height: 1.5;
              background: transparent;
            }
          </style>
        </head>
        <body>
          ${preview.html}
        </body>
      </html>
    `)
    iframeDoc.close()

    const resizeIframe = () => {
      if (!iframeRef.current || !iframeDoc.body) {
        return
      }
      const height = Math.max(
        iframeDoc.body.scrollHeight,
        iframeDoc.body.offsetHeight,
        DEFAULT_PREVIEW_HEIGHT
      )
      iframeRef.current.style.height = `${Math.min(height, MAX_PREVIEW_HEIGHT)}px`
    }

    if (iframeDoc.readyState === 'complete') {
      resizeIframe()
    } else {
      iframeRef.current.onload = resizeIframe
      setTimeout(resizeIframe, 120)
    }
  }, [preview?.html])

  const columns: ColumnDef<InterviewCandidate>[] = useMemo(
    () => [
      {
        accessorKey: 'recruitment_candidate.code',
        header: 'Mã ƯV',
        cell: ({ getValue }) => {
          const code = getValue() as string
          return (
            <span className="text-content-dark-1 text-sm" title={code}>
              {code || '-'}
            </span>
          )
        },
        meta: {
          width: 'w-[120px]',
        },
      },
      {
        accessorKey: 'recruitment_candidate.name',
        header: 'Họ và tên',
        cell: ({ getValue }) => {
          const name = getValue() as string
          return (
            <span className="text-content-dark-1 text-sm break-words" title={name}>
              {name || '-'}
            </span>
          )
        },
        meta: {
          width: 'flex-1',
        },
      },
      {
        accessorKey: 'recruitment_candidate.citizen_id',
        header: 'CCCD',
        cell: ({ getValue }) => {
          const citizenId = getValue() as string
          return (
            <span className="text-content-dark-1 text-sm" title={citizenId}>
              {citizenId || '-'}
            </span>
          )
        },
        meta: {
          width: 'w-[140px]',
        },
      },
      {
        accessorKey: 'recruitment_candidate.phone',
        header: 'SĐT',
        cell: ({ getValue }) => {
          const phone = getValue() as string
          return (
            <span className="text-content-dark-1 text-sm" title={phone}>
              {phone || '-'}
            </span>
          )
        },
        meta: {
          width: 'w-[140px]',
        },
      },
      {
        accessorKey: 'recruitment_candidate.email',
        header: 'Email',
        cell: ({ getValue }) => {
          const email = getValue() as string
          return (
            <span className="text-content-dark-1 text-sm break-words" title={email}>
              {email || '-'}
            </span>
          )
        },
        meta: {
          width: 'flex-1',
        },
      },
      {
        accessorKey: 'interview_time',
        header: 'Thời gian PV',
        cell: ({ getValue }) => {
          const time = getValue() as string
          const display = formatCandidateDateTime(time)
          return (
            <span className="text-content-dark-1 text-sm" title={display}>
              {display}
            </span>
          )
        },
        meta: {
          width: 'w-[160px]',
        },
      },
      {
        accessorKey: 'email_sent_at',
        header: 'Gửi mail lần cuối',
        cell: ({ getValue }) => {
          const time = getValue() as string
          const display = formatCandidateDateTime(time)
          return (
            <span className="text-content-dark-1 text-sm" title={display}>
              {display}
            </span>
          )
        },
        meta: {
          width: 'w-[180px]',
        },
      },
    ],
    []
  )

  const bccList = useMemo(() => {
    const interviewers = currentSchedule.interviewers

    if (!interviewers?.length) {
      return 'Chưa có người phỏng vấn'
    }

    return interviewers
      .map((interviewer) => interviewer.fullname || 'N/A')
      .filter(Boolean)
      .join(', ')
  }, [currentSchedule.interviewers])

  const handleSelectionChange = useCallback((rows: InterviewCandidate[]) => {
    setSelectedCandidates(rows)
  }, [])

  const sendInvites = useCallback(async () => {
    if (!selectedCandidates.length) {
      return
    }

    const candidateIds = selectedCandidates.map((item) => item.id)
    await onSend({
      candidateIds,
      subject: subject?.trim() ? subject.trim() : undefined,
    })
  }, [onSend, selectedCandidates, subject])

  // Chặn double-submit ở mức đồng bộ — xem docs/ai/conventions.md § Chống double-submit.
  // Guard cũ (`if (... || isSubmitting) return` bên trong `useCallback` với `isSubmitting`
  // trong deps) KHÔNG chặn được: hai cú click liên tiếp dùng cùng một closure của lần
  // render trước, cả hai đều đọc `isSubmitting === false`. Ref guard mới đọc giá trị
  // hiện tại nên chặn thật.
  const { submit: handleSend, isSubmitting } = useSubmitOnce(sendInvites)

  const renderPreview = () => {
    if (isPreviewPending) {
      return <FullScreenLoading className="h-['unset'] min-h-['unset'] flex-1" />
    }

    if (previewError) {
      return (
        <div className="text-content-dark-2 flex h-96 items-center justify-center">
          {previewError}
        </div>
      )
    }

    if (!preview?.html && !preview?.text) {
      return (
        <div className="text-content-dark-3 flex h-96 items-center justify-center">
          Không có nội dung email
        </div>
      )
    }

    if (preview?.html) {
      return (
        <iframe
          ref={iframeRef}
          className="w-full border-0"
          style={{
            display: 'block',
            width: '100%',
            minHeight: `${DEFAULT_PREVIEW_HEIGHT}px`,
            height: `${DEFAULT_PREVIEW_HEIGHT}px`,
            border: 'none',
            overflow: 'auto',
          }}
          sandbox="allow-same-origin"
          title="Preview email"
        />
      )
    }

    const textContent = preview?.text ?? ''
    return (
      <div className="typo-body-base-regular text-content-dark-1 max-h-[384px] overflow-y-auto p-4 whitespace-pre-line">
        {textContent}
      </div>
    )
  }

  if (candidatesError) {
    return (
      <div className="p-6">
        <div className="text-content-dark-2 flex items-center justify-center py-10">
          Không thể tải danh sách ứng viên
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onCancel}>
            Đóng
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <span className="typo-body-base-semibold text-content-dark-2">Gửi đến Ứng viên:</span>
        </div>
        <Table
          key={schedule.id}
          data={candidates}
          columns={columns}
          showActions={false}
          showSTT={false}
          enablePagination={false}
          enableSorting={false}
          enableRowSelection
          selectMode="multiple"
          onSelectionChange={handleSelectionChange}
          selectedRows={selectedCandidates}
          isLoading={isCandidatesLoading}
          emptyMessage="Không có ứng viên nào"
          className={'p-0'}
        />
      </div>

      <div className="flex items-center gap-3">
        <span className="typo-body-base-semibold text-content-dark-2">Bcc Người phỏng vấn:</span>
        <span className="typo-body-lg text-content-dark-2">{bccList || '-'}</span>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <span className="typo-body-base-semibold text-content-dark-2">Tiêu đề</span>
          <TextField
            value={subject}
            onChange={(value) => setSubject(value)}
            placeholder="Nhập tiêu đề email"
          />
        </div>

        <div className="flex flex-col gap-2">
          <span className="typo-body-base-semibold text-content-dark-2">Nội dung mẫu</span>
          <div
            className={cn(
              'border-border-1 bg-background-1 flex-1 overflow-hidden rounded border p-0'
            )}
          >
            {renderPreview()}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={onCancel} disabled={isSubmitting}>
          Huỷ
        </Button>
        <Button
          onClick={() => {
            void handleSend()
          }}
          disabled={!selectedCandidates.length || isSubmitting}
          loading={isSubmitting}
        >
          {isSubmitting ? 'Đang gửi...' : 'Gửi mail'}
        </Button>
      </div>
    </div>
  )
}
