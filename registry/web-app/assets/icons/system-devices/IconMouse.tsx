import { TIcon } from '@/types/common.ts'

function IconMouse({ size = 24, color = 'currentColor', title = '', ...props }: TIcon) {
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
      <path d="M13.875 2.25C17.1887 2.25 19.875 4.93629 19.875 8.25V15.75C19.875 19.0637 17.1887 21.75 13.875 21.75H10.125C6.81129 21.75 4.125 19.0637 4.125 15.75V8.25C4.125 4.93629 6.81129 2.25 10.125 2.25H13.875ZM5.625 15.75C5.625 18.2353 7.63972 20.25 10.125 20.25H13.875C16.3603 20.25 18.375 18.2353 18.375 15.75V11.25H5.625V15.75ZM12.75 9.75H18.375V8.25C18.375 5.76472 16.3603 3.75 13.875 3.75H12.75V9.75ZM10.125 3.75C7.63972 3.75 5.625 5.76472 5.625 8.25V9.75H11.25V3.75H10.125Z" />
    </svg>
  )
}

export { IconMouse }
