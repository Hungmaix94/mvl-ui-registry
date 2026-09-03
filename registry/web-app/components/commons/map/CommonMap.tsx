import { Fragment, useCallback, ReactNode } from 'react'
import GoongMap, {
  Layer,
  Marker,
  NavigationControl,
  Source,
  ViewportProps,
} from '@goongmaps/goong-map-react'
import { getGoongMapsApiKey } from '@/config/environment.ts'
import pinUrl from '@/components/commons/map/Pin.svg'
import { Feature } from 'geojson'

const createGeoJSONCircle = (
  center: [number, number],
  radiusInMeters: number,
  points = 64
): Feature => {
  const coords = {
    latitude: center[1],
    longitude: center[0],
  }

  const km = radiusInMeters / 1000

  const ret = []
  const distanceX = km / (111.32 * Math.cos((coords.latitude * Math.PI) / 180))
  const distanceY = km / 110.574

  for (let i = 0; i < points; i++) {
    const angle = (i / points) * (2 * Math.PI)
    const dx = distanceX * Math.cos(angle)
    const dy = distanceY * Math.sin(angle)
    ret.push([coords.longitude + dx, coords.latitude + dy])
  }
  ret.push(ret[0]) // Close the circle

  return {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [ret],
    },
    properties: {}, // Add an empty properties object
  }
}

export interface MarkerData {
  latitude: number
  longitude: number
  element?: ReactNode
  offsetLeft?: number
  offsetTop?: number
  draggable?: boolean
  onDragEnd?: (e: any) => void
  radius?: number
}

interface CommonMapProps {
  viewport: Partial<ViewportProps>
  onViewportChange: (viewport: Partial<ViewportProps>) => void
  markers?: MarkerData[]
  onClick?: (e: any) => void
  children?: ReactNode
  containerClassName?: string
}

export function CommonMap({
  viewport,
  onViewportChange,
  markers,
  onClick,
  children,
  containerClassName = 'h-[450px] w-full',
}: CommonMapProps) {
  const GOONG_MAPS_API_KEY = getGoongMapsApiKey()

  const handleZoom = useCallback(
    (event: any) => {
      event.preventDefault()
      const newZoom = event.deltaY < 0 ? (viewport.zoom || 1) * 1.5 : (viewport.zoom || 1) / 1.5
      onViewportChange({ ...viewport, zoom: newZoom })
    },
    [viewport, onViewportChange]
  )

  return (
    <div className={containerClassName}>
      <GoongMap
        {...viewport}
        mapStyle="https://tiles.goong.io/assets/goong_map_web.json"
        onViewportChange={onViewportChange}
        goongApiAccessToken={GOONG_MAPS_API_KEY}
        reuseMaps={true}
        transitionDuration={500}
        transitionEasing={(t: any) => t * (2 - t)}
        width="100%"
        height="100%"
        onClick={onClick}
        onWheel={handleZoom}
        doubleClickZoom={true}
      >
        <NavigationControl style={{ right: 10, bottom: 10 }} />
        {markers?.map((marker, index) => (
          <Fragment key={index}>
            {marker.radius && (
              <Source
                id={`circle-data-${index}`}
                type="geojson"
                data={createGeoJSONCircle(
                  [marker.longitude, marker.latitude],
                  marker.radius ?? 100
                )}
              >
                <Layer
                  id={`circle-layer-${index}`}
                  type="fill"
                  paint={{
                    'fill-color': '#AF2323',
                    'fill-opacity': 0.15,
                  }}
                />
              </Source>
            )}
            <Marker
              key={index}
              latitude={marker.latitude}
              longitude={marker.longitude}
              offsetLeft={marker?.offsetLeft || -10}
              offsetTop={marker?.offsetTop || -28}
              draggable={marker.draggable ?? false}
              onDragEnd={marker?.onDragEnd}
            >
              {marker?.element ?? (
                <div>
                  <img src={pinUrl} alt={'marker'} />
                </div>
              )}
            </Marker>
          </Fragment>
        ))}
        {children}
      </GoongMap>
    </div>
  )
}
