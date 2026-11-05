import axios from 'axios'
import type { Account, AuthResponse, MyRoomSummary, Room, RoomPreview } from './types'
export type { Account, AuthResponse, MyRoomSummary, Proposal, Room, RoomMember, RoomPreview, SavedRoom } from './types'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8082/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
})

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
  if (room.accessToken) { sessionStorage.setItem(`letsplay.room.${room.id}`, room.accessToken); localStorage.setItem(`letsplay.room.${room.id}`,room.accessToken) }
}

export function getRoomToken(roomId: string) {
  return sessionStorage.getItem(`letsplay.room.${roomId}`) ?? localStorage.getItem(`letsplay.room.${roomId}`)
}

export function getGuestRoomSessions(){
  const sessions=new Map<string,string>()
  for(const storage of [localStorage,sessionStorage]) for(let i=0;i<storage.length;i++){
    const key=storage.key(i)
    if(key?.startsWith('letsplay.room.')){const token=storage.getItem(key);if(token)sessions.set(key.slice('letsplay.room.'.length),token)}
  }
  return [...sessions.entries()].map(([roomId,token])=>({roomId,token}))
}
export function getMyRooms(accountToken?:string|null,guestTokens:string[]=[]){
  return api.get<MyRoomSummary[]>('/rooms/mine',{headers:{...(accountToken?{Authorization:`Bearer ${accountToken}`}:{ } ),...(guestTokens.length?{'X-Guest-Tokens':guestTokens.join(',')}:{})}})
}

export function forgetAuth() { localStorage.removeItem(accountTokenKey); localStorage.removeItem('letsplay.account') }

export function getRoom(roomId: string, token: string, signal?: AbortSignal) {
  return api.get<Room>(`/rooms/${encodeURIComponent(roomId)}`, { headers: { Authorization: `Bearer ${token}` }, signal })
}
export function previewRoom(inviteCode: string) {
  return api.post<RoomPreview>('/rooms/preview', { inviteCode: inviteCode.trim().toUpperCase() })
}
export function claimRoom(roomId: string, accountToken: string, guestToken: string) {
  return api.post(`/rooms/${encodeURIComponent(roomId)}/claim`, {}, { headers: { Authorization: `Bearer ${accountToken}`, 'X-Guest-Token': guestToken } })
}
export function createProposal(roomId: string, payload: { title: string; description?: string; scheduledTime?: string | null }, token: string) {
  return api.post<Room>(`/rooms/${encodeURIComponent(roomId)}/proposals`, payload, { headers: { Authorization: `Bearer ${token}` } })
}
export function toggleVote(roomId: string, proposalId: string, token: string) {
  return api.post<Room>(`/rooms/${encodeURIComponent(roomId)}/proposals/${encodeURIComponent(proposalId)}/vote`, {}, { headers: { Authorization: `Bearer ${token}` } })
}
export function updateRoomPhase(roomId: string, payload: { phase: string; selectedProposalId?: string | null }, token: string) {
  return api.post<Room>(`/rooms/${encodeURIComponent(roomId)}/phase`, payload, { headers: { Authorization: `Bearer ${token}` } })
}
export function leaveRoom(roomId: string, token: string) {
  return api.post<void>(`/rooms/${encodeURIComponent(roomId)}/leave`, {}, { headers: { Authorization: `Bearer ${token}` } })
}
export function updateProposal(roomId:string,proposalId:string,payload:{title:string;description?:string;scheduledTime?:string|null},token:string){
  return api.put<Room>(`/rooms/${encodeURIComponent(roomId)}/proposals/${encodeURIComponent(proposalId)}`,payload,{headers:{Authorization:`Bearer ${token}`}})
}
export function deleteProposal(roomId:string,proposalId:string,token:string){
  return api.delete<Room>(`/rooms/${encodeURIComponent(roomId)}/proposals/${encodeURIComponent(proposalId)}`,{headers:{Authorization:`Bearer ${token}`}})
}
export function kickMember(roomId:string,membershipId:string,token:string){
  return api.delete<void>(`/rooms/${encodeURIComponent(roomId)}/members/${encodeURIComponent(membershipId)}`,{headers:{Authorization:`Bearer ${token}`}})
}

export type RoomUpdate = { roomId: string; revision: number; changedAt: string; eventType?: 'revision'|'presence' }

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
      ...(lastRevision > 0 ? { 'Last-Event-ID': String(lastRevision) } : {}),
    },
    signal,
  })
  if (!response.ok) throw new RealtimeRequestError(response.status)
  if (!response.body) throw new Error('Realtime stream has no response body')

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) return
      buffer += decoder.decode(value, { stream: true })
      let boundary = buffer.search(/\r?\n\r?\n/)
      while (boundary >= 0) {
        const frame = buffer.slice(0, boundary)
        const delimiter = buffer.slice(boundary).match(/^\r?\n\r?\n/)?.[0].length ?? 2
        buffer = buffer.slice(boundary + delimiter)
        const lines = frame.split(/\r?\n/)
        const eventName = lines.find(line => line.startsWith('event:'))?.slice(6).trim()
        const data = lines.filter(line => line.startsWith('data:')).map(line => line.slice(5).trim()).join('\n')
        if (eventName === 'ready') onReady()
        if (eventName === 'room.updated' && data) onUpdate({ ...(JSON.parse(data) as RoomUpdate),eventType:'revision' })
        if (eventName === 'room.presence' && data) onUpdate({ ...(JSON.parse(data) as RoomUpdate),eventType:'presence' })
        boundary = buffer.search(/\r?\n\r?\n/)
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
