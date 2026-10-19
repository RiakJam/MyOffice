import { useState } from 'react'
import { presentationShapes, ShapeGraphic, type PresentationShapeId } from './presentationShapes'
import './WordShapesDialog.css'

export function WordShapesDialog({onClose,onInsert}:{onClose:()=>void;onInsert:(source:string,name:string)=>void}){
 const [shape,setShape]=useState<PresentationShapeId>('rect')
 const [fill,setFill]=useState('#39b7aa')
 const [stroke,setStroke]=useState('#187a7a')
 const [group,setGroup]=useState('Basic')
 const insert=async()=>{
  const entry=presentationShapes.find(item=>item.id===shape)!
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 100 100" preserveAspectRatio="none"><path d="${entry.path}" fill="${shape==='line'?'none':fill}" fill-rule="${shape==='donut'?'evenodd':'nonzero'}" stroke="${stroke}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/></svg>`
  const image=new Image()
  image.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg)
  await image.decode()
  const canvas=document.createElement('canvas');canvas.width=640;canvas.height=400
  canvas.getContext('2d')?.drawImage(image,0,0)
  onInsert(canvas.toDataURL('image/png'),entry.name)
 }
 return <div className="word-shapes-backdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)onClose()}}><div className="word-shapes-dialog" role="dialog" aria-modal="true" aria-label="Insert shape"><header><strong>Insert a shape</strong><button aria-label="Close shapes" onClick={onClose}>×</button></header><div className="word-shapes-groups">{['Basic','Arrows','Stars','Symbols','Flowchart','Lines'].map(name=><button key={name} className={group===name?'active':''} onClick={()=>setGroup(name)}>{name}</button>)}</div><div className="word-shapes-grid">{presentationShapes.filter(item=>item.group===group).map(item=><button key={item.id} className={shape===item.id?'active':''} aria-label={item.name} onClick={()=>setShape(item.id)}><ShapeGraphic shape={item.id} fill={fill} stroke={stroke}/><span>{item.name}</span></button>)}</div><div className="word-shapes-options"><label>Fill <input type="color" value={fill} onChange={e=>setFill(e.target.value)}/></label><label>Outline <input type="color" value={stroke} onChange={e=>setStroke(e.target.value)}/></label></div><footer><button onClick={onClose}>Cancel</button><button className="primary" onClick={()=>void insert()}>Insert shape</button></footer></div></div>
}
