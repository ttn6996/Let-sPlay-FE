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
  member: { id: string; displayName: string; role: 'HOST' | 'MEMBER' }
  accessToken: string | null
}

export type RoomPreview = Pick<Room, 'id' | 'name' | 'inviteCode' | 'status' | 'eventDate' | 'eventTime' | 'region'>

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

export function getApiError(error: unknown) {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message ?? 'Không kết nối được máy chủ. Hãy thử lại.'
  }
  return 'Có lỗi xảy ra. Hãy thử lại.'
}
