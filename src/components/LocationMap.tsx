import { useEffect, useRef } from 'react'
import { Map as MapLibreMap, Marker, NavigationControl, type MapMouseEvent } from 'maplibre-gl'
import { setWorkerUrl } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { Point } from './RoomToolkit'

setWorkerUrl(workerUrl)
export function LocationMap({location,meetup,mode,onSelect}:{location:Point|null;meetup:Point|null;mode:'event'|'meetup';onSelect:(point:Point)=>void}){
 const host=useRef<HTMLDivElement>(null),map=useRef<MapLibreMap|null>(null),marker=useRef<Marker|null>(null)
 const selectRef=useRef(onSelect)
 useEffect(()=>{selectRef.current=onSelect},[onSelect])
 useEffect(()=>{if(!host.current||map.current)return;const point=mode==='event'?location:meetup;const instance=new MapLibreMap({container:host.current,style:'https://tiles.openfreemap.org/styles/bright',center:[point?.lon??105.8342,point?.lat??21.0278],zoom:point?12:5});instance.addControl(new NavigationControl(),'top-right');instance.on('click',(event:MapMouseEvent)=>selectRef.current({lat:event.lngLat.lat,lon:event.lngLat.lng}));map.current=instance;return()=>{instance.remove();map.current=null}},[])
 useEffect(()=>{if(!map.current)return;const point=mode==='event'?location:meetup;if(point){map.current.flyTo({center:[point.lon,point.lat],zoom:12});marker.current?.remove();marker.current=new Marker({color:mode==='event'?'#aa6b42':'#35664c'}).setLngLat([point.lon,point.lat]).addTo(map.current)}else marker.current?.remove()},[location,meetup,mode])
 return <div className="toolkit-map" ref={host}/>
}
