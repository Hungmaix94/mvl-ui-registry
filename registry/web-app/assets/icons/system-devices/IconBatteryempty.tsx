import { TIcon } from '@/types/common.ts'

function IconBatteryempty({ size = 24, color = 'currentColor', title = '', ...props }: TIcon) {
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
      <path d="M18.75 4.5C19.9926 4.5 21 5.50736 21 6.75V17.25C21 18.4926 19.9926 19.5 18.75 19.5H4.5C3.25736 19.5 2.25 18.4926 2.25 17.25V6.75C2.25 5.50736 3.25736 4.5 4.5 4.5H18.75ZM4.5 6C4.08579 6 3.75 6.33579 3.75 6.75V17.25C3.75 17.6642 4.08579 18 4.5 18H18.75C19.1642 18 19.5 17.6642 19.5 17.25V6.75C19.5 6.33579 19.1642 6 18.75 6H4.5ZM23.25 8.25C23.6642 8.25 24 8.58579 24 9V15C24 15.4142 23.6642 15.75 23.25 15.75C22.8358 15.75 22.5 15.4142 22.5 15V9C22.5 8.58579 22.8358 8.25 23.25 8.25Z" />
    </svg>
  )
}

export { IconBatteryempty }
