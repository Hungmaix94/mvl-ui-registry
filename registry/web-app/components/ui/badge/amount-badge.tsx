import { cn } from '@/utils'

const AmountBadge = ({ amount }: { amount: number }) => {
  return (
    <>
      <div
        className={cn(
          'flex items-center justify-center',
          'h-[18px] w-[18px]',
          'bg-action-primary-red-focus',
          'text-content-light-1',
          'typo-body-xs',
          'rounded-full'
        )}
      >
        {amount}
      </div>
    </>
  )
}

export default AmountBadge
