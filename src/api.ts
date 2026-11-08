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
export function getPushConfig(){return api.get<{vapidPublicKey:string;googleClientId:string}>('/system/public-config')}
export function savePushSubscription(roomId:string,token:string,subscription:PushSubscription){
  return api.post<void>(`/rooms/${encodeURIComponent(roomId)}/push-subscriptions`,subscription.toJSON(),{headers:{Authorization:`Bearer ${token}`}})
}
export function previewRoom(inviteCode: string) {
  return api.post<RoomPreview>('/rooms/preview', { inviteCode: inviteCode.trim().toUpperCase() })
}
export function claimRoom(roomId: string, accountToken: string, guestToken: string) {
  return api.post(`/rooms/${encodeURIComponent(roomId)}/claim`, {}, { headers: { Authorization: `Bearer ${accountToken}`, 'X-Guest-Token': guestToken } })
}
export function createProposal(roomId: string, payload: { title: string; description?: string; scheduledTime?: string | null;location?:string|null;estimatedCostPerPerson?:number|null;latitude?:number|null;longitude?:number|null }, token: string) {
  return api.post<Room>(`/rooms/${encodeURIComponent(roomId)}/proposals`, payload, { headers: { Authorization: `Bearer ${token}` } })
}
export function toggleVote(roomId: string, proposalId: string, token: string) {
  return api.post<Room>(`/rooms/${encodeURIComponent(roomId)}/proposals/${encodeURIComponent(proposalId)}/vote`, {}, { headers: { Authorization: `Bearer ${token}` } })
}
export function updateAvailabilityOptions(roomId:string,title:string,startsAt:string[],token:string){
  return api.put<Room>(`/rooms/${encodeURIComponent(roomId)}/availability/options`,{title,startsAt},{headers:{Authorization:`Bearer ${token}`}})
}
export function addAvailabilitySlots(roomId:string,startsAt:string[],token:string){
  return api.post<Room>(`/rooms/${encodeURIComponent(roomId)}/availability/slots`,{startsAt},{headers:{Authorization:`Bearer ${token}`}})
}
export function commentOnProposal(roomId:string,proposalId:string,content:string,token:string){
  return api.post<Room>(`/rooms/${encodeURIComponent(roomId)}/proposals/${encodeURIComponent(proposalId)}/comments`,{content},{headers:{Authorization:`Bearer ${token}`}})
}
export function commentOnAvailabilitySlot(roomId:string,slotId:string,content:string,token:string){
  return api.post<Room>(`/rooms/${encodeURIComponent(roomId)}/availability/${encodeURIComponent(slotId)}/comments`,{content},{headers:{Authorization:`Bearer ${token}`}})
}
export function updateAvailability(roomId:string,slotIds:string[],token:string){
  return api.put<Room>(`/rooms/${encodeURIComponent(roomId)}/availability`,{slotIds},{headers:{Authorization:`Bearer ${token}`}})
}
export function selectAvailabilitySlot(roomId:string,slotId:string,token:string){
  return api.post<Room>(`/rooms/${encodeURIComponent(roomId)}/availability/${encodeURIComponent(slotId)}/select`,{},{headers:{Authorization:`Bearer ${token}`}})
}
export function updateRoomPhase(roomId: string, payload: { phase: string; selectedProposalId?: string | null }, token: string) {
  return api.post<Room>(`/rooms/${encodeURIComponent(roomId)}/phase`, payload, { headers: { Authorization: `Bearer ${token}` } })
}
export function leaveRoom(roomId: string, token: string) {
  return api.post<void>(`/rooms/${encodeURIComponent(roomId)}/leave`, {}, { headers: { Authorization: `Bearer ${token}` } })
}
export function updateProposal(roomId:string,proposalId:string,payload:{title:string;description?:string;scheduledTime?:string|null;location?:string|null;estimatedCostPerPerson?:number|null;latitude?:number|null;longitude?:number|null},token:string){
  return api.put<Room>(`/rooms/${encodeURIComponent(roomId)}/proposals/${encodeURIComponent(proposalId)}`,payload,{headers:{Authorization:`Bearer ${token}`}})
}
export function deleteProposal(roomId:string,proposalId:string,token:string){
  return api.delete<Room>(`/rooms/${encodeURIComponent(roomId)}/proposals/${encodeURIComponent(proposalId)}`,{headers:{Authorization:`Bearer ${token}`}})
}
export function setProposalCompleted(roomId:string,proposalId:string,completed:boolean,token:string){
  return api.put<Room>(`/rooms/${encodeURIComponent(roomId)}/proposals/${encodeURIComponent(proposalId)}/completion`,{completed},{headers:{Authorization:`Bearer ${token}`}})
}
export function kickMember(roomId:string,membershipId:string,token:string){
  return api.delete<void>(`/rooms/${encodeURIComponent(roomId)}/members/${encodeURIComponent(membershipId)}`,{headers:{Authorization:`Bearer ${token}`}})
}

