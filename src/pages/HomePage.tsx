import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Sparkles, ArrowUpRight, ArrowRight, Heart } from 'lucide-react'
import gsap from 'gsap'
import { api, claimRoom, forgetAuth, getAccountToken, getApiError, getGuestId, getGuestRoomSessions, getMyRooms, getSavedAccount, previewRoom, saveAuth, saveRoomSession, type Account, type AuthResponse, type MyRoomSummary, type Room, type RoomPreview } from '../api'
import { enableRoomNotifications, preloadPushConfig, requestRoomPushPermission, unlockNotificationSound } from '../notifications'
import { GoogleSignInButton } from '../components/GoogleSignInButton'

type Mode = 'create' | 'join'

export default function HomePage() {
  const [searchParams]=useSearchParams()
  const initialInviteCode=(searchParams.get('code')??searchParams.get('invite')??'').trim().toUpperCase()
  const [mode, setMode] = useState<Mode>(initialInviteCode?'join':'create')
  const [displayName, setDisplayName] = useState('')
  const [roomName, setRoomName] = useState('')
  const [inviteCode, setInviteCode] = useState(initialInviteCode)
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
  const [rooms, setRooms] = useState<MyRoomSummary[]>([])
  const [googleClientId,setGoogleClientId]=useState('')
  const navigate = useNavigate()
  const heroGridRef = useRef<HTMLElement>(null)

  useEffect(() => {
    void preloadPushConfig()
    void api.get<{googleClientId:string}>('/system/public-config').then(response=>setGoogleClientId(response.data.googleClientId??'')).catch(()=>undefined)
    const token = getAccountToken()
    const guestTokens=getGuestRoomSessions().map(session=>session.token)
    void getMyRooms(token,guestTokens).then(response=>setRooms(response.data)).catch(()=>{if(token){forgetAuth();setAccount(null)}})
  }, [])

  useEffect(() => {
    if (!heroGridRef.current) return
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) return

    const ctx = gsap.context(() => {
      gsap.from('.hero-copy > *', {
        y: 20,
        opacity: 0,
        stagger: 0.1,
        duration: 0.8,
        ease: 'power3.out',
      })
      gsap.from('.entry-card', {
        y: 28,
        opacity: 0,
        duration: 0.85,
        delay: 0.15,
        ease: 'power3.out',
      })
    }, heroGridRef)

    return () => ctx.revert()
  }, [])

  useEffect(()=>{
    const code=(searchParams.get('code')??searchParams.get('invite')??'').trim().toUpperCase()
    if(!code)return
    void previewRoom(code).then(response=>setPreview(response.data)).catch(requestError=>setError(getApiError(requestError)))
  },[searchParams])

  async function refreshRooms(token=getAccountToken()){
    try{const response=await getMyRooms(token,getGuestRoomSessions().map(session=>session.token));setRooms(response.data)}catch{/* Keep the current list visible during temporary network errors. */}
  }

  async function finishAuthentication(auth:AuthResponse){
    saveAuth(auth); setAccount(auth.account)
    for (const session of getGuestRoomSessions()) {
      await claimRoom(session.roomId,auth.accessToken,session.token).catch(() => undefined)
    }
    const invite=(searchParams.get('code')??searchParams.get('invite')??inviteCode).trim().toUpperCase()
    if(mode==='join'&&invite){
      const roomPreview=await previewRoom(invite)
      const joined=await api.post<Room>('/rooms/join',{guestId:getGuestId(),displayName:displayName.trim()||auth.account.displayName,inviteCode:roomPreview.data.inviteCode},{headers:{Authorization:`Bearer ${auth.accessToken}`}})
      saveRoomSession(joined.data)
      await refreshRooms(auth.accessToken)
      navigate(`/rooms/${joined.data.id}`)
      return
    }
    await refreshRooms(auth.accessToken)
  }

  async function authenticate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setBusy(true)
    try {
      const response = await api.post<AuthResponse>(authMode === 'login' ? '/auth/login' : '/auth/register', authMode === 'login' ? { email, password } : { email, password, displayName: displayName.trim() })
      await finishAuthentication(response.data); setPassword('')
    } catch (requestError) { setError(getApiError(requestError)) } finally { setBusy(false) }
  }

  async function authenticateWithGoogle(credential:string){
    if(busy)return
    setError('');setBusy(true)
    try{const response=await api.post<AuthResponse>('/auth/google',{credential});await finishAuthentication(response.data)}
    catch(requestError){setError(getApiError(requestError))}finally{setBusy(false)}
  }

  async function logout() {
    const token = getAccountToken()
    if (token) await api.post('/auth/logout', {}, { headers: { Authorization: `Bearer ${token}` } }).catch(() => undefined)
    forgetAuth(); setAccount(null); await refreshRooms(null)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      const guestId = getGuestId()
      if (mode === 'join' && !preview) {
        const response = await previewRoom(inviteCode)
        setPreview(response.data)
        return
      }
      unlockNotificationSound()
      const canPush=await requestRoomPushPermission()
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
      if(canPush){const roomToken=response.data.accessToken??getAccountToken();if(roomToken)void enableRoomNotifications(response.data.id,roomToken).catch(()=>undefined)}
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
      <header className="topbar"><Link className="brand" to="/" aria-label="Kèo, trang chủ"><span className="brand-mark"><img src="/favicon.svg" alt="k" width="34" height="34" /></span><span>Kèo</span></Link><span className="top-note">Một buổi vui, cùng nhau lên kế hoạch</span></header>
      <section className="hero-grid" ref={heroGridRef}>
        <div className="hero-copy">
          <p className="eyebrow"><span className="status-dot" /> HẸN NHAU DỄ HƠN</p>
          <h1>Chọn một ngày.<br /><em>Chốt một cuộc vui.</em></h1>
          <p className="hero-description">Gom ý tưởng, chọn hoạt động và sắp lịch cùng hội bạn trong một căn phòng riêng.</p>
          <div className="hero-footnote"><span className="avatar-stack"><i>A</i><i>M</i><i>+</i></span><span>Cả nhóm cùng góp ý, không ai phải lo hết.</span></div>
        </div>

        <section className="entry-card" aria-labelledby="entry-heading">
          <div className="card-topline"><span className="card-icon"><Sparkles size={16} /></span><span className="private-label">PHÒNG RIÊNG CHO NHÓM BẠN</span></div>
          <h2 id="entry-heading">Bắt đầu cuộc hẹn</h2>
          <p className="card-description">Tạo phòng mới hoặc tham gia bằng mã mời.</p>
          {rooms.length > 0 && <section className="saved-rooms"><h3>Phòng đã tham gia gần đây</h3>{rooms.map(saved => <Link key={saved.roomId} to={`/rooms/${saved.roomId}`} className="saved-room"><span><strong>{saved.name}</strong><small>{saved.viewerRole === 'HOST' ? 'Chủ phòng' : 'Thành viên'} · {saved.memberCount} người · {saved.phase==='FINALIZED'?'Đã chốt':saved.phase==='VOTING'?'Đang bình chọn':'Đang góp ý'}</small></span><b>Vào lại <ArrowRight size={13} className="inline ml-1" /></b></Link>)}</section>}
          {!account ? <form onSubmit={authenticate} className="entry-form account-form"><h3>Lưu phòng của bạn</h3><p>Đăng nhập để mở lại phòng trên điện thoại hoặc máy tính khác.</p><div className="mode-switch"><button type="button" className={authMode === 'login' ? 'selected' : ''} onClick={() => setAuthMode('login')}>Đăng nhập</button><button type="button" className={authMode === 'register' ? 'selected' : ''} onClick={() => setAuthMode('register')}>Tạo tài khoản</button></div>{authMode === 'register' && <label>Tên hiển thị<input required maxLength={60} value={displayName} onChange={event => setDisplayName(event.target.value)} placeholder="Ví dụ: An" /></label>}<label>Email<input type="email" required maxLength={254} autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="ban@email.com" /></label><label>Mật khẩu<input type="password" required minLength={8} maxLength={72} autoComplete={authMode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={event => setPassword(event.target.value)} placeholder="Ít nhất 8 ký tự" /></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="primary-button" disabled={busy}>{busy ? 'Đang xử lý…' : authMode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}<ArrowUpRight size={15} className="inline ml-1" /></button>{googleClientId&&<><div className="auth-divider"><span>hoặc</span></div><GoogleSignInButton clientId={googleClientId} disabled={busy} onCredential={credential=>void authenticateWithGoogle(credential)}/></>}</form> : <>
          <div className="account-banner"><span>Đang đăng nhập: <strong>{account.displayName}</strong></span><button type="button" onClick={() => void logout()}>Đăng xuất</button></div>
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
              {preview && <div className="preview-card"><span>PHÒNG BẠN SẮP THAM GIA</span><strong>{preview.name}</strong><small>{preview.phase === 'FINALIZED' ? 'Đã chốt lịch' : preview.phase === 'VOTING' ? 'Đang bình chọn' : 'Đang góp ý'} · {preview.memberCount} thành viên</small>{preview.region && <small>{preview.region}</small>}{preview.eventDate && <small>{new Date(`${preview.eventDate}T00:00:00`).toLocaleDateString('vi-VN')}</small>}</div>}
              {preview && <label>Tên bạn sẽ hiển thị<input required maxLength={60} value={displayName} onChange={event => setDisplayName(event.target.value)} placeholder="Ví dụ: An" autoComplete="nickname" /></label>}
            </>}
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="primary-button" type="submit" disabled={busy}>{busy ? 'Đang kết nối…' : mode === 'create' ? 'Tạo phòng và mời bạn' : preview ? 'Vào phòng' : 'Kiểm tra mã'}<ArrowUpRight size={15} className="inline ml-1" /></button>
          </form>
          <p className="session-note">Phòng được lưu theo tài khoản. Đăng nhập tài khoản này trên thiết bị khác để tiếp tục.</p></>}
        </section>
      </section>
      <footer className="home-footer"><span>Ít nhắn qua lại hơn. Nhiều thời gian vui hơn.</span><span>Được làm cho những cuộc hẹn đáng nhớ <b><Heart size={13} className="inline ml-1 text-rose-500 fill-rose-500 align-middle" /></b></span></footer>
    </main>
  )
}
