import { useEffect, useRef } from 'react'

export function useFileMenuDismiss(open:boolean,close:()=>void){
 const buttonRef=useRef<HTMLButtonElement>(null)
 const menuRef=useRef<HTMLDivElement>(null)
 useEffect(()=>{
  if(!open)return
  const outside=(event:PointerEvent)=>{const target=event.target as Node;if(!buttonRef.current?.contains(target)&&!menuRef.current?.contains(target))close()}
  const escape=(event:KeyboardEvent)=>{if(event.key==='Escape')close()}
  document.addEventListener('pointerdown',outside)
  document.addEventListener('keydown',escape)
  return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape)}
 },[open,close])
 return {buttonRef,menuRef}
}
