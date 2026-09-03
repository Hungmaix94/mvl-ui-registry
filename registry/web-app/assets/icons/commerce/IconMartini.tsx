import { TIcon } from '@/types/common.ts'

function IconMartini({ size = 24, color = 'currentColor', title = '', ...props }: TIcon) {
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
      <path d="M21.75 3C22.0533 3 22.3272 3.1827 22.4434 3.46289C22.5594 3.74313 22.4948 4.06579 22.2803 4.28027L12.75 13.8105V19.5H15.75C16.1642 19.5 16.5 19.8358 16.5 20.25C16.5 20.6642 16.1642 21 15.75 21H8.25C7.83593 20.9998 7.5 20.6641 7.5 20.25C7.5 19.8359 7.83593 19.5002 8.25 19.5H11.25V13.8105L1.71973 4.28027C1.5054 4.06582 1.44069 3.74303 1.55664 3.46289C1.67269 3.18273 1.94678 3.00013 2.25 3H21.75ZM7.06055 7.5L12 12.4395L16.9395 7.5H7.06055ZM5.56055 6H18.4395L19.9395 4.5H4.06055L5.56055 6Z" />
    </svg>
  )
}

export { IconMartini }
