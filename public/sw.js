self.addEventListener('push',event=>{
  let payload={title:'Đề xuất mới',body:'Có thành viên vừa thêm đề xuất vào phòng.',url:'/'}
  try{if(event.data)payload={...payload,...event.data.json()}}catch{}
  event.waitUntil((async()=>{
    const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true})
    const targetPath=new URL(payload.url,self.location.origin).pathname
    const active=windows.some(client=>client.visibilityState==='visible'&&new URL(client.url).pathname===targetPath)
    if(active)return
    await self.registration.showNotification(payload.title,{body:payload.body,icon:'/favicon.svg',badge:'/favicon.svg',tag:'letsplay-proposal',renotify:true,vibrate:[120,60,120],data:{url:payload.url}})
  })())
})
self.addEventListener('notificationclick',event=>{
  event.notification.close()
  const url=new URL(event.notification.data?.url??'/',self.location.origin).href
  event.waitUntil((async()=>{
    const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true})
    const existing=windows.find(client=>client.url.startsWith(self.location.origin))
    if(existing){await existing.focus();if('navigate' in existing)await existing.navigate(url)}else await self.clients.openWindow(url)
  })())
})
