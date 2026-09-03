import { TIcon } from '@/types/common.ts'

function IconCaretright({ size = 24, color = 'currentColor', title = '', ...props }: TIcon) {
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
      <path d="M8.46973 3.96973C8.76262 3.67683 9.23738 3.67683 9.53027 3.96973L17.0303 11.4697C17.3231 11.7626 17.3231 12.2374 17.0303 12.5303L9.53027 20.0303C9.2374 20.3231 8.76262 20.3231 8.46973 20.0303C8.17683 19.7374 8.17683 19.2626 8.46973 18.9697L15.4395 12L8.46973 5.03027C8.17683 4.73738 8.17683 4.26262 8.46973 3.96973Z" />
    </svg>
  )
}

export { IconCaretright }
