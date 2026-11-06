import { useEffect, useMemo, useState } from 'react'
import { addAvailabilitySlots, commentOnAvailabilitySlot, getApiError, selectAvailabilitySlot, updateAvailability, updateAvailabilityOptions, type Room } from '../api'

type Props={room:Room;roomId:string;token:string;onRoom:(room:Room)=>void}
const DEFAULT_TITLE='Giờ nào mọi người đều rảnh?'

function localSlot(value:string){
  const date=new Date(value)
  return Number.isNaN(date.getTime())?value:date.toLocaleString('vi-VN',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})
}

export function AvailabilityPanel({room,roomId,token,onRoom}:Props){
  const [draftTime,setDraftTime]=useState('')
  const [newSlotTime,setNewSlotTime]=useState('')
  const [commentDrafts,setCommentDrafts]=useState<Record<string,string>>({})
  const [draftSlots,setDraftSlots]=useState<string[]>([])
  const [draftTitle,setDraftTitle]=useState(room.availabilityTitle||DEFAULT_TITLE)
  const [editing,setEditing]=useState(false)
  const [busy,setBusy]=useState(false)
  const [message,setMessage]=useState('')
  const [draftSelection,setDraftSelection]=useState<string[]|null>(null)
  const isHost=room.member.role==='HOST'
  const locked=room.phase==='FINALIZED'
  const slots=room.availabilitySlots??[]
  const slotSignature=slots.map(slot=>slot.id).join(',')
  const savedSelection=slots.filter(slot=>slot.availableByMe).map(slot=>slot.id)
  const selection=draftSelection??savedSelection
  const selectionChanged=[...selection].sort().join(',')!==[...savedSelection].sort().join(',')
  const recommendation=useMemo(()=>slots.reduce<(typeof slots)[number]|null>((best,slot)=>!best||slot.availableCount>best.availableCount?slot:best,null),[slots])

  useEffect(()=>setDraftSelection(null),[slotSignature])

  async function saveOptions(){
    const title=draftTitle.trim()
    if(!title){setMessage('Vui lòng nhập tiêu đề bình chọn.');return}
    const current=slots.map(slot=>slot.startsAt.slice(0,16)).sort()
    const next=[...draftSlots].sort()
    const timesChanged=JSON.stringify(current)!==JSON.stringify(next)
    if(timesChanged&&slots.some(slot=>slot.availableCount>0||(slot.comments?.length??0)>0)&&!window.confirm('Thay đổi danh sách giờ sẽ xóa phiếu và bình luận trên các khung giờ hiện tại. Tiếp tục?'))return
    setBusy(true);setMessage('')
    try{
      const result=await updateAvailabilityOptions(roomId,title,draftSlots,token)
      onRoom(result.data);setDraftSlots([]);setDraftTitle(result.data.availabilityTitle||title);setEditing(false);setMessage('Đã lưu tiêu đề và các khung giờ.')
    }catch(error){setMessage(getApiError(error))}finally{setBusy(false)}
  }

  function toggleSlot(slotId:string,checked:boolean){
    if(busy||locked)return
    const next=new Set(selection)
    if(checked)next.add(slotId);else next.delete(slotId)
    setDraftSelection([...next]);setMessage('')
  }

  async function saveSelection(){
    if(!selectionChanged||busy||locked)return
    setBusy(true);setMessage('')
    try{const result=await updateAvailability(roomId,selection,token);onRoom(result.data);setDraftSelection(null);setMessage('Đã lưu các khung giờ bạn chọn.')}
    catch(error){setMessage(getApiError(error))}finally{setBusy(false)}
  }

  async function chooseSlot(slotId:string){
    setBusy(true);setMessage('')
    try{const result=await selectAvailabilitySlot(roomId,slotId,token);onRoom(result.data);setMessage('Đã cập nhật giờ dự kiến của phòng.')}
    catch(error){setMessage(getApiError(error))}finally{setBusy(false)}
  }

  async function addSlot(){
    if(!newSlotTime||busy||locked)return
    setBusy(true);setMessage('')
    try{const result=await addAvailabilitySlots(roomId,[newSlotTime],token);onRoom(result.data);setNewSlotTime('');setMessage('Đã thêm khung giờ mới.')}
    catch(error){setMessage(getApiError(error))}finally{setBusy(false)}
  }

  async function sendComment(slotId:string){
    const content=(commentDrafts[slotId]??'').trim()
    if(!content||busy)return
    setBusy(true);setMessage('')
    try{const result=await commentOnAvailabilitySlot(roomId,slotId,content,token);onRoom(result.data);setCommentDrafts(values=>({...values,[slotId]:''}))}
    catch(error){setMessage(getApiError(error))}finally{setBusy(false)}
  }

  return <section className="availability-panel">
    <div className="availability-heading"><div><p className="eyebrow">TÌM GIỜ HẸN PHÙ HỢP</p><h2>{room.availabilityTitle||DEFAULT_TITLE}</h2><p>Mọi thành viên có thể thêm khung giờ và chọn nhiều thời điểm phù hợp. Phiếu luôn ẩn danh.</p></div>{isHost&&!locked&&<button type="button" className="secondary-button" onClick={()=>{setDraftSlots(slots.map(slot=>slot.startsAt.slice(0,16)));setDraftTitle(room.availabilityTitle||DEFAULT_TITLE);setEditing(value=>!value);setMessage('')}}>{editing?'Đóng':'Sửa tiêu đề / giờ'}</button>}</div>
    {editing&&isHost&&<div className="availability-editor">
      <label className="availability-title-field">Tiêu đề bình chọn<input type="text" required maxLength={100} value={draftTitle} onChange={event=>setDraftTitle(event.target.value)} placeholder="Ví dụ: Cuối tuần này mọi người rảnh lúc nào?"/></label>
      <label>Thêm ngày và giờ<input type="datetime-local" value={draftTime} onChange={event=>setDraftTime(event.target.value)}/></label>
      <button type="button" className="secondary-button" disabled={!draftTime||draftSlots.includes(draftTime)} onClick={()=>{setDraftSlots(times=>[...times,draftTime].sort());setDraftTime('')}}>＋ Thêm giờ</button>
      <div className="availability-draft-list">{draftSlots.map((slot,index)=><button type="button" key={`${slot}-${index}`} onClick={()=>setDraftSlots(times=>times.filter((_,i)=>i!==index))}>{localSlot(slot)} <span>×</span></button>)}</div>
      <button type="button" className="primary-button" disabled={busy||!draftSlots.length||!draftTitle.trim()} onClick={()=>void saveOptions()}>{busy?'Đang lưu…':'Lưu tiêu đề và khung giờ'} <span>✓</span></button>
    </div>}
    {!locked&&<form className="availability-add-slot" onSubmit={event=>{event.preventDefault();void addSlot()}}><label>Thêm khung giờ mới<input type="datetime-local" value={newSlotTime} onChange={event=>setNewSlotTime(event.target.value)}/></label><button type="submit" className="secondary-button" disabled={busy||!newSlotTime}>＋ Thêm khung giờ</button><small>Mọi thành viên trong phòng đều có thể đề xuất giờ.</small></form>}
    {!slots.length?<div className="availability-empty">{isHost?'Thêm vài ngày và giờ dự kiến để cả nhóm chọn.':'Chủ phòng chưa thêm khung giờ. Bạn sẽ chọn được khi các lựa chọn xuất hiện.'}</div>:<>
      {recommendation&&<div className="availability-recommendation"><span>ĐANG ĐƯỢC CHỌN NHIỀU NHẤT</span><strong>{localSlot(recommendation.startsAt)}</strong><small>{recommendation.availableCount}/{room.memberCount} người có thể tham gia</small></div>}
      <div className="availability-list">{slots.map(slot=>{
        const percent=room.memberCount?Math.round(slot.availableCount/room.memberCount*100):0
        return <div className={`availability-option ${selection.includes(slot.id)?'is-selected':''}`} key={slot.id}><input id={`availability-${slot.id}`} type="checkbox" checked={selection.includes(slot.id)} disabled={busy||locked} onChange={event=>toggleSlot(slot.id,event.target.checked)}/><label htmlFor={`availability-${slot.id}`} className="availability-option-content"><strong>{localSlot(slot.startsAt)}{slot.selected&&<em>GIỜ DỰ KIẾN</em>}</strong><span>{slot.availableCount} / {room.memberCount} người có thể</span><i><b style={{width:`${percent}%`}}/></i></label>{isHost&&!locked&&<button type="button" className="mini-action" disabled={busy||slot.availableCount===0} onClick={()=>void chooseSlot(slot.id)}>Chốt giờ</button>}
          <div className="discussion-thread"><strong>Thảo luận <span>· bình luận ẩn danh</span></strong>{slot.comments?.map(comment=><p className="discussion-comment" key={comment.id}><b>{comment.writtenByMe?'Bạn':'Ẩn danh'}</b>{comment.content}</p>)}<form onSubmit={event=>{event.preventDefault();void sendComment(slot.id)}}><input maxLength={500} value={commentDrafts[slot.id]??''} onChange={event=>setCommentDrafts(values=>({...values,[slot.id]:event.target.value}))} placeholder="Trao đổi về khung giờ này…"/><button type="submit" className="mini-action" disabled={busy||!(commentDrafts[slot.id]??'').trim()}>Gửi</button></form></div>
        </div>
      })}</div>
      {!locked&&<div className="availability-vote-actions"><span>{selectionChanged?'Các lựa chọn chưa được lưu.':`Đã chọn ${selection.length} khung giờ.`}</span><button type="button" className="primary-button" disabled={busy||!selectionChanged} onClick={()=>void saveSelection()}>{busy?'Đang lưu…':'Lưu lựa chọn'} <span>✓</span></button></div>}
    </>}
    {message&&<p className="availability-message" role="status">{message}</p>}
  </section>
}
