import { useEffect, useRef, useState } from 'react'
import { claimRoom, getAccountToken, getApiError, getRoom, getRoomToken, RealtimeRequestError, streamRoomEvents, type Room } from '../api'

export function useRoomRealtime(roomId: string, token: string | null) {
  const [room,setRoom]=useState<Room|null>(null)
  const [error,setError]=useState('')
  const [realtimeState,setRealtimeState]=useState<'connecting'|'connected'|'reconnecting'|'disconnected'>('connecting')
  const currentRevisionRef=useRef(0)
  const snapshotControllerRef=useRef<AbortController|null>(null)

  useEffect(()=>{
    if(token===null)return
    const accessToken=token
    const controller=new AbortController()
    let stopped=false
    async function connect(){
      try{
        let response
        try{response=await getRoom(roomId,accessToken,controller.signal)}
        catch(requestError){
          const guestToken=getRoomToken(roomId)
          if(!getAccountToken()||!guestToken)throw requestError
          await claimRoom(roomId,accessToken,guestToken)
          response=await getRoom(roomId,accessToken,controller.signal)
        }
        if(stopped)return
        setRoom(response.data); currentRevisionRef.current=response.data.revision
        let lastRevision=response.data.revision
        while(!stopped){
          try{
            await streamRoomEvents(roomId,accessToken,lastRevision,controller.signal,
              ()=>setRealtimeState('connected'),
              update=>{
                lastRevision=Math.max(lastRevision,update.revision)
                currentRevisionRef.current=Math.max(currentRevisionRef.current,update.revision)
                setRealtimeState('connected')
                snapshotControllerRef.current?.abort()
                const snapshotController=new AbortController(); snapshotControllerRef.current=snapshotController
                void getRoom(roomId,accessToken,AbortSignal.any([controller.signal,snapshotController.signal])).then(snapshot=>{
                  if(stopped)return
                  lastRevision=Math.max(lastRevision,snapshot.data.revision)
                  if(snapshot.data.revision>=currentRevisionRef.current){currentRevisionRef.current=snapshot.data.revision;setRoom(snapshot.data)}
                }).catch(()=>undefined)
              })
            if(!stopped)throw new Error('Realtime stream closed')
          }catch(streamError){
            if(stopped||controller.signal.aborted)return
            if(streamError instanceof RealtimeRequestError&&streamError.status>=400&&streamError.status<500&&streamError.status!==408&&streamError.status!==429){setRealtimeState('disconnected');setError('Phiên realtime không còn hợp lệ. Hãy tải lại phòng hoặc tham gia lại bằng mã mời.');return}
            setRealtimeState('reconnecting')
            await new Promise(resolve=>window.setTimeout(resolve,1200))
          }
        }
      }catch(requestError){if(!stopped){setRealtimeState('disconnected');setError(getApiError(requestError))}}
    }
    void connect()
    return()=>{stopped=true;controller.abort();snapshotControllerRef.current?.abort()}
  },[roomId,token])

  return {room,setRoom,error,realtimeState,currentRevisionRef}
}