const roomHeaders=(token:string)=>({headers:{Authorization:`Bearer ${token}`}})
export type ExpenseAllocation={membershipId:string;amount:number}
export type ExpensePayload={title:string;totalAmount:number;note?:string;payers:ExpenseAllocation[];shares:ExpenseAllocation[]}
export function updateRoomPlan(roomId:string,payload:{name:string;eventDate:string|null;eventTime:string|null;region:string|null;notes:string|null;latitude:number|null;longitude:number|null;weatherFallback:string|null;cancelled:boolean},token:string){return api.put<Room>(`/rooms/${encodeURIComponent(roomId)}/plan`,payload,roomHeaders(token))}
export function setAttendance(roomId:string,status:string,token:string){return api.put<Room>(`/rooms/${encodeURIComponent(roomId)}/attendance`,{status},roomHeaders(token))}
export function getRoomCollaboration(roomId:string,token:string){return api.get<RoomCollaboration>(`/rooms/${encodeURIComponent(roomId)}/collaboration`,roomHeaders(token))}
export function markRoomNotificationsRead(roomId:string,token:string){return api.post<void>(`/rooms/${encodeURIComponent(roomId)}/notifications/read`,{},roomHeaders(token))}
export function saveMeetupPoint(roomId:string,latitude:number|null,longitude:number|null,token:string){return api.put<void>(`/rooms/${encodeURIComponent(roomId)}/meetup-point`,{latitude,longitude},roomHeaders(token))}
export function saveRoomPreferences(roomId:string,payload:{preferences:string;budgetMin:number|null;budgetMax:number|null},token:string){return api.put<void>(`/rooms/${encodeURIComponent(roomId)}/preferences`,payload,roomHeaders(token))}
export function saveRoomRide(roomId:string,payload:{hasVehicle:boolean;seatsAvailable:number;pickupArea:string;note:string},token:string){return api.put<void>(`/rooms/${encodeURIComponent(roomId)}/ride`,payload,roomHeaders(token))}
export function getRoomExpenses(roomId:string,token:string){return api.get<RoomExpenseBook>(`/rooms/${encodeURIComponent(roomId)}/expenses`,roomHeaders(token))}
export function createRoomExpense(roomId:string,payload:ExpensePayload,token:string){return api.post(`/rooms/${encodeURIComponent(roomId)}/expenses`,payload,roomHeaders(token))}
export function updateRoomExpense(roomId:string,id:string,payload:ExpensePayload,token:string){return api.put(`/rooms/${encodeURIComponent(roomId)}/expenses/${encodeURIComponent(id)}`,payload,roomHeaders(token))}
export function deleteRoomExpense(roomId:string,id:string,token:string){return api.delete(`/rooms/${encodeURIComponent(roomId)}/expenses/${encodeURIComponent(id)}`,roomHeaders(token))}
export function createRoomSettlement(roomId:string,payload:{fromMembershipId:string;toMembershipId:string;amount:number},token:string){return api.post(`/rooms/${encodeURIComponent(roomId)}/settlements`,payload,roomHeaders(token))}
export function getRoomCalendarLink(roomId:string,token:string){return api.get<{eventId:string|null}>(`/rooms/${encodeURIComponent(roomId)}/calendar-link`,roomHeaders(token))}
export function saveRoomCalendarLink(roomId:string,eventId:string,token:string){return api.put<void>(`/rooms/${encodeURIComponent(roomId)}/calendar-link`,{eventId},roomHeaders(token))}
export type RoomCollaboration={attendance:{membershipId:string;displayName:string;status:string}[];preferences:{membershipId:string;preferences:string;budgetMin:number;budgetMax:number}[];rides:{membershipId:string;displayName:string;registered:boolean;hasVehicle:boolean;seatsAvailable:number;pickupArea:string;note:string}[];notifications:{id:string;type:string;title:string;body:string;createdAt:string;read:boolean}[];planHistory:{id:string;actor:string;summary:string;createdAt:string}[]}
export type RoomExpenseBook={expenses:{id:string;title:string;totalAmount:number;note:string;payers:{membershipId:string;displayName:string;amount:number}[];shares:{membershipId:string;displayName:string;amount:number}[]}[];audit:{id:string;actor:string;action:string;description:string;createdAt:string}[];balances:{members:{membershipId:string;displayName:string;netAmount:number}[];suggestedTransfers:{fromMembershipId:string;from:string;toMembershipId:string;to:string;amount:number}[];settlements:{id:string;from:string;to:string;amount:number;status:string}[]}}

export type RoomUpdate = { roomId: string; revision: number; changedAt: string; eventType?: 'revision'|'presence' }
export type ProposalCreatedUpdate = {roomId:string;proposalId:string;title:string;createdAt:string}

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
  onProposalCreated: (update:ProposalCreatedUpdate)=>void = ()=>undefined,
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
        if (eventName === 'room.proposal-created' && data) onProposalCreated(JSON.parse(data) as ProposalCreatedUpdate)
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
