import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { commentOnProposal, createProposal, deleteProposal, getAccountToken, getApiError, getRoomToken, kickMember, leaveRoom, setProposalCompleted, toggleVote, updateProposal, updateRoomPhase, type Room } from '../api'
import { useRoomRealtime } from '../hooks/useRoomRealtime'
import { ConnectionStatus } from '../components/ConnectionStatus'
import { QRCodeSVG } from 'qrcode.react'
import { enableRoomNotifications, requestRoomPushPermission, unlockNotificationSound } from '../notifications'
import { AvailabilityPanel } from '../components/AvailabilityPanel'
const RoomToolkit=lazy(()=>import('../components/RoomToolkit').then(module=>({default:module.RoomToolkit})))

export default function RoomPage() {
  const { roomId = '' } = useParams()
  const token = getAccountToken() ?? getRoomToken(roomId)
  const {room,setRoom,error,realtimeState,currentRevisionRef,proposalNotice,setProposalNotice}=useRoomRealtime(roomId,token)
  const [actionError, setActionError] = useState('')
  const [copied, setCopied] = useState(false)
  const [proposalTitle, setProposalTitle] = useState('')
  const [proposalDescription, setProposalDescription] = useState('')
  const [proposalTime, setProposalTime] = useState('')
  const [proposalLocation,setProposalLocation]=useState('')
  const [proposalCost,setProposalCost]=useState('')
  const [proposalLatitude,setProposalLatitude]=useState<number|null>(null)
  const [proposalLongitude,setProposalLongitude]=useState<number|null>(null)
  const [selectedProposalId, setSelectedProposalId] = useState('')
  const [editingProposalId,setEditingProposalId]=useState('')
  const [commentDrafts,setCommentDrafts]=useState<Record<string,string>>({})
  const [qrOpen,setQrOpen]=useState(false)
  const pushPromptAttempted=useRef(false)
  useEffect(()=>{if(!proposalNotice)return;const timer=window.setTimeout(()=>setProposalNotice(''),5500);return()=>window.clearTimeout(timer)},[proposalNotice,setProposalNotice])
  useEffect(()=>{if(room?.id&&token&&'Notification' in window&&Notification.permission==='granted')void enableRoomNotifications(roomId,token).catch(()=>undefined)},[room?.id,roomId,token])

  function onRoomGesture(){
    unlockNotificationSound()
    if(pushPromptAttempted.current||!token||!('Notification' in window)||Notification.permission!=='default')return
    pushPromptAttempted.current=true
    void requestRoomPushPermission().then(granted=>{if(granted)void enableRoomNotifications(roomId,token).catch(()=>undefined)})
  }

  async function runRoomAction(action: () => Promise<{ data: Room }>): Promise<boolean> {
    setActionError('')
    try { const response=await action(); if(response.data.revision>=currentRevisionRef.current){currentRevisionRef.current=response.data.revision;setRoom(response.data)} return true }
    catch(requestError){setActionError(getApiError(requestError));return false}
  }

  async function copyInvite() {
    try { await copyText(`${window.location.origin}/?code=${encodeURIComponent(room?.inviteCode??'')}`); setCopied(true); window.setTimeout(()=>setCopied(false),1800) }
    catch { setActionError('Không thể sao chép. Hãy sao chép mã mời thủ công.') }
  }

  async function copyText(value:string){
    try{if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(value);return}}
    catch{/* Use the selection based fallback for insecure LAN origins. */}
    const textarea=document.createElement('textarea');textarea.value=value;textarea.setAttribute('readonly','');textarea.style.position='fixed';textarea.style.opacity='0';document.body.append(textarea);textarea.select()
    const copied=document.execCommand('copy');textarea.remove();if(!copied)throw new Error('Clipboard unavailable')
  }

  async function copyInviteCode(){try{await copyText(room?.inviteCode??'');setCopied(true);window.setTimeout(()=>setCopied(false),1800)}catch{setActionError('Không thể sao chép mã mời.')}}

  function selectedProposal(){return room?.proposals.find(proposal=>proposal.id===room.selectedProposalId)??null}
  function calendarStart(value:string|null){
    if(room?.eventDate&&room.eventTime)return new Date(`${room.eventDate}T${room.eventTime}`)
    if(room?.eventDate&&value)return new Date(`${room.eventDate}T${value.slice(11,16)}`)
    if(value)return new Date(value)
    return null
  }
  function calendarDay(value:string){return value.replaceAll('-','')}
  function calendarNextDay(value:string){const [year,month,day]=value.split('-').map(Number);const next=new Date(year,month-1,day+1);return `${next.getFullYear()}${String(next.getMonth()+1).padStart(2,'0')}${String(next.getDate()).padStart(2,'0')}`}
  function addCalendar(){
    const proposal=selectedProposal();if(!proposal)return
    const start=calendarStart(proposal.scheduledTime);const end=start?new Date(start.getTime()+60*60*1000):null
    const format=(date:Date)=>date.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z')
    const details=[proposal.description,room?.region?`Khu vực: ${room.region}`:null].filter(Boolean).join('\n')||`Cuộc hẹn: ${room?.name??''}`
    const params=new URLSearchParams({action:'TEMPLATE',text:proposal.title,details})
    if(room?.eventDate&&!room.eventTime&&!proposal.scheduledTime)params.set('dates',`${calendarDay(room.eventDate)}/${calendarNextDay(room.eventDate)}`)
    else if(start&&end)params.set('dates',`${format(start)}/${format(end)}`)
    if(room?.region)params.set('location',room.region)
    window.open(`https://calendar.google.com/calendar/render?${params.toString()}`,'_blank','noopener,noreferrer')
  }
  function downloadCalendar(){
    const proposal=selectedProposal();if(!proposal)return
    const start=calendarStart(proposal.scheduledTime);const end=start?new Date(start.getTime()+60*60*1000):null
    const format=(date:Date)=>date.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z')
    const escape=(text:string)=>text.replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;')
    const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//LetsPlay//Room Planner//VI','BEGIN:VEVENT',`UID:${proposal.id}@letsplay`,`DTSTAMP:${format(new Date())}`]
    if(room?.eventDate&&!room.eventTime&&!proposal.scheduledTime)lines.push(`DTSTART;VALUE=DATE:${calendarDay(room.eventDate)}`,`DTEND;VALUE=DATE:${calendarNextDay(room.eventDate)}`)
    else if(start&&end)lines.push(`DTSTART:${format(start)}`,`DTEND:${format(end)}`)
    lines.push(`SUMMARY:${escape(proposal.title)}`,`DESCRIPTION:${escape(proposal.description??room?.name??'')}`,'END:VEVENT','END:VCALENDAR')
    if(room?.region)lines.splice(lines.length-2,0,`LOCATION:${escape(room.region)}`)
    const blob=new Blob([lines.join('\r\n')],{type:'text/calendar;charset=utf-8'});const url=URL.createObjectURL(blob);const anchor=document.createElement('a');anchor.href=url;anchor.download=`letsplay-${proposal.title.toLowerCase().replace(/[^a-z0-9]+/g,'-')}.ics`;anchor.click();URL.revokeObjectURL(url)
  }

  async function optimisticVote(proposalId:string){
    if(!room||!token)return
    const previous=room
    const previousRevision=currentRevisionRef.current
    const alreadyVoted=room.proposals.find(p=>p.id===proposalId)?.votedByMe??false
    setRoom({...room,proposals:room.proposals.map(p=>p.id===proposalId?{...p,votedByMe:!alreadyVoted,voteCount:Math.max(0,p.voteCount+(alreadyVoted?-1:1))}:p)})
    const saved=await runRoomAction(()=>toggleVote(roomId,proposalId,token))
    if(!saved&&currentRevisionRef.current===previousRevision)setRoom(previous)
  }

  async function onKick(membershipId:string){
    if(!token)return
    setActionError('')
    try{await kickMember(roomId,membershipId,token)}catch(requestError){setActionError(getApiError(requestError))}
  }

  async function sendProposalComment(proposalId:string){
    const content=(commentDrafts[proposalId]??'').trim()
    if(!content||!token)return
    const saved=await runRoomAction(()=>commentOnProposal(roomId,proposalId,content,token))
    if(saved)setCommentDrafts(values=>({...values,[proposalId]:''}))
  }

  async function onLeave() {
    if(!room||!token)return
    try { await leaveRoom(roomId,token); if(!getAccountToken()) sessionStorage.removeItem(`letsplay.room.${roomId}`); window.location.assign('/') }
    catch(requestError){setActionError(getApiError(requestError))}
  }

  if (error || !token) return <main className="room-shell" onPointerDownCapture={onRoomGesture}><Link className="brand" to="/"><span className="brand-mark">k</span><span>Kèo</span></Link><section className="room-state"><span className="state-icon">↗</span><h1>Chưa vào được phòng</h1><p>{error || 'Không tìm thấy phiên trong tab này. Hãy tham gia lại bằng mã mời.'}</p><Link className="primary-button link-button" to="/">Về trang đầu <span>→</span></Link></section></main>
  if (!room) return <main className="room-shell" onPointerDownCapture={onRoomGesture}><Link className="brand" to="/"><span className="brand-mark">k</span><span>Kèo</span></Link><p className="loading-state">Đang mở phòng…</p></main>

  const phaseLabel=room.phase==='FINALIZED'?'Đã chốt lịch':room.phase==='VOTING'?'Đang bình chọn':'Đang góp ý'
  const onlineCount=room.members.filter(member=>member.online).length
  const highestVoteCount=Math.max(0,...room.proposals.map(proposal=>proposal.voteCount))
  const displayProposals=[...room.proposals].sort((left,right)=>Number(right.id===room.selectedProposalId)-Number(left.id===room.selectedProposalId))
  const inviteUrl=`${window.location.origin}/?code=${encodeURIComponent(room.inviteCode)}`
  return <main className="room-shell" onPointerDownCapture={onRoomGesture}><header className="topbar"><Link className="brand" to="/"><span className="brand-mark">k</span><span>Kèo</span></Link><span className="room-member"><ConnectionStatus state={realtimeState}/><strong>{room.member.displayName}</strong></span></header>
    <section className="room-welcome"><div className="room-heading"><div><p className="eyebrow"><span className="status-dot" /> {room.status==='CANCELLED'?'KẾ HOẠCH ĐÃ HỦY':'PHÒNG ĐANG MỞ'}</p><h1>{room.name}</h1><p>Chào {room.member.displayName}, cùng nhau chốt một cuộc vui.</p></div><div className="invite-actions"><button type="button" className="secondary-button" onClick={()=>void copyInvite()}>{copied?'Đã sao chép!':'Sao chép link mời'}</button><button type="button" className="secondary-button" onClick={()=>void copyInviteCode()}>Sao chép mã</button><button type="button" className="secondary-button" onClick={()=>setQrOpen(open=>!open)}>{qrOpen?'Ẩn QR':'Mã QR'}</button></div></div>
      {qrOpen&&<div className="qr-panel"><QRCodeSVG value={inviteUrl} size={180} includeMargin/><span>Quét mã để xem trước và tham gia phòng</span></div>}
      <div className="room-facts"><div><span>VAI TRÒ CỦA BẠN</span><strong>{room.member.role==='HOST'?'Chủ phòng':'Thành viên'}</strong></div><div><span>THÀNH VIÊN</span><strong>{room.memberCount}</strong></div><div><span>ĐANG TRỰC TUYẾN</span><strong>{onlineCount}/{room.memberCount}</strong></div><div><span>GIAI ĐOẠN</span><strong>{phaseLabel}</strong></div></div>
      {(room.eventDate||room.eventTime||room.region)&&<section className="room-details-card" aria-label="Thông tin cuộc hẹn"><p className="eyebrow">THÔNG TIN CUỘC HẸN</p><div className="room-details-items">{(room.eventDate||room.eventTime)&&<div className="room-detail-item"><span className="room-detail-icon">◷</span><span><small>THỜI GIAN DỰ KIẾN</small><strong>{room.eventDate?new Date(`${room.eventDate}T${room.eventTime??'12:00'}`).toLocaleString('vi-VN',room.eventTime?{weekday:'long',day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'}:{weekday:'long',day:'numeric',month:'long'}):`${room.eventTime} · chưa chọn ngày`}</strong></span></div>}{room.region&&<a className="room-detail-item room-location-link" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(room.region)}`} target="_blank" rel="noreferrer"><span className="room-detail-icon">⌖</span><span><small>ĐỊA ĐIỂM / KHU VỰC</small><strong>{room.region}</strong><em>Mở Google Maps ↗</em></span></a>}</div></section>}
      <div className="notification-controls"><div><strong>Thông báo luôn bật trong phòng</strong><span>Bạn sẽ nhận báo realtime khi có đề xuất mới. Thông báo đẩy tự đăng ký nếu đã cho phép trên trình duyệt.</span></div><span className="notification-on-badge">● ĐANG BẬT</span></div>
      <Suspense fallback={<p className="loading-state">Đang tải công cụ phòng…</p>}><RoomToolkit room={room} roomId={roomId} token={token} onRoom={updated=>{if(updated.revision>=currentRevisionRef.current){currentRevisionRef.current=updated.revision;setRoom(updated)}}}/></Suspense>
      {token&&<AvailabilityPanel room={room} roomId={roomId} token={token} onRoom={updated=>{if(updated.revision>=currentRevisionRef.current){currentRevisionRef.current=updated.revision;setRoom(updated)}}}/>}
      {room.phase==='FINALIZED'&&selectedProposal()&&<section className="finalized-banner"><div><span>CUỘC HẸN ĐÃ ĐƯỢC CHỐT</span><h2>{selectedProposal()!.title}</h2><p>{selectedProposal()!.description}{selectedProposal()!.scheduledTime&&` · ${new Date(selectedProposal()!.scheduledTime!).toLocaleString('vi-VN',{dateStyle:'medium',timeStyle:'short'})}`}</p></div><div><button className="secondary-button" onClick={addCalendar}>Thêm vào Google Calendar</button><button className="secondary-button" onClick={downloadCalendar}>Tải lịch (.ics)</button></div></section>}
      <section className="members-panel"><div className="members-heading"><strong>Thành viên</strong><span>{onlineCount}/{room.memberCount} đang online</span></div><div className="members-list">{room.members.map(member=><div className="room-member-chip" key={member.id}><span className={`online-dot ${member.online?'is-online':''}`} />{member.displayName}<small>{member.role==='HOST'?'Chủ phòng':'Thành viên'}</small>{room.member.role==='HOST'&&member.id!==room.member.id&&<button type="button" onClick={()=>void onKick(member.id)}>Mời ra</button>}</div>)}</div></section>
      {proposalNotice&&<div className="proposal-notice" role="status"><span>✳</span><div><strong>Đề xuất mới</strong><p>{proposalNotice}</p></div><button type="button" aria-label="Đóng thông báo" onClick={()=>setProposalNotice('')}>×</button></div>}
      {actionError&&<p className="form-error" role="alert">{actionError}</p>}
      {room.status==='CANCELLED'&&<p className="toolkit-error">Kế hoạch đã hủy. Chủ phòng có thể mở lại trong mục Kế hoạch.</p>}{room.status==='OPEN'&&room.member.role==='HOST'&&<section className="host-controls"><div><strong>Điều khiển chủ phòng</strong><span>{room.phase==='COLLECTING'?'Mở bình chọn khi mọi người đã gửi ý tưởng.':room.phase==='VOTING'?'Có thể tiếp tục góp ý và bình chọn phương án.':'Phương án đã được chốt.'}</span></div>{room.phase==='COLLECTING'?<button className="primary-button" onClick={()=>void runRoomAction(()=>updateRoomPhase(roomId,{phase:'VOTING'},token))}>Bắt đầu bình chọn <span>→</span></button>:room.phase==='VOTING'?<div className="voting-controls"><button type="button" className="secondary-button" onClick={()=>{if(window.confirm('Quay lại góp ý. Các phiếu hiện tại sẽ được giữ nguyên. Tiếp tục?'))void runRoomAction(()=>updateRoomPhase(roomId,{phase:'COLLECTING'},token))}}>← Quay lại góp ý</button><div className="finalize-control"><select aria-label="Chọn phương án chốt" value={selectedProposalId||room.proposals[0]?.id||''} onChange={event=>setSelectedProposalId(event.target.value)}><option value="" disabled>Chọn phương án</option>{room.proposals.map(p=><option key={p.id} value={p.id}>{p.title} · {p.voteCount} phiếu</option>)}</select><button className="primary-button" disabled={!room.proposals.length} onClick={()=>void runRoomAction(()=>updateRoomPhase(roomId,{phase:'FINALIZED',selectedProposalId:selectedProposalId||room.proposals[0]?.id},token))}>Chốt phương án <span>✓</span></button></div></div>:<span className="finalized-label">✓ Đã chốt</span>}</section>}
      {room.status==='OPEN'&&(['COLLECTING','VOTING'].includes(room.phase))&&<form className="proposal-form" onSubmit={event=>{event.preventDefault();void runRoomAction(()=>createProposal(roomId,{title:proposalTitle.trim(),description:proposalDescription.trim()||undefined,scheduledTime:proposalTime||null,location:proposalLocation||null,estimatedCostPerPerson:proposalCost?Number(proposalCost):null,latitude:proposalLatitude,longitude:proposalLongitude},token)).then(saved=>{if(saved){setProposalTitle('');setProposalDescription('');setProposalTime('');setProposalLocation('');setProposalCost('');setProposalLatitude(null);setProposalLongitude(null)}})}}><h2>{room.phase==='VOTING'?'Thêm đề xuất trong lúc bình chọn':'Đề xuất hoạt động'}</h2><p className="proposal-form-note">Đề xuất mới sẽ xuất hiện ngay để mọi người bình chọn.</p><label>Tên hoạt động hoặc địa điểm<input required maxLength={120} value={proposalTitle} onChange={event=>setProposalTitle(event.target.value)} placeholder="Ví dụ: Ăn lẩu rồi xem phim" /></label><div className="proposal-fields"><label>Thời gian dự kiến<input type="datetime-local" value={proposalTime} onChange={event=>setProposalTime(event.target.value)} /></label><label>Mô tả ngắn<input maxLength={500} value={proposalDescription} onChange={event=>setProposalDescription(event.target.value)} placeholder="Ghi chú thêm (không bắt buộc)" /></label><label>Địa điểm<input maxLength={200} value={proposalLocation} onChange={event=>{setProposalLocation(event.target.value);setProposalLatitude(null);setProposalLongitude(null)}} placeholder="Quán, địa chỉ hoặc khu vực" /><button type="button" className="text-link" onClick={()=>{setProposalLocation(room.region??'');setProposalLatitude(room.eventLatitude);setProposalLongitude(room.eventLongitude)}}>Dùng vị trí kế hoạch đã ghim</button></label><label>Chi phí dự kiến/người (₫)<input type="number" min="0" value={proposalCost} onChange={event=>setProposalCost(event.target.value)} placeholder="Không bắt buộc" /></label></div><button className="primary-button">Thêm đề xuất <span>＋</span></button></form>}
      <section className="proposal-section"><div className="proposal-section-heading"><div><p className="eyebrow">CÙNG NHAU LÊN KẾ HOẠCH</p><h2>{room.phase==='FINALIZED'?'Phương án đã chốt':room.phase==='VOTING'?'Bình chọn ý tưởng':'Ý tưởng của cả nhóm'}</h2></div><span>{room.proposals.length} đề xuất</span></div>
        {!room.proposals.length?<div className="empty-proposals"><span>✳</span><strong>Chưa có đề xuất nào</strong><p>{room.phase==='FINALIZED'?'Chưa có phương án được chốt.':'Hãy thêm ý tưởng đầu tiên để cả nhóm cùng bàn nhé.'}</p></div>:<div className="proposal-list">{displayProposals.map(proposal=>{const selected=room.selectedProposalId===proposal.id;const canManage=room.phase!=='FINALIZED'&&(room.member.role==='HOST'||proposal.createdByMe);const topPick=proposal.voteCount>0&&proposal.voteCount===highestVoteCount;const progress=room.memberCount?Math.min(100,Math.round(proposal.voteCount/room.memberCount*100)):0;return <article className={`proposal-card ${selected?'selected-proposal':''} ${proposal.completed?'completed-proposal':''}`} key={proposal.id}>{editingProposalId===proposal.id?<form className="proposal-edit-form" onSubmit={event=>{event.preventDefault();void runRoomAction(()=>updateProposal(roomId,proposal.id,{title:proposalTitle.trim(),description:proposalDescription.trim()||undefined,scheduledTime:proposalTime||null,location:proposalLocation||null,estimatedCostPerPerson:proposalCost?Number(proposalCost):null,latitude:proposalLatitude,longitude:proposalLongitude},token)).then(saved=>{if(saved)setEditingProposalId('')})}}><label>Tên đề xuất<input required maxLength={120} value={proposalTitle} onChange={event=>setProposalTitle(event.target.value)}/></label><label>Mô tả<input maxLength={500} value={proposalDescription} onChange={event=>setProposalDescription(event.target.value)}/></label><label>Thời gian<input type="datetime-local" value={proposalTime} onChange={event=>setProposalTime(event.target.value)}/></label><label>Địa điểm<input maxLength={200} value={proposalLocation} onChange={event=>{setProposalLocation(event.target.value);setProposalLatitude(null);setProposalLongitude(null)}}/></label><label>Chi phí/người<input type="number" min="0" value={proposalCost} onChange={event=>setProposalCost(event.target.value)}/></label><div className="proposal-edit-actions"><button className="primary-button">Lưu thay đổi</button><button type="button" className="secondary-button" onClick={()=>setEditingProposalId('')}>Hủy</button></div></form>:<><div className="proposal-card-title"><div><h3>{proposal.title}{selected&&<span className="winner-badge">ĐÃ CHỐT · GHIM ĐẦU</span>}{topPick&&<span className="top-pick-badge">TOP PICK</span>}</h3>{proposal.description&&<p>{proposal.description}</p>}{proposal.scheduledTime&&<small>◷ {new Date(proposal.scheduledTime).toLocaleString('vi-VN',{dateStyle:'medium',timeStyle:'short'})}</small>}{proposal.location&&<small>⌖ {proposal.location}</small>}{proposal.estimatedCostPerPerson!=null&&<small>♧ {proposal.estimatedCostPerPerson.toLocaleString('vi-VN')} ₫/người</small>}</div><div className="proposal-card-actions">{room.phase==='VOTING'&&<button className={`vote-button ${proposal.votedByMe?'voted':''}`} onClick={()=>void optimisticVote(proposal.id)}>{proposal.votedByMe?'Bỏ bình chọn':'Bình chọn'} <b>{proposal.voteCount}</b></button>}{canManage&&<><button className="mini-action" onClick={()=>{setEditingProposalId(proposal.id);setProposalTitle(proposal.title);setProposalDescription(proposal.description??'');setProposalTime(proposal.scheduledTime?.slice(0,16)??'');setProposalLocation(proposal.location??'');setProposalLatitude(proposal.latitude);setProposalLongitude(proposal.longitude);setProposalCost(proposal.estimatedCostPerPerson?String(proposal.estimatedCostPerPerson):'')}}>Sửa</button><button className="mini-action danger" onClick={()=>{if(window.confirm('Xóa đề xuất này?'))void runRoomAction(()=>deleteProposal(roomId,proposal.id,token))}}>Xóa</button></>}</div></div><div className="vote-progress"><div><span>{proposal.voteCount} phiếu</span><span>{progress}% thành viên</span></div><i><b style={{width:`${progress}%`}}/></i></div><div className="voter-list">{proposal.voters.length?proposal.voters.map((voter,index)=><span key={`${proposal.id}-${index}`}>{voter.displayName}</span>):<span>Chưa có lượt bình chọn</span>}</div><label className="proposal-completion"><input type="checkbox" checked={proposal.completed} disabled={room.status==='CANCELLED'} onChange={event=>void runRoomAction(()=>setProposalCompleted(roomId,proposal.id,event.target.checked,token))}/><span>{proposal.completed?'Đã thực hiện':'Đánh dấu đã thực hiện'}</span></label><div className="discussion-thread"><strong>Thảo luận <span>· bình luận ẩn danh</span></strong>{proposal.comments?.map(comment=><p className="discussion-comment" key={comment.id}><b>{comment.writtenByMe?'Bạn':'Ẩn danh'}</b>{comment.content}</p>)}<form onSubmit={event=>{event.preventDefault();void sendProposalComment(proposal.id)}}><input maxLength={500} value={commentDrafts[proposal.id]??''} onChange={event=>setCommentDrafts(values=>({...values,[proposal.id]:event.target.value}))} placeholder="Trao đổi về đề xuất này…"/><button type="submit" className="mini-action" disabled={room.status==='CANCELLED'||!(commentDrafts[proposal.id]??'').trim()}>Gửi</button></form></div></>}</article>})}</div>}
      </section><div className="room-bottom-links"><Link to="/" className="text-link">← Trang đầu</Link><button className="leave-button" onClick={()=>void onLeave()}>{room.member.role==='HOST'?'Rời phòng và chuyển quyền':'Rời phòng'}</button></div>
    </section>
  </main>
}
