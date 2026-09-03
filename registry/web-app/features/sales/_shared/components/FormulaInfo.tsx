import { Popover, PopoverContentPrimitive, PopoverTrigger } from '@/components/ui/popover'
import { IconInfo } from '@/assets/icons/security-warnings/IconInfo'

type FormulaInfoProps = {
  formula: string
  size?: number
}

function FormulaInfo({ formula, size = 16 }: FormulaInfoProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="text-content-dark-3 hover:text-content-dark-1 ml-1 inline-flex cursor-pointer align-middle"
          onClick={(e) => e.stopPropagation()}
        >
          <IconInfo size={size} />
        </button>
      </PopoverTrigger>
      <PopoverContentPrimitive
        className="bg-content-light-1 w-auto max-w-fit"
        side="top"
        sideOffset={20}
      >
        <p className="typo-body-sm-regular text-content-dark-2 whitespace-pre-line">{formula}</p>
      </PopoverContentPrimitive>
    </Popover>
  )
}

export default FormulaInfo
