import { TIcon } from '@/types/common.ts'

function IconCaretdown({ size = 24, color = 'currentColor', title = '', ...props }: TIcon) {
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
      <path d="M18.9697 8.46973C19.2626 8.17683 19.7374 8.17683 20.0303 8.46973C20.3231 8.76262 20.3231 9.2374 20.0303 9.53027L12.5303 17.0303C12.2374 17.3231 11.7626 17.3231 11.4697 17.0303L3.96973 9.53027C3.67683 9.23738 3.67683 8.76262 3.96973 8.46973C4.26262 8.17683 4.73738 8.17683 5.03027 8.46973L12 15.4395L18.9697 8.46973Z" />
    </svg>
  )
}

export { IconCaretdown }
