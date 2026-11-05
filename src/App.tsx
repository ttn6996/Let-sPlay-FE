import { useEffect, useState, type FormEvent } from 'react'
import { Link, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import { api, getApiError, getGuestId, getRoomToken, saveRoomSession, type Room, type RoomPreview } from './api'

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
  const navigate = useNavigate()

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
        })
        : await api.post<Room>('/rooms/join', {
          guestId,
          displayName: displayName.trim(),
          inviteCode: preview?.inviteCode ?? inviteCode.trim().toUpperCase(),
        })
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
          <p className="session-note">Phiên khách chỉ lưu trong tab trình duyệt này. Đóng tab hoặc đổi thiết bị có thể làm mất quyền vào phòng.</p>
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
  const token = getRoomToken(roomId)

  useEffect(() => {
    if (!token) {
      return
    }
    api.get<Room>(`/rooms/${roomId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(response => setRoom(response.data))
      .catch(requestError => setError(getApiError(requestError)))
  }, [roomId, token])

  if (error || !token) return <main className="room-shell"><Link className="brand" to="/"><span className="brand-mark">k</span><span>Kèo</span></Link><section className="room-state"><span className="state-icon">↗</span><h1>Chưa vào được phòng</h1><p>{error || 'Không tìm thấy phiên trong tab này. Hãy tham gia lại bằng mã mời.'}</p><Link className="primary-button link-button" to="/">Về trang đầu <span>→</span></Link></section></main>
  if (!room) return <main className="room-shell"><Link className="brand" to="/"><span className="brand-mark">k</span><span>Kèo</span></Link><p className="loading-state">Đang mở phòng…</p></main>

  return <main className="room-shell"><header className="topbar"><Link className="brand" to="/"><span className="brand-mark">k</span><span>Kèo</span></Link><span className="room-member">Đang vào với tên <strong>{room.member.displayName}</strong></span></header>
    <section className="room-welcome"><p className="eyebrow"><span className="status-dot" /> PHÒNG ĐANG MỞ</p><h1>{room.name}</h1><p>Chào {room.member.displayName}, phòng đã sẵn sàng để cả nhóm cùng lên kế hoạch.</p>
      <div className="room-facts"><div><span>VAI TRÒ CỦA BẠN</span><strong>{room.member.role === 'HOST' ? 'Chủ phòng' : 'Thành viên'}</strong></div><div><span>MÃ MỜI BẠN BÈ</span><strong className="invite-code">{room.inviteCode}</strong></div><div><span>GIAI ĐOẠN</span><strong>Góp ý</strong></div></div>
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
