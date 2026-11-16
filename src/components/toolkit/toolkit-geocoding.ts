import type { Place } from './toolkit-types'

export async function searchPlacesOnline(
  query: string,
  centerLat = 21.0285,
  centerLon = 105.8542
): Promise<Place[]> {
  // 1. Primary: Photon OSM Geocoder (supports parks, POIs, streets, cafes, addresses in Vietnam)
  try {
    const photonUrl = new URL('https://photon.komoot.io/api/')
    photonUrl.search = new URLSearchParams({
      q: query,
      limit: '8',
      lat: String(centerLat),
      lon: String(centerLon),
    }).toString()

    const res = await fetch(photonUrl.toString())
    if (res.ok) {
      const resJson = await res.json()
      const features = (resJson.features ?? []) as Array<{
        properties: {
          name?: string
          street?: string
          housenumber?: string
          district?: string
          city?: string
          state?: string
          country?: string
          countrycode?: string
        }
        geometry: { coordinates: [number, number] }
      }>

      if (features.length > 0) {
        const sorted = [...features].sort((a, b) => {
          const aVN =
            a.properties.countrycode === 'VN' ||
            a.properties.country?.toLowerCase().includes('việt')
          const bVN =
            b.properties.countrycode === 'VN' ||
            b.properties.country?.toLowerCase().includes('việt')
          return (bVN ? 1 : 0) - (aVN ? 1 : 0)
        })

        return sorted.map((f) => {
          const p = f.properties
          const primary =
            p.name || p.street || [p.district, p.city].filter(Boolean).join(', ') || query
          const parts = [
            p.housenumber ? `${p.housenumber} ${p.street || ''}`.trim() : p.street,
            p.district,
            p.city,
            p.state,
            p.country,
          ].filter(Boolean) as string[]

          const subtitleParts = parts.filter((part) => part !== primary)
          const subtitle =
            subtitleParts.length > 0 ? subtitleParts.join(', ') : p.country || undefined

          return {
            name: primary,
            subtitle,
            latitude: Number(f.geometry.coordinates[1].toFixed(6)),
            longitude: Number(f.geometry.coordinates[0].toFixed(6)),
          }
        })
      }
    }
  } catch (err) {
    console.warn('Photon search error:', err)
  }

  // 2. Fallback: Open-Meteo Geocoding
  try {
    const meteoUrl = new URL('https://geocoding-api.open-meteo.com/v1/search')
    meteoUrl.search = new URLSearchParams({
      name: query,
      count: '6',
      language: 'vi',
      format: 'json',
    }).toString()

    const meteoRes = await fetch(meteoUrl.toString())
    if (meteoRes.ok) {
      const meteoData = await meteoRes.json()
      const meteoResults = (meteoData.results ?? []) as Array<{
        name: string
        admin1?: string
        country?: string
        latitude: number
        longitude: number
      }>

      if (meteoResults.length > 0) {
        return meteoResults.map((r) => ({
          name: r.name,
          subtitle: [r.admin1, r.country].filter(Boolean).join(', '),
          latitude: r.latitude,
          longitude: r.longitude,
        }))
      }
    }
  } catch (err) {
    console.warn('Open-Meteo geocoding error:', err)
  }

  return []
}
