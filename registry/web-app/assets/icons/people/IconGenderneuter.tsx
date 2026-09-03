import { TIcon } from '@/types/common.ts'

function IconGenderneuter({ size = 24, color = 'currentColor', title = '', ...props }: TIcon) {
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
      <path d="M12 2.25C16.1421 2.25 19.5 5.60786 19.5 9.75C19.5 13.639 16.5399 16.8356 12.75 17.2119V21.75C12.75 22.1642 12.4142 22.5 12 22.5C11.5858 22.5 11.25 22.1642 11.25 21.75V17.2119C7.46006 16.8356 4.5 13.639 4.5 9.75C4.5 5.60786 7.85786 2.25 12 2.25ZM12 3.75C8.68629 3.75 6 6.43629 6 9.75C6 13.0637 8.68629 15.75 12 15.75C15.3137 15.75 18 13.0637 18 9.75C18 6.43629 15.3137 3.75 12 3.75Z" />
    </svg>
  )
}

export { IconGenderneuter }
