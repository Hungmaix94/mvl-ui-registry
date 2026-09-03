import { useCallback, useEffect, useRef, useState } from 'react'

import { Button, Loading } from '@/components/ui'
import { useDialog } from '@/hooks/useDialog.ts'
import { parseCsvContent, parseAttendanceExemptionCsvContent } from '@/utils/import.ts'
import toastService from '@/services/toast-service.tsx'
import { extractErrorMessage } from '@/utils/error-utils'

import type { components } from '@/api/schema.ts'
import type { EmployeeImportResult } from '@/types/hrm-import.ts'
import type { ImportJob } from '@/services/export-service.ts'
import type { DialogConfig } from '@/types'
import EmployeeImportResultContent from '@/features/employee/management/_shares/components/EmployeeImportResultContent.tsx'

type ResultFiles = components['schemas']['ResultFiles']
type ResultFileInfo = components['schemas']['ResultFileInfo']

type ResultDialogResolver = {
  resolve: () => void
  reject: (error: Error) => void
}

export type ImportResultDialogOptions = {
  csvFormat?: 'standard' | 'attendance_exemption'
}

export function useEmployeeImportResultDialog() {
  const { displayCustom, displayClose, updateConfig } = useDialog()
  const [isOpen, setIsOpen] = useState(false)
  const [result, setResult] = useState<EmployeeImportResult | null>(null)
  const [activeTab, setActiveTab] = useState<'success' | 'failure'>('failure')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const resolverRef = useRef<ResultDialogResolver | null>(null)
  const jobRef = useRef<ImportJob | null>(null)
  const optionsRef = useRef<ImportResultDialogOptions | null>(null)
  const hasDisplayedRef = useRef(false)

  const parseCsv = useCallback((raw: string) => {
    if (optionsRef.current?.csvFormat === 'attendance_exemption') {
      return parseAttendanceExemptionCsvContent(raw)
    }
    return parseCsvContent(raw)
  }, [])

  const loadResultFiles = useCallback(
    async (rawFiles: ResultFiles | string | null | undefined) => {
      const files = parseResultFiles(rawFiles)

      if (!files) {
        return {
          data: {
            success: { headers: [], rows: [] },
            failure: { headers: [], rows: [] },
            successRaw: '',
            failureRaw: '',
          },
          defaultTab: 'success' as const,
        }
      }

      const [successRaw, failureRaw] = await Promise.all([
        fetchResultFile(files.success_file),
        fetchResultFile(files.failed_file),
      ])

      const parsedResult: EmployeeImportResult = {
        successRaw: successRaw ?? '',
        failureRaw: failureRaw ?? '',
        success: successRaw ? parseCsv(successRaw) : { headers: [], rows: [] },
        failure: failureRaw ? parseCsv(failureRaw) : { headers: [], rows: [] },
      }

      const defaultTab =
        parsedResult.failure && parsedResult.failure.rows.length > 0 ? 'failure' : 'success'

      return { data: parsedResult, defaultTab }
    },
    [parseCsv]
  )

  const handleClose = useCallback(() => {
    setIsOpen(false)
    resolverRef.current?.resolve()
    resolverRef.current = null
    jobRef.current = null
    setResult(null)
    setIsLoading(false)
    setActiveTab('failure')
    setErrorMessage(null)
    hasDisplayedRef.current = false
  }, [])

  const createConfig = useCallback((): DialogConfig => {
    return {
      title: 'Kết quả nhập dữ liệu',
      content: result ? (
        <EmployeeImportResultContent
          result={result}
          activeTab={activeTab}
          onTabChange={(value) => setActiveTab(value)}
          onCopyFailure={() => {
            if (!result.failureRaw) {
              toastService.warning('Không có dữ liệu thất bại để sao chép')
              return
            }
            navigator.clipboard
              .writeText(result.failureRaw)
              .then(() => toastService.success('Đã sao chép danh sách thất bại'))
              .catch(() => toastService.error('Không thể sao chép danh sách thất bại'))
          }}
          isLoading={isLoading}
          errorMessage={errorMessage}
        />
      ) : (
        <div className="flex justify-center py-10">
          <Loading variant="spinner" size="lg" />
        </div>
      ),
      hideFooter: false,
      footer: (
        <div className="border-border-1 flex w-full justify-end border border-t-[1px] px-6 py-3">
          <Button variant="secondary" className="w-[120px]" onClick={() => displayClose()}>
            Đóng
          </Button>
        </div>
      ),
      disableBackdropClose: false,
      onClose: handleClose,
      size: 'full',
    }
  }, [activeTab, displayClose, errorMessage, handleClose, isLoading, result])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    displayCustom(createConfig())
    hasDisplayedRef.current = true

    return () => {
      hasDisplayedRef.current = false
    }
  }, [createConfig, displayCustom, isOpen])

  useEffect(() => {
    if (!isOpen || !hasDisplayedRef.current) {
      return
    }

    updateConfig(createConfig())
  }, [createConfig, isOpen, updateConfig])

  useEffect(() => {
    if (!isOpen || !jobRef.current) {
      return
    }

    let cancelled = false

    const fetchResults = async () => {
      setIsLoading(true)
      try {
        const { data, defaultTab } = await loadResultFiles(jobRef.current?.result_files)
        if (cancelled) {
          return
        }
        setResult(data)
        setActiveTab(defaultTab as 'success' | 'failure')
      } catch (error) {
        console.error('Error fetching import result files:', error)
        const message = extractErrorMessage(error, 'Không thể tải kết quả nhập dữ liệu')
        toastService.error(message)
        setResult({
          success: { headers: [], rows: [] },
          failure: { headers: [], rows: [] },
          successRaw: '',
          failureRaw: '',
        })
        setActiveTab('success')
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void fetchResults()

    return () => {
      cancelled = true
    }
  }, [isOpen, loadResultFiles])

  const openResultDialog = useCallback((job: ImportJob, options?: ImportResultDialogOptions) => {
    return new Promise<void>((resolve, reject) => {
      resolverRef.current = { resolve, reject }
      jobRef.current = job
      optionsRef.current = options ?? null
      setResult(null)
      setActiveTab('failure')
      setIsLoading(false)
      setErrorMessage(job.error_message ?? null)
      setIsOpen(true)
    })
  }, [])

  return { openResultDialog }
}

async function fetchResultFile(fileInfo?: ResultFileInfo | null) {
  if (!fileInfo?.url) {
    return null
  }

  const response = await fetch(fileInfo.url)
  if (!response.ok) {
    throw new Error('Không thể tải tệp kết quả')
  }

  return await response.text()
}

function parseResultFiles(raw: ResultFiles | string | null | undefined) {
  if (!raw) {
    return null
  }

  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as ResultFiles
    } catch (e) {
      console.error('Error parsing result files JSON:', e)
      return null
    }
  }

  return raw
}
