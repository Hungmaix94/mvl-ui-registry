import { Chip } from '@/components/ui'
import { ColoredValueVariant } from '@/api/schema'

export function StepCard({
  stepNum,
  title,
  hint,
  noPadding,
  children,
}: {
  stepNum?: number
  title: string
  hint?: React.ReactNode
  noPadding?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="border-border-1 rounded-lg border bg-white">
      <div className="border-border-1 flex flex-col gap-1 border-b px-6 py-4">
        <div className="flex items-center gap-3">
          {stepNum && <Chip variant={ColoredValueVariant.RED as any} label={`Bước ${stepNum}`} />}
          <h3 className="font-semibold">{title}</h3>
        </div>
        {hint && <div className="text-sm break-words text-gray-500">{hint}</div>}
      </div>
      <div className="p-6" style={noPadding ? { padding: 0 } : undefined}>
        {children}
      </div>
    </div>
  )
}
