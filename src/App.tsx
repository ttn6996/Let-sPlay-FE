import { useEffect, useState, type FormEvent } from 'react'
import { Link, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import { api, forgetAuth, getAccountToken, getApiError, getGuestId, getRoomToken, getSavedAccount, RealtimeRequestError, saveAuth, saveRoomSession, streamRoomEvents, type Account, type AuthResponse, type Room, type RoomPreview, type SavedRoom } from './api'

type Mode = 'create' | 'join'

function HomePage() {
  const [mode, setMode] = useState<Mode>('create')
  const [displayName, setDisplayName] = useState('')
  const [roomName, setRoomName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [preview, setPreview] = useState<RoomPreview | null>(null)
  const [eventDate, setEventDate] = useState('')
  const [eventTime, setEventTime] = useState('')
  const [region, setRegion] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [requestId, setRequestId] = useState(() => sessionStorage.getItem('letsplay.pendingCreate') ?? '')
  const [account, setAccount] = useState<Account | null>(() => getSavedAccount())
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rooms, setRooms] = useState<SavedRoom[]>([])
  const navigate = useNavigate()

  useEffect(() => {
    const token = getAccountToken()
    if (token) void api.get<SavedRoom[]>('/auth/rooms', { headers: { Authorization: `Bearer ${token}` } }).then(response => setRooms(response.data)).catch(() => { forgetAuth(); setAccount(null) })
  }, [])

  async function authenticate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setBusy(true)
    try {
      const response = await api.post<AuthResponse>(authMode === 'login' ? '/auth/login' : '/auth/register', authMode === 'login' ? { email, password } : { email, password, displayName: displayName.trim() })
      saveAuth(response.data); setAccount(response.data.account)
      const oldRoomKeys = Object.keys(sessionStorage).filter(key => key.startsWith('letsplay.room.'))
      for (const key of oldRoomKeys) {
        const guestToken = sessionStorage.getItem(key)
        if (guestToken) await api.post(`/rooms/${key.slice('letsplay.room.'.length)}/claim`, {}, { headers: { Authorization: `Bearer ${response.data.accessToken}`, 'X-Guest-Access-Token': guestToken } }).catch(() => undefined)
      }
      const list = await api.get<SavedRoom[]>('/auth/rooms', { headers: { Authorization: `Bearer ${response.data.accessToken}` } }); setRooms(list.data); setPassword('')
    } catch (requestError) { setError(getApiError(requestError)) } finally { setBusy(false) }
  }

  async function logout() {
    const token = getAccountToken()
    if (token) await api.post('/auth/logout', {}, { headers: { Authorization: `Bearer ${token}` } }).catch(() => undefined)
    forgetAuth(); setAccount(null); setRooms([])
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      const guestId = getGuestId()
      if (mode === 'join' && !preview) {
        const response = await api.post<RoomPreview>('/rooms/preview', {
          inviteCode: inviteCode.trim().toUpperCase(),
        })
        setPreview(response.data)
        return
      }
      const createRequestId = mode === 'create'
        ? requestId || crypto.randomUUID()
        : ''
      if (mode === 'create' && !requestId) {
        setRequestId(createRequestId)
        sessionStorage.setItem('letsplay.pendingCreate', createRequestId)
      }
      const response = mode === 'create'
        ? await api.post<Room>('/rooms', {
          requestId: createRequestId,
          guestId,
          displayName: displayName.trim(),
          roomName: roomName.trim(),
          eventDate: eventDate || null,
          eventTime: eventTime || null,
          region: region.trim() || null,
        }, { headers: { Authorization: `Bearer ${getAccountToken()}` } })
        : await api.post<Room>('/rooms/join', {
          guestId,
          displayName: displayName.trim(),
          inviteCode: preview?.inviteCode ?? inviteCode.trim().toUpperCase(),
        }, { headers: { Authorization: `Bearer ${getAccountToken()}` } })
      saveRoomSession(response.data)
      sessionStorage.removeItem('letsplay.pendingCreate')
      setRequestId('')
      navigate(`/rooms/${response.data.id}`)
    } catch (requestError) {
      setError(getApiError(requestError))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="home-shell">
      <header className="topbar"><Link className="brand" to="/" aria-label="Kèo, trang chủ"><span className="brand-mark">k</span><span>Kèo</span></Link><span className="top-note">Một buổi vui, cùng nhau lên kế hoạch</span></header>
      <section className="hero-grid">
        <div className="hero-copy">
          <p className="eyebrow"><span className="status-dot" /> HẸN NHAU DỄ HƠN</p>
          <h1>Chọn một ngày.<br /><em>Chốt một cuộc vui.</em></h1>
          <p className="hero-description">Gom ý tưởng, chọn hoạt động và sắp lịch cùng hội bạn trong một căn phòng riêng.</p>
          <div className="hero-footnote"><span className="avatar-stack"><i>A</i><i>M</i><i>+</i></span><span>Cả nhóm cùng góp ý, không ai phải lo hết.</span></div>
        </div>

        <section className="entry-card" aria-labelledby="entry-heading">
          <div className="card-topline"><span className="card-icon">✳</span><span className="private-label">PHÒNG RIÊNG CHO NHÓM BẠN</span></div>
          <h2 id="entry-heading">Bắt đầu cuộc hẹn</h2>
          <p className="card-description">Tạo phòng mới hoặc tham gia bằng mã mời.</p>
          {!account ? <form onSubmit={authenticate} className="entry-form account-form"><h3>Lưu phòng của bạn</h3><p>Đăng nhập để mở lại phòng trên điện thoại hoặc máy tính khác.</p><div className="mode-switch"><button type="button" className={authMode === 'login' ? 'selected' : ''} onClick={() => setAuthMode('login')}>Đăng nhập</button><button type="button" className={authMode === 'register' ? 'selected' : ''} onClick={() => setAuthMode('register')}>Tạo tài khoản</button></div>{authMode === 'register' && <label>Tên hiển thị<input required maxLength={60} value={displayName} onChange={event => setDisplayName(event.target.value)} placeholder="Ví dụ: An" /></label>}<label>Email<input type="email" required maxLength={254} autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="ban@email.com" /></label><label>Mật khẩu<input type="password" required minLength={8} maxLength={72} autoComplete={authMode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={event => setPassword(event.target.value)} placeholder="Ít nhất 8 ký tự" /></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="primary-button" disabled={busy}>{busy ? 'Đang xử lý…' : authMode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}<span>↗</span></button></form> : <>
          <div className="account-banner"><span>Đang đăng nhập: <strong>{account.displayName}</strong></span><button type="button" onClick={() => void logout()}>Đăng xuất</button></div>
          {rooms.length > 0 && <section className="saved-rooms"><h3>Phòng của bạn</h3>{rooms.map(saved => <Link key={saved.id} to={`/rooms/${saved.id}`} className="saved-room"><span><strong>{saved.name}</strong><small>{saved.role === 'HOST' ? 'Chủ phòng' : 'Thành viên'} · {saved.memberCount} thành viên</small></span><b>→</b></Link>)}</section>}
          <div className="mode-switch" role="tablist" aria-label="Chọn thao tác">
            <button type="button" role="tab" aria-selected={mode === 'create'} className={mode === 'create' ? 'selected' : ''} onClick={() => { setMode('create'); setError(''); setPreview(null) }}>Tạo phòng mới</button>
            <button type="button" role="tab" aria-selected={mode === 'join'} className={mode === 'join' ? 'selected' : ''} onClick={() => { setMode('join'); setError(''); setPreview(null) }}>Mình có mã mời</button>
          </div>
          <form onSubmit={submit} className="entry-form">
            {mode === 'create' && <label>Tên bạn sẽ hiển thị<input required maxLength={60} value={displayName} onChange={event => setDisplayName(event.target.value)} placeholder="Ví dụ: An" autoComplete="nickname" /></label>}
            {mode === 'create' ? <>
              <label>Tên buổi hẹn<input required maxLength={100} value={roomName} onChange={event => setRoomName(event.target.value)} placeholder="Ví dụ: Tối thứ Sáu đi đâu?" /></label>
              <div className="optional-fields"><label>Ngày dự kiến <span>(không bắt buộc)</span><input type="date" value={eventDate} onChange={event => setEventDate(event.target.value)} /></label><label>Giờ <span>(không bắt buộc)</span><input type="time" value={eventTime} onChange={event => setEventTime(event.target.value)} /></label></div>
              <label>Khu vực <span>(không bắt buộc)</span><input maxLength={120} value={region} onChange={event => setRegion(event.target.value)} placeholder="Ví dụ: Quận 1, TP. Hồ Chí Minh" /></label>
            </> : <>
              <label>Mã tham gia<input required minLength={6} maxLength={8} value={inviteCode} onChange={event => { setInviteCode(event.target.value.toUpperCase()); setPreview(null); setDisplayName('') }} placeholder="Nhập mã 6 ký tự" className="code-input" autoCapitalize="characters" /></label>
              {preview && <div className="preview-card"><span>PHÒNG BẠN SẮP THAM GIA</span><strong>{preview.name}</strong>{preview.region && <small>{preview.region}</small>}{preview.eventDate && <small>{new Date(`${preview.eventDate}T00:00:00`).toLocaleDateString('vi-VN')}</small>}</div>}
              {preview && <label>Tên bạn sẽ hiển thị<input required maxLength={60} value={displayName} onChange={event => setDisplayName(event.target.value)} placeholder="Ví dụ: An" autoComplete="nickname" /></label>}
            </>}
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="primary-button" type="submit" disabled={busy}>{busy ? 'Đang kết nối…' : mode === 'create' ? 'Tạo phòng và mời bạn' : preview ? 'Vào phòng' : 'Kiểm tra mã'}<span aria-hidden="true">↗</span></button>
          </form>
          <p className="session-note">Phòng được lưu theo tài khoản. Đăng nhập tài khoản này trên thiết bị khác để tiếp tục.</p></>}
        </section>
      </section>
      <footer className="home-footer"><span>Ít nhắn qua lại hơn. Nhiều thời gian vui hơn.</span><span>Được làm cho những cuộc hẹn đáng nhớ <b>♥</b></span></footer>
    </main>
  )
}

function RoomPage() {
  const { roomId = '' } = useParams()
  const [room, setRoom] = useState<Room | null>(null)
  const [error, setError] = useState('')
  const [realtimeState, setRealtimeState] = useState<'connecting' | 'connected' | 'reconnecting' | 'disconnected'>('connecting')
  const token = getAccountToken() ?? getRoomToken(roomId)

  useEffect(() => {
    if (token === null) return
    const accessToken: string = token
    const controller = new AbortController()
    let stopped = false

    async function connect() {
      try {
        let response
        try { response = await api.get<Room>(`/rooms/${roomId}`, { headers: { Authorization: `Bearer ${accessToken}` } }) }
        catch (requestError) {
          const guestToken = getRoomToken(roomId)
          if (!getAccountToken() || !guestToken) throw requestError
          await api.post(`/rooms/${roomId}/claim`, {}, { headers: { Authorization: `Bearer ${accessToken}`, 'X-Guest-Access-Token': guestToken } })
          response = await api.get<Room>(`/rooms/${roomId}`, { headers: { Authorization: `Bearer ${accessToken}` } })
        }
        if (stopped) return
        setRoom(response.data)
        let lastRevision = response.data.revision

        while (!stopped) {
          try {
            await streamRoomEvents(roomId, accessToken, lastRevision, controller.signal,
              () => setRealtimeState('connected'),
              update => {
                lastRevision = Math.max(lastRevision, update.revision)
                setRealtimeState('connected')
                void api.get<Room>(`/rooms/${roomId}`, { headers: { Authorization: `Bearer ${accessToken}` } })
                  .then(snapshot => {
                    if (stopped) return
                    lastRevision = Math.max(lastRevision, snapshot.data.revision)
                    setRoom(current => !current || snapshot.data.revision >= current.revision ? snapshot.data : current)
                  })
              })
            if (!stopped) throw new Error('Realtime stream closed')
          } catch (streamError) {
            if (stopped || controller.signal.aborted) return
            if (streamError instanceof RealtimeRequestError && streamError.status >= 400 && streamError.status < 500 && streamError.status !== 408 && streamError.status !== 429) {
              setRealtimeState('disconnected')
              setError('Phiên realtime không còn hợp lệ. Hãy tải lại phòng hoặc tham gia lại bằng mã mời.')
              return
            }
            setRealtimeState('reconnecting')
            await new Promise(resolve => window.setTimeout(resolve, 1200))
          }
        }
      } catch (requestError) {
        if (!stopped) {
          setRealtimeState('disconnected')
          setError(getApiError(requestError))
        }
      }
    }

    void connect()
    return () => {
      stopped = true
      controller.abort()
    }
  }, [roomId, token])

  if (error || !token) return <main className="room-shell"><Link className="brand" to="/"><span className="brand-mark">k</span><span>Kèo</span></Link><section className="room-state"><span className="state-icon">↗</span><h1>Chưa vào được phòng</h1><p>{error || 'Không tìm thấy phiên trong tab này. Hãy tham gia lại bằng mã mời.'}</p><Link className="primary-button link-button" to="/">Về trang đầu <span>→</span></Link></section></main>
  if (!room) return <main className="room-shell"><Link className="brand" to="/"><span className="brand-mark">k</span><span>Kèo</span></Link><p className="loading-state">Đang mở phòng…</p></main>

  const realtimeLabel = realtimeState === 'connected' ? 'Đang đồng bộ' : realtimeState === 'reconnecting' ? 'Đang kết nối lại' : realtimeState === 'disconnected' ? 'Mất kết nối' : 'Đang kết nối'
  return <main className="room-shell"><header className="topbar"><Link className="brand" to="/"><span className="brand-mark">k</span><span>Kèo</span></Link><span className="room-member"><span className={`connection-pill ${realtimeState}`} role="status"><i />{realtimeLabel}</span>Đang vào với tên <strong>{room.member.displayName}</strong></span></header>
    <section className="room-welcome"><p className="eyebrow"><span className="status-dot" /> PHÒNG ĐANG MỞ</p><h1>{room.name}</h1><p>Chào {room.member.displayName}, phòng đã sẵn sàng để cả nhóm cùng lên kế hoạch.</p>
      <div className="room-facts"><div><span>VAI TRÒ CỦA BẠN</span><strong>{room.member.role === 'HOST' ? 'Chủ phòng' : 'Thành viên'}</strong></div><div><span>THÀNH VIÊN</span><strong>{room.memberCount}</strong></div><div><span>MÃ MỜI BẠN BÈ</span><strong className="invite-code">{room.inviteCode}</strong></div><div><span>GIAI ĐOẠN</span><strong>Góp ý</strong></div></div>
      <p className="coming-soon">Các bước góp ý và lên lịch sẽ được nối tiếp trong phần triển khai tiếp theo.</p><Link to="/" className="text-link">← Trang đầu</Link>
    </section>
  </main>
}

function NotFoundPage() {
  return <main className="room-shell"><section className="room-state"><h1>Trang này chưa có</h1><Link className="text-link" to="/">Về trang đầu</Link></section></main>
}

export default function App() {
  return <Routes><Route path="/" element={<HomePage />} /><Route path="/rooms/:roomId" element={<RoomPage />} /><Route path="*" element={<NotFoundPage />} /></Routes>
}
