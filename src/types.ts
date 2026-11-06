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
  member: RoomMember
  members: RoomMember[]
  accessToken: string | null
  selectedProposalId: string | null
  proposals: Proposal[]
  availabilitySlots: AvailabilitySlot[]
  availabilityTitle: string
}

export type RoomMember = { id: string; displayName: string; role: 'HOST' | 'MEMBER'; online: boolean }
export type RoomComment = {id:string;displayName:string;content:string;createdAt:string;writtenByMe:boolean}
export type Proposal = { id: string; createdByMe: boolean; title: string; description: string | null; scheduledTime: string | null; createdAt: string; voteCount: number; voters: { displayName: string }[]; votedByMe: boolean; completed: boolean; comments:RoomComment[] }
export type AvailabilitySlot = {id:string;startsAt:string;availableCount:number;availableByMe:boolean;selected:boolean;comments:RoomComment[]}
export type RoomPreview = Pick<Room, 'id' | 'name' | 'inviteCode' | 'status' | 'phase' | 'memberCount' | 'eventDate' | 'eventTime' | 'region'>
export type Account = { id: string; email: string; displayName: string }
export type AuthResponse = { accessToken: string; expiresAt: string; account: Account }
export type SavedRoom = { id: string; name: string; inviteCode: string; phase: string; status: string; eventDate: string | null; eventTime: string | null; region: string | null; createdAt: string; revision: number; memberCount: number; role: 'HOST' | 'MEMBER' }
export type MyRoomSummary = { roomId: string; name: string; inviteCode: string; phase: string; viewerRole: 'HOST' | 'MEMBER'; memberCount: number; revision: number; updatedAt: string }
