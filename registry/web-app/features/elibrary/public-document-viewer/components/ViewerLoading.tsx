import { Loading } from '@/components/Loading'

/** Loading căn giữa dùng trong khu vực nội dung của trình xem tài liệu. */
export function ViewerLoading({ message = 'Đang tải...' }: { message?: string }) {
  return (
    <div className="flex flex-1 items-center justify-center py-10">
      <Loading size="lg" message={message} />
    </div>
  )
}
