import { useEffect, useRef, useState } from 'react'
import type { Editor } from '@tiptap/react'
import { applyTableBorders, type BorderPreset, type BorderSide } from './wordTableBorders'
import './TableBordersMenu.css'

const presets:{id:BorderPreset;label:string;symbol:string}[]=[
 {id:'all',label:'All borders',symbol:'▦'},{id:'none',label:'No borders',symbol:'□'},
 {id:'outside',label:'Outside borders',symbol:'▣'},{id:'inside',label:'Inside borders',symbol:'☷'},
 {id:'horizontal',label:'Inside horizontal',symbol:'☰'},{id:'vertical',label:'Inside vertical',symbol:'▥'},
]
const sides:{id:BorderSide;label:string;symbol:string}[]=[
 {id:'top',label:'Toggle top',symbol:'▔'},{id:'bottom',label:'Toggle bottom',symbol:'▁'},
 {id:'left',label:'Toggle left',symbol:'▏'},{id:'right',label:'Toggle right',symbol:'▕'},
]
export function TableBordersMenu({editor,left,top,onClose}:{editor:Editor;left:number;top:number;onClose:()=>void}){
 const [scope,setScope]=useState<'table'|'selection'>('table')
 const ref=useRef<HTMLDivElement>(null)
 useEffect(()=>{const down=(event:PointerEvent)=>{if(!ref.current?.contains(event.target as Node))onClose()};const key=(event:KeyboardEvent)=>{if(event.key==='Escape')onClose()};document.addEventListener('pointerdown',down);document.addEventListener('keydown',key);return()=>{document.removeEventListener('pointerdown',down);document.removeEventListener('keydown',key)}},[onClose])
 const apply=(choice:BorderPreset|BorderSide)=>{applyTableBorders(editor,choice,scope)}
 return <div className="word-border-menu" ref={ref} role="dialog" aria-label="Table borders" style={{left:Math.min(left,window.innerWidth-270),top:Math.min(top,window.innerHeight-365)}}><strong>Table borders</strong><div className="word-border-scope"><label><input type="radio" checked={scope==='table'} onChange={()=>setScope('table')}/>Whole table</label><label><input type="radio" checked={scope==='selection'} onChange={()=>setScope('selection')}/>Selected cells</label></div><div className="word-border-preset-grid">{presets.map(item=><button key={item.id} title={item.label} onClick={()=>apply(item.id)}><span>{item.symbol}</span>{item.label}</button>)}</div><small>Choose individual edges to show or hide them.</small><div className="word-border-side-grid">{sides.map(item=><button key={item.id} onClick={()=>apply(item.id)}><span>{item.symbol}</span>{item.label}</button>)}</div></div>
}
