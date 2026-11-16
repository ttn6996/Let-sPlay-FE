import type { Room } from '../../api'

interface MembersTabProps {
  room: Room
  onlineCount: number
  onKick: (membershipId: string) => Promise<void>
}

export function MembersTab({
  room,
  onlineCount,
  onKick,
}: MembersTabProps) {
  return (
    <div className="w-full">
      <section className="members-panel !w-full">
        <div className="members-heading">
          <strong>Thành viên ({room.memberCount})</strong>
          <span>{onlineCount}/{room.memberCount} đang online</span>
        </div>
        <div className="members-list">
          {room.members.map((member) => (
            <div className="room-member-chip" key={member.id}>
              <span className={`online-dot ${member.online ? 'is-online' : ''}`} />
              {member.displayName}
              <small>{member.role === 'HOST' ? 'Chủ phòng' : 'Thành viên'}</small>
              {room.member.role === 'HOST' && member.id !== room.member.id && (
                <button type="button" onClick={() => void onKick(member.id)}>
                  Mời ra
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      <div className="notification-controls mt-6 !w-full">
        <div>
          <strong>Thông báo luôn bật trong phòng</strong>
          <span>
            Bạn sẽ nhận báo realtime khi có đề xuất mới. Thông báo đẩy tự đăng ký nếu đã cho phép
            trên trình duyệt.
          </span>
        </div>
        <span className="notification-on-badge">● ĐANG BẬT</span>
      </div>
    </div>
  )
}
