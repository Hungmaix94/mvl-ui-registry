import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

type SeparatorHorizontalProps = {
  className?: string
}

const SeparatorHorizontal = ({ className }: SeparatorHorizontalProps) => {
  return <Separator orientation={'horizontal'} className={cn('!w-full', className)} />
}

export default SeparatorHorizontal
