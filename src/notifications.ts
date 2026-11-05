import { getPushConfig, savePushSubscription } from './api'

let audioContext: AudioContext | null = null
let vapidKeyRequest:Promise<string>|null=null

export function preloadPushConfig(){
  vapidKeyRequest??=getPushConfig().then(response=>response.data.vapidPublicKey).catch(()=> '')
  return vapidKeyRequest
}

export async function requestRoomPushPermission(){
  if(!('Notification' in window)||!('PushManager' in window)||!('serviceWorker' in navigator))return false
  if(Notification.permission==='granted')return true
  if(Notification.permission==='denied'||!await preloadPushConfig())return false
  try{return await Notification.requestPermission()==='granted'}catch{return false}
}

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
  if(!('serviceWorker' in navigator)||!('PushManager' in window)||!('Notification' in window)||Notification.permission!=='granted')return false
  const vapidPublicKey=await preloadPushConfig()
  if(!vapidPublicKey)return false
  const registration=await navigator.serviceWorker.register('/sw.js')
  const subscription=await registration.pushManager.getSubscription()??await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:decodeVapidKey(vapidPublicKey) as BufferSource})
  await savePushSubscription(roomId,token,subscription)
  return true
}
