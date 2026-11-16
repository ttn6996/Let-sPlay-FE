import { Link } from 'react-router-dom'
import {
  ThunderboltOutlined,
  ArrowRightOutlined,
  CopyOutlined,
  CheckOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import type { MyRoomSummary } from '../../api'

interface RoomsTableTabProps {
  rooms: MyRoomSummary[]
  copiedCode: string | null
  onCopyCode: (code: string) => void
  onGoCreate: () => void
}

export function RoomsTableTab({
  rooms,
  copiedCode,
  onCopyCode,
  onGoCreate,
}: RoomsTableTabProps) {
  return (
    <div>
      <div className="mb-6 pb-4 border-b border-stone-200">
        <h2 className="text-2xl font-bold font-display text-stone-900 m-0 mb-1.5">
          Phòng của bạn
        </h2>
        <p className="text-sm text-stone-500 m-0">
          Danh sách các phòng bạn đã tạo hoặc từng tham gia gần đây.
        </p>
      </div>

      {rooms.length > 0 ? (
        <div className="overflow-x-auto mt-2 border border-stone-200 rounded-2xl bg-white shadow-xs">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200">
                <th className="px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-stone-600">
                  Cuộc hẹn
                </th>
                <th className="px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-stone-600">
                  Mã phòng
                </th>
                <th className="px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-stone-600">
                  Giai đoạn
                </th>
                <th className="px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-stone-600">
                  Thành viên
                </th>
                <th className="px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-stone-600">
                  Vai trò
                </th>
                <th className="px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-stone-600">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {rooms.map((room) => (
                <tr key={room.roomId} className="hover:bg-stone-50/70 transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="flex flex-col gap-0.5">
                      <strong className="text-stone-900 font-bold text-sm">{room.name}</strong>
                      <small className="text-xs text-stone-500">
                        Cập nhật: {new Date(room.updatedAt).toLocaleDateString('vi-VN')}
                      </small>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded-lg font-mono text-xs font-bold text-emerald-950 transition-colors cursor-pointer"
                      onClick={() => onCopyCode(room.inviteCode)}
                      title="Bấm để sao chép mã mời"
                    >
                      {room.inviteCode}
                      {copiedCode === room.inviteCode ? (
                        <CheckOutlined style={{ fontSize: 13 }} className="text-emerald-600" />
                      ) : (
                        <CopyOutlined style={{ fontSize: 13 }} className="text-stone-400" />
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3.5">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        room.phase === 'FINALIZED'
                          ? 'bg-blue-100 text-blue-800'
                          : room.phase === 'VOTING'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {room.phase === 'FINALIZED'
                        ? 'Đã chốt lịch'
                        : room.phase === 'VOTING'
                        ? 'Đang bình chọn'
                        : 'Đang góp ý'}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="inline-flex items-center gap-1.5 text-stone-600 font-medium">
                      <TeamOutlined style={{ fontSize: 14 }} className="text-stone-400" />
                      {room.memberCount}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="font-semibold text-xs text-stone-700">
                      {room.viewerRole === 'HOST' ? 'Chủ phòng' : 'Thành viên'}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <Link
                      to={`/rooms/${room.roomId}`}
                      className="primary-button !py-1.5 !px-3.5 !text-xs !inline-flex !items-center !gap-1.5"
                    >
                      Vào phòng <ArrowRightOutlined style={{ fontSize: 12 }} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state">
          <span className="card-icon !w-12 !h-12 !text-xl">
            <ThunderboltOutlined style={{ fontSize: 22 }} />
          </span>
          <h3>Chưa có phòng nào</h3>
          <p>Bạn chưa tham gia phòng nào trên thiết bị này. Hãy tạo một phòng mới ngay!</p>
          <button
            type="button"
            className="primary-button cursor-pointer"
            onClick={onGoCreate}
          >
            Tạo phòng mới <ArrowRightOutlined className="inline ml-1" style={{ fontSize: 14 }} />
          </button>
        </div>
      )}
    </div>
  )
}
