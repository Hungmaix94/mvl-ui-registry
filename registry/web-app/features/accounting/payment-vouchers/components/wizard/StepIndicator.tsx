export const STEPS = [
  { n: 1, title: 'Tạo phiếu chi', sub: 'Nhập thông tin chi tiền' },
  { n: 2, title: 'Chọn hóa đơn & Đính kèm', sub: 'Cấn trừ, phân bổ & tải lên' },
]

export function StepIndicator({
  current,
  onStepClick,
}: {
  current: number
  onStepClick: (n: number) => void
}) {
  return (
    <div className="border-border-1 flex items-stretch gap-1 rounded-md border bg-white p-1.5">
      {STEPS.map((step, idx) => {
        const isActive = step.n === current
        const isDone = step.n < current
        return (
          <div
            key={step.n}
            className={`relative flex min-w-0 flex-1 items-center gap-3 rounded px-4 py-3 transition-colors ${isActive ? 'bg-red-10' : 'cursor-pointer hover:bg-gray-50'} `}
            onClick={() => !isActive && onStepClick(step.n)}
          >
            {idx > 0 && (
              <div className="border-l-border-1 absolute top-1/2 -left-0.5 h-0 w-0 -translate-y-1/2 border-y-[6px] border-l-[6px] border-solid border-y-transparent" />
            )}
            <div
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${isActive ? 'bg-red-600 text-white' : isDone ? 'bg-red-10 text-red-600' : 'bg-gray-100 text-gray-500'} `}
            >
              {isDone ? '✓' : step.n}
            </div>
            <div className="flex min-w-0 flex-col leading-tight">
              <span
                className={`truncate text-[13px] font-semibold ${isActive ? 'text-red-600' : 'text-gray-900'}`}
              >
                {step.title}
              </span>
              <span className="mt-0.5 truncate text-[12px] text-gray-500">{step.sub}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
