import { TIcon } from '@/types/common.ts'

function IconCaretleft({ size = 24, color = 'currentColor', title = '', ...props }: TIcon) {
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
      <path d="M14.4697 3.96973C14.7626 3.67683 15.2374 3.67683 15.5303 3.96973C15.8231 4.26262 15.8231 4.7374 15.5303 5.03027L8.56055 12L15.5303 18.9697C15.8231 19.2626 15.8231 19.7374 15.5303 20.0303C15.2374 20.3231 14.7626 20.3231 14.4697 20.0303L6.96973 12.5303C6.67683 12.2374 6.67683 11.7626 6.96973 11.4697L14.4697 3.96973Z" />
    </svg>
  )
}

export { IconCaretleft }
