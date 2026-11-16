interface NotificationsPanelProps {
  notifications?: Array<{
    id: string
    title: string
    body: string
    read: boolean
    createdAt: string
  }>
  onMarkRead: () => void
}

export function NotificationsPanel({
  notifications,
  onMarkRead,
}: NotificationsPanelProps) {
  return (
    <div className="toolkit-panel">
      <div className="toolkit-heading">
        <h2>Hoạt động phòng</h2>
        <button className="secondary-button" onClick={onMarkRead}>
          Đánh dấu đã đọc
        </button>
      </div>
      {!notifications?.length ? (
        <p className="toolkit-muted">Chưa có thông báo mới.</p>
      ) : (
        notifications.map((n) => (
          <article className={`room-notification ${n.read ? 'read' : ''}`} key={n.id}>
            <strong>{n.title}</strong>
            <p>{n.body}</p>
            <small>{new Date(n.createdAt).toLocaleString('vi-VN')}</small>
          </article>
        ))
      )}
    </div>
  )
}
