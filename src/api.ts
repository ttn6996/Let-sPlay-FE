import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8082/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
})

export type Room = {
  id: string
  name: string
  inviteCode: string
  phase: string
  status: string
  eventDate: string | null
  eventTime: string | null
  region: string | null
  createdAt: string
  revision: number
  memberCount: number
  member: { id: string; displayName: string; role: 'HOST' | 'MEMBER' }
  accessToken: string | null
}

export type RoomPreview = Pick<Room, 'id' | 'name' | 'inviteCode' | 'status' | 'eventDate' | 'eventTime' | 'region'>

export type Account = { id: string; email: string; displayName: string }
export type AuthResponse = { accessToken: string; expiresAt: string; account: Account }
export type SavedRoom = Omit<Room, 'member' | 'accessToken'> & { role: 'HOST' | 'MEMBER' }
const accountTokenKey = 'letsplay.accountToken'
export function getAccountToken() { return localStorage.getItem(accountTokenKey) }
export function saveAuth(auth: AuthResponse) { localStorage.setItem(accountTokenKey, auth.accessToken); localStorage.setItem('letsplay.account', JSON.stringify(auth.account)) }
export function getSavedAccount(): Account | null {
  try { return JSON.parse(localStorage.getItem('letsplay.account') ?? 'null') as Account | null } catch { return null }
}

export function getGuestId() {
  const key = 'letsplay.guestId'
  let guestId = sessionStorage.getItem(key)
  if (!guestId) {
    guestId = crypto.randomUUID()
    sessionStorage.setItem(key, guestId)
  }
  return guestId
}

export function saveRoomSession(room: Room) {
  if (room.accessToken) sessionStorage.setItem(`letsplay.room.${room.id}`, room.accessToken)
}

export function getRoomToken(roomId: string) {
  return sessionStorage.getItem(`letsplay.room.${roomId}`)
}

export function forgetAuth() { localStorage.removeItem(accountTokenKey); localStorage.removeItem('letsplay.account') }

export type RoomUpdate = { roomId: string; revision: number; changedAt: string }

export class RealtimeRequestError extends Error {
  readonly status: number

  constructor(status: number) {
    super(`Realtime connection failed with HTTP ${status}`)
    this.status = status
  }
}

export async function streamRoomEvents(
  roomId: string,
  token: string,
  lastRevision: number,
  signal: AbortSignal,
  onReady: () => void,
  onUpdate: (update: RoomUpdate) => void,
) {
  const baseUrl = api.defaults.baseURL ?? 'http://localhost:8082/api'
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/rooms/${encodeURIComponent(roomId)}/events`, {
    headers: {
      Accept: 'text/event-stream',
      Authorization: `Bearer ${token}`,
      'Last-Event-ID': String(lastRevision),
    },
    signal,
  })
  if (!response.ok) throw new RealtimeRequestError(response.status)
  if (!response.body) throw new Error('Realtime stream has no response body')

  onReady()
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) return
      buffer += decoder.decode(value, { stream: true })
      buffer = buffer.replace(/\r\n/g, '\n')
      let boundary = buffer.indexOf('\n\n')
      while (boundary >= 0) {
        const frame = buffer.slice(0, boundary)
        buffer = buffer.slice(boundary + 2)
        const lines = frame.split('\n')
        const eventName = lines.find(line => line.startsWith('event:'))?.slice(6).trim()
        const data = lines.filter(line => line.startsWith('data:')).map(line => line.slice(5).trim()).join('\n')
        if (eventName === 'ready') onReady()
        if (eventName === 'room.updated' && data) onUpdate(JSON.parse(data) as RoomUpdate)
        boundary = buffer.indexOf('\n\n')
      }
    }
  } finally {
    reader.releaseLock()
  }
}

export function getApiError(error: unknown) {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message ?? 'Không kết nối được máy chủ. Hãy thử lại.'
  }
  return 'Có lỗi xảy ra. Hãy thử lại.'
}
