import { useEffect, useRef, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  ThunderboltOutlined,
  ArrowRightOutlined,
  HeartFilled,
} from '@ant-design/icons'
import gsap from 'gsap'
import { GoogleSignInButton } from '../GoogleSignInButton'
import type { MyRoomSummary } from '../../api'

interface GuestLandingProps {
  authMode: 'login' | 'register'
  setAuthMode: (mode: 'login' | 'register') => void
  displayName: string
  setDisplayName: (name: string) => void
  email: string
  setEmail: (email: string) => void
  password: string
  setPassword: (password: string) => void
  googleClientId: string
  error: string
  busy: boolean
  rooms: MyRoomSummary[]
  onAuth: (event: FormEvent<HTMLFormElement>) => Promise<void>
  onGoogleAuth: (credential: string) => Promise<void>
  onContinueAsGuest?: () => void
}

export function GuestLanding({
  authMode,
  setAuthMode,
  displayName,
  setDisplayName,
  email,
  setEmail,
  password,
  setPassword,
  googleClientId,
  error,
  busy,
  rooms,
  onAuth,
  onGoogleAuth,
  onContinueAsGuest,
}: GuestLandingProps) {
  const heroGridRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!heroGridRef.current) return
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) return

    const ctx = gsap.context(() => {
      gsap.from('.hero-copy > *', {
        y: 24,
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

  return (
    <main className="home-shell">
      <header className="topbar">
        <Link className="brand" to="/" aria-label="Kèo, trang chủ">
          <span className="brand-mark">
            <img src="/favicon.svg" alt="k" width="34" height="34" />
          </span>
          <span>Kèo</span>
        </Link>
        <span className="top-note">Một buổi vui, cùng nhau lên kế hoạch</span>
      </header>

      <section className="hero-grid" ref={heroGridRef}>
        <div className="hero-copy">
          <p className="eyebrow">
            <span className="status-dot" /> HẸN NHAU DỄ HƠN
          </p>
          <h1>
            Chọn một ngày.
            <br />
            <em>Chốt một cuộc vui.</em>
          </h1>
          <p className="hero-description">
            Gom ý tưởng, chọn hoạt động và sắp lịch cùng hội bạn trong một căn phòng riêng.
          </p>
          <div className="hero-footnote">
            <span className="avatar-stack">
              <i>A</i>
              <i>M</i>
              <i>+</i>
            </span>
            <span>Cả nhóm cùng góp ý, không ai phải lo hết.</span>
          </div>
        </div>

        <section className="entry-card" aria-labelledby="entry-heading">
          <div className="card-topline">
            <span className="card-icon">
              <ThunderboltOutlined style={{ fontSize: 16 }} />
            </span>
            <span className="private-label">PHÒNG RIÊNG CHO NHÓM BẠN</span>
          </div>
          <h2 id="entry-heading">Bắt đầu cuộc hẹn</h2>
          <p className="card-description">Tạo phòng mới hoặc tham gia bằng mã mới.</p>

          {rooms.length > 0 && (
            <section className="saved-rooms">
              <h3>Phòng đã tham gia gần đây</h3>
              {rooms.map((saved) => (
                <Link key={saved.roomId} to={`/rooms/${saved.roomId}`} className="saved-room">
                  <span>
                    <strong>{saved.name}</strong>
                    <small>
                      {saved.viewerRole === 'HOST' ? 'Chủ phòng' : 'Thành viên'} · {saved.memberCount} người ·{' '}
                      {saved.phase === 'FINALIZED'
                        ? 'Đã chốt'
                        : saved.phase === 'VOTING'
                        ? 'Đang bình chọn'
                        : 'Đang góp ý'}
                    </small>
                  </span>
                  <b>
                    Vào lại <ArrowRightOutlined style={{ fontSize: 13 }} className="inline ml-1" />
                  </b>
                </Link>
              ))}
            </section>
          )}

          <form onSubmit={onAuth} className="entry-form account-form">
            <h3>Lưu phòng của bạn</h3>
            <p>Đăng nhập để mở lại phòng trên điện thoại hoặc máy tính khác.</p>
            <div className="mode-switch">
              <button
                type="button"
                className={authMode === 'login' ? 'selected' : ''}
                onClick={() => setAuthMode('login')}
              >
                Đăng nhập
              </button>
              <button
                type="button"
                className={authMode === 'register' ? 'selected' : ''}
                onClick={() => setAuthMode('register')}
              >
                Tạo tài khoản
              </button>
            </div>

            {authMode === 'register' && (
              <label>
                Tên hiển thị
                <input
                  required
                  maxLength={60}
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Ví dụ: An"
                />
              </label>
            )}

            <label>
              Email
              <input
                type="email"
                required
                maxLength={254}
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="ban@email.com"
              />
            </label>

            <label>
              Mật khẩu
              <input
                type="password"
                required
                minLength={8}
                maxLength={72}
                autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Ít nhất 8 ký tự"
              />
            </label>

            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}

            <button className="primary-button" disabled={busy}>
              {busy ? 'Đang xử lý…' : authMode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
              <ArrowRightOutlined style={{ fontSize: 14 }} className="inline ml-1" />
            </button>

            {googleClientId && (
              <>
                <div className="auth-divider">
                  <span>hoặc</span>
                </div>
                <GoogleSignInButton
                  clientId={googleClientId}
                  disabled={busy}
                  onCredential={(credential) => void onGoogleAuth(credential)}
                />
              </>
            )}

            {onContinueAsGuest && (
              <button
                type="button"
                onClick={onContinueAsGuest}
                className="text-xs text-stone-500 hover:text-stone-800 text-center w-full mt-3 block hover:underline cursor-pointer bg-transparent border-0"
              >
                Tiếp tục với tư cách khách vãng lai →
              </button>
            )}
          </form>
        </section>
      </section>

      <footer className="home-footer">
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
