import type { FormEvent } from 'react'
import { ArrowRightOutlined, LogoutOutlined } from '@ant-design/icons'
import { GoogleSignInButton } from '../GoogleSignInButton'
import type { Account } from '../../api'

interface AccountTabProps {
  account: Account | null
  authMode: 'login' | 'register'
  setAuthMode: (mode: 'login' | 'register') => void
  displayName: string
  setDisplayName: (val: string) => void
  email: string
  setEmail: (val: string) => void
  password: string
  setPassword: (val: string) => void
  googleClientId: string
  error: string
  busy: boolean
  roomCount: number
  onAuth: (e: FormEvent<HTMLFormElement>) => void
  onGoogleAuth: (credential: string) => void
  onLogout: () => void
}

export function AccountTab({
  account,
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
  roomCount,
  onAuth,
  onGoogleAuth,
  onLogout,
}: AccountTabProps) {
  return (
    <div>
      <div className="mb-6 pb-4 border-b border-stone-200">
        <h2 className="text-2xl font-bold font-display text-stone-900 m-0 mb-1.5">
          Tài khoản & Đồng bộ
        </h2>
        <p className="text-sm text-stone-500 m-0">
          Đăng nhập để tự động lưu phòng và mở lại trên mọi thiết bị.
        </p>
      </div>

      {account ? (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-stone-50 border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-emerald-900 text-white font-bold text-2xl grid place-items-center">
                {account.displayName.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="font-bold text-lg text-stone-900 m-0">
                  {account.displayName}
                </h3>
                <p className="text-sm text-stone-500 m-0">{account.email}</p>
                <p className="text-xs text-emerald-700 font-semibold mt-1">
                  ✓ Đang liên kết {roomCount} phòng
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="secondary-button !border-rose-300 !text-rose-700 hover:!bg-rose-50 cursor-pointer"
            >
              <LogoutOutlined className="inline mr-1.5" style={{ fontSize: 14 }} />
              Đăng xuất
            </button>
          </div>

          <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-100 text-sm text-emerald-950">
            💡 <b>Đã đồng bộ tài khoản:</b> Tất cả các phòng bạn tạo hoặc tham gia bằng tài khoản
            này sẽ luôn xuất hiện trong danh sách "Phòng của tôi".
          </div>
        </div>
      ) : (
        <form onSubmit={onAuth} className="entry-form max-w-lg">
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
                onChange={(e) => setDisplayName(e.target.value)}
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
              onChange={(e) => setEmail(e.target.value)}
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
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Ít nhất 8 ký tự"
            />
          </label>

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <button className="primary-button cursor-pointer" disabled={busy}>
            {busy
              ? 'Đang xử lý…'
              : authMode === 'login'
              ? 'Đăng nhập'
              : 'Tạo tài khoản'}
            <ArrowRightOutlined className="inline ml-1" style={{ fontSize: 14 }} />
          </button>

          {googleClientId && (
            <>
              <div className="auth-divider">
                <span>hoặc</span>
              </div>
              <GoogleSignInButton
                clientId={googleClientId}
                disabled={busy}
                onCredential={(credential) => onGoogleAuth(credential)}
              />
            </>
          )}
        </form>
      )}
    </div>
  )
}
