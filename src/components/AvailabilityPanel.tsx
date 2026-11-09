import { useEffect, useMemo, useState } from 'react'
import { Check, Plus, Clock, Sparkles } from 'lucide-react'
import {
  addAvailabilitySlots,
  commentOnAvailabilitySlot,
  getApiError,
  selectAvailabilitySlot,
  updateAvailability,
  updateAvailabilityOptions,
  type Room,
} from '../api'

type Props = {
  room: Room
  roomId: string
  token: string
  onRoom: (room: Room) => void
}

const DEFAULT_TITLE = 'Giờ nào mọi người đều rảnh?'

function localSlot(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const timeStr = date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  const dateStr = date.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric' })
  return `${timeStr} · ${dateStr}`
}

export function AvailabilityPanel({ room, roomId, token, onRoom }: Props) {
  const [draftTime, setDraftTime] = useState('')
  const [newSlotTime, setNewSlotTime] = useState('')
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({})
  const [draftSlots, setDraftSlots] = useState<string[]>([])
  const [draftTitle, setDraftTitle] = useState(room.availabilityTitle || DEFAULT_TITLE)
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [draftSelection, setDraftSelection] = useState<string[] | null>(null)

  const isHost = room.member.role === 'HOST'
  const locked = room.phase === 'FINALIZED' || room.status === 'CANCELLED'
  const slots = room.availabilitySlots ?? []
  const slotSignature = slots.map(slot => slot.id).join(',')
  const savedSelection = slots.filter(slot => slot.availableByMe).map(slot => slot.id)
  const selection = draftSelection ?? savedSelection
  const selectionChanged = [...selection].sort().join(',') !== [...savedSelection].sort().join(',')

  const recommendation = useMemo(
    () => slots.reduce<(typeof slots)[number] | null>((best, slot) => (!best || slot.availableCount > best.availableCount ? slot : best), null),
    [slots]
  )

  useEffect(() => setDraftSelection(null), [slotSignature])

  async function saveOptions() {
    const title = draftTitle.trim()
    if (!title) {
      setMessage('Vui lòng nhập tiêu đề bình chọn.')
      return
    }
    const current = slots.map(slot => slot.startsAt.slice(0, 16)).sort()
    const next = [...draftSlots].sort()
    const timesChanged = JSON.stringify(current) !== JSON.stringify(next)
    if (
      timesChanged &&
      slots.some(slot => slot.availableCount > 0 || (slot.comments?.length ?? 0) > 0) &&
      !window.confirm('Thay đổi danh sách giờ sẽ xóa phiếu và bình luận trên các khung giờ hiện tại. Tiếp tục?')
    )
      return

    setBusy(true)
    setMessage('')
    try {
      const result = await updateAvailabilityOptions(roomId, title, draftSlots, token)
      onRoom(result.data)
      setDraftSlots([])
      setDraftTitle(result.data.availabilityTitle || title)
      setEditing(false)
      setMessage('Đã lưu tiêu đề và các khung giờ.')
    } catch (error) {
      setMessage(getApiError(error))
    } finally {
      setBusy(false)
    }
  }

  function toggleSlot(slotId: string, checked: boolean) {
    if (busy || locked) return
    const next = new Set(selection)
    if (checked) next.add(slotId)
    else next.delete(slotId)
    setDraftSelection([...next])
    setMessage('')
  }

  async function saveSelection() {
    if (!selectionChanged || busy || locked) return
    setBusy(true)
    setMessage('')
    try {
      const result = await updateAvailability(roomId, selection, token)
      onRoom(result.data)
      setDraftSelection(null)
      setMessage('Đã lưu các khung giờ bạn chọn.')
    } catch (error) {
      setMessage(getApiError(error))
    } finally {
      setBusy(false)
    }
  }

  async function chooseSlot(slotId: string) {
    setBusy(true)
    setMessage('')
    try {
      const result = await selectAvailabilitySlot(roomId, slotId, token)
      onRoom(result.data)
      setMessage('Đã cập nhật giờ dự kiến của phòng.')
    } catch (error) {
      setMessage(getApiError(error))
    } finally {
      setBusy(false)
    }
  }

  async function addSlot() {
    if (!newSlotTime || busy || locked) return
    setBusy(true)
    setMessage('')
    try {
      const result = await addAvailabilitySlots(roomId, [newSlotTime], token)
      onRoom(result.data)
      setNewSlotTime('')
      setMessage('Đã thêm khung giờ mới.')
    } catch (error) {
      setMessage(getApiError(error))
    } finally {
      setBusy(false)
    }
  }

  async function sendComment(slotId: string) {
    const content = (commentDrafts[slotId] ?? '').trim()
    if (!content || busy) return
    setBusy(true)
    setMessage('')
    try {
      const result = await commentOnAvailabilitySlot(roomId, slotId, content, token)
      onRoom(result.data)
      setCommentDrafts(values => ({ ...values, [slotId]: '' }))
    } catch (error) {
      setMessage(getApiError(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="availability-panel" aria-labelledby="availability-title">
      <div className="availability-heading">
        <div>
          <p className="eyebrow"><span className="status-dot" /> TÌM GIỜ HẸN PHÙ HỢP</p>
          <h2 id="availability-title">{room.availabilityTitle || DEFAULT_TITLE}</h2>
          <p className="availability-desc">
            Mọi thành viên có thể thêm khung giờ và chọn nhiều thời điểm phù hợp. Phiếu bình chọn luôn ẩn danh để mọi người thoải mái biểu quyết.
          </p>
        </div>
        {isHost && !locked && (
          <button
            type="button"
            className="secondary-button availability-edit-toggle"
            onClick={() => {
              setDraftSlots(slots.map(slot => slot.startsAt.slice(0, 16)))
              setDraftTitle(room.availabilityTitle || DEFAULT_TITLE)
              setEditing(value => !value)
              setMessage('')
            }}
          >
            {editing ? 'Đóng chế độ sửa' : 'Sửa tiêu đề & danh sách giờ'}
          </button>
        )}
      </div>

      {editing && isHost && (
        <div className="availability-editor">
          <label className="availability-title-field">
            Tiêu đề bình chọn
            <input
              type="text"
              required
              maxLength={100}
              value={draftTitle}
              onChange={event => setDraftTitle(event.target.value)}
              placeholder="Ví dụ: Cuối tuần này mọi người rảnh lúc nào?"
            />
          </label>
          <div className="availability-editor-add">
            <label>
              Thêm ngày và giờ
              <input
                type="datetime-local"
                value={draftTime}
                onChange={event => setDraftTime(event.target.value)}
              />
            </label>
            <button
              type="button"
              className="secondary-button"
              disabled={!draftTime || draftSlots.includes(draftTime)}
              onClick={() => {
                setDraftSlots(times => [...times, draftTime].sort())
                setDraftTime('')
              }}
            >
              ＋ Thêm vào danh sách
            </button>
          </div>
          {draftSlots.length > 0 && (
            <div className="availability-draft-list">
              <span className="draft-list-title">Các khung giờ đang thiết lập:</span>
              <div className="draft-chips">
                {draftSlots.map((slot, index) => (
                  <button
                    type="button"
                    key={`${slot}-${index}`}
                    className="draft-chip"
                    onClick={() => setDraftSlots(times => times.filter((_, i) => i !== index))}
                    title="Bấm để xóa khung giờ này"
                  >
                    <span>{localSlot(slot)}</span>
                    <span className="chip-remove" aria-hidden="true">×</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          <button
            type="button"
            className="primary-button availability-save-btn"
            disabled={busy || !draftSlots.length || !draftTitle.trim()}
            onClick={() => void saveOptions()}
          >
            {busy ? 'Đang lưu…' : 'Lưu tiêu đề và khung giờ'} <Check size={14} className="inline-icon" />
          </button>
        </div>
      )}

      {!locked && (
        <form
          className="availability-add-slot"
          onSubmit={event => {
            event.preventDefault()
            void addSlot()
          }}
        >
          <div className="add-slot-input-group">
            <label htmlFor="new-slot-input">Đề xuất thêm khung giờ mới</label>
            <input
              id="new-slot-input"
              type="datetime-local"
              value={newSlotTime}
              onChange={event => setNewSlotTime(event.target.value)}
            />
          </div>
          <button type="submit" className="secondary-button add-slot-btn" disabled={busy || !newSlotTime}>
            <Plus size={14} className="inline-icon mr-1" /> Thêm khung giờ
          </button>
          <small className="add-slot-help">Mọi thành viên trong phòng đều có thể đề xuất khung giờ mới.</small>
        </form>
      )}

      {!slots.length ? (
        <div className="availability-empty">
          <Clock size={24} className="empty-icon" />
          <strong>Chưa có khung giờ nào được tạo</strong>
          <p>{isHost ? 'Hãy thêm vài ngày và giờ dự kiến ở ô phía trên để cả nhóm cùng chọn.' : 'Chủ phòng chưa tạo danh sách giờ. Bạn sẽ có thể chọn khi khung giờ xuất hiện.'}</p>
        </div>
      ) : (
        <>
          {recommendation && (
            <div className="availability-recommendation">
              <div className="recommendation-badge-wrap">
                <span className="recommendation-badge">
                  <Sparkles size={13} className="badge-sparkle" /> ĐANG ĐƯỢC CHỌN NHIỀU NHẤT
                </span>
                <strong className="recommendation-time">{localSlot(recommendation.startsAt)}</strong>
              </div>
              <div className="recommendation-stats">
                <span className="recommendation-count">
                  <strong>{recommendation.availableCount}</strong> / {room.memberCount} thành viên rảnh
                </span>
              </div>
            </div>
          )}

          <div className="availability-list" role="group" aria-label="Danh sách khung giờ bình chọn">
            {slots.map(slot => {
              const percent = room.memberCount ? Math.round((slot.availableCount / room.memberCount) * 100) : 0
              const isSelected = selection.includes(slot.id)

              return (
                <div className={`availability-option ${isSelected ? 'is-selected' : ''}`} key={slot.id}>
                  {/* Top Bar: Primary Voting Control */}
                  <div className="availability-slot-main">
                    <label htmlFor={`availability-${slot.id}`} className="availability-slot-label">
                      <input
                        id={`availability-${slot.id}`}
                        type="checkbox"
                        checked={isSelected}
                        disabled={busy || locked}
                        onChange={event => toggleSlot(slot.id, event.target.checked)}
                        className="slot-checkbox"
                      />
                      <div className="availability-slot-info">
                        <div className="availability-slot-time-row">
                          <span className="slot-time-text">{localSlot(slot.startsAt)}</span>
                          {slot.selected && <span className="slot-badge-selected">GIỜ DỰ KIẾN ĐÃ CHỌN</span>}
                        </div>
                        <div className="availability-slot-meta">
                          <span className="slot-counter">
                            <strong>{slot.availableCount}</strong> / {room.memberCount} người rảnh ({percent}%)
                          </span>
                          <div className="slot-progress-track" aria-hidden="true">
                            <div className="slot-progress-fill" style={{ width: `${percent}%` }} />
                          </div>
                        </div>
                      </div>
                    </label>

                    {isHost && !locked && (
                      <button
                        type="button"
                        className="slot-choose-btn"
                        disabled={busy || slot.availableCount === 0}
                        onClick={() => void chooseSlot(slot.id)}
                        title="Đặt khung giờ này làm thời gian chính thức của buổi hẹn"
                      >
                        Chốt giờ này
                      </button>
                    )}
                  </div>

                  {/* Bottom Bar: Collaborative Discussion */}
                  <div className="discussion-thread">
                    <div className="discussion-header">
                      <span className="discussion-title">Trao đổi về khung giờ này</span>
                      <span className="discussion-subnote">bình luận ẩn danh</span>
                    </div>

                    {slot.comments && slot.comments.length > 0 && (
                      <div className="discussion-comments-list">
                        {slot.comments.map(comment => (
                          <div className="discussion-comment" key={comment.id}>
                            <span className={`comment-author ${comment.writtenByMe ? 'author-me' : ''}`}>
                              {comment.writtenByMe ? 'Bạn' : 'Ẩn danh'}
                            </span>
                            <span className="comment-text">{comment.content}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <form
                      className="discussion-form"
                      onSubmit={event => {
                        event.preventDefault()
                        void sendComment(slot.id)
                      }}
                    >
                      <input
                        maxLength={500}
                        value={commentDrafts[slot.id] ?? ''}
                        onChange={event => setCommentDrafts(values => ({ ...values, [slot.id]: event.target.value }))}
                        placeholder="Thêm ý kiến hoặc lưu ý về giờ này…"
                        className="discussion-input"
                      />
                      <button
                        type="submit"
                        className="discussion-send-btn"
                        disabled={busy || !(commentDrafts[slot.id] ?? '').trim()}
                      >
                        Gửi
                      </button>
                    </form>
                  </div>
                </div>
              )
            })}
          </div>

          {!locked && (
            <div className="availability-vote-actions">
              <span className="vote-status-text">
                {selectionChanged ? 'Bạn có thay đổi chưa lưu.' : `Đã chọn ${selection.length} khung giờ phù hợp.`}
              </span>
              <button
                type="button"
                className="primary-button save-vote-btn"
                disabled={busy || !selectionChanged}
                onClick={() => void saveSelection()}
              >
                {busy ? 'Đang lưu…' : 'Lưu lựa chọn của bạn'} <Check size={14} className="inline-icon" />
              </button>
            </div>
          )}
        </>
      )}

      {message && <p className="availability-message" role="status">{message}</p>}
    </section>
  )
}
