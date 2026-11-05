import { useMemo, useState } from 'react'
import { getApiError, selectAvailabilitySlot, updateAvailability, updateAvailabilityOptions, type Room } from '../api'

type Props={room:Room;roomId:string;token:string;onRoom:(room:Room)=>void}

function localSlot(value:string){
  const date=new Date(value)
  return Number.isNaN(date.getTime())?value:date.toLocaleString('vi-VN',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})
}

export function AvailabilityPanel({room,roomId,token,onRoom}:Props){
  const [draftTime,setDraftTime]=useState('')
  const [draftSlots,setDraftSlots]=useState<string[]>([])
  const [editing,setEditing]=useState(false)
  const [busy,setBusy]=useState(false)
  const [message,setMessage]=useState('')
  const isHost=room.member.role==='HOST'
  const locked=room.phase==='FINALIZED'
  const slots=room.availabilitySlots??[]
  const recommendation=useMemo(()=>slots.reduce<(typeof slots)[number]|null>((best,slot)=>!best||slot.availableCount>best.availableCount?slot:best,null),[slots])

  async function saveOptions(){
    const current=slots.map(slot=>slot.startsAt.slice(0,16)).sort()
    const next=[...draftSlots].sort()
    if(slots.some(slot=>slot.availableCount>0)&&JSON.stringify(current)!==JSON.stringify(next)&&!window.confirm('Thay đổi danh sách giờ sẽ xóa các lựa chọn hiện tại của cả nhóm. Tiếp tục?'))return
    setBusy(true);setMessage('')
    try{const result=await updateAvailabilityOptions(roomId,draftSlots,token);onRoom(result.data);setDraftSlots([]);setEditing(false);setMessage('Đã cập nhật các khung giờ.')}
    catch(error){setMessage(getApiError(error))}finally{setBusy(false)}
  }
  async function toggleSlot(slotId:string,checked:boolean){
    if(busy||locked)return
    const current=slots.filter(slot=>slot.availableByMe).map(slot=>slot.id)
    const selected=checked?[...current,slotId]:current.filter(id=>id!==slotId)
    setBusy(true);setMessage('')
    try{const result=await updateAvailability(roomId,selected,token);onRoom(result.data)}
    catch(error){setMessage(getApiError(error))}finally{setBusy(false)}
  }
  async function chooseSlot(slotId:string){
    setBusy(true);setMessage('')
    try{const result=await selectAvailabilitySlot(roomId,slotId,token);onRoom(result.data);setMessage('Đã cập nhật giờ dự kiến của phòng.')}
    catch(error){setMessage(getApiError(error))}finally{setBusy(false)}
  }

  return <section className="availability-panel">
    <div className="availability-heading"><div><p className="eyebrow">TÌM GIỜ HẸN PHÙ HỢP</p><h2>Giờ nào mọi người đều rảnh?</h2><p>Chủ phòng đưa ra vài lựa chọn; mỗi người đánh dấu giờ mình tham gia được. Phiếu luôn ẩn danh.</p></div>{isHost&&!locked&&<button type="button" className="secondary-button" onClick={()=>{setDraftSlots(slots.map(slot=>slot.startsAt.slice(0,16)));setEditing(value=>!value);setMessage('')}}>{editing?'Đóng':'Sửa khung giờ'}</button>}</div>
    {editing&&isHost&&<div className="availability-editor"><label>Thêm ngày và giờ<input type="datetime-local" value={draftTime} onChange={event=>setDraftTime(event.target.value)}/></label><button type="button" className="secondary-button" disabled={!draftTime||draftSlots.includes(draftTime)} onClick={()=>{setDraftSlots(slots=>[...slots,draftTime].sort());setDraftTime('')}}>＋ Thêm giờ</button><div className="availability-draft-list">{draftSlots.map((slot,index)=><button type="button" key={`${slot}-${index}`} onClick={()=>setDraftSlots(slots=>slots.filter((_,i)=>i!==index))}>{localSlot(slot)} <span>×</span></button>)}</div><button type="button" className="primary-button" disabled={busy||!draftSlots.length} onClick={()=>void saveOptions()}>{busy?'Đang lưu…':'Lưu các khung giờ'} <span>✓</span></button></div>}
    {!slots.length?<div className="availability-empty">{isHost?'Thêm vài ngày và giờ dự kiến để cả nhóm chọn.':'Chủ phòng chưa thêm khung giờ. Bạn sẽ chọn được khi các lựa chọn xuất hiện.'}</div>:<>
      {recommendation&&<div className="availability-recommendation"><span>ĐANG ĐƯỢC CHỌN NHIỀU NHẤT</span><strong>{localSlot(recommendation.startsAt)}</strong><small>{recommendation.availableCount}/{room.memberCount} người có thể tham gia</small></div>}
      <div className="availability-list">{slots.map(slot=>{
        const percent=room.memberCount?Math.round(slot.availableCount/room.memberCount*100):0
        return <div className={`availability-option ${slot.selected?'is-selected':''}`} key={slot.id}><input id={`availability-${slot.id}`} type="checkbox" checked={slot.availableByMe} disabled={busy||locked} onChange={event=>void toggleSlot(slot.id,event.target.checked)}/><label htmlFor={`availability-${slot.id}`} className="availability-option-content"><strong>{localSlot(slot.startsAt)}{slot.selected&&<em>GIỜ DỰ KIẾN</em>}</strong><span>{slot.availableCount} / {room.memberCount} người có thể</span><i><b style={{width:`${percent}%`}}/></i></label>{isHost&&!locked&&<button type="button" className="mini-action" disabled={busy||slot.availableCount===0} onClick={()=>void chooseSlot(slot.id)}>Chốt giờ</button>}</div>
      })}</div>
    </>}
    {message&&<p className="availability-message" role="status">{message}</p>}
  </section>
}
