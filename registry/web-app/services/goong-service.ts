import { getGoongApiKey, getGoongApiUrl } from '@/config/environment'
import { Suggestion } from '@/components/ui'

const GOONG_API_URL = getGoongApiUrl()

type GoongPrediction = {
  description: string
  place_id: string
}

type GoongAutocompleteResponse = {
  predictions: GoongPrediction[]
  status: string
}

export async function getAddressSuggestions(input: string): Promise<Suggestion[]> {
  if (!input) {
    return []
  }

  const apiKey = getGoongApiKey()
  if (!apiKey) {
    console.error('Goong API key is not configured.')
    return []
  }

  const url = new URL(`${GOONG_API_URL}/place/autocomplete`)
  url.searchParams.append('api_key', apiKey)
  url.searchParams.append('input', input)
  url.searchParams.append('limit', '5')
  url.searchParams.append('location', '21.0278,105.8342')

  try {
    const response = await fetch(url.toString())
    const data: GoongAutocompleteResponse = await response.json()
    if (data.status === 'OK') {
      return data.predictions.map((prediction) => ({
        label: prediction.description,
        value: prediction.place_id,
      }))
    } else {
      console.error('Goong API error:', data.status)
      return []
    }
  } catch (error) {
    console.error('Error fetching address suggestions:', error)
    return []
  }
}

type GoongPlaceDetailResponse = {
  result: {
    geometry: {
      location: {
        lat: number
        lng: number
      }
    }
    formatted_address: string
  }
  status: string
}

export async function getPlaceDetails(placeId: string) {
  const apiKey = getGoongApiKey()
  if (!apiKey) {
    console.error('Goong API key is not configured.')
    return null
  }

  const url = new URL(`${GOONG_API_URL}/place/detail`)
  url.searchParams.append('api_key', apiKey)
  url.searchParams.append('place_id', placeId)

  try {
    const response = await fetch(url.toString())
    const data: GoongPlaceDetailResponse = await response.json()

    if (data.status === 'OK') {
      return data.result
    } else {
      console.error('Goong API error:', data.status)
      return null
    }
  } catch (error) {
    console.error('Error fetching place details:', error)
    return null
  }
}

type LatLongResponse = {
  address: string
  latitude: number
  longitude: number
}

export async function getGeoFromLatLong(lat: number, lng: number): Promise<LatLongResponse | null> {
  const apiKey = getGoongApiKey()
  if (!apiKey) {
    console.error('Goong API key is not configured.')
    return null
  }

  try {
    const response = await fetch(`${GOONG_API_URL}/geocode?latlng=${lat},${lng}&api_key=${apiKey}`)
    const data = await response.json()
    if (data.results && data.results.length > 0) {
      return {
        address: data.results[0].formatted_address,
        latitude: data.results[0].geometry.location.lat,
        longitude: data.results[0].geometry.location.lng,
      }
    }
    return null
  } catch (error) {
    console.error('Error during geocoding:', error)
    return null
  }
}
