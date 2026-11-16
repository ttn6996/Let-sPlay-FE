import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { HeartFilled } from '@ant-design/icons'
import gsap from 'gsap'
import '../styles.css'
import {
  api,
  claimRoom,
  forgetAuth,
  getAccountToken,
  getApiError,
  getGuestId,
  getGuestRoomSessions,
  getMyRooms,
  getSavedAccount,
  previewRoom,
  saveAuth,
  saveRoomSession,
  type Account,
  type AuthResponse,
  type MyRoomSummary,
  type Room,
  type RoomPreview,
} from '../api'
import {
  enableRoomNotifications,
  preloadPushConfig,
  requestRoomPushPermission,
  unlockNotificationSound,
} from '../notifications'
import { HomeHeader } from '../components/home/HomeHeader'
import { HomeSidebar, type NavTab } from '../components/home/HomeSidebar'
import { CreateRoomTab } from '../components/home/CreateRoomTab'
import { JoinRoomTab } from '../components/home/JoinRoomTab'
import { RoomsTableTab } from '../components/home/RoomsTableTab'
import { AccountTab } from '../components/home/AccountTab'
import { GuestLanding } from '../components/home/GuestLanding'

export default function HomePage() {
  const [searchParams] = useSearchParams()
  const initialInviteCode = (searchParams.get('code') ?? searchParams.get('invite') ?? '')
    .trim()
    .toUpperCase()

  const [tab, setTab] = useState<NavTab>(initialInviteCode ? 'join' : 'create')
  const [displayName, setDisplayName] = useState('')
  const [roomName, setRoomName] = useState('')
  const [inviteCode, setInviteCode] = useState(initialInviteCode)
  const [preview, setPreview] = useState<RoomPreview | null>(null)
  const [eventDate, setEventDate] = useState('')
  const [eventTime, setEventTime] = useState('')
  const [region, setRegion] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [requestId, setRequestId] = useState(
    () => sessionStorage.getItem('letsplay.pendingCreate') ?? ''
  )
  const [account, setAccount] = useState<Account | null>(() => getSavedAccount())
  const [guestMode, setGuestMode] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rooms, setRooms] = useState<MyRoomSummary[]>([])
  const [googleClientId, setGoogleClientId] = useState('')
  const navigate = useNavigate()
  const heroRef = useRef<HTMLElement>(null)

  useEffect(() => {
    void preloadPushConfig()
    void api
      .get<{ googleClientId: string }>('/system/public-config')
      .then((response) => setGoogleClientId(response.data.googleClientId ?? ''))
      .catch(() => undefined)
    const token = getAccountToken()
    const guestTokens = getGuestRoomSessions().map((session) => session.token)
    void getMyRooms(token, guestTokens)
      .then((response) => setRooms(response.data))
      .catch(() => {
        if (token) {
          forgetAuth()
          setAccount(null)
        }
      })
  }, [])

  useEffect(() => {
    if (!heroRef.current) return
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) return

    const ctx = gsap.context(() => {
      gsap.from('.hero-header-top > *', {
        y: 20,
        opacity: 0,
        stagger: 0.1,
        duration: 0.8,
        ease: 'power3.out',
      })
      gsap.from('.board-container', {
        y: 28,
        opacity: 0,
        duration: 0.85,
        delay: 0.2,
        ease: 'power3.out',
      })
    }, heroRef)

    return () => ctx.revert()
  }, [])

  useEffect(() => {
    const code = (searchParams.get('code') ?? searchParams.get('invite') ?? '').trim().toUpperCase()
    if (!code) return
    setTab('join')
    void previewRoom(code)
      .then((response) => setPreview(response.data))
      .catch((requestError) => setError(getApiError(requestError)))
  }, [searchParams])

  async function refreshRooms(token = getAccountToken()) {
    try {
      const response = await getMyRooms(
        token,
        getGuestRoomSessions().map((session) => session.token)
      )
      setRooms(response.data)
    } catch {
      /* Keep current list visible */
    }
  }

  async function finishAuthentication(auth: AuthResponse) {
    saveAuth(auth)
    setAccount(auth.account)
    for (const session of getGuestRoomSessions()) {
      await claimRoom(session.roomId, auth.accessToken, session.token).catch(() => undefined)
    }
    const invite = (searchParams.get('code') ?? searchParams.get('invite') ?? inviteCode)
      .trim()
      .toUpperCase()
    if (tab === 'join' && invite) {
      const roomPreview = await previewRoom(invite)
      const joined = await api.post<Room>(
        '/rooms/join',
        {
          guestId: getGuestId(),
          displayName: displayName.trim() || auth.account.displayName,
          inviteCode: roomPreview.data.inviteCode,
        },
        { headers: { Authorization: `Bearer ${auth.accessToken}` } }
      )
      saveRoomSession(joined.data)
      await refreshRooms(auth.accessToken)
      navigate(`/rooms/${joined.data.id}`)
      return
    }
    await refreshRooms(auth.accessToken)
    setTab('rooms')
  }

  async function authenticate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      const response = await api.post<AuthResponse>(
        authMode === 'login' ? '/auth/login' : '/auth/register',
        authMode === 'login'
          ? { email, password }
          : { email, password, displayName: displayName.trim() }
      )
      await finishAuthentication(response.data)
      setPassword('')
    } catch (requestError) {
      setError(getApiError(requestError))
    } finally {
      setBusy(false)
    }
  }

  async function authenticateWithGoogle(credential: string) {
    if (busy) return
    setError('')
    setBusy(true)
    try {
      const response = await api.post<AuthResponse>('/auth/google', { credential })
      await finishAuthentication(response.data)
    } catch (requestError) {
      setError(getApiError(requestError))
    } finally {
      setBusy(false)
    }
  }

  async function logout() {
    const token = getAccountToken()
    if (token) {
      await api
        .post('/auth/logout', {}, { headers: { Authorization: `Bearer ${token}` } })
        .catch(() => undefined)
    }
    forgetAuth()
    setAccount(null)
    setGuestMode(false)
    await refreshRooms(null)
    setTab('create')
  }

  function handleCopyCode(code: string) {
    void navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(code)
      setTimeout(() => setCopiedCode(null), 1800)
    })
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      const guestId = getGuestId()
      if (tab === 'join' && !preview) {
        const response = await previewRoom(inviteCode)
        setPreview(response.data)
        return
      }
      unlockNotificationSound()
      const canPush = await requestRoomPushPermission()
      const createRequestId = tab === 'create' ? requestId || crypto.randomUUID() : ''
      if (tab === 'create' && !requestId) {
        setRequestId(createRequestId)
        sessionStorage.setItem('letsplay.pendingCreate', createRequestId)
      }
      const response =
        tab === 'create'
          ? await api.post<Room>(
              '/rooms',
              {
                requestId: createRequestId,
                guestId,
                displayName: displayName.trim(),
                roomName: roomName.trim(),
                eventDate: eventDate || null,
                eventTime: eventTime || null,
                region: region.trim() || null,
              },
              { headers: { Authorization: `Bearer ${getAccountToken()}` } }
            )
          : await api.post<Room>(
              '/rooms/join',
              {
                guestId,
                displayName: displayName.trim(),
                inviteCode: preview?.inviteCode ?? inviteCode.trim().toUpperCase(),
              },
              { headers: { Authorization: `Bearer ${getAccountToken()}` } }
            )
      saveRoomSession(response.data)
      if (canPush) {
        const roomToken = response.data.accessToken ?? getAccountToken()
        if (roomToken) {
          void enableRoomNotifications(response.data.id, roomToken).catch(() => undefined)
        }
      }
      sessionStorage.removeItem('letsplay.pendingCreate')
      setRequestId('')
      navigate(`/rooms/${response.data.id}`)
    } catch (requestError) {
      setError(getApiError(requestError))
    } finally {
      setBusy(false)
    }
  }

  if (!account && !guestMode) {
    return (
      <GuestLanding
        authMode={authMode}
        setAuthMode={setAuthMode}
        displayName={displayName}
        setDisplayName={setDisplayName}
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        googleClientId={googleClientId}
        error={error}
        busy={busy}
        rooms={rooms}
        onAuth={authenticate}
        onGoogleAuth={authenticateWithGoogle}
        onContinueAsGuest={() => setGuestMode(true)}
      />
    )
  }

  return (
    <main className="home-shell !max-w-full !px-3 sm:!px-6 lg:!px-8 !py-0 flex flex-col justify-between min-h-screen">
      <div>
        <HomeHeader heroRef={heroRef} />

        {/* TABLE TO VỚI MENU DỌC (MAIN DASHBOARD BOARD FULL SCREEN) */}
        <section className="board-container grid grid-cols-1 md:grid-cols-[260px_1fr] bg-white border border-stone-200 rounded-2xl shadow-xs overflow-hidden my-2 min-h-[520px]">
          <HomeSidebar
            account={account}
            tab={tab}
            roomCount={rooms.length}
            onTabChange={(t) => {
              setTab(t)
              setError('')
              if (t !== 'join') setPreview(null)
            }}
            onLogout={() => void logout()}
          />

          <section className="board-content p-5 sm:p-7 flex flex-col bg-white">
          {tab === 'create' && (
            <CreateRoomTab
              displayName={displayName}
              setDisplayName={setDisplayName}
              roomName={roomName}
              setRoomName={setRoomName}
              eventDate={eventDate}
              setEventDate={setEventDate}
              eventTime={eventTime}
              setEventTime={setEventTime}
              region={region}
              setRegion={setRegion}
              error={error}
              busy={busy}
              onSubmit={submit}
            />
          )}

          {tab === 'join' && (
            <JoinRoomTab
              inviteCode={inviteCode}
              displayName={displayName}
              preview={preview}
              error={error}
              busy={busy}
              onInviteCodeChange={(code) => {
                setInviteCode(code)
                setPreview(null)
                setDisplayName('')
              }}
              onDisplayNameChange={setDisplayName}
              onSubmit={submit}
            />
          )}

          {tab === 'rooms' && (
            <RoomsTableTab
              rooms={rooms}
              copiedCode={copiedCode}
              onCopyCode={handleCopyCode}
              onGoCreate={() => {
                setTab('create')
                setError('')
              }}
            />
          )}

          {tab === 'account' && (
            <AccountTab
              account={account}
              authMode={authMode}
              setAuthMode={setAuthMode}
              displayName={displayName}
              setDisplayName={setDisplayName}
              email={email}
              setEmail={setEmail}
              password={password}
              setPassword={setPassword}
              googleClientId={googleClientId}
              error={error}
              busy={busy}
              roomCount={rooms.length}
              onAuth={authenticate}
              onGoogleAuth={authenticateWithGoogle}
              onLogout={() => void logout()}
            />
          )}
        </section>
      </section>
      </div>

      <footer className="home-footer !py-2 text-xs text-stone-400">
        <span>Ít nhắn qua lại hơn. Nhiều thời gian vui hơn.</span>
        <span>
          Được làm cho những cuộc hẹn đáng nhớ{' '}
          <b>
            <HeartFilled style={{ fontSize: 13 }} className="inline ml-1 text-rose-500 align-middle" />
          </b>
        </span>
      </footer>
    </main>
  )
}
