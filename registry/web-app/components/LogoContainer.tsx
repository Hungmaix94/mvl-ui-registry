import loginBackground from '@/assets/images/Login background.png'
import { ReactNode } from 'react'

export default function LogoContainer(props: { children: ReactNode }) {
  return (
    <div
      className="h-screen w-full overflow-auto bg-size-[255.87%_136.66%] bg-[45.52%_15.33%] bg-no-repeat md:bg-size-[255.87%_136.66%]"
      data-name="Logo Container"
      data-node-id="2220:20962"
      style={{
        backgroundImage: `url('${loginBackground}')`,
        backgroundSize: 'cover',
      }}
    >
      {props.children}
    </div>
  )
}
