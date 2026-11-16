import { lazy, Suspense, useEffect, useState } from 'react'
import {
  SearchOutlined,
  EnvironmentOutlined,
  CompassOutlined,
  CloseOutlined,
  InfoCircleOutlined,
  RightOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons'
import type { Point, Place } from './toolkit-types'
import { searchPlacesOnline } from './toolkit-geocoding'
import type { Room } from '../../types'

const LocationMap = lazy(() =>
  import('../LocationMap').then((module) => ({ default: module.LocationMap }))
)

interface PlanPanelProps {
  room: Room
  busy: boolean
  name: string
  setName: (val: string) => void
  date: string
  setDate: (val: string) => void
  time: string
  setTime: (val: string) => void
  region: string
  setRegion: (val: string) => void
  notes: string
  setNotes: (val: string) => void
  fallback: string
  setFallback: (val: string) => void
  location: Point | null
  meetup: Point | null
  onSetLocation: (point: Point | null, regionName?: string) => void
  onSetMeetup: (point: Point | null) => void
  onSavePlan: (cancelled?: boolean) => Promise<boolean | void>
  onSyncCalendar: () => Promise<boolean | void>
  planHistory?: Array<{ id: string; actor: string; summary: string; createdAt: string }>
}

export function PlanPanel({
  room,
  busy,
  name,
  setName,
  date,
  setDate,
  time,
  setTime,
  region,
  setRegion,
  notes,
  setNotes,
  fallback,
  setFallback,
  location,
  meetup,
  onSetLocation,
  onSetMeetup,
  onSavePlan,
  onSyncCalendar,
  planHistory,
}: PlanPanelProps) {
  const [mapMode, setMapMode] = useState<'event' | 'meetup'>('event')
  const [mapVisible, setMapVisible] = useState(false)
  const [placeQuery, setPlaceQuery] = useState('')
  const [places, setPlaces] = useState<Place[]>([])
  const [searchingPlace, setSearchingPlace] = useState(false)
  const [searchMessage, setSearchMessage] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [savingPlan, setSavingPlan] = useState(false)
  const [syncingCal, setSyncingCal] = useState(false)

  useEffect(() => {
    if (!feedback || feedback.type !== 'success') return
    const timer = window.setTimeout(() => setFeedback(null), 4000)
    return () => window.clearTimeout(timer)
  }, [feedback])

  async function handleSavePlan(cancelled = false) {
    setSavingPlan(true)
    setFeedback(null)
    try {
      const ok = await onSavePlan(cancelled)
      if (ok !== false) {
        setFeedback({
          type: 'success',
          message: cancelled ? 'Đã cập nhật trạng thái kế hoạch.' : 'Đã lưu kế hoạch thành công!',
        })
      } else {
        setFeedback({
          type: 'error',
          message: 'Không thể lưu kế hoạch. Vui lòng kiểm tra lại.',
        })
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Lưu kế hoạch thất bại. Vui lòng thử lại.',
      })
    } finally {
      setSavingPlan(false)
    }
  }

  async function handleSyncCalendar() {
    setSyncingCal(true)
    setFeedback(null)
    try {
      const ok = await onSyncCalendar()
      if (ok !== false) {
        setFeedback({
          type: 'success',
          message: 'Đã đồng bộ cuộc hẹn sang Google Calendar thành công!',
        })
      } else {
        setFeedback({
          type: 'error',
          message: 'Không thể đồng bộ Google Calendar. Vui lòng thử lại.',
        })
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Đồng bộ Google Calendar thất bại.',
      })
    } finally {
      setSyncingCal(false)
    }
  }

  async function handleSearchPlace() {
    const query = placeQuery.trim()
    if (query.length < 2) {
      setSearchMessage('Vui lòng nhập ít nhất 2 ký tự để tìm kiếm địa điểm.')
      return
    }

    setSearchingPlace(true)
    setSearchMessage(null)

    try {
      const centerLat = location?.lat ?? meetup?.lat ?? 21.0285
      const centerLon = location?.lon ?? meetup?.lon ?? 105.8542
      const results = await searchPlacesOnline(query, centerLat, centerLon)
      if (results.length > 0) {
        setPlaces(results)
      } else {
        setPlaces([])
        setSearchMessage(
          `Không tìm thấy kết quả cho "${query}". Bạn có thể phóng to bản đồ bên dưới và nhấp để ghim vị trí trực tiếp.`
        )
      }
    } catch {
      setPlaces([])
      setSearchMessage(
        'Không thể kết nối tìm kiếm địa điểm lúc này. Bạn có thể ghim trực tiếp trên bản đồ.'
      )
    } finally {
      setSearchingPlace(false)
    }
  }

  function handleSelectPlace(p: Place) {
    const pt: Point = { lat: p.latitude, lon: p.longitude }
    if (mapMode === 'event') {
      onSetLocation(pt, p.subtitle ? `${p.name} (${p.subtitle})` : p.name)
    } else {
      onSetMeetup(pt)
    }
    setMapVisible(true)
    setPlaces([])
    setSearchMessage(null)
  }

  function handleSelectMapPoint(point: Point) {
    if (mapMode === 'event') {
      onSetLocation(point)
    } else {
      onSetMeetup(point)
    }
  }

  function handleDeviceLocation() {
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const point = {
          lat: Number(p.coords.latitude.toFixed(6)),
          lon: Number(p.coords.longitude.toFixed(6)),
        }
        if (mapMode === 'event') {
          onSetLocation(point)
        } else {
          onSetMeetup(point)
        }
        setMapVisible(true)
      },
      () => {
        setSearchMessage('Trình duyệt không cấp quyền định vị. Bạn có thể chọn vị trí trên bản đồ.')
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  return (
    <div className="toolkit-panel">
      <h2>Thông tin cuộc hẹn</h2>
      <form
        className="toolkit-form"
        onSubmit={(e) => {
          e.preventDefault()
          void handleSavePlan(false)
        }}
      >
        <label>
          Tên kế hoạch
          <input
            required
            maxLength={100}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>

        <div className="toolkit-fields">
          <label>
            Ngày
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label>
            Giờ
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </label>
        </div>

        <label>
          Địa điểm
          <input
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            placeholder="Tên địa điểm hoặc khu vực"
          />
        </label>

        <label>
          Ghi chú
          <textarea
            maxLength={2000}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>

        {/* Segmented Mode Selector with clear visual separation */}
        <div className="map-mode-selector">
          <button
            type="button"
            className={`map-mode-btn ${mapMode === 'event' ? 'active event' : ''}`}
            onClick={() => setMapMode('event')}
          >
            <EnvironmentOutlined style={{ fontSize: 14 }} className="mode-btn-icon" />
            <span>Chọn điểm hẹn trên bản đồ</span>
          </button>
          <button
            type="button"
            className={`map-mode-btn ${mapMode === 'meetup' ? 'active meetup' : ''}`}
            onClick={() => setMapMode('meetup')}
          >
            <CompassOutlined style={{ fontSize: 14 }} className="mode-btn-icon" />
            <span>Chọn điểm xuất phát chung</span>
          </button>
        </div>

        {/* Smart POI Search bar with clear button & feedback */}
        <div className="place-search">
          <div className="search-input-wrapper">
            <span className="search-icon">
              <SearchOutlined style={{ fontSize: 15 }} />
            </span>
            <input
              value={placeQuery}
              onChange={(e) => {
                setPlaceQuery(e.target.value)
                if (searchMessage) setSearchMessage(null)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void handleSearchPlace()
                }
              }}
              placeholder="Tìm công viên, địa điểm, quán xá hoặc thành phố…"
            />
            {placeQuery && (
              <button
                type="button"
                className="clear-search-btn"
                onClick={() => {
                  setPlaceQuery('')
                  setPlaces([])
                  setSearchMessage(null)
                }}
                title="Xóa ô tìm kiếm"
              >
                <CloseOutlined style={{ fontSize: 12 }} />
              </button>
            )}
          </div>
          <button
            type="button"
            className="search-submit-btn cursor-pointer"
            disabled={searchingPlace}
            onClick={() => void handleSearchPlace()}
          >
            {searchingPlace ? 'Đang tìm…' : 'Tìm kiếm'}
          </button>
          <button
            type="button"
            className="device-location-btn cursor-pointer"
            onClick={handleDeviceLocation}
            title="Lấy vị trí GPS hiện tại của thiết bị"
          >
            <CompassOutlined style={{ fontSize: 14 }} className="btn-icon" />
            <span>Vị trí thiết bị</span>
          </button>
        </div>

        {searchMessage && (
          <div className="place-search-message" role="status">
            <InfoCircleOutlined style={{ fontSize: 15 }} className="msg-icon shrink-0" />
            <span>{searchMessage}</span>
          </div>
        )}

        {places.length > 0 && (
          <div className="place-results">
            <div className="place-results-header">
              <span>Kết quả tìm kiếm ({places.length})</span>
              <button
                type="button"
                onClick={() => setPlaces([])}
                className="close-results-btn"
              >
                <CloseOutlined style={{ fontSize: 12 }} />
                <span>Đóng</span>
              </button>
            </div>
            <div className="place-results-list">
              {places.map((p, i) => (
                <button
                  type="button"
                  key={`${p.name}-${p.latitude}-${p.longitude}-${i}`}
                  className="place-result-item"
                  onClick={() => handleSelectPlace(p)}
                >
                  <div className="place-item-icon">
                    <EnvironmentOutlined style={{ fontSize: 15 }} />
                  </div>
                  <div className="place-item-content">
                    <strong className="place-item-name">{p.name}</strong>
                    {p.subtitle && <span className="place-item-sub">{p.subtitle}</span>}
                  </div>
                  <span className="place-item-action">
                    <span>Ghim vị trí</span>
                    <RightOutlined style={{ fontSize: 13 }} />
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          type="button"
          className="secondary-button cursor-pointer"
          onClick={() => setMapVisible((open) => !open)}
        >
          {mapVisible ? 'Ẩn bản đồ' : 'Mở bản đồ để ghim vị trí'}
        </button>

        {mapVisible && (
          <Suspense fallback={<p className="toolkit-muted">Đang tải bản đồ…</p>}>
            <LocationMap
              location={location}
              meetup={meetup}
              mode={mapMode}
              onSelect={handleSelectMapPoint}
            />
          </Suspense>
        )}

        <small className="map-attribution">
          © OpenStreetMap contributors · Bản đồ OpenFreeMap · Tìm kiếm Photon OSM
        </small>

        <label>
          Phương án dự phòng khi thời tiết xấu
          <textarea
            maxLength={1000}
            value={fallback}
            onChange={(e) => setFallback(e.target.value)}
            placeholder="Ví dụ: nếu mưa, chuyển sang quán cà phê gần đó"
          />
        </label>

        {feedback && (
          <div
            className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-sm font-medium transition-all ${
              feedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900 shadow-xs'
                : 'bg-rose-50 border-rose-200 text-rose-900 shadow-xs'
            }`}
            role="status"
          >
            {feedback.type === 'success' ? (
              <CheckCircleOutlined style={{ fontSize: 18 }} className="text-emerald-600 shrink-0" />
            ) : (
              <CloseCircleOutlined style={{ fontSize: 18 }} className="text-rose-600 shrink-0" />
            )}
            <span className="flex-1">{feedback.message}</span>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="text-stone-400 hover:text-stone-700 cursor-pointer p-0.5"
              aria-label="Đóng thông báo"
            >
              <CloseOutlined style={{ fontSize: 14 }} />
            </button>
          </div>
        )}

        <button
          type="submit"
          className="primary-button cursor-pointer"
          disabled={busy || savingPlan || room.member.role !== 'HOST'}
        >
          {savingPlan ? 'Đang lưu kế hoạch…' : 'Lưu kế hoạch'}
        </button>
        <button
          type="button"
          className="secondary-button cursor-pointer"
          disabled={busy || syncingCal}
          onClick={() => void handleSyncCalendar()}
        >
          {syncingCal ? 'Đang đồng bộ…' : 'Đồng bộ Google Calendar'}
        </button>
        <small className="toolkit-muted">
          Cấp quyền Calendar riêng; thông tin chỉ đồng bộ từ phòng sang lịch của bạn.
        </small>

        {room.status === 'CANCELLED' ? (
          <button
            type="button"
            className="secondary-button cursor-pointer"
            disabled={room.member.role !== 'HOST' || savingPlan}
            onClick={() => void handleSavePlan(false)}
          >
            {savingPlan ? 'Đang mở lại…' : 'Mở lại kế hoạch'}
          </button>
        ) : (
          <button
            type="button"
            className="toolkit-danger cursor-pointer"
            disabled={room.member.role !== 'HOST' || savingPlan}
            onClick={() => {
              if (confirm('Hủy kế hoạch này?')) void handleSavePlan(true)
            }}
          >
            {savingPlan ? 'Đang hủy…' : 'Hủy kế hoạch'}
          </button>
        )}
      </form>

      <details>
        <summary>Lịch sử thay đổi kế hoạch</summary>
        {planHistory?.map((item) => (
          <p key={item.id}>
            {item.actor} · {item.summary} · {new Date(item.createdAt).toLocaleString('vi-VN')}
          </p>
        ))}
      </details>
    </div>
  )
}
