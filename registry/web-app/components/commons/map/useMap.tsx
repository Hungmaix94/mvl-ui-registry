import { useCallback, useState } from 'react'
import { getGeoFromLatLong } from '@/services/goong-service'

type ViewPortProps = {
  longitude?: number
  latitude?: number
  zoom?: number
  bearing?: number
  pitch?: number
}

export function useMap(initialViewPort: ViewPortProps) {
  const [viewport, setViewport] = useState<ViewPortProps>(initialViewPort)

  const onViewportChange = useCallback((viewport: any) => setViewport(viewport), [setViewport])
  return {
    viewport,
    onViewportChange,
    getGeoFromLatLong,
  }
}
