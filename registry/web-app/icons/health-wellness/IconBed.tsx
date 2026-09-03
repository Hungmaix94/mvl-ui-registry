import { TIcon } from '@/types/common.ts'

function IconBed({ size = 24, color = 'currentColor', title = '', ...props }: TIcon) {
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
      <path d="M1.5 3.75C1.91421 3.75 2.25 4.08579 2.25 4.5V6.75H19.5C20.4946 6.75 21.4481 7.14537 22.1514 7.84863C22.8546 8.55189 23.25 9.50544 23.25 10.5V19.5C23.25 19.9142 22.9142 20.25 22.5 20.25C22.0858 20.25 21.75 19.9142 21.75 19.5V16.5H2.25V19.5C2.25 19.9142 1.91421 20.25 1.5 20.25C1.08579 20.25 0.75 19.9142 0.75 19.5V4.5C0.75 4.08579 1.08579 3.75 1.5 3.75ZM2.25 8.25V15H9V8.25H2.25ZM10.5 15H21.75V10.5C21.75 9.90326 21.5128 9.33114 21.0908 8.90918C20.6689 8.48722 20.0967 8.25 19.5 8.25H10.5V15Z" />
    </svg>
  )
}

export { IconBed }
