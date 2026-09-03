import { useCallback, useRef } from 'react'

import { useAsyncImportProgressDialog } from '@/hooks/useAsyncImportProgressDialog'
import { useReconLinesImportUploadDialog } from './useReconLinesImportUploadDialog'
import { useReconLinesImportResultDialog } from './useReconLinesImportResultDialog'

/** Huỷ ở bước chọn tệp: chưa có gì được ghi ⇒ không cần làm mới danh sách. */
const UPLOAD_CANCELLED = 'upload_dialog_cancelled'

/**
 * Luồng "Nhập Excel" danh sách căn cho phiếu đối chiếu CĐT 2.0:
 * chọn tệp → theo dõi tiến trình → xem kết quả → làm mới danh sách căn.
 *
 * Dialog tiến trình dùng hook chung `useAsyncImportProgressDialog`.
 */
export function useReconLinesImport(sheetId: number, onImported: () => void) {
  const { openUploadDialog } = useReconLinesImportUploadDialog(sheetId)
  const { openProgressDialog } = useAsyncImportProgressDialog({
    title: 'Đang nhập danh sách căn',
  })
  const { openResultDialog } = useReconLinesImportResultDialog()

  // Bấm nút hai lần sẽ ghi đè resolver của dialog upload, bỏ rơi promise đầu
  // (chuỗi await treo vĩnh viễn) — chặn ngay ở đây.
  const isRunningRef = useRef(false)

  const openImportDialog = useCallback(async () => {
    if (isRunningRef.current) {
      return
    }
    isRunningRef.current = true

    try {
      const jobId = await openUploadDialog()
      const finalJob = await openProgressDialog(jobId)
      await openResultDialog(finalJob)
      onImported()
    } catch (error) {
      const message = error instanceof Error ? error.message : ''

      if (message === UPLOAD_CANCELLED) {
        return
      }

      if (message.endsWith('_cancelled')) {
        // Huỷ khi job đã chạy: BE ghi theo từng dòng (partial success) nên các
        // căn đã nhập vẫn còn — phải làm mới để hiển thị đúng.
        onImported()
        return
      }

      console.error('Investor reconciliation lines import failed:', error)
    } finally {
      isRunningRef.current = false
    }
  }, [onImported, openProgressDialog, openResultDialog, openUploadDialog])

  return { openImportDialog }
}
