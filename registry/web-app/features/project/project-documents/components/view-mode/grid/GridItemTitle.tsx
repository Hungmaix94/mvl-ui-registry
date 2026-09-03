import { cn } from '@/utils'

type GridItemTitleProps = {
  name: string
}

export default function GridItemTitle({ name }: GridItemTitleProps) {
  return (
    <div
      className={cn(
        'text-content-dark-1 typo-body-xs-regular text-center',
        'mx-auto line-clamp-2 max-w-[90px]',
        'mb-1'
      )}
      title={name}
    >
      {name}
    </div>
  )
}
