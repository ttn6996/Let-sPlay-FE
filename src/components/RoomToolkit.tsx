import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import {
  api,
  createRoomExpense,
  createRoomSettlement,
  deleteRoomExpense,
  getPushConfig,
  getRoomCalendarLink,
  getRoomCollaboration,
  getRoomExpenses,
  markRoomNotificationsRead,
  saveMeetupPoint,
  saveRoomCalendarLink,
  saveRoomPreferences,
  saveRoomRide,
  updateRoomExpense,
  updateRoomPlan,
  type RoomExpenseBook,
} from '../api'
import type { Room } from '../types'

const LocationMap = lazy(() =>
  import('./LocationMap').then((module) => ({ default: module.LocationMap }))
)

export type Point = { lat: number; lon: number }

export interface Place {
  name: string
  subtitle?: string
  latitude: number
  longitude: number
}

const money = (value: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value)

function loadGoogleIdentity() {
  return new Promise<void>((resolve, reject) => {
    if (window.google?.accounts.oauth2) {
      resolve()
      return
    }
    let script = document.querySelector<HTMLScriptElement>('script[data-google-identity]')
    if (!script) {
      script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      script.dataset.googleIdentity = 'true'
      document.head.append(script)
    }
    const timer = window.setTimeout(
      () => reject(new Error('Hết thời gian tải Google Identity Services.')),
      10000
    )
    script.addEventListener(
      'load',
      () => {
        window.clearTimeout(timer)
        window.google?.accounts.oauth2
          ? resolve()
          : reject(new Error('Google Calendar OAuth không khả dụng.'))
      },
      { once: true }
    )
    script.addEventListener(
      'error',
      () => {
        window.clearTimeout(timer)
        reject(new Error('Không tải được Google Identity Services.'))
      },
      { once: true }
    )
  })
}

