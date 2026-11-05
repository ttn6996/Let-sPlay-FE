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
  selectedProposalId: string | null
  proposals: Proposal[]
}

export type Proposal = { id: string; title: string; description: string | null; scheduledTime: string | null; createdAt: string; voteCount: number; voters: { membershipId: string; displayName: string }[]; votedByMe: boolean }
export type RoomPreview = Pick<Room, 'id' | 'name' | 'inviteCode' | 'status' | 'phase' | 'memberCount' | 'eventDate' | 'eventTime' | 'region'>
export type Account = { id: string; email: string; displayName: string }
export type AuthResponse = { accessToken: string; expiresAt: string; account: Account }
export type SavedRoom = { id: string; name: string; inviteCode: string; phase: string; status: string; eventDate: string | null; eventTime: string | null; region: string | null; createdAt: string; revision: number; memberCount: number; role: 'HOST' | 'MEMBER' }
