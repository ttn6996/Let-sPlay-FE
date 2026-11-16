import { lazy, Suspense } from 'react'
import {
  ClockCircleOutlined,
  EnvironmentOutlined,
  LinkOutlined,
} from '@ant-design/icons'
import type { Room } from '../../api'

const RoomToolkit = lazy(() =>
  import('../RoomToolkit').then((module) => ({ default: module.RoomToolkit }))
)

interface ToolkitTabProps {
  room: Room
  roomId: string
  token: string
  onRoomUpdate: (updated: Room) => void
}

export function ToolkitTab({
  room,
  roomId,
  token,
  onRoomUpdate,
}: ToolkitTabProps) {
  return (
    <div className="w-full">
      {(room.eventDate || room.eventTime || room.region) && (
        <section className="room-details-card !w-full" aria-label="Thông tin cuộc hẹn">
          <p className="eyebrow">THÔNG TIN CUỘC HẸN</p>
          <div className="room-details-items">
            {(room.eventDate || room.eventTime) && (
              <div className="room-detail-item">
                <span className="room-detail-icon">
                  <ClockCircleOutlined style={{ fontSize: 16 }} />
                </span>
                <span>
                  <small>THỜI GIAN DỰ KIẾN</small>
                  <strong>
                    {room.eventDate
                      ? new Date(`${room.eventDate}T${room.eventTime ?? '12:00'}`).toLocaleString(
                          'vi-VN',
                          room.eventTime
                            ? {
                                weekday: 'long',
                                day: 'numeric',
                                month: 'long',
                                hour: '2-digit',
                                minute: '2-digit',
                              }
                            : { weekday: 'long', day: 'numeric', month: 'long' }
                        )
                      : `${room.eventTime} · chưa chọn ngày`}
                  </strong>
                </span>
              </div>
            )}
            {room.region && (
              <a
                className="room-detail-item room-location-link"
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  room.region
                )}`}
                target="_blank"
                rel="noreferrer"
              >
                <span className="room-detail-icon">
                  <EnvironmentOutlined style={{ fontSize: 16 }} />
                </span>
                <span>
                  <small>ĐỊA ĐIỂM / KHU VỰC</small>
                  <strong>{room.region}</strong>
                  <em>
                    Mở Google Maps <LinkOutlined style={{ fontSize: 12 }} className="inline ml-1" />
                  </em>
                </span>
              </a>
            )}
          </div>
        </section>
      )}

      <Suspense fallback={<p className="loading-state">Đang tải công cụ phòng…</p>}>
        <RoomToolkit
          room={room}
          roomId={roomId}
          token={token}
          onRoom={onRoomUpdate}
        />
      </Suspense>
    </div>
  )
}
