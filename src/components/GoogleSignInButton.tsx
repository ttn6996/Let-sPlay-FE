import { useEffect, useRef, useState } from 'react'

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options:{client_id:string;callback:(response:{credential:string})=>void;use_fedcm_for_button?:boolean})=>void
          renderButton: (element:HTMLElement,options:Record<string,string|number|boolean>)=>void
        }
      }
    }
  }
}

type Props={clientId:string;disabled?:boolean;onCredential:(credential:string)=>void}

export function GoogleSignInButton({clientId,disabled=false,onCredential}:Props){
  const container=useRef<HTMLDivElement>(null)
  const callback=useRef(onCredential)
  const [loadError,setLoadError]=useState(false)
  callback.current=onCredential

  useEffect(()=>{
    let cancelled=false
    const render=()=>{
      if(cancelled||!container.current||!window.google)return
      window.google.accounts.id.initialize({client_id:clientId,callback:response=>callback.current(response.credential),use_fedcm_for_button:true})
      container.current.replaceChildren()
      const buttonWidth=Math.max(240,Math.min(400,Math.round(container.current.getBoundingClientRect().width)||400))
      window.google.accounts.id.renderButton(container.current,{type:'standard',theme:'outline',size:'large',text:'continue_with',shape:'rectangular',logo_alignment:'left',width:buttonWidth,locale:'vi'})
    }
    let script=document.querySelector<HTMLScriptElement>('script[data-google-identity]')
    if(window.google){render()}
    else if(script){script.addEventListener('load',render);script.addEventListener('error',()=>setLoadError(true),{once:true})}
    else{
      script=document.createElement('script');script.src='https://accounts.google.com/gsi/client';script.async=true;script.defer=true;script.dataset.googleIdentity='true';script.onload=render;script.onerror=()=>setLoadError(true);document.head.append(script)
    }
    const resize=()=>render()
    window.addEventListener('resize',resize)
    return()=>{cancelled=true;window.removeEventListener('resize',resize);script?.removeEventListener('load',render)}
  },[clientId])

  if(!clientId)return null
  return <div className={`google-signin ${disabled?'is-disabled':''}`} aria-label="Đăng nhập bằng Google"><div ref={container}/>{loadError&&<small>Không tải được Google Sign-In. Bạn có thể đăng nhập bằng email.</small>}</div>
}
