import { getPushConfig, savePushSubscription } from './api'

let audioContext: AudioContext | null = null

export function unlockNotificationSound(){
  try{
    const Context=window.AudioContext
    if(!Context)return
    audioContext??=new Context()
    if(audioContext.state==='suspended')void audioContext.resume()
    const oscillator=audioContext.createOscillator();const gain=audioContext.createGain()
    gain.gain.value=0;oscillator.connect(gain);gain.connect(audioContext.destination);oscillator.start();oscillator.stop(audioContext.currentTime+0.01)
    ;(window as Window & {__letsPlayAudioContext?:AudioContext}).__letsPlayAudioContext=audioContext
  }catch{/* Sound is an optional enhancement. */}
}

function decodeVapidKey(value:string){
  const padding='='.repeat((4-value.length%4)%4)
  const base64=(value+padding).replace(/-/g,'+').replace(/_/g,'/')
  const raw=window.atob(base64)
  return Uint8Array.from(raw,character=>character.charCodeAt(0))
}

export async function enableRoomNotifications(roomId:string,token:string){
  if(!('serviceWorker' in navigator)||!('PushManager' in window)||!('Notification' in window))throw new Error('Trình duyệt này chưa hỗ trợ thông báo đẩy.')
  const {data}=await getPushConfig()
  if(!data.vapidPublicKey)throw new Error('Máy chủ chưa cấu hình khóa Web Push. Thông báo trong phòng vẫn hoạt động.')
  const permission=await Notification.requestPermission()
  if(permission!=='granted')throw new Error('Bạn chưa cho phép gửi thông báo trên trình duyệt.')
  const registration=await navigator.serviceWorker.register('/sw.js')
  const subscription=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:decodeVapidKey(data.vapidPublicKey) as BufferSource})
  await savePushSubscription(roomId,token,subscription)
}
