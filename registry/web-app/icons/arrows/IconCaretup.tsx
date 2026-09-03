import { TIcon } from '@/types/common.ts'

function IconCaretup({ size = 24, color = 'currentColor', title = '', ...props }: TIcon) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {title && <title>{title}</title>}
      <path d="M11.5264 6.91797C11.8209 6.67775 12.2557 6.69518 12.5303 6.96973L20.0303 14.4697C20.3231 14.7626 20.3231 15.2374 20.0303 15.5303C19.7374 15.8232 19.2626 15.8232 18.9697 15.5303L12 8.56055L5.03027 15.5303C4.73738 15.8232 4.26262 15.8232 3.96973 15.5303C3.67686 15.2374 3.67684 14.7626 3.96973 14.4697L11.4697 6.96973L11.5264 6.91797Z" />
    </svg>
  )
}

export { IconCaretup }
