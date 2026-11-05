import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { createProposal, getAccountToken, getApiError, getRoomToken, leaveRoom, toggleVote, updateRoomPhase, type Room } from '../api'
import { useRoomRealtime } from '../hooks/useRoomRealtime'
import { ConnectionStatus } from '../components/ConnectionStatus'

export default function RoomPage() {
  const { roomId = '' } = useParams()
  const token = getAccountToken() ?? getRoomToken(roomId)
  const {room,setRoom,error,realtimeState,currentRevisionRef}=useRoomRealtime(roomId,token)
  const [actionError, setActionError] = useState('')
  const [copied, setCopied] = useState(false)
  const [proposalTitle, setProposalTitle] = useState('')
  const [proposalDescription, setProposalDescription] = useState('')
  const [proposalTime, setProposalTime] = useState('')
  const [selectedProposalId, setSelectedProposalId] = useState('')

  async function runRoomAction(action: () => Promise<{ data: Room }>): Promise<boolean> {
    setActionError('')
    try { const response=await action(); if(response.data.revision>=currentRevisionRef.current){currentRevisionRef.current=response.data.revision;setRoom(response.data)} return true }
    catch(requestError){setActionError(getApiError(requestError));return false}
  }

  async function copyInvite() {
    try { await navigator.clipboard.writeText(`${window.location.origin}/rooms/${roomId} · Mã ${room?.inviteCode}`); setCopied(true); window.setTimeout(()=>setCopied(false),1800) }
    catch { setActionError('Không thể sao chép. Hãy sao chép mã mời thủ công.') }
  }

  async function onLeave() {
    if(!room||!token)return
    try { await leaveRoom(roomId,token); if(!getAccountToken()) sessionStorage.removeItem(`letsplay.room.${roomId}`); window.location.assign('/') }
    catch(requestError){setActionError(getApiError(requestError))}
  }

  if (error || !token) return <main className="room-shell"><Link className="brand" to="/"><span className="brand-mark">k</span><span>Kèo</span></Link><section className="room-state"><span className="state-icon">↗</span><h1>Chưa vào được phòng</h1><p>{error || 'Không tìm thấy phiên trong tab này. Hãy tham gia lại bằng mã mời.'}</p><Link className="primary-button link-button" to="/">Về trang đầu <span>→</span></Link></section></main>
  if (!room) return <main className="room-shell"><Link className="brand" to="/"><span className="brand-mark">k</span><span>Kèo</span></Link><p className="loading-state">Đang mở phòng…</p></main>

  const phaseLabel=room.phase==='FINALIZED'?'Đã chốt lịch':room.phase==='VOTING'?'Đang bình chọn':'Đang góp ý'
  return <main className="room-shell"><header className="topbar"><Link className="brand" to="/"><span className="brand-mark">k</span><span>Kèo</span></Link><span className="room-member"><ConnectionStatus state={realtimeState}/><strong>{room.member.displayName}</strong></span></header>
    <section className="room-welcome"><div className="room-heading"><div><p className="eyebrow"><span className="status-dot" /> PHÒNG ĐANG MỞ</p><h1>{room.name}</h1><p>Chào {room.member.displayName}, cùng nhau chốt một cuộc vui.</p></div><button type="button" className="secondary-button" onClick={()=>void copyInvite()}>{copied?'Đã sao chép!':'Sao chép lời mời'}</button></div>
      <div className="room-facts"><div><span>VAI TRÒ CỦA BẠN</span><strong>{room.member.role==='HOST'?'Chủ phòng':'Thành viên'}</strong></div><div><span>THÀNH VIÊN</span><strong>{room.memberCount}</strong></div><div><span>MÃ MỜI</span><strong className="invite-code">{room.inviteCode}</strong></div><div><span>GIAI ĐOẠN</span><strong>{phaseLabel}</strong></div></div>
      {actionError&&<p className="form-error" role="alert">{actionError}</p>}
      {room.member.role==='HOST'&&<section className="host-controls"><div><strong>Điều khiển chủ phòng</strong><span>{room.phase==='COLLECTING'?'Mở bình chọn khi mọi người đã gửi ý tưởng.':room.phase==='VOTING'?'Chọn phương án được yêu thích nhất để chốt lịch.':'Phương án đã được chốt.'}</span></div>{room.phase==='COLLECTING'?<button className="primary-button" onClick={()=>void runRoomAction(()=>updateRoomPhase(roomId,{phase:'VOTING'},token))}>Bắt đầu bình chọn <span>→</span></button>:room.phase==='VOTING'?<div className="finalize-control"><select aria-label="Chọn phương án chốt" value={selectedProposalId||room.proposals[0]?.id||''} onChange={event=>setSelectedProposalId(event.target.value)}><option value="" disabled>Chọn phương án</option>{room.proposals.map(p=><option key={p.id} value={p.id}>{p.title} · {p.voteCount} phiếu</option>)}</select><button className="primary-button" disabled={!room.proposals.length} onClick={()=>void runRoomAction(()=>updateRoomPhase(roomId,{phase:'FINALIZED',selectedProposalId:selectedProposalId||room.proposals[0]?.id},token))}>Chốt phương án <span>✓</span></button></div>:<span className="finalized-label">✓ Đã chốt</span>}</section>}
      {room.phase==='COLLECTING'&&<form className="proposal-form" onSubmit={event=>{event.preventDefault();void runRoomAction(()=>createProposal(roomId,{title:proposalTitle.trim(),description:proposalDescription.trim()||undefined,scheduledTime:proposalTime||null},token)).then(saved=>{if(saved){setProposalTitle('');setProposalDescription('');setProposalTime('')}})}}><h2>Đề xuất hoạt động</h2><label>Tên hoạt động hoặc địa điểm<input required maxLength={120} value={proposalTitle} onChange={event=>setProposalTitle(event.target.value)} placeholder="Ví dụ: Ăn lẩu rồi xem phim" /></label><div className="proposal-fields"><label>Thời gian dự kiến<input type="datetime-local" value={proposalTime} onChange={event=>setProposalTime(event.target.value)} /></label><label>Mô tả ngắn<input maxLength={500} value={proposalDescription} onChange={event=>setProposalDescription(event.target.value)} placeholder="Ghi chú thêm (không bắt buộc)" /></label></div><button className="primary-button">Thêm đề xuất <span>＋</span></button></form>}
      <section className="proposal-section"><div className="proposal-section-heading"><div><p className="eyebrow">CÙNG NHAU LÊN KẾ HOẠCH</p><h2>{room.phase==='FINALIZED'?'Phương án đã chốt':room.phase==='VOTING'?'Bình chọn ý tưởng':'Ý tưởng của cả nhóm'}</h2></div><span>{room.proposals.length} đề xuất</span></div>
        {!room.proposals.length?<div className="empty-proposals"><span>✳</span><strong>Chưa có đề xuất nào</strong><p>{room.phase==='COLLECTING'?'Hãy thêm ý tưởng đầu tiên để cả nhóm cùng bàn nhé.':'Chưa có ý tưởng để bình chọn.'}</p></div>:<div className="proposal-list">{room.proposals.map(proposal=>{const selected=room.selectedProposalId===proposal.id;return <article className={`proposal-card ${selected?'selected-proposal':''}`} key={proposal.id}><div className="proposal-card-title"><div><h3>{proposal.title}{selected&&<span className="winner-badge">ĐÃ CHỐT</span>}</h3>{proposal.description&&<p>{proposal.description}</p>}{proposal.scheduledTime&&<small>◷ {new Date(proposal.scheduledTime).toLocaleString('vi-VN',{dateStyle:'medium',timeStyle:'short'})}</small>}</div>{room.phase==='VOTING'&&<button className={`vote-button ${proposal.votedByMe?'voted':''}`} onClick={()=>void runRoomAction(()=>toggleVote(roomId,proposal.id,token))}>{proposal.votedByMe?'Bỏ bình chọn':'Bình chọn'} <b>{proposal.voteCount}</b></button>}</div><div className="voter-list">{proposal.voters.length?proposal.voters.map(voter=><span key={voter.membershipId}>{voter.displayName}</span>):<span>Chưa có lượt bình chọn</span>}</div></article>})}</div>}
      </section><div className="room-bottom-links"><Link to="/" className="text-link">← Trang đầu</Link>{room.member.role==='MEMBER'&&<button className="leave-button" onClick={()=>void onLeave()}>Rời phòng</button>}</div>
    </section>
  </main>
}
