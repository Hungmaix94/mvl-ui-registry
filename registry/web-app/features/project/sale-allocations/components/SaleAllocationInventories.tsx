import { FC, useCallback, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import AppDialog from '@/components/dialog/AppDialog.tsx'
import { parsePositiveInt } from '@/utils/common'
import { resolvePageSize } from '@/utils/table/pagination'
import ProductInventoryTable from '@/pages/authenticated/project/product-inventories/components/ProductInventoryTable'
import {
  useDeleteSalesAllocationProductInventory,
  useSalesAllocationProductInventories,
} from '@/services/realestate-service'

interface SaleAllocationInventoriesProps {
  saleAllocationId: number
}

/** Chỉ những field cần cho luồng xoá — bảng vẫn nhận record đầy đủ từ API. */
type DeletableInventory = {
  id: number
  unit_number?: string | null
  code?: string | null
}

const SaleAllocationInventories: FC<SaleAllocationInventoriesProps> = ({ saleAllocationId }) => {
  const [searchParams, setSearchParams] = useSearchParams()
  // `parsePositiveInt` loại luôn `page=0` và rác (`?page=abc`) về `undefined` → rơi về trang 1.
  // Cần thiết vì URL cũ đã phát tán kèm `page=0`, mà API trả 404 "Invalid page." cho giá trị đó.
  const page = parsePositiveInt(searchParams.get('page')) ?? 1
  // `resolvePageSize` là chuẩn của repo cho `page_size` (docs/ai/conventions.md §6): giá trị ngoài
  // `PAGE_SIZES` (`?page_size=99999`) phải rơi về mặc định, không thì dropdown phân trang hiện ô trống.
  const pageSize = resolvePageSize(searchParams.get('page_size'))

  const { data, isLoading } = useSalesAllocationProductInventories(saleAllocationId, {
    page,
    page_size: pageSize,
  })

  const [deleteTarget, setDeleteTarget] = useState<DeletableInventory | null>(null)
  const deleteMutation = useDeleteSalesAllocationProductInventory()

  const handleRequestDelete = useCallback((record: DeletableInventory) => {
    setDeleteTarget(record)
  }, [])

  const handleCancelDelete = useCallback(() => {
    setDeleteTarget(null)
  }, [])

  // `AppDialog` tự đóng khi `onConfirm` không throw, mà `mutate()` không throw — nên dialog đóng
  // ngay lúc bấm, không chờ API. Lỗi 400 của BE (căn còn chứng từ tham chiếu) vẫn tới người dùng
  // qua toast vì `BaseApiService.delete` mặc định `showErrorToast ?? true`. `onSuccess` dưới đây
  // để reset bản ghi đang chọn, không phải để đóng dialog.
  const handleConfirmDelete = useCallback(() => {
    if (!deleteTarget) return
    deleteMutation.mutate(
      { saPk: saleAllocationId, id: deleteTarget.id },
      { onSuccess: () => setDeleteTarget(null) }
    )
  }, [deleteTarget, deleteMutation, saleAllocationId])

  // Nhắc đúng mã người dùng đang nhìn thấy ở cột "Mã bất động sản" (unit_number, fallback code).
  const deleteTargetLabel = deleteTarget?.unit_number || deleteTarget?.code || ''

  return (
    <>
      <ProductInventoryTable
        data={data?.results || []}
        isLoading={isLoading}
        pageCount={data?.count ? Math.ceil(data.count / pageSize) : 1}
        currentPage={page}
        pageSize={pageSize}
        totalRecords={data?.count || 0}
        // `useTable` phát ra `pageIndex` 0-based, còn `page` trên URL/API là 1-based — thiếu `+ 1`
        // thì bấm về trang đầu ghi `page=0` và API trả 404 "Invalid page.".
        onPaginationChange={(pageIndex, newPageSize) => {
          setSearchParams((prev) => {
            // Dựng bản sao thay vì `prev.set(...)`: cùng cách màn "DS căn" toàn dự án đang làm
            // (`ProjectProductInventoryPage`), và không sửa tại chỗ object router đang giữ.
            const newParams = new URLSearchParams(prev)
            newParams.set('page', String(pageIndex + 1))
            if (newPageSize) {
              newParams.set('page_size', String(newPageSize))
            }
            return newParams
          })
        }}
        onDelete={handleRequestDelete}
        showUnitNumberEyeIcon={true}
        // Giữ `pb-16` mặc định của `Table`: khối phân trang `fixed bottom-0` (54px) đè lên nội
        // dung, `pb-0` ở đây từng làm dòng cuối bị che 32px. Chừa nằm ngoài khung viền của bảng
        // nên không tạo dòng rỗng thừa. Chỉ bỏ padding ngang vì wrapper trang đã có `px-7`.
        className="px-0"
      />

      <AppDialog
        variant="alert"
        title="Xóa Bất động sản"
        titleDescription={`Bạn có chắc chắn muốn xóa Bất động sản ${deleteTargetLabel}? Hành động này không thể hoàn tác.`}
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        onCancel={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        loading={deleteMutation.isPending}
        content={null}
      />
    </>
  )
}

export default SaleAllocationInventories
