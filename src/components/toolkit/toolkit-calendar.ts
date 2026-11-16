import { getPushConfig, getRoomCalendarLink, saveRoomCalendarLink } from '../../api'
import type { Room } from '../../types'

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

export async function syncGoogleCalendar(room: Room, roomId: string, token: string) {
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
    ? {
        dateTime: `${room.eventDate}T${room.eventTime.slice(0, 5)}:00+07:00`,
        timeZone: 'Asia/Ho_Chi_Minh',
      }
    : { date: room.eventDate }
  const next = new Date(`${room.eventDate}T12:00:00`)
  next.setDate(next.getDate() + 1)
  const end = room.eventTime
    ? {
        dateTime: new Date(
          new Date(`${room.eventDate}T${room.eventTime.slice(0, 5)}:00+07:00`).getTime() + 3600000
        ).toISOString(),
        timeZone: 'Asia/Ho_Chi_Minh',
      }
    : { date: next.toISOString().slice(0, 10) }
  const event = {
    summary: room.name,
    description: [
      room.planNotes,
      room.weatherFallback ? `Phương án dự phòng: ${room.weatherFallback}` : null,
    ]
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
    throw new Error(
      'Google Calendar không chấp nhận cập nhật. Kiểm tra quyền Calendar của tài khoản.'
    )
  const resData = await response.json()
  if (resData.id) await saveRoomCalendarLink(roomId, resData.id, token)
}