export function RoomToolkit({
  room,
  roomId,
  token,
  onRoom,
}: {
  room: Room
  roomId: string
  token: string
  onRoom: (room: Room) => void
}) {
  const [panel, setPanel] = useState('plan')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [mapVisible, setMapVisible] = useState(false)
  const [data, setData] = useState<Awaited<ReturnType<typeof getRoomCollaboration>>['data'] | null>(
    null
  )
  const [book, setBook] = useState<RoomExpenseBook | null>(null)

  const [name, setName] = useState(room.name)
  const [date, setDate] = useState(room.eventDate ?? '')
  const [time, setTime] = useState(room.eventTime?.slice(0, 5) ?? '')
  const [region, setRegion] = useState(room.region ?? '')
  const [notes, setNotes] = useState(room.planNotes ?? '')
  const [fallback, setFallback] = useState(room.weatherFallback ?? '')
  const [location, setLocation] = useState<Point | null>(
    room.eventLatitude != null && room.eventLongitude != null
      ? { lat: room.eventLatitude, lon: room.eventLongitude }
      : null
  )
  const [meetup, setMeetup] = useState<Point | null>(
    room.meetupLatitude != null && room.meetupLongitude != null
      ? { lat: room.meetupLatitude, lon: room.meetupLongitude }
      : null
  )
  const [mapMode, setMapMode] = useState<'event' | 'meetup'>('event')

  const [placeQuery, setPlaceQuery] = useState('')
  const [places, setPlaces] = useState<Place[]>([])
  const [searchingPlace, setSearchingPlace] = useState(false)
  const [searchMessage, setSearchMessage] = useState<string | null>(null)
  const [weather, setWeather] = useState<{ chance: number | null; max: number | null } | null>(
    null
  )

  const [prefs, setPrefs] = useState('')
  const [budgetMin, setBudgetMin] = useState('')
  const [budgetMax, setBudgetMax] = useState('')
  const [hasVehicle, setHasVehicle] = useState(false)
  const [seats, setSeats] = useState('0')
  const [pickup, setPickup] = useState('')
  const [rideNote, setRideNote] = useState('')

  const [expenseId, setExpenseId] = useState('')
  const [expenseTitle, setExpenseTitle] = useState('')
  const [expenseTotal, setExpenseTotal] = useState('')
  const [expenseNote, setExpenseNote] = useState('')
  const [payers, setPayers] = useState<Record<string, string>>({})
  const [shares, setShares] = useState<Record<string, string>>({})

  const expenseMembers = useMemo(() => {
    const members = new globalThis.Map(room.members.map((m) => [m.id, { id: m.id, displayName: m.displayName }]))
    const old = book?.expenses.find((e) => e.id === expenseId)
    ;[...(old?.payers ?? []), ...(old?.shares ?? [])].forEach((m) => {
      if (!members.has(m.membershipId)) {
        members.set(m.membershipId, {
          id: m.membershipId,
          displayName: m.displayName + ' (đã rời phòng)',
        })
      }
    })
    return [...members.values()]
  }, [room.members, book, expenseId])

  async function refresh() {
    try {
      const [collab, expenses] = await Promise.all([
        getRoomCollaboration(roomId, token),
        getRoomExpenses(roomId, token),
      ])
      setData(collab.data)
      setBook(expenses.data)
      const p = collab.data.preferences.find((x) => x.membershipId === room.member.id)
      if (p) {
        setPrefs(p.preferences)
        setBudgetMin(p.budgetMin ? String(p.budgetMin) : '')
        setBudgetMax(p.budgetMax ? String(p.budgetMax) : '')
      }
      const r = collab.data.rides.find((x) => x.membershipId === room.member.id)
      if (r) {
        setHasVehicle(r.hasVehicle)
        setSeats(String(r.seatsAvailable))
        setPickup(r.pickupArea)
        setRideNote(r.note)
      }
    } catch {
      setError('Không tải được dữ liệu hoạt động của phòng.')
    }
  }

  useEffect(() => {
    void refresh()
  }, [roomId, token, room.revision])

  useEffect(() => {
    setName(room.name)
    setDate(room.eventDate ?? '')
    setTime(room.eventTime?.slice(0, 5) ?? '')
    setRegion(room.region ?? '')
    setNotes(room.planNotes ?? '')
    setFallback(room.weatherFallback ?? '')
    setLocation(
      room.eventLatitude != null && room.eventLongitude != null
        ? { lat: room.eventLatitude, lon: room.eventLongitude }
        : null
    )
    setMeetup(
      room.meetupLatitude != null && room.meetupLongitude != null
        ? { lat: room.meetupLatitude, lon: room.meetupLongitude }
        : null
    )
  }, [room])

  useEffect(() => {
    if (!location || !date) {
      setWeather(null)
      return
    }
    let cancelled = false
    const url = new URL('https://api.open-meteo.com/v1/forecast')
    url.search = new URLSearchParams({
      latitude: String(location.lat),
      longitude: String(location.lon),
      daily: 'precipitation_probability_max,temperature_2m_max',
      start_date: date,
      end_date: date,
      timezone: 'auto',
    }).toString()

    fetch(url)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((payload) => {
        if (!cancelled) {
          const chance = payload.daily?.precipitation_probability_max?.[0] ?? null
          const max = payload.daily?.temperature_2m_max?.[0] ?? null
          setWeather({ chance, max })
          const key = `letsplay.weather.${roomId}.${date}`
          if (
            chance != null &&
            chance >= 50 &&
            'Notification' in window &&
            Notification.permission === 'granted' &&
            !sessionStorage.getItem(key)
          ) {
            new Notification('Có khả năng mưa trong ngày hẹn', {
              body: fallback
                ? `Phương án dự phòng: ${fallback}`
                : 'Mở phòng để xem thời tiết và cập nhật kế hoạch.',
            })
            sessionStorage.setItem(key, '1')
          }
        }
      })
      .catch(() => {
        if (!cancelled) setWeather(null)
      })

    return () => {
      cancelled = true
    }
  }, [location, date, roomId, fallback])

  async function action(run: () => Promise<unknown>) {
    setBusy(true)
    setError('')
    try {
      await run()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không lưu được thay đổi. Vui lòng thử lại.')
      return false
    } finally {
      setBusy(false)
    }
  }

  async function savePlan(cancelled = false) {
    const result = await action(async () => {
      const r = await updateRoomPlan(
        roomId,
        {
          name,
          eventDate: date || null,
          eventTime: time || null,
          region: region || null,
          notes: notes || null,
          latitude: location?.lat ?? null,
          longitude: location?.lon ?? null,
          weatherFallback: fallback || null,
          cancelled,
        },
        token
      )
      onRoom(r.data)
    })
    if (result) await refresh()
  }

  async function syncCalendar() {
    await action(async () => {
      if (!room.eventDate) throw new Error('Cần chốt ngày trước khi đồng bộ lịch.')
      let clientId = ''
      try {
        clientId = (await getPushConfig()).data.googleClientId
      } catch {}
      if (!clientId) throw new Error('Chưa cấu hình Google Sign-In cho ứng dụng.')
      await loadGoogleIdentity()
      const google = window.google?.accounts.oauth2
      if (!google) throw new Error('Google Calendar OAuth chưa tải được.')
      const accessToken = await new Promise<string>((resolve, reject) => {
        const client = google.initTokenClient({
          client_id: clientId,
          scope: 'https://www.googleapis.com/auth/calendar.events',
          callback: (response) =>
            response.access_token
              ? resolve(response.access_token)
              : reject(new Error(response.error ?? 'Không cấp quyền Google Calendar.')),
        })
        client.requestAccessToken({ prompt: '' })
      })
      const linked = (await getRoomCalendarLink(roomId, token)).data.eventId
      const start = room.eventTime
        ? { dateTime: `${room.eventDate}T${room.eventTime.slice(0, 5)}:00+07:00`, timeZone: 'Asia/Ho_Chi_Minh' }
        : { date: room.eventDate }
      const next = new Date(`${room.eventDate}T12:00:00`)
      next.setDate(next.getDate() + 1)
      const end = room.eventTime
        ? {
            dateTime: new Date(new Date(`${room.eventDate}T${room.eventTime.slice(0, 5)}:00+07:00`).getTime() + 3600000).toISOString(),
            timeZone: 'Asia/Ho_Chi_Minh',
          }
        : { date: next.toISOString().slice(0, 10) }
      const event = {
        summary: room.name,
        description: [room.planNotes, room.weatherFallback ? `Phương án dự phòng: ${room.weatherFallback}` : null]
          .filter(Boolean)
          .join('\n'),
        location: room.region ?? '',
        start,
        end,
        status: room.status === 'CANCELLED' ? 'cancelled' : 'confirmed',
      }
      const endpoint = `https://www.googleapis.com/calendar/v3/calendars/primary/events${
        linked ? `/${encodeURIComponent(linked)}` : ''
      }`
      const response = await fetch(endpoint, {
        method: linked ? 'PATCH' : 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
      })
      if (!response.ok)
        throw new Error('Google Calendar không chấp nhận cập nhật. Kiểm tra quyền Calendar của tài khoản.')
      const result = await response.json()
      if (result.id) await saveRoomCalendarLink(roomId, result.id, token)
    })
  }

  async function searchPlace() {
    const query = placeQuery.trim()
    if (query.length < 2) {
      setSearchMessage('Vui lòng nhập ít nhất 2 ký tự để tìm kiếm địa điểm.')
      return
    }

    setSearchingPlace(true)
    setSearchMessage(null)
    setError('')

    try {
      // 1. Primary: Photon OSM Geocoder (supports parks, POIs, streets, cafes, addresses in Vietnam)
      const centerLat = location?.lat ?? meetup?.lat ?? 21.0285
      const centerLon = location?.lon ?? meetup?.lon ?? 105.8542
      const photonUrl = new URL('https://photon.komoot.io/api/')
      photonUrl.search = new URLSearchParams({
        q: query,
        limit: '8',
        lat: String(centerLat),
        lon: String(centerLon),
      }).toString()

      const res = await fetch(photonUrl.toString())
      if (res.ok) {
        const data = await res.json()
        const features = (data.features ?? []) as Array<{
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
          // Prioritize Vietnamese locations
          const sorted = [...features].sort((a, b) => {
            const aVN = a.properties.countrycode === 'VN' || a.properties.country?.toLowerCase().includes('việt')
            const bVN = b.properties.countrycode === 'VN' || b.properties.country?.toLowerCase().includes('việt')
            return (bVN ? 1 : 0) - (aVN ? 1 : 0)
          })

          const mapped: Place[] = sorted.map((f) => {
            const p = f.properties
            const primary = p.name || p.street || [p.district, p.city].filter(Boolean).join(', ') || query
            const parts = [
              p.housenumber ? `${p.housenumber} ${p.street || ''}`.trim() : p.street,
              p.district,
              p.city,
              p.state,
              p.country,
            ].filter(Boolean) as string[]

            const subtitleParts = parts.filter((part) => part !== primary)
            const subtitle = subtitleParts.length > 0 ? subtitleParts.join(', ') : p.country || undefined

            return {
              name: primary,
              subtitle,
              latitude: Number(f.geometry.coordinates[1].toFixed(6)),
              longitude: Number(f.geometry.coordinates[0].toFixed(6)),
            }
          })

          setPlaces(mapped)
          setSearchingPlace(false)
          return
        }
      }

      // 2. Fallback: Open-Meteo Geocoding (useful for city names)
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
          setPlaces(
            meteoResults.map((r) => ({
              name: r.name,
              subtitle: [r.admin1, r.country].filter(Boolean).join(', '),
              latitude: r.latitude,
              longitude: r.longitude,
            }))
          )
          setSearchingPlace(false)
          return
        }
      }

      // If no results found from both
      setPlaces([])
      setSearchMessage(`Không tìm thấy kết quả cho "${query}". Bạn có thể phóng to bản đồ bên dưới và nhấp để ghim vị trí trực tiếp.`)
    } catch (err) {
      console.warn('Geocoding search failed:', err)
      setPlaces([])
      setSearchMessage('Không thể kết nối tìm kiếm địa điểm lúc này. Bạn có thể ghim trực tiếp trên bản đồ.')
    } finally {
      setSearchingPlace(false)
    }
  }

  function handleSelectPlace(p: Place) {
    const pt: Point = { lat: p.latitude, lon: p.longitude }
    if (mapMode === 'event') {
      setLocation(pt)
      setRegion(p.subtitle ? `${p.name} (${p.subtitle})` : p.name)
    } else {
      setMeetup(pt)
      void saveMeetupPoint(roomId, pt.lat, pt.lon, token).catch(() =>
        setError('Không lưu được điểm xuất phát chung.')
      )
    }
    setMapVisible(true)
    setPlaces([])
    setSearchMessage(null)
  }

  function selectMapPoint(point: Point) {
    if (mapMode === 'event') {
      setLocation(point)
    } else {
      setMeetup(point)
      void saveMeetupPoint(roomId, point.lat, point.lon, token).catch(() =>
        setError('Không lưu được điểm xuất phát chung.')
      )
    }
  }

  function useDeviceLocation() {
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const point = { lat: Number(p.coords.latitude.toFixed(6)), lon: Number(p.coords.longitude.toFixed(6)) }
        if (mapMode === 'event') {
          setLocation(point)
        } else {
          setMeetup(point)
          void saveMeetupPoint(roomId, point.lat, point.lon, token).catch(() =>
            setError('Không lưu được điểm xuất phát chung.')
          )
        }
        setMapVisible(true)
      },
      () => setError('Trình duyệt không cấp quyền định vị. Bạn có thể chọn vị trí trên bản đồ.'),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  async function savePrefs() {
    if (
      await action(() =>
        saveRoomPreferences(
          roomId,
          {
            preferences: prefs,
            budgetMin: budgetMin ? Number(budgetMin) : null,
            budgetMax: budgetMax ? Number(budgetMax) : null,
          },
          token
        )
      )
    ) {
      void refresh()
    }
  }

  async function saveRideForm() {
    if (
      await action(() =>
        saveRoomRide(
          roomId,
          {
            hasVehicle,
            seatsAvailable: Number(seats) || 0,
            pickupArea: pickup,
            note: rideNote,
          },
          token
        )
      )
    ) {
      void refresh()
    }
  }

  function beginEdit(e: RoomExpenseBook['expenses'][number]) {
    setExpenseId(e.id)
    setExpenseTitle(e.title)
    setExpenseTotal(String(e.totalAmount))
    setExpenseNote(e.note)
    setPayers(Object.fromEntries(e.payers.map((x) => [x.membershipId, String(x.amount)])))
    setShares(Object.fromEntries(e.shares.map((x) => [x.membershipId, String(x.amount)])))
  }

  async function saveExpense(e: React.FormEvent) {
    e.preventDefault()
    const total = Number(expenseTotal)
    const payerRows = Object.entries(payers)
      .filter(([, v]) => Number(v) > 0)
      .map(([membershipId, v]) => ({ membershipId, amount: Number(v) }))
    const shareRows = Object.entries(shares)
      .filter(([, v]) => Number(v) >= 0 && v !== '')
      .map(([membershipId, v]) => ({ membershipId, amount: Number(v) }))

    if (
      payerRows.reduce((s, x) => s + x.amount, 0) !== total ||
      shareRows.reduce((s, x) => s + x.amount, 0) !== total
    ) {
      setError('Tổng tiền người trả và phần chia phải bằng tổng khoản chi.')
      return
    }

    const payload = {
      title: expenseTitle,
      totalAmount: total,
      note: expenseNote || undefined,
      payers: payerRows,
      shares: shareRows,
    }

    const ok = await action(() =>
      expenseId
        ? updateRoomExpense(roomId, expenseId, payload, token)
        : createRoomExpense(roomId, payload, token)
    )

    if (ok) {
      setExpenseId('')
      setExpenseTitle('')
      setExpenseTotal('')
      setExpenseNote('')
      setPayers({})
      setShares({})
      void refresh()
    }
  }

  async function confirmTransfer(transfer: {
    fromMembershipId: string
    toMembershipId: string
    amount: number
  }) {
    if (await action(() => createRoomSettlement(roomId, transfer, token))) void refresh()
  }

  const suggestion = useMemo(() => {
    const budgets = data?.preferences.filter((p) => p.budgetMax > 0).map((p) => p.budgetMax) ?? []
    const limit = budgets.length ? Math.min(...budgets) : null
    const keywords = (
      data?.preferences.flatMap((p) => p.preferences.toLocaleLowerCase().split(/[,;\s]+/)) ?? []
    ).filter((word) => word.length > 2)

    return room.proposals
      .map((p) => {
        const text = `${p.title} ${p.description ?? ''} ${p.location ?? ''}`.toLocaleLowerCase()
        const preferenceScore = keywords.filter((word) => text.includes(word)).length
        return {
          proposal: p,
          distance:
            p.latitude != null && p.longitude != null && meetup
              ? distanceKm({ lat: p.latitude, lon: p.longitude }, meetup)
              : null,
          preferenceScore,
          withinBudget: !limit || p.estimatedCostPerPerson == null || p.estimatedCostPerPerson <= limit,
        }
      })
      .sort(
        (a, b) =>
          Number(b.withinBudget) - Number(a.withinBudget) ||
          b.preferenceScore - a.preferenceScore ||
          (a.distance ?? Number.POSITIVE_INFINITY) - (b.distance ?? Number.POSITIVE_INFINITY) ||
          b.proposal.voteCount - a.proposal.voteCount
      )
  }, [room.proposals, data, meetup])

  const attendanceLabel = (s: string) =>
    ({
      NO_RESPONSE: 'Chưa trả lời',
      GOING: 'Sẽ đi',
      MAYBE: 'Chưa chắc',
      NOT_GOING: 'Không đi',
      ON_THE_WAY: 'Đang đến',
      LATE: 'Đến muộn',
      ARRIVED: 'Đã tới',
    }[s] ?? 'Chưa trả lời')

  return (
    <section className="room-toolkit">
      <div className="toolkit-tabs">
        {[
          ['plan', 'Kế hoạch'],
          ['attendance', 'Tham gia'],
          ['notifications', 'Thông báo'],
          ['expenses', 'Chia tiền'],
          ['recommend', 'Gợi ý'],
          ['rides', 'Đi chung'],
          ['weather', 'Thời tiết'],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={panel === id ? 'active' : ''}
            onClick={() => setPanel(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <p role="alert" className="toolkit-error">
          {error}
        </p>
      )}

      {panel === 'plan' && (
        <div className="toolkit-panel">
          <h2>Thông tin cuộc hẹn</h2>
          <form
            className="toolkit-form"
            onSubmit={(e) => {
              e.preventDefault()
              void savePlan()
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
                <span className="mode-dot event" />
                <span>Chọn điểm hẹn trên bản đồ</span>
              </button>
              <button
                type="button"
                className={`map-mode-btn ${mapMode === 'meetup' ? 'active meetup' : ''}`}
                onClick={() => setMapMode('meetup')}
              >
                <span className="mode-dot meetup" />
                <span>Chọn điểm xuất phát chung</span>
              </button>
            </div>

            {/* Smart POI Search bar with clear button & feedback */}
            <div className="place-search">
              <div className="search-input-wrapper">
                <span className="search-icon">🔍</span>
                <input
                  value={placeQuery}
                  onChange={(e) => {
                    setPlaceQuery(e.target.value)
                    if (searchMessage) setSearchMessage(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      void searchPlace()
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
                    ✕
                  </button>
                )}
              </div>
              <button
                type="button"
                className="search-submit-btn"
                disabled={searchingPlace}
                onClick={() => void searchPlace()}
              >
                {searchingPlace ? 'Đang tìm…' : 'Tìm kiếm'}
              </button>
              <button
                type="button"
                className="device-location-btn"
                onClick={useDeviceLocation}
                title="Lấy vị trí GPS hiện tại của thiết bị"
              >
                📍 Vị trí thiết bị
              </button>
            </div>

            {searchMessage && (
              <div className="place-search-message" role="status">
                <span>💡</span>
                <span>{searchMessage}</span>
              </div>
            )}

            {places.length > 0 && (
              <div className="place-results">
                <div className="place-results-header">
                  <span>Kết quả tìm kiếm ({places.length})</span>
                  <button type="button" onClick={() => setPlaces([])}>
                    Đóng ✕
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
                      <div className="place-item-icon">📍</div>
                      <div className="place-item-content">
                        <strong className="place-item-name">{p.name}</strong>
                        {p.subtitle && <span className="place-item-sub">{p.subtitle}</span>}
                      </div>
                      <span className="place-item-action">Ghim vị trí →</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              type="button"
              className="secondary-button"
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
                  onSelect={selectMapPoint}
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

            <button className="primary-button" disabled={busy || room.member.role !== 'HOST'}>
              Lưu kế hoạch
            </button>
            <button
              type="button"
              className="secondary-button"
              disabled={busy}
              onClick={() => void syncCalendar()}
            >
              Đồng bộ Google Calendar
            </button>
            <small className="toolkit-muted">
              Cấp quyền Calendar riêng; thông tin chỉ đồng bộ từ phòng sang lịch của bạn.
            </small>

            {room.status === 'CANCELLED' ? (
              <button
                type="button"
                className="secondary-button"
                disabled={room.member.role !== 'HOST'}
                onClick={() => void savePlan(false)}
              >
                Mở lại kế hoạch
              </button>
            ) : (
              <button
                type="button"
                className="toolkit-danger"
                disabled={room.member.role !== 'HOST'}
                onClick={() => {
                  if (confirm('Hủy kế hoạch này?')) void savePlan(true)
                }}
              >
                Hủy kế hoạch
              </button>
            )}
          </form>

          <details>
            <summary>Lịch sử thay đổi kế hoạch</summary>
            {data?.planHistory.map((item) => (
              <p key={item.id}>
                {item.actor} · {item.summary} · {new Date(item.createdAt).toLocaleString('vi-VN')}
              </p>
            ))}
          </details>
        </div>
      )}

      {panel === 'attendance' && (
        <div className="toolkit-panel">
          <h2>Ai sẽ tham gia?</h2>
          <div className="attendance-buttons">
            {[
              ['GOING', 'Sẽ đi'],
              ['MAYBE', 'Chưa chắc'],
              ['NOT_GOING', 'Không đi'],
              ['ON_THE_WAY', 'Đang đến'],
              ['LATE', 'Đến muộn'],
              ['ARRIVED', 'Đã tới'],
            ].map(([v, l]) => {
              const isCurrent = data?.attendance.find((a) => a.membershipId === room.member.id)?.status === v
              return (
                <button
                  key={v}
                  type="button"
                  className={isCurrent ? 'active' : ''}
                  onClick={() =>
                    void action(async () => {
                      const r = await api.put<Room>(
                        `/rooms/${roomId}/attendance`,
                        { status: v },
                        { headers: { Authorization: `Bearer ${token}` } }
                      )
                      onRoom(r.data)
                      await refresh()
                    })
                  }
                >
                  {l}
                </button>
              )
            })}
          </div>
          <div className="attendance-list">
            {data?.attendance.map((a) => (
              <div key={a.membershipId}>
                <strong>{a.displayName}</strong>
                <span>{attendanceLabel(a.status)}</span>
              </div>
            ))}
          </div>
          <p className="toolkit-muted">Tên thành viên công khai trong phòng.</p>
        </div>
      )}

      {panel === 'notifications' && (
        <div className="toolkit-panel">
          <div className="toolkit-heading">
            <h2>Hoạt động phòng</h2>
            <button
              className="secondary-button"
              onClick={() =>
                void action(async () => {
                  await markRoomNotificationsRead(roomId, token)
                  await refresh()
                })
              }
            >
              Đánh dấu đã đọc
            </button>
          </div>
          {!data?.notifications.length ? (
            <p className="toolkit-muted">Chưa có thông báo mới.</p>
          ) : (
            data.notifications.map((n) => (
              <article className={`room-notification ${n.read ? 'read' : ''}`} key={n.id}>
                <strong>{n.title}</strong>
                <p>{n.body}</p>
                <small>{new Date(n.createdAt).toLocaleString('vi-VN')}</small>
              </article>
            ))
          )}
        </div>
      )}

      {panel === 'expenses' && (
        <div className="toolkit-panel">
          <h2>Sổ chi tiêu · minh bạch cho cả phòng</h2>
          <p className="toolkit-muted">
            Ai trong phòng cũng có thể thêm, sửa hoặc xóa khoản chi. Lịch sử ghi nhận người chỉnh
            sửa.
          </p>
          <form className="toolkit-form" onSubmit={saveExpense}>
            <label>
              Nội dung khoản chi
              <input
                required
                maxLength={160}
                value={expenseTitle}
                onChange={(e) => setExpenseTitle(e.target.value)}
                placeholder="Ví dụ: tiền ăn tối"
              />
            </label>
            <label>
              Tổng tiền (₫)
              <input
                required
                type="number"
                min="1"
                step="1"
                value={expenseTotal}
                onChange={(e) => setExpenseTotal(e.target.value)}
              />
            </label>
            <label>
              Ghi chú
              <input
                maxLength={1000}
                value={expenseNote}
                onChange={(e) => setExpenseNote(e.target.value)}
              />
            </label>
            <div className="expense-allocation">
              <strong>Ai đã trả? (có thể chọn nhiều người)</strong>
              {expenseMembers.map((m) => (
                <label key={m.id}>
                  {m.displayName}
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    value={payers[m.id] ?? ''}
                    onChange={(e) => setPayers({ ...payers, [m.id]: e.target.value })}
                  />
                </label>
              ))}
            </div>
            <div className="expense-allocation">
              <strong>Ai cùng chia khoản này?</strong>
              <button
                type="button"
                className="text-link"
                onClick={() => {
                  const each = Math.floor(Number(expenseTotal || 0) / room.members.length)
                  const remainder = Number(expenseTotal || 0) - each * room.members.length
                  setShares(
                    Object.fromEntries(
                      room.members.map((m, i) => [
                        m.id,
                        String(each + (i === 0 ? remainder : 0)),
                      ])
                    )
                  )
                }}
              >
                Chia đều cho cả phòng
              </button>
              {expenseMembers.map((m) => (
                <label key={m.id}>
                  {m.displayName}
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    value={shares[m.id] ?? ''}
                    onChange={(e) => setShares({ ...shares, [m.id]: e.target.value })}
                  />
                </label>
              ))}
            </div>
            <button className="primary-button" disabled={busy}>
              {expenseId ? 'Lưu sửa khoản chi' : 'Thêm khoản chi'}
            </button>
            {expenseId && (
              <button
                type="button"
                className="secondary-button"
                onClick={() => setExpenseId('')}
              >
                Hủy sửa
              </button>
            )}
          </form>

          {book?.expenses.map((e) => (
            <article className="expense-card" key={e.id}>
              <div className="toolkit-heading">
                <strong>
                  {e.title} · {money(e.totalAmount)}
                </strong>
                <span>
                  <button onClick={() => beginEdit(e)}>Sửa</button>
                  <button
                    onClick={() => {
                      if (confirm('Xóa khoản chi?'))
                        void action(async () => {
                          await deleteRoomExpense(roomId, e.id, token)
                          await refresh()
                        })
                    }}
                  >
                    Xóa
                  </button>
                </span>
              </div>
              <p>
                Trả:{' '}
                {e.payers.map((p) => `${p.displayName} ${money(p.amount)}`).join(' · ')}
              </p>
              <p>
                Chia:{' '}
                {e.shares.map((s) => `${s.displayName} ${money(s.amount)}`).join(' · ')}
              </p>
            </article>
          ))}

          {(book?.balances?.suggestedTransfers?.length ?? 0) > 0 && (
            <div className="expense-balance">
              <strong>Gợi ý thanh toán để cân bằng</strong>
              {book?.balances?.suggestedTransfers.map((t, i) => (
                <p key={i}>
                  {t.from} chuyển {money(t.amount)} cho {t.to}{' '}
                  <button type="button" onClick={() => void confirmTransfer(t)}>
                    Đã thanh toán
                  </button>
                </p>
              ))}
            </div>
          )}

          {(book?.balances?.settlements?.length ?? 0) > 0 && (
            <details>
              <summary>Lịch sử chuyển tiền</summary>
              {book?.balances?.settlements.map((s) => (
                <p key={s.id}>
                  {s.from} → {s.to} · {money(s.amount)} · {s.status}
                </p>
              ))}
            </details>
          )}

          <details>
            <summary>Lịch sử chỉnh sửa</summary>
            {book?.audit.map((a) => (
              <p key={a.id}>
                {a.actor} · {a.action} · {a.description}
              </p>
            ))}
          </details>
        </div>
      )}

      {panel === 'recommend' && (
        <div className="toolkit-panel">
          <h2>Ưu tiên của bạn</h2>
          <div className="toolkit-form">
            <label>
              Sở thích / điều cần lưu ý
              <input
                value={prefs}
                onChange={(e) => setPrefs(e.target.value)}
                placeholder="Món chay, hoạt động ngoài trời…"
              />
            </label>
            <div className="toolkit-fields">
              <label>
                Ngân sách tối thiểu/người
                <input
                  type="number"
                  min="0"
                  value={budgetMin}
                  onChange={(e) => setBudgetMin(e.target.value)}
                />
              </label>
              <label>
                Ngân sách tối đa/người
                <input
                  type="number"
                  min="0"
                  value={budgetMax}
                  onChange={(e) => setBudgetMax(e.target.value)}
                />
              </label>
            </div>
            <button className="primary-button" onClick={() => void savePrefs()}>
              Lưu ưu tiên
            </button>
            <h3>Đề xuất trong phòng</h3>
            {suggestion.map(({ proposal }) => (
              <div className="suggestion-row" key={proposal.id}>
                <strong>{proposal.title}</strong>
                <span>
                  {proposal.location || 'Chưa có địa điểm'} ·{' '}
                  {proposal.estimatedCostPerPerson != null
                    ? money(proposal.estimatedCostPerPerson)
                    : 'Chưa ước tính chi phí'}{' '}
                  · {proposal.voteCount} bình chọn
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {panel === 'rides' && (
        <div className="toolkit-panel">
          <h2>Đi chung xe</h2>
          <form
            className="toolkit-form"
            onSubmit={(e) => {
              e.preventDefault()
              void saveRideForm()
            }}
          >
            <label className="inline-check">
              <input
                type="checkbox"
                checked={hasVehicle}
                onChange={(e) => setHasVehicle(e.target.checked)}
              />
              Mình có xe
            </label>
            {hasVehicle && (
              <label>
                Số chỗ còn trống
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={seats}
                  onChange={(e) => setSeats(e.target.value)}
                />
              </label>
            )}
            <label>
              Khu vực có thể đón
              <input value={pickup} onChange={(e) => setPickup(e.target.value)} />
            </label>
            <label>
              Ghi chú
              <input value={rideNote} onChange={(e) => setRideNote(e.target.value)} />
            </label>
            <button className="primary-button">Lưu thông tin xe</button>
          </form>
          <div className="attendance-list">
            {data?.rides.map((r) => (
              <div key={r.membershipId}>
                <strong>
                  {r.displayName}
                  {!r.registered
                    ? ' · chưa cập nhật'
                    : r.hasVehicle
                    ? ` · có xe (${r.seatsAvailable} chỗ trống)`
                    : ' · không có xe'}
                </strong>
                <span>{r.pickupArea}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {panel === 'weather' && (
        <div className="toolkit-panel">
          <h2>Dự báo cho ngày hẹn</h2>
          {location && date && weather ? (
            <div className={`weather-card ${(weather.chance ?? 0) >= 50 ? 'weather-alert' : ''}`}>
              <strong>
                {(weather.chance ?? 0) >= 50 ? '⚠ Có khả năng mưa cao' : 'Dự báo hiện tại'}
              </strong>
              <p>
                {weather.chance == null
                  ? 'Chưa có xác suất mưa'
                  : `Khả năng mưa ${weather.chance}%`}{' '}
                {weather.max != null && ` · Nhiệt độ cao nhất ${weather.max}°C`}
              </p>
              <small>Dự báo có thể thay đổi; hãy kiểm tra lại gần ngày đi.</small>
              {(weather.chance ?? 0) >= 50 && fallback && (
                <p>
                  <b>Phương án dự phòng:</b> {fallback}
                </p>
              )}
            </div>
          ) : (
            <p className="toolkit-muted">
              Chọn ngày và vị trí cuộc hẹn trong mục Kế hoạch để xem dự báo.
            </p>
          )}
          <p className="map-attribution">
            Dữ liệu dự báo: Open-Meteo · Bản đồ © OpenStreetMap contributors
          </p>
        </div>
      )}
    </section>
  )
}

function distanceKm(a: Point, b: Point) {
  const rad = (x: number) => (x * Math.PI) / 180
  const dLat = rad(a.lat - b.lat)
  const dLon = rad(a.lon - b.lon)
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
}
