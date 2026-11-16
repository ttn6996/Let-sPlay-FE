import { useState } from 'react'
import {
  ArrowRightOutlined,
  ArrowLeftOutlined,
  CheckOutlined,
  PlusOutlined,
  ThunderboltOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  DollarOutlined,
} from '@ant-design/icons'
import {
  updateRoomPhase,
  createProposal,
  updateProposal,
  deleteProposal,
  setProposalCompleted,
  type Room,
  type Proposal,
} from '../../api'

interface ProposalsTabProps {
  room: Room
  roomId: string
  token: string
  displayProposals: Proposal[]
  highestVoteCount: number
  selectedProposal: () => Proposal | null
  runRoomAction: (action: () => Promise<{ data: Room }>) => Promise<boolean>
  optimisticVote: (proposalId: string) => Promise<void>
  sendProposalComment: (proposalId: string) => Promise<void>
  commentDrafts: Record<string, string>
  setCommentDrafts: React.Dispatch<React.SetStateAction<Record<string, string>>>
  addCalendar: () => void
  downloadCalendar: () => void
}

export function ProposalsTab({
  room,
  roomId,
  token,
  displayProposals,
  highestVoteCount,
  selectedProposal,
  runRoomAction,
  optimisticVote,
  sendProposalComment,
  commentDrafts,
  setCommentDrafts,
  addCalendar,
  downloadCalendar,
}: ProposalsTabProps) {
  const [proposalTitle, setProposalTitle] = useState('')
  const [proposalDescription, setProposalDescription] = useState('')
  const [proposalTime, setProposalTime] = useState('')
  const [proposalLocation, setProposalLocation] = useState('')
  const [proposalCost, setProposalCost] = useState('')
  const [proposalLatitude, setProposalLatitude] = useState<number | null>(null)
  const [proposalLongitude, setProposalLongitude] = useState<number | null>(null)
  const [selectedProposalId, setSelectedProposalId] = useState('')
  const [editingProposalId, setEditingProposalId] = useState('')

  const finalProposal = selectedProposal()

  return (
    <div className="w-full">
      {/* FINALIZED BANNER */}
      {room.phase === 'FINALIZED' && finalProposal && (
        <section className="finalized-banner !w-full">
          <div>
            <span>CUỘC HẸN ĐÃ ĐƯỢC CHỐT</span>
            <h2>{finalProposal.title}</h2>
            <p>
              {finalProposal.description}
              {finalProposal.scheduledTime &&
                ` · ${new Date(finalProposal.scheduledTime).toLocaleString('vi-VN', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}`}
            </p>
          </div>
          <div>
            <button className="secondary-button" onClick={addCalendar}>
              Thêm vào Google Calendar
            </button>
            <button className="secondary-button" onClick={downloadCalendar}>
              Tải lịch (.ics)
            </button>
          </div>
        </section>
      )}

      {/* CANCELLED WARNING */}
      {room.status === 'CANCELLED' && (
        <p className="toolkit-error">
          Kế hoạch đã hủy. Chủ phòng có thể mở lại trong mục Kế hoạch.
        </p>
      )}

      {/* HOST CONTROLS */}
      {room.status === 'OPEN' && room.member.role === 'HOST' && (
        <section className="host-controls !w-full">
          <div>
            <strong>Điều khiển chủ phòng</strong>
            <span>
              {room.phase === 'COLLECTING'
                ? 'Mở bình chọn khi mọi người đã gửi ý tưởng.'
                : room.phase === 'VOTING'
                ? 'Có thể tiếp tục góp ý và bình chọn phương án.'
                : 'Phương án đã được chốt.'}
            </span>
          </div>
          {room.phase === 'COLLECTING' ? (
            <button
              className="primary-button"
              onClick={() =>
                void runRoomAction(() => updateRoomPhase(roomId, { phase: 'VOTING' }, token))
              }
            >
              Bắt đầu bình chọn <ArrowRightOutlined style={{ fontSize: 14 }} className="inline ml-1" />
            </button>
          ) : room.phase === 'VOTING' ? (
            <div className="voting-controls">
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  if (
                    window.confirm(
                      'Quay lại góp ý. Các phiếu hiện tại sẽ được giữ nguyên. Tiếp tục?'
                    )
                  )
                    void runRoomAction(() =>
                      updateRoomPhase(roomId, { phase: 'COLLECTING' }, token)
                    )
                }}
              >
                <ArrowLeftOutlined style={{ fontSize: 14 }} className="inline mr-1" /> Quay lại góp ý
              </button>
              <div className="finalize-control">
                <select
                  aria-label="Chọn phương án chốt"
                  value={selectedProposalId || room.proposals[0]?.id || ''}
                  onChange={(event) => setSelectedProposalId(event.target.value)}
                >
                  <option value="" disabled>
                    Chọn phương án
                  </option>
                  {room.proposals.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} · {p.voteCount} phiếu
                    </option>
                  ))}
                </select>
                <button
                  className="primary-button"
                  disabled={!room.proposals.length}
                  onClick={() =>
                    void runRoomAction(() =>
                      updateRoomPhase(
                        roomId,
                        {
                          phase: 'FINALIZED',
                          selectedProposalId: selectedProposalId || room.proposals[0]?.id,
                        },
                        token
                      )
                    )
                  }
                >
                  Chốt phương án <CheckOutlined style={{ fontSize: 14 }} className="inline ml-1" />
                </button>
              </div>
            </div>
          ) : (
            <span className="finalized-label">
              <CheckOutlined style={{ fontSize: 14 }} className="inline mr-1" /> Đã chốt
            </span>
          )}
        </section>
      )}

      {/* CREATE PROPOSAL FORM */}
      {room.status === 'OPEN' && ['COLLECTING', 'VOTING'].includes(room.phase) && (
        <form
          className="proposal-form !w-full"
          onSubmit={(event) => {
            event.preventDefault()
            void runRoomAction(() =>
              createProposal(
                roomId,
                {
                  title: proposalTitle.trim(),
                  description: proposalDescription.trim() || undefined,
                  scheduledTime: proposalTime || null,
                  location: proposalLocation || null,
                  estimatedCostPerPerson: proposalCost ? Number(proposalCost) : null,
                  latitude: proposalLatitude,
                  longitude: proposalLongitude,
                },
                token
              )
            ).then((saved) => {
              if (saved) {
                setProposalTitle('')
                setProposalDescription('')
                setProposalTime('')
                setProposalLocation('')
                setProposalCost('')
                setProposalLatitude(null)
                setProposalLongitude(null)
              }
            })
          }}
        >
          <h2>{room.phase === 'VOTING' ? 'Thêm đề xuất trong lúc bình chọn' : 'Đề xuất hoạt động'}</h2>
          <p className="proposal-form-note">Đề xuất mới sẽ xuất hiện ngay để mọi người bình chọn.</p>
          <label>
            Tên hoạt động hoặc địa điểm
            <input
              required
              maxLength={120}
              value={proposalTitle}
              onChange={(event) => setProposalTitle(event.target.value)}
              placeholder="Ví dụ: Ăn lẩu rồi xem phim"
            />
          </label>
          <div className="proposal-fields">
            <label>
              Thời gian dự kiến
              <input
                type="datetime-local"
                value={proposalTime}
                onChange={(event) => setProposalTime(event.target.value)}
              />
            </label>
            <label>
              Mô tả ngắn
              <input
                maxLength={500}
                value={proposalDescription}
                onChange={(event) => setProposalDescription(event.target.value)}
                placeholder="Ghi chú thêm (không bắt buộc)"
              />
            </label>
            <label>
              Địa điểm
              <input
                maxLength={200}
                value={proposalLocation}
                onChange={(event) => {
                  setProposalLocation(event.target.value)
                  setProposalLatitude(null)
                  setProposalLongitude(null)
                }}
                placeholder="Quán, địa chỉ hoặc khu vực"
              />
              <button
                type="button"
                className="text-link"
                onClick={() => {
                  setProposalLocation(room.region ?? '')
                  setProposalLatitude(room.eventLatitude)
                  setProposalLongitude(room.eventLongitude)
                }}
              >
                Dùng vị trí kế hoạch đã ghim
              </button>
            </label>
            <label>
              Chi phí dự kiến/người (₫)
              <input
                type="number"
                min="0"
                value={proposalCost}
                onChange={(event) => setProposalCost(event.target.value)}
                placeholder="Không bắt buộc"
              />
            </label>
          </div>
          <button className="primary-button">
            Thêm đề xuất <PlusOutlined style={{ fontSize: 14 }} className="inline ml-1" />
          </button>
        </form>
      )}

      {/* PROPOSALS LIST */}
      <section className="proposal-section !w-full">
        <div className="proposal-section-heading flex items-center justify-between flex-wrap gap-2.5 mb-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <p className="eyebrow !my-0">CÙNG NHAU LÊN KẾ HOẠCH</p>
            <h2 className="!text-sm sm:!text-base md:!text-lg !font-bold !text-stone-900 !my-0 font-display tracking-tight">
              {room.phase === 'FINALIZED'
                ? 'Phương án đã chốt'
                : room.phase === 'VOTING'
                ? 'Bình chọn ý tưởng'
                : 'Ý tưởng của cả nhóm'}
            </h2>
          </div>
          <span className="text-xs sm:text-sm text-stone-500 font-medium">{room.proposals.length} đề xuất</span>
        </div>
        {!room.proposals.length ? (
          <div className="empty-proposals">
            <span>
              <ThunderboltOutlined style={{ fontSize: 24 }} />
            </span>
            <strong>Chưa có đề xuất nào</strong>
            <p>
              {room.phase === 'FINALIZED'
                ? 'Chưa có phương án được chốt.'
                : 'Hãy thêm ý tưởng đầu tiên để cả nhóm cùng bàn nhé.'}
            </p>
          </div>
        ) : (
          <div
            className="proposal-list !w-full !max-h-[460px] md:!max-h-[500px] !overflow-y-auto !pr-2 overscroll-contain"
            style={{ scrollbarWidth: 'thin', scrollbarColor: '#d6d3d1 transparent' }}
          >
            {displayProposals.map((proposal) => {
              const selected = room.selectedProposalId === proposal.id
              const canManage =
                room.phase !== 'FINALIZED' && (room.member.role === 'HOST' || proposal.createdByMe)
              const topPick = proposal.voteCount > 0 && proposal.voteCount === highestVoteCount
              const progress = room.memberCount
                ? Math.min(100, Math.round((proposal.voteCount / room.memberCount) * 100))
                : 0
              return (
                <article
                  className={`proposal-card ${selected ? 'selected-proposal' : ''} ${
                    proposal.completed ? 'completed-proposal' : ''
                  }`}
                  key={proposal.id}
                >
                  {editingProposalId === proposal.id ? (
                    <form
                      className="proposal-edit-form"
                      onSubmit={(event) => {
                        event.preventDefault()
                        void runRoomAction(() =>
                          updateProposal(
                            roomId,
                            proposal.id,
                            {
                              title: proposalTitle.trim(),
                              description: proposalDescription.trim() || undefined,
                              scheduledTime: proposalTime || null,
                              location: proposalLocation || null,
                              estimatedCostPerPerson: proposalCost ? Number(proposalCost) : null,
                              latitude: proposalLatitude,
                              longitude: proposalLongitude,
                            },
                            token
                          )
                        ).then((saved) => {
                          if (saved) setEditingProposalId('')
                        })
                      }}
                    >
                      <label>
                        Tên đề xuất
                        <input
                          required
                          maxLength={120}
                          value={proposalTitle}
                          onChange={(event) => setProposalTitle(event.target.value)}
                        />
                      </label>
                      <label>
                        Mô tả
                        <input
                          maxLength={500}
                          value={proposalDescription}
                          onChange={(event) => setProposalDescription(event.target.value)}
                        />
                      </label>
                      <label>
                        Thời gian
                        <input
                          type="datetime-local"
                          value={proposalTime}
                          onChange={(event) => setProposalTime(event.target.value)}
                        />
                      </label>
                      <label>
                        Địa điểm
                        <input
                          maxLength={200}
                          value={proposalLocation}
                          onChange={(event) => {
                            setProposalLocation(event.target.value)
                            setProposalLatitude(null)
                            setProposalLongitude(null)
                          }}
                        />
                      </label>
                      <label>
                        Chi phí/người
                        <input
                          type="number"
                          min="0"
                          value={proposalCost}
                          onChange={(event) => setProposalCost(event.target.value)}
                        />
                      </label>
                      <div className="proposal-edit-actions">
                        <button className="primary-button">Lưu thay đổi</button>
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => setEditingProposalId('')}
                        >
                          Hủy
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="proposal-card-title">
                        <div>
                          <h3>
                            {proposal.title}
                            {selected && <span className="winner-badge">ĐÃ CHỐT · GHIM ĐẦU</span>}
                            {topPick && <span className="top-pick-badge">TOP PICK</span>}
                          </h3>
                          {proposal.description && <p>{proposal.description}</p>}
                          {proposal.scheduledTime && (
                            <small>
                              <ClockCircleOutlined style={{ fontSize: 12 }} className="inline mr-1" />
                              {new Date(proposal.scheduledTime).toLocaleString('vi-VN', {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              })}
                            </small>
                          )}
                          {proposal.location && (
                            <small>
                              <EnvironmentOutlined style={{ fontSize: 12 }} className="inline mr-1" />
                              {proposal.location}
                            </small>
                          )}
                          {proposal.estimatedCostPerPerson != null && (
                            <small>
                              <DollarOutlined style={{ fontSize: 12 }} className="inline mr-1" />
                              {proposal.estimatedCostPerPerson.toLocaleString('vi-VN')} ₫/người
                            </small>
                          )}
                        </div>
                        <div className="proposal-card-actions">
                          {room.phase === 'VOTING' && (
                            <button
                              className={`vote-button ${proposal.votedByMe ? 'voted' : ''}`}
                              onClick={() => void optimisticVote(proposal.id)}
                            >
                              {proposal.votedByMe ? 'Bỏ bình chọn' : 'Bình chọn'}{' '}
                              <b>{proposal.voteCount}</b>
                            </button>
                          )}
                          {canManage && (
                            <>
                              <button
                                className="mini-action"
                                onClick={() => {
                                  setEditingProposalId(proposal.id)
                                  setProposalTitle(proposal.title)
                                  setProposalDescription(proposal.description ?? '')
                                  setProposalTime(proposal.scheduledTime?.slice(0, 16) ?? '')
                                  setProposalLocation(proposal.location ?? '')
                                  setProposalLatitude(proposal.latitude)
                                  setProposalLongitude(proposal.longitude)
                                  setProposalCost(
                                    proposal.estimatedCostPerPerson
                                      ? String(proposal.estimatedCostPerPerson)
                                      : ''
                                  )
                                }}
                              >
                                Sửa
                              </button>
                              <button
                                className="mini-action danger"
                                onClick={() => {
                                  if (window.confirm('Xóa đề xuất này?'))
                                    void runRoomAction(() => deleteProposal(roomId, proposal.id, token))
                                }}
                              >
                                Xóa
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="vote-progress">
                        <div>
                          <span>{proposal.voteCount} phiếu</span>
                          <span>{progress}% thành viên</span>
                        </div>
                        <i>
                          <b style={{ width: `${progress}%` }} />
                        </i>
                      </div>

                      <div className="voter-list">
                        {proposal.voters.length ? (
                          proposal.voters.map((voter, index) => (
                            <span key={`${proposal.id}-${index}`}>{voter.displayName}</span>
                          ))
                        ) : (
                          <span>Chưa có lượt bình chọn</span>
                        )}
                      </div>

                      <label className="proposal-completion">
                        <input
                          type="checkbox"
                          checked={proposal.completed}
                          disabled={room.status === 'CANCELLED'}
                          onChange={(event) =>
                            void runRoomAction(() =>
                              setProposalCompleted(roomId, proposal.id, event.target.checked, token)
                            )
                          }
                        />
                        <span>{proposal.completed ? 'Đã thực hiện' : 'Đánh dấu đã thực hiện'}</span>
                      </label>

                      <div className="discussion-thread">
                        <strong>
                          Thảo luận <span>· bình luận ẩn danh</span>
                        </strong>
                        {proposal.comments?.map((comment) => (
                          <p className="discussion-comment" key={comment.id}>
                            <b>{comment.writtenByMe ? 'Bạn' : 'Ẩn danh'}</b>
                            {comment.content}
                          </p>
                        ))}
                        <form
                          onSubmit={(event) => {
                            event.preventDefault()
                            void sendProposalComment(proposal.id)
                          }}
                        >
                          <input
                            maxLength={500}
                            value={commentDrafts[proposal.id] ?? ''}
                            onChange={(event) =>
                              setCommentDrafts((values) => ({
                                ...values,
                                [proposal.id]: event.target.value,
                              }))
                            }
                            placeholder="Trao đổi về đề xuất này…"
                          />
                          <button
                            type="submit"
                            className="mini-action"
                            disabled={
                              room.status === 'CANCELLED' || !(commentDrafts[proposal.id] ?? '').trim()
                            }
                          >
                            Gửi
                          </button>
                        </form>
                      </div>
                    </>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
