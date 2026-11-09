import { useEffect, useRef, useState } from 'react'
import { Map as MapLibreMap, Marker, NavigationControl, type MapMouseEvent } from 'maplibre-gl'
import { setWorkerUrl } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { Point } from './RoomToolkit'

setWorkerUrl(workerUrl)

interface LocationMapProps {
  location: Point | null
  meetup: Point | null
  mode: 'event' | 'meetup'
  onSelect: (point: Point) => void
}

export function LocationMap({ location, meetup, mode, onSelect }: LocationMapProps) {
  const host = useRef<HTMLDivElement>(null)
  const map = useRef<MapLibreMap | null>(null)
  const marker = useRef<Marker | null>(null)
  const selectRef = useRef(onSelect)
  const [mapReady, setMapReady] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    selectRef.current = onSelect
  }, [onSelect])

  const activePoint = mode === 'event' ? location : meetup

  useEffect(() => {
    if (!host.current || map.current) return

    let isCancelled = false
    try {
      const initialPoint = mode === 'event' ? location : meetup
      const instance = new MapLibreMap({
        container: host.current,
        style: 'https://tiles.openfreemap.org/styles/bright',
        center: [initialPoint?.lon ?? 105.8342, initialPoint?.lat ?? 21.0278],
        zoom: initialPoint ? 13 : 6,
        attributionControl: false,
      })

      instance.addControl(new NavigationControl({ showCompass: true }), 'top-right')

      instance.on('load', () => {
        if (isCancelled) return
        setMapReady(true)
        instance.resize()
      })

      instance.on('error', (e) => {
        // If critical tile or WebGL failure
        if (e.error && !isCancelled) {
          console.warn('MapLibre event:', e.error)
        }
      })

      instance.on('click', (event: MapMouseEvent) => {
        selectRef.current({
          lat: Number(event.lngLat.lat.toFixed(6)),
          lon: Number(event.lngLat.lng.toFixed(6)),
        })
      })

      // Multiple resize triggers to ensure full viewport calculation
      const t1 = setTimeout(() => instance.resize(), 100)
      const t2 = setTimeout(() => instance.resize(), 300)
      const t3 = setTimeout(() => instance.resize(), 600)

      map.current = instance

      return () => {
        isCancelled = true
        clearTimeout(t1)
        clearTimeout(t2)
        clearTimeout(t3)
        instance.remove()
        map.current = null
      }
    } catch (err) {
      console.error('Failed to initialize map:', err)
      setLoadError('Không thể khởi tạo bản đồ WebGL trên thiết bị này. Bạn có thể nhập địa chỉ hoặc dùng Google Maps.')
    }
  }, [])

  // Sync marker and position when location/meetup changes
  useEffect(() => {
    if (!map.current) return
    const point = mode === 'event' ? location : meetup

    if (point) {
      map.current.flyTo({ center: [point.lon, point.lat], zoom: 13, essential: true })
      marker.current?.remove()
      marker.current = new Marker({
        color: mode === 'event' ? '#C87442' : '#1B382B',
      })
        .setLngLat([point.lon, point.lat])
        .addTo(map.current)
    } else {
      marker.current?.remove()
      marker.current = null
    }
  }, [location, meetup, mode])

  return (
    <div className="toolkit-map-wrapper">
      <div className="toolkit-map" ref={host} tabIndex={0} aria-label="Bản đồ ghim vị trí cuộc hẹn">
        {!mapReady && !loadError && (
          <div className="toolkit-map-loading">
            <span className="loading-spinner" />
            <span>Đang tải bản đồ tương tác…</span>
          </div>
        )}
        {loadError && (
          <div className="toolkit-map-error">
            <p>{loadError}</p>
          </div>
        )}
      </div>

      <div className="toolkit-map-statusbar">
        <div className="map-status-info">
          <span className="status-label">
            {mode === 'event' ? '📍 Điểm hẹn:' : '🚩 Điểm đón chung:'}
          </span>
          <span className="status-coords">
            {activePoint ? `${activePoint.lat}, ${activePoint.lon}` : 'Chưa ghim vị trí (bấm vào bản đồ để chọn)'}
          </span>
        </div>
        {activePoint && (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${activePoint.lat},${activePoint.lon}`}
            target="_blank"
            rel="noreferrer"
            className="map-ext-link"
          >
            Mở trên Google Maps ↗
          </a>
        )}
      </div>
    </div>
  )
}
