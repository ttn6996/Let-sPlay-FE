import '../styles.css'
import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeftOutlined } from '@ant-design/icons'
import gsap from 'gsap'
import {
  commentOnProposal,
  getAccountToken,
  getApiError,
  getRoomToken,
  kickMember,
  leaveRoom,
  toggleVote,
  type Room,
} from '../api'
import { useRoomRealtime } from '../hooks/useRoomRealtime'
import { ConnectionStatus } from '../components/ConnectionStatus'
import {
  enableRoomNotifications,
  requestRoomPushPermission,
  unlockNotificationSound,
} from '../notifications'
import { AvailabilityPanel } from '../components/AvailabilityPanel'
import { RoomHero } from '../components/room/RoomHero'
import { RoomTabsNav, type RoomTab } from '../components/room/RoomTabsNav'
import { ProposalsTab } from '../components/room/ProposalsTab'
import { ToolkitTab } from '../components/room/ToolkitTab'
import { MembersTab } from '../components/room/MembersTab'

export default function RoomPage() {
  const { roomId = '' } = useParams()
  const token = getAccountToken() ?? getRoomToken(roomId)
  const {
    room,
    setRoom,
    error,
    realtimeState,
    currentRevisionRef,
    proposalNotice,
    setProposalNotice,
  } = useRoomRealtime(roomId, token)

  const [roomTab, setRoomTab] = useState<RoomTab>('proposals')
  const [actionError, setActionError] = useState('')
  const [copied, setCopied] = useState(false)
  const [qrOpen, setQrOpen] = useState(false)
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({})
  const pushPromptAttempted = useRef(false)
  const roomWelcomeRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!proposalNotice) return
    const timer = window.setTimeout(() => setProposalNotice(''), 5500)
    return () => window.clearTimeout(timer)
  }, [proposalNotice, setProposalNotice])

  useEffect(() => {
    if (room?.id && token && 'Notification' in window && Notification.permission === 'granted')
      void enableRoomNotifications(roomId, token).catch(() => undefined)
  }, [room?.id, roomId, token])

  useEffect(() => {
    if (!room || !roomWelcomeRef.current) return
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) return

    const ctx = gsap.context(() => {
      gsap.from('.room-facts > div', {
        y: 14,
        opacity: 0,
        stagger: 0.06,
        duration: 0.6,
        ease: 'power3.out',
      })
      gsap.from('.room-details-card', {
        y: 16,
        opacity: 0,
        duration: 0.7,
        delay: 0.15,
        ease: 'power3.out',
      })
    }, roomWelcomeRef)

    return () => ctx.revert()
  }, [room])

  function onRoomGesture() {
    unlockNotificationSound()
    if (
      pushPromptAttempted.current ||
      !token ||
      !('Notification' in window) ||
      Notification.permission !== 'default'
    )
      return
    pushPromptAttempted.current = true
    void requestRoomPushPermission().then((granted) => {
      if (granted) void enableRoomNotifications(roomId, token).catch(() => undefined)
    })
  }

  async function runRoomAction(action: () => Promise<{ data: Room }>): Promise<boolean> {
    setActionError('')
    try {
      const response = await action()
      if (response.data.revision >= currentRevisionRef.current) {
        currentRevisionRef.current = response.data.revision
        setRoom(response.data)
      }
      return true
    } catch (requestError) {
      setActionError(getApiError(requestError))
      return false
    }
  }

  async function copyInvite() {
    try {
      await copyText(`${window.location.origin}/?code=${encodeURIComponent(room?.inviteCode ?? '')}`)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setActionError('Không thể sao chép. Hãy sao chép mã mời thủ công.')
    }
  }

  async function copyText(value: string) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value)
        return
      }
    } catch {
      /* Use fallback below */
    }
    const textarea = document.createElement('textarea')
    textarea.value = value
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.append(textarea)
    textarea.select()
    const isCopied = document.execCommand('copy')
    textarea.remove()
    if (!isCopied) throw new Error('Clipboard unavailable')
  }

  async function copyInviteCode() {
    try {
      await copyText(room?.inviteCode ?? '')
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setActionError('Không thể sao chép mã mời.')
    }
  }

  function selectedProposal() {
    return room?.proposals.find((proposal) => proposal.id === room.selectedProposalId) ?? null
  }

  function calendarStart(value: string | null) {
    if (room?.eventDate && room.eventTime) return new Date(`${room.eventDate}T${room.eventTime}`)
    if (room?.eventDate && value) return new Date(`${room.eventDate}T${value.slice(11, 16)}`)
    if (value) return new Date(value)
    return null
  }

  function calendarDay(value: string) {
    return value.replaceAll('-', '')
  }

  function calendarNextDay(value: string) {
    const [year, month, day] = value.split('-').map(Number)
    const next = new Date(year, month - 1, day + 1)
    return `${next.getFullYear()}${String(next.getMonth() + 1).padStart(2, '0')}${String(
      next.getDate()
    ).padStart(2, '0')}`
  }

  function addCalendar() {
    const proposal = selectedProposal()
    if (!proposal) return
    const start = calendarStart(proposal.scheduledTime)
    const end = start ? new Date(start.getTime() + 60 * 60 * 1000) : null
    const format = (date: Date) =>
      date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
    const details =
      [proposal.description, room?.region ? `Khu vực: ${room.region}` : null]
        .filter(Boolean)
        .join('\n') || `Cuộc hẹn: ${room?.name ?? ''}`
    const params = new URLSearchParams({ action: 'TEMPLATE', text: proposal.title, details })
    if (room?.eventDate && !room.eventTime && !proposal.scheduledTime)
      params.set('dates', `${calendarDay(room.eventDate)}/${calendarNextDay(room.eventDate)}`)
    else if (start && end) params.set('dates', `${format(start)}/${format(end)}`)
    if (room?.region) params.set('location', room.region)
    window.open(
      `https://calendar.google.com/calendar/render?${params.toString()}`,
      '_blank',
      'noopener,noreferrer'
    )
  }

  function downloadCalendar() {
    const proposal = selectedProposal()
    if (!proposal) return
    const start = calendarStart(proposal.scheduledTime)
    const end = start ? new Date(start.getTime() + 60 * 60 * 1000) : null
    const format = (date: Date) =>
      date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
    const escape = (text: string) =>
      text.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;')
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//LetsPlay//Room Planner//VI',
      'BEGIN:VEVENT',
      `UID:${proposal.id}@letsplay`,
      `DTSTAMP:${format(new Date())}`,
    ]
    if (room?.eventDate && !room.eventTime && !proposal.scheduledTime)
      lines.push(
        `DTSTART;VALUE=DATE:${calendarDay(room.eventDate)}`,
        `DTEND;VALUE=DATE:${calendarNextDay(room.eventDate)}`
      )
    else if (start && end) lines.push(`DTSTART:${format(start)}`, `DTEND:${format(end)}`)
    lines.push(
      `SUMMARY:${escape(proposal.title)}`,
      `DESCRIPTION:${escape(proposal.description ?? room?.name ?? '')}`,
      'END:VEVENT',
      'END:VCALENDAR'
    )
    if (room?.region) lines.splice(lines.length - 2, 0, `LOCATION:${escape(room.region)}`)
    const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `letsplay-${proposal.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.ics`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  async function optimisticVote(proposalId: string) {
    if (!room || !token) return
    const previous = room
    const previousRevision = currentRevisionRef.current
    const alreadyVoted = room.proposals.find((p) => p.id === proposalId)?.votedByMe ?? false
    setRoom({
      ...room,
      proposals: room.proposals.map((p) =>
        p.id === proposalId
          ? {
              ...p,
              votedByMe: !alreadyVoted,
              voteCount: Math.max(0, p.voteCount + (alreadyVoted ? -1 : 1)),
            }
          : p
      ),
    })
    const saved = await runRoomAction(() => toggleVote(roomId, proposalId, token))
    if (!saved && currentRevisionRef.current === previousRevision) setRoom(previous)
  }

  async function onKick(membershipId: string) {
    if (!token) return
    setActionError('')
    try {
      await kickMember(roomId, membershipId, token)
    } catch (requestError) {
      setActionError(getApiError(requestError))
    }
  }

  async function sendProposalComment(proposalId: string) {
    const content = (commentDrafts[proposalId] ?? '').trim()
    if (!content || !token) return
    const saved = await runRoomAction(() => commentOnProposal(roomId, proposalId, content, token))
    if (saved) setCommentDrafts((values) => ({ ...values, [proposalId]: '' }))
  }

  async function onLeave() {
    if (!room || !token) return
    try {
      await leaveRoom(roomId, token)
      if (!getAccountToken()) sessionStorage.removeItem(`letsplay.room.${roomId}`)
      window.location.assign('/')
    } catch (requestError) {
      setActionError(getApiError(requestError))
    }
  }

  if (error || !token) {
    return (
      <main className="room-shell" onPointerDownCapture={onRoomGesture}>
        <Link className="brand" to="/">
          <span className="brand-mark">
            <img src="/favicon.svg" alt="k" width="34" height="34" />
          </span>
          <span>Kèo</span>
        </Link>
        <section className="room-state">
          <span className="state-icon">↗</span>
          <h1>Chưa vào được phòng</h1>
          <p>{error || 'Không tìm thấy phiên trong tab này. Hãy tham gia lại bằng mã mời.'}</p>
          <Link className="primary-button link-button" to="/">
            Về trang đầu <span>→</span>
          </Link>
        </section>
      </main>
    )
  }

  if (!room) {
    return (
      <main className="room-shell" onPointerDownCapture={onRoomGesture}>
        <Link className="brand" to="/">
          <span className="brand-mark">
            <img src="/favicon.svg" alt="k" width="34" height="34" />
          </span>
          <span>Kèo</span>
        </Link>
        <p className="loading-state">Đang mở phòng…</p>
      </main>
    )
  }

  const phaseLabel =
    room.phase === 'FINALIZED'
      ? 'Đã chốt lịch'
      : room.phase === 'VOTING'
      ? 'Đang bình chọn'
      : 'Đang góp ý'
  const onlineCount = room.members.filter((member) => member.online).length
  const highestVoteCount = Math.max(0, ...room.proposals.map((proposal) => proposal.voteCount))
  const displayProposals = [...room.proposals].sort(
    (left, right) =>
      Number(right.id === room.selectedProposalId) - Number(left.id === room.selectedProposalId)
  )
  const inviteUrl = `${window.location.origin}/?code=${encodeURIComponent(room.inviteCode)}`

  return (
    <main
      className="room-shell !max-w-full !px-3 sm:!px-6 lg:!px-8 !py-0 flex flex-col justify-between min-h-screen"
      onPointerDownCapture={onRoomGesture}
    >
      <div>
        <header className="topbar !h-14 !min-h-[56px] border-b border-stone-200 flex items-center justify-between">
          <Link className="brand" to="/" aria-label="Kèo, trang chủ">
            <span className="brand-mark">
              <img src="/favicon.svg" alt="k" width="28" height="28" />
            </span>
            <span>Kèo</span>
          </Link>
          <span className="room-member flex items-center gap-2">
            <ConnectionStatus state={realtimeState} />
            <strong className="text-stone-800 text-sm font-semibold">{room.member.displayName}</strong>
          </span>
        </header>

        <section
          className="room-welcome !max-w-full !w-full !m-0 sm:!my-3 !p-4 sm:!p-6 lg:!p-8 bg-white border border-stone-200 rounded-2xl shadow-xs"
          ref={roomWelcomeRef}
        >
        <RoomHero
          room={room}
          copied={copied}
          copyInvite={copyInvite}
          copyInviteCode={copyInviteCode}
          qrOpen={qrOpen}
          setQrOpen={setQrOpen}
          inviteUrl={inviteUrl}
          onlineCount={onlineCount}
          phaseLabel={phaseLabel}
          proposalNotice={proposalNotice}
          setProposalNotice={setProposalNotice}
          actionError={actionError}
        />

        <RoomTabsNav
          activeTab={roomTab}
          onTabChange={setRoomTab}
          proposalsCount={room.proposals.length}
          availabilityCount={room.availabilitySlots?.length ?? 0}
          memberCount={room.memberCount}
        />

        {/* TAB 1: Ý TƯỞNG & BÌNH CHỌN */}
        {roomTab === 'proposals' && (
          <ProposalsTab
            room={room}
            roomId={roomId}
            token={token}
            displayProposals={displayProposals}
            highestVoteCount={highestVoteCount}
            selectedProposal={selectedProposal}
            runRoomAction={runRoomAction}
            optimisticVote={optimisticVote}
            sendProposalComment={sendProposalComment}
            commentDrafts={commentDrafts}
            setCommentDrafts={setCommentDrafts}
            addCalendar={addCalendar}
            downloadCalendar={downloadCalendar}
          />
        )}

        {/* TAB 2: KHUNG GIỜ RẢNH */}
        {roomTab === 'availability' && (
          <div className="w-full">
            {token && (
              <AvailabilityPanel
                room={room}
                roomId={roomId}
                token={token}
                onRoom={(updated) => {
                  if (updated.revision >= currentRevisionRef.current) {
                    currentRevisionRef.current = updated.revision
                    setRoom(updated)
                  }
                }}
              />
            )}
          </div>
        )}

        {/* TAB 3: CÔNG CỤ & KẾ HOẠCH */}
        {roomTab === 'toolkit' && (
          <ToolkitTab
            room={room}
            roomId={roomId}
            token={token}
            onRoomUpdate={(updated) => {
              if (updated.revision >= currentRevisionRef.current) {
                currentRevisionRef.current = updated.revision
                setRoom(updated)
              }
            }}
          />
        )}

        {/* TAB 4: THÀNH VIÊN */}
        {roomTab === 'members' && (
          <MembersTab
            room={room}
            onlineCount={onlineCount}
            onKick={onKick}
          />
        )}

        {/* BOTTOM LINKS */}
        <div className="room-bottom-links">
          <Link to="/" className="text-link">
            <ArrowLeftOutlined style={{ fontSize: 14 }} className="inline mr-1" /> Trang đầu
          </Link>
          <button className="leave-button" onClick={() => void onLeave()}>
            {room.member.role === 'HOST' ? 'Rời phòng và chuyển quyền' : 'Rời phòng'}
          </button>
        </div>
      </section>
      </div>
    </main>
  )
}
