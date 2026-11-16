export type Point = { lat: number; lon: number }

export interface Place {
  name: string
  subtitle?: string
  latitude: number
  longitude: number
}

export const money = (value: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value)

export function distanceKm(a: Point, b: Point) {
  const rad = (x: number) => (x * Math.PI) / 180
  const dLat = rad(a.lat - b.lat)
  const dLon = rad(a.lon - b.lon)
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
}
