import { TIcon } from '@/types/common.ts'

function IconDevicemobile({ size = 24, color = 'currentColor', title = '', ...props }: TIcon) {
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
      <path d="M16.5 1.5C17.7426 1.5 18.75 2.50736 18.75 3.75V20.25C18.75 21.4926 17.7426 22.5 16.5 22.5H7.5C6.25736 22.5 5.25 21.4926 5.25 20.25V3.75C5.25 2.50736 6.25736 1.5 7.5 1.5H16.5ZM6.75 19.5V20.25C6.75 20.6642 7.08579 21 7.5 21H16.5C16.9142 21 17.25 20.6642 17.25 20.25V19.5H6.75ZM6.75 18H17.25V6H6.75V18ZM7.5 3C7.08579 3 6.75 3.33579 6.75 3.75V4.5H17.25V3.75C17.25 3.33579 16.9142 3 16.5 3H7.5Z" />
    </svg>
  )
}

export { IconDevicemobile }
