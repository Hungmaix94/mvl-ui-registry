import { Flex, Text } from '@radix-ui/themes'
import { cn } from '@/lib/utils'
import { ReactNode } from 'react'
import { Button } from '@/components/ui'

/** Ngưỡng cắt mặc định của badge — giữ đúng hành vi "99+" mà lưới HRM ở đầu trang đang có. */
const DEFAULT_MAX_COUNT = 99

type RealtimeButtonProps = {
  icon: ReactNode
  label: string
  count: number
  onClick?: () => void
  /**
   * Ngưỡng cắt của badge. Mặc định 99 ⇒ số lớn hơn hiện "99+".
   *
   * Truyền `null` để hiện số đầy đủ: badge bỏ bề rộng cố định và tự giãn theo số. Cần cho lưới
   * Sales, nơi "Dự án đang mở bán = 214" mà cắt thành "99+" là mất hẳn thông tin chứ không phải
   * rút gọn — người xem buộc phải bấm vào mới biết con số thật.
   */
  maxCount?: number | null
}

function RealtimeButton({ icon, label, count, onClick, maxCount }: RealtimeButtonProps) {
  const cap = maxCount === undefined ? DEFAULT_MAX_COUNT : maxCount
  const isCapped = cap !== null && count > cap

  return (
    <Flex
      direction="column"
      align="center"
      gap="1"
      className="group w-[120px] cursor-pointer"
      onClick={onClick}
    >
      <div className="relative">
        <Button
          className={cn(
            'flex',
            'rounded-full',
            'p-3',
            'text-action-primary-red-default',
            'bg-background-3',
            'hover:bg-background-3',
            'group-hover:text-red-70',
            'transition-colors',
            'items-center',
            'justify-center',
            'min-h-[50px] min-w-[50px]'
          )}
          iconOnly
          leftIcon={
            <div className={cn('h-6 w-6', 'flex', 'items-center', 'justify-center')}>{icon}</div>
          }
        />
        {/* Badge count */}
        {count > 0 && (
          <div
            data-testid="realtime-button-badge"
            className={cn(
              'absolute',
              '-top-2',
              '-right-2',
              'bg-data-blue-default',
              'text-white',
              'rounded-full',
              'h-[25px]',
              'flex',
              'items-center',
              'justify-center',
              'typo-body-sm-medium',
              // Nhánh mặc định giữ nguyên hộp 25px cố định của lưới HRM.
              //
              // Nhánh không cắt số phải tự giãn, nếu không "214" tràn ra ngoài viên pill. `px-1`
              // (không phải `px-1.5`): đệm rộng hơn làm badge hai chữ số phình lên ~27px trong khi
              // badge một chữ số vẫn 25px, và cả hàng tròn to nhỏ so le. Với `px-1` thì mọi số tới
              // hai chữ số đều dừng ở đúng 25px của `min-w`, chỉ số từ ba chữ số mới nở ra.
              cap === null ? 'min-w-[25px] px-1' : 'w-[25px] px-2 py-1'
            )}
          >
            {isCapped ? `${cap}+` : count}
          </div>
        )}
      </div>

      <Text
        className={cn(
          'text-content-dark-1',
          'group-hover:text-red-70',
          'text-center',
          'text-xs',
          'font-medium',
          'line-clamp-2',
          'max-w-[140px]',
          'transition-colors'
        )}
      >
        {label}
      </Text>
    </Flex>
  )
}

export default RealtimeButton
