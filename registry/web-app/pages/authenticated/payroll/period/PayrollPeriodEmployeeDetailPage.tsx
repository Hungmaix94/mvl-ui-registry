import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { PageTitle } from '@/components/ui'
import { APP_PATH } from '@/routes/AppRoute.constant'

import { Document, Page, pdfjs } from 'react-pdf'
import useMeasure from 'react-use-measure'

import {
  usePayrollSlips,
  useExportPayrollSlipDocument,
  usePayrollSlip,
  type PayrollSlip,
} from '@/features/payroll/services/payroll-slip-service'
import { Skeleton } from '@/components/ui/skeleton'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper.tsx'
import { isNotFoundError } from '@/utils/error-utils'
import { useAbility } from '@/lib/ability'

import 'react-pdf/dist/Page/TextLayer.css'
import 'react-pdf/dist/Page/AnnotationLayer.css'

// Configure PDF worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

const PayrollPeriodEmployeeDetailPage = () => {
  const { id, employeeId } = useParams<{ id: string; employeeId: string }>()
  const navigate = useNavigate()
  const ability = useAbility()
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [numPages, setNumPages] = useState<number>(0)

  const [ref, { width }] = useMeasure()

  // Fetch the slip ID
  const {
    data: slipsData,
    isLoading: isSlipLoading,
    error: slipsError,
  } = usePayrollSlips(
    {
      salary_period: Number(id),
      employee: Number(employeeId),
      page_size: 1,
    },
    { enabled: !!id && !!employeeId }
  )

  const slip = slipsData?.results?.[0]

  // Fetch detailed payslip data
  const { data: slipDetail, error: slipDetailError } = usePayrollSlip(slip?.id || 0, {
    enabled: !!slip?.id,
  })

  const displaySlip = (slipDetail || slip) as PayrollSlip | undefined

  const { mutate: exportDocument, isPending: isExporting } = useExportPayrollSlipDocument()

  // Determine if slip was not found (404 error or no data)
  const isNotFound = useMemo(() => {
    if (isSlipLoading) return false
    const error = slipsError || slipDetailError
    if (error && isNotFoundError(error)) return true
    // No slip found after loading completed
    return !isSlipLoading && slipsData && !slip
  }, [isSlipLoading, slipsError, slipDetailError, slipsData, slip])

  // Determine if there's a non-404 error
  const isError = useMemo(() => {
    if (isSlipLoading) return false
    const error = slipsError || slipDetailError
    if (!error) return false
    return !isNotFoundError(error)
  }, [isSlipLoading, slipsError, slipDetailError])

  useEffect(() => {
    if (slip?.id) {
      exportDocument(slip.id, {
        onSuccess: (blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob)
            setPdfUrl(url)
          }
        },
      })
    }

    return () => {
      // Revoke the object URL to free up memory
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl)
      }
    }
  }, [slip?.id, exportDocument])

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages)
  }

  const handleDownload = () => {
    if (pdfUrl) {
      const link = document.createElement('a')
      link.href = pdfUrl
      link.download = displaySlip?.code ? `Phieu_luong_${displaySlip.code}.pdf` : 'Phieu_luong.pdf'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const handleShowHistory = () => {
    if (id && displaySlip?.id) {
      navigate(
        APP_PATH.PAYROLL_PERIOD_PAYSLIP_HISTORY.replace(':periodId', String(id)).replace(
          ':id',
          String(displaySlip.id)
        )
      )
    }
  }

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <PageTitle
        title={
          displaySlip?.employee_name
            ? `Phiếu lương - ${displaySlip.employee_name}`
            : 'Chi tiết phiếu lương'
        }
        breadcrumb={[
          { label: 'Tính lương', href: '/payroll' },
          { label: 'Kỳ lương', href: `/payroll/period` },
          { label: displaySlip?.code || 'Chi tiết', isCurrentPage: true },
        ]}
        handleExportBtnIcon={handleDownload}
        titleExportBtnIcon="Tải xuống"
        handleShowHistory={handleShowHistory}
        enableBackButton
      />

      {/* `hasPermission` ứng mã `payroll_slip.retrieve` — đúng mã route đang chặn.
          `parsePermissionCode` cắt ở dấu chấm cuối nên subject là `payroll_slip`. */}
      <DetailPageWrapper
        isLoading={isSlipLoading}
        isNotFound={isNotFound}
        isError={isError}
        hasPermission={ability.can('retrieve', 'payroll_slip')}
      >
        {slip && (
          <div className="flex min-h-[500px] flex-1 flex-col items-center gap-4 rounded-lg bg-gray-100 px-24 py-4">
            {isExporting ? (
              <div className="flex h-full flex-col items-center justify-center gap-2">
                <Skeleton className="h-[500px] w-[400px]" />
                <p>Đang tải phiếu lương...</p>
              </div>
            ) : pdfUrl ? (
              <div className="flex w-full flex-col items-center" ref={ref}>
                <div className="w-full">
                  <Document
                    file={pdfUrl}
                    onLoadSuccess={onDocumentLoadSuccess}
                    loading={
                      <div className="flex h-[600px] w-full items-center justify-center">
                        <Skeleton className="h-full w-full" />
                      </div>
                    }
                    scale={0.6}
                    error={
                      <div className="p-10 text-center text-red-500">
                        Không thể tải PDF. Vui lòng thử lại.
                      </div>
                    }
                    className="flex flex-col items-center gap-4"
                  >
                    {Array.from(new Array(numPages), (_el, index) => (
                      <div key={`page_${index + 1}`} className="overflow-hidden bg-white shadow-sm">
                        <Page
                          pageNumber={index + 1}
                          width={width ? width : undefined}
                          renderTextLayer={false}
                          renderAnnotationLayer={false}
                        />
                      </div>
                    ))}
                  </Document>
                </div>
              </div>
            ) : (
              <div className="text-muted-foreground flex h-full items-center justify-center">
                Đang tải phiếu lương...
              </div>
            )}
          </div>
        )}
      </DetailPageWrapper>
    </div>
  )
}

export default PayrollPeriodEmployeeDetailPage
