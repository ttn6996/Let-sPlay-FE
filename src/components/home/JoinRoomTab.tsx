import type { FormEvent } from 'react'
import { ArrowRightOutlined } from '@ant-design/icons'
import type { RoomPreview } from '../../api'

interface JoinRoomTabProps {
  inviteCode: string
  displayName: string
  preview: RoomPreview | null
  error: string
  busy: boolean
  onInviteCodeChange: (code: string) => void
  onDisplayNameChange: (name: string) => void
  onSubmit: (e: FormEvent<HTMLFormElement>) => void
}

export function JoinRoomTab({
  inviteCode,
  displayName,
  preview,
  error,
  busy,
  onInviteCodeChange,
  onDisplayNameChange,
  onSubmit,
}: JoinRoomTabProps) {
  return (
    <div>
      <div className="mb-6 pb-4 border-b border-stone-200">
        <h2 className="text-2xl font-bold font-display text-stone-900 m-0 mb-1.5">
          Tham gia cuộc hẹn
        </h2>
        <p className="text-sm text-stone-500 m-0">
          Nhập mã tham gia 6 ký tự được bạn bè chia sẻ để cùng lên kế hoạch.
        </p>
      </div>

      <form onSubmit={onSubmit} className="entry-form max-w-xl">
        <label>
          Mã tham gia phòng
          <input
            required
            minLength={6}
            maxLength={8}
            value={inviteCode}
            onChange={(e) => onInviteCodeChange(e.target.value.toUpperCase())}
            placeholder="Nhập mã 6 ký tự (Ví dụ: ABCXYZ)"
            className="code-input"
            autoCapitalize="characters"
          />
        </label>

        {preview && (
          <div className="preview-card">
            <span>PHÒNG BẠN SẮP THAM GIA</span>
            <strong>{preview.name}</strong>
            <small>
              {preview.phase === 'FINALIZED'
                ? 'Đã chốt lịch'
                : preview.phase === 'VOTING'
                ? 'Đang bình chọn'
                : 'Đang góp ý'}{' '}
              · {preview.memberCount} thành viên
            </small>
            {preview.region && <small>{preview.region}</small>}
            {preview.eventDate && (
              <small>
                {new Date(`${preview.eventDate}T00:00:00`).toLocaleDateString('vi-VN')}
              </small>
            )}
          </div>
        )}

        {preview && (
          <label>
            Tên bạn sẽ hiển thị
            <input
              required
              maxLength={60}
              value={displayName}
              onChange={(e) => onDisplayNameChange(e.target.value)}
              placeholder="Ví dụ: An"
              autoComplete="nickname"
            />
          </label>
        )}

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <div className="pt-2">
          <button className="primary-button cursor-pointer" type="submit" disabled={busy}>
            {busy ? 'Đang kết nối…' : preview ? 'Vào phòng ngay' : 'Kiểm tra mã'}
            <ArrowRightOutlined className="inline ml-1.5" style={{ fontSize: 14 }} />
          </button>
        </div>
      </form>
    </div>
  )
}
