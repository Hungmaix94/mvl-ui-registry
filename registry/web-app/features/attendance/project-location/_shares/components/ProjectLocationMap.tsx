import { CommonMap, MarkerData } from '@/components/commons/map/CommonMap.tsx'
import { useMap } from '@/components/commons/map/useMap.tsx'
import { useCallback, useEffect, useMemo, useState } from 'react'

export type LocationChangeProps = {
  latitude: number
  longitude: number
  address?: string
}

export type MarkerCoordsProps = {
  latitude: number
  longitude: number
}

interface ProjectLocationMapProps {
  disable?: boolean
  latitude?: number
  longitude?: number
  radius?: number
  onLocationChange: ({ latitude, longitude, address }: LocationChangeProps) => void
}

export function ProjectLocationMap({
  disable,
  latitude,
  longitude,
  radius,
  onLocationChange,
}: ProjectLocationMapProps) {
  const [markerCoords, setMarkerCoords] = useState<MarkerCoordsProps | null>()

  const initialViewPort = useMemo(
    () => ({
      latitude: latitude || 21.020395207164682,
      longitude: longitude || 105.79145756912683,
      zoom: 15,
    }),
    [latitude, longitude]
  )
  const { viewport, onViewportChange, getGeoFromLatLong } = useMap(initialViewPort)

  useEffect(() => {
    if (latitude && longitude) {
      setMarkerCoords({
        latitude,
        longitude,
      })
      onViewportChange({
        latitude,
        longitude,
        zoom: 15,
      })
    }
  }, [latitude, longitude])

  const handleMapClick = useCallback(
    async (e: any) => {
      const newLng = e.lngLat?.[0]
      const newLat = e.lngLat?.[1]
      if (newLat && newLng) {
        onViewportChange((prev: any) => ({ ...prev, longitude: newLng, latitude: newLat }))
        setMarkerCoords({ latitude: newLat, longitude: newLng })

        const geoAddress = await getGeoFromLatLong(newLat, newLng)
        const address = geoAddress?.address as string
        onLocationChange({ longitude: newLng, latitude: newLat, ...(address ? { address } : {}) })
      }
    },
    [getGeoFromLatLong, onLocationChange]
  )
  const markers: MarkerData[] =
    markerCoords?.latitude && markerCoords?.longitude
      ? [
          {
            latitude: markerCoords.latitude,
            longitude: markerCoords.longitude,
            draggable: false,
            radius,
          },
        ]
      : []

  return (
    <CommonMap
      viewport={viewport}
      onViewportChange={onViewportChange}
      markers={markers}
      onClick={!disable ? handleMapClick : () => {}}
    />
  )
}
