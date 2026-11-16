import type { FormEvent } from 'react'
import { ArrowRightOutlined } from '@ant-design/icons'

interface CreateRoomTabProps {
  displayName: string
  setDisplayName: (val: string) => void
  roomName: string
  setRoomName: (val: string) => void
  eventDate: string
  setEventDate: (val: string) => void
  eventTime: string
  setEventTime: (val: string) => void
  region: string
  setRegion: (val: string) => void
  error: string
  busy: boolean
  onSubmit: (e: FormEvent<HTMLFormElement>) => void
}

export function CreateRoomTab({
  displayName,
  setDisplayName,
  roomName,
  setRoomName,
  eventDate,
  setEventDate,
  eventTime,
  setEventTime,
  region,
  setRegion,
  error,
  busy,
  onSubmit,
}: CreateRoomTabProps) {
  return (
    <div>
      <div className="mb-6 pb-4 border-b border-stone-200">
        <h2 className="text-2xl font-bold font-display text-stone-900 m-0 mb-1.5">
          Bắt đầu cuộc hẹn mới
        </h2>
        <p className="text-sm text-stone-500 m-0">
          Tạo một căn phòng riêng để cùng nhau bàn bạc, đề xuất hoạt động và chốt lịch.
        </p>
      </div>

      <form onSubmit={onSubmit} className="entry-form max-w-xl">
        <label>
          Tên bạn sẽ hiển thị
          <input
            required
            maxLength={60}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Ví dụ: An"
            autoComplete="nickname"
          />
        </label>

        <label>
          Tên buổi hẹn
          <input
            required
            maxLength={100}
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            placeholder="Ví dụ: Tối thứ Sáu đi đâu?"
          />
        </label>

        <div className="form-grid-2">
          <label>
            Ngày dự kiến <span>(không bắt buộc)</span>
            <input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
            />
          </label>
          <label>
            Giờ <span>(không bắt buộc)</span>
            <input
              type="time"
              value={eventTime}
              onChange={(e) => setEventTime(e.target.value)}
            />
          </label>
        </div>

        <label>
          Khu vực / Địa điểm <span>(không bắt buộc)</span>
          <input
            maxLength={120}
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            placeholder="Ví dụ: Quận 1, TP. Hồ Chí Minh"
          />
        </label>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <div className="pt-2">
          <button className="primary-button cursor-pointer" type="submit" disabled={busy}>
            {busy ? 'Đang tạo phòng…' : 'Tạo phòng và mời bạn'}
            <ArrowRightOutlined className="inline ml-1.5" style={{ fontSize: 14 }} />
          </button>
        </div>
      </form>
    </div>
  )
}
