import { TIcon } from '@/types/common.ts'

function IconListcheck({ size = 24, color = 'currentColor', title = '', ...props }: TIcon) {
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
      <path d="M10.707 16.207L6 20.9141L2.79297 17.707L4.20703 16.293L6 18.0859L9.29297 14.793L10.707 16.207ZM21 20H13V18H21V20ZM21 13H13V11H21V13ZM10 4V11H3V4H10ZM5 6V9H8V6H5ZM21 6H13V4H21V6Z" />
    </svg>
  )
}

export { IconListcheck }
