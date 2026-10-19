import { useEffect } from 'react'

export type InfoDialogContent={title:string;message?:string;stats?:{label:string;value:number}[]}

export function InfoDialog({content,onClose}:{content:InfoDialogContent;onClose:()=>void}){
 useEffect(()=>{const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape')onClose()};document.addEventListener('keydown',onKey);return()=>document.removeEventListener('keydown',onKey)},[onClose])
 return <div className="info-dialog-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)onClose()}}>
  <div className="info-dialog" role="dialog" aria-modal="true" aria-labelledby="info-dialog-title">
   <h2 id="info-dialog-title">{content.title}</h2>
   {content.message&&<p>{content.message}</p>}
   {content.stats&&<dl>{content.stats.map(item=><div key={item.label}><dt>{item.label}</dt><dd>{item.value.toLocaleString()}</dd></div>)}</dl>}
   <button autoFocus type="button" onClick={onClose}>Close</button>
  </div>
 </div>
}
