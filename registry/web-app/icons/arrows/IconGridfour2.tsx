import { TIcon } from '@/types/common.ts'

function IconGridfour2({ size = 24, color = 'currentColor', title = '', ...props }: TIcon) {
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
      <path d="M19.125 3.375C19.5227 3.37545 19.9043 3.53325 20.1855 3.81445C20.4668 4.09566 20.6245 4.47731 20.625 4.875V19.125C20.6245 19.5227 20.4668 19.9043 20.1855 20.1855C19.9043 20.4668 19.5227 20.6245 19.125 20.625H4.875C4.47731 20.6245 4.09566 20.4668 3.81445 20.1855C3.53325 19.9043 3.37545 19.5227 3.375 19.125V4.875C3.37545 4.47731 3.53325 4.09566 3.81445 3.81445C4.09566 3.53325 4.47731 3.37545 4.875 3.375H19.125ZM4.875 12V19.125H12V12H4.875ZM12 4.875V12H19.125V4.875H12Z" />
    </svg>
  )
}

export { IconGridfour2 }
