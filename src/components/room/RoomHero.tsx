import { QRCodeSVG } from 'qrcode.react'
import { ThunderboltOutlined, CloseOutlined } from '@ant-design/icons'
import type { Room } from '../../api'

interface RoomHeroProps {
  room: Room
  copied: boolean
  copyInvite: () => Promise<void>
  copyInviteCode: () => Promise<void>
  qrOpen: boolean
  setQrOpen: React.Dispatch<React.SetStateAction<boolean>>
  inviteUrl: string
  onlineCount: number
  phaseLabel: string
  proposalNotice: string
  setProposalNotice: (notice: string) => void
  actionError: string
}

export function RoomHero({
  room,
  copied,
  copyInvite,
  copyInviteCode,
  qrOpen,
  setQrOpen,
  inviteUrl,
  onlineCount,
  phaseLabel,
  proposalNotice,
  setProposalNotice,
  actionError,
}: RoomHeroProps) {
  return (
    <>
      <div className="room-heading w-full">
        <div>
          <p className="eyebrow">
            <span className="status-dot" />{' '}
            {room.status === 'CANCELLED' ? 'KẾ HOẠCH ĐÃ HỦY' : 'PHÒNG ĐANG MỞ'}
          </p>
          <h1>{room.name}</h1>
          <p>Chào {room.member.displayName}, cùng nhau chốt một cuộc vui.</p>
        </div>
        <div className="invite-actions">
          <button type="button" className="secondary-button" onClick={() => void copyInvite()}>
            {copied ? 'Đã sao chép!' : 'Sao chép link mời'}
          </button>
          <button type="button" className="secondary-button" onClick={() => void copyInviteCode()}>
            Sao chép mã
          </button>
          <button type="button" className="secondary-button" onClick={() => setQrOpen((open) => !open)}>
            {qrOpen ? 'Ẩn QR' : 'Mã QR'}
          </button>
        </div>
      </div>

      {qrOpen && (
        <div className="qr-panel">
          <QRCodeSVG value={inviteUrl} size={180} includeMargin />
          <span>Quét mã để xem trước và tham gia phòng</span>
        </div>
      )}

      <div className="room-facts w-full">
        <div>
          <span>VAI TRÒ CỦA BẠN</span>
          <strong>{room.member.role === 'HOST' ? 'Chủ phòng' : 'Thành viên'}</strong>
        </div>
        <div>
          <span>THÀNH VIÊN</span>
          <strong>{room.memberCount}</strong>
        </div>
        <div>
          <span>ĐANG TRỰC TUYẾN</span>
          <strong>
            {onlineCount}/{room.memberCount}
          </strong>
        </div>
        <div>
          <span>GIAI ĐOẠN</span>
          <strong>{phaseLabel}</strong>
        </div>
      </div>

      {proposalNotice && (
        <div className="proposal-notice" role="status">
          <span>
            <ThunderboltOutlined style={{ fontSize: 16 }} />
          </span>
          <div>
            <strong>Đề xuất mới</strong>
            <p>{proposalNotice}</p>
          </div>
          <button type="button" aria-label="Đóng thông báo" onClick={() => setProposalNotice('')}>
            <CloseOutlined style={{ fontSize: 14 }} />
          </button>
        </div>
      )}

      {actionError && (
        <p className="form-error" role="alert">
          {actionError}
        </p>
      )}
    </>
  )
}
