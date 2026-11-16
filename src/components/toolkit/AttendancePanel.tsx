import type { Room } from '../../types'

interface AttendancePanelProps {
  room: Room
  attendance?: Array<{ membershipId: string; displayName: string; status: string }>
  onUpdateStatus: (status: string) => void
}

const ATTENDANCE_STATUSES = [
  ['GOING', 'Sẽ đi'],
  ['MAYBE', 'Chưa chắc'],
  ['NOT_GOING', 'Không đi'],
  ['ON_THE_WAY', 'Đang đến'],
  ['LATE', 'Đến muộn'],
  ['ARRIVED', 'Đã tới'],
] as const

const attendanceLabel = (s: string) =>
  ({
    NO_RESPONSE: 'Chưa trả lời',
    GOING: 'Sẽ đi',
    MAYBE: 'Chưa chắc',
    NOT_GOING: 'Không đi',
    ON_THE_WAY: 'Đang đến',
    LATE: 'Đến muộn',
    ARRIVED: 'Đã tới',
  }[s] ?? 'Chưa trả lời')

export function AttendancePanel({
  room,
  attendance,
  onUpdateStatus,
}: AttendancePanelProps) {
  return (
    <div className="toolkit-panel">
      <h2>Ai sẽ tham gia?</h2>
      <div className="attendance-buttons">
        {ATTENDANCE_STATUSES.map(([v, l]) => {
          const isCurrent = attendance?.find((a) => a.membershipId === room.member.id)?.status === v
          return (
            <button
              key={v}
              type="button"
              className={isCurrent ? 'active' : ''}
              onClick={() => onUpdateStatus(v)}
            >
              {l}
            </button>
          )
        })}
      </div>
      <div className="attendance-list">
        {attendance?.map((a) => (
          <div key={a.membershipId}>
            <strong>{a.displayName}</strong>
            <span>{attendanceLabel(a.status)}</span>
          </div>
        ))}
      </div>
      <p className="toolkit-muted">Tên thành viên công khai trong phòng.</p>
    </div>
  )
}
