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
      <div className="border-border-1 flex flex-row items-center gap-3 border-b px-6 py-4">
        {stepNum && <Chip variant={ColoredValueVariant.RED as any} label={`Bước ${stepNum}`} />}
        <div className="flex min-w-0 flex-1 items-center justify-between">
          <h3 className="font-semibold">{title}</h3>
          {hint && <div className="right text-sm text-gray-500">{hint}</div>}
        </div>
      </div>
      <div className="p-6" style={noPadding ? { padding: 0 } : undefined}>
        {children}
      </div>
    </div>
  )
}
