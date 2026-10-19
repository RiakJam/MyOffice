import { Node } from '@tiptap/core'
import { useEffect, useState } from 'react'

export type TocOptions = { style:'classic'|'modern'|'compact'; order:'document'|'alphabetical'; pages:'right'|'inline'|'hidden'; depth:number }
export type TocEntry = { title:string; level:number; page:number }
export const defaultTocOptions:TocOptions = {style:'classic',order:'document',pages:'right',depth:3}
const readJSON=(value:string|null,fallback:unknown)=>{try{return JSON.parse(value||'')}catch{return fallback}}

export const TableOfContents = Node.create({
 name:'tableOfContents',group:'block',atom:true,selectable:true,
 addAttributes:()=>({
  options:{default:defaultTocOptions,parseHTML:element=>readJSON(element.getAttribute('data-toc-options'),defaultTocOptions),renderHTML:attributes=>({'data-toc-options':JSON.stringify(attributes.options)})},
  entries:{default:[],parseHTML:element=>readJSON(element.getAttribute('data-toc-entries'),[]),renderHTML:attributes=>({'data-toc-entries':JSON.stringify(attributes.entries)})},
 }),
 parseHTML:()=>[{tag:'section[data-table-of-contents]'}],
 renderHTML:({node})=>{
  const options=node.attrs.options as TocOptions
  const entries=node.attrs.entries as TocEntry[]
  return ['section',{'data-table-of-contents':'true',class:`table-of-contents toc-${options.style} toc-pages-${options.pages}`},
   ['div',{class:'toc-header'},['strong',{},'Contents'],['button',{type:'button','data-toc-update':'true',contenteditable:'false'},'Update contents']],
   ['div',{class:'toc-entries'},...(entries.length?entries.map(entry=>['div',{class:`toc-entry toc-level-${entry.level}`},['span',{class:'toc-title'},entry.title],['span',{class:'toc-leader'},''],...(options.pages==='hidden'?[]:[['span',{class:'toc-page'},options.pages==='inline'?`Page ${entry.page}`:String(entry.page)]])]):[['p',{class:'toc-empty'},'Add headings, then select Update contents.']])]
  ]
 },
})

type Props={initial?:TocOptions;onClose:()=>void;onSave:(value:TocOptions)=>void}
export function TableOfContentsDialog({initial,onClose,onSave}:Props){
 const [value,setValue]=useState<TocOptions>(initial||defaultTocOptions)
 useEffect(()=>{const key=(event:KeyboardEvent)=>{if(event.key==='Escape')onClose()};document.addEventListener('keydown',key);return()=>document.removeEventListener('keydown',key)},[onClose])
 return <div className="reference-dialog-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)onClose()}}><form className="reference-dialog toc-dialog" role="dialog" aria-modal="true" aria-labelledby="toc-dialog-title" onSubmit={event=>{event.preventDefault();onSave(value)}}>
  <h2 id="toc-dialog-title">{initial?'Contents options':'Insert table of contents'}</h2>
  <p>Choose which headings to include and how their pages appear. Use Update contents in the document after editing headings or pages.</p>
  <label>Style<select value={value.style} onChange={event=>setValue({...value,style:event.target.value as TocOptions['style']})}><option value="classic">Classic with dotted leaders</option><option value="modern">Modern</option><option value="compact">Compact</option></select></label>
  <label>Arrange entries<select value={value.order} onChange={event=>setValue({...value,order:event.target.value as TocOptions['order']})}><option value="document">Document order</option><option value="alphabetical">Alphabetical</option></select></label>
  <label>Show pages<select value={value.pages} onChange={event=>setValue({...value,pages:event.target.value as TocOptions['pages']})}><option value="right">Right aligned page numbers</option><option value="inline">Page labels after titles</option><option value="hidden">Hide page numbers</option></select></label>
  <label>Heading levels<select value={value.depth} onChange={event=>setValue({...value,depth:Number(event.target.value)})}>{[1,2,3,4,5,6].map(level=><option key={level} value={level}>{level}</option>)}</select></label>
  <div className="reference-dialog-actions"><button type="button" onClick={onClose}>Cancel</button><button className="save" type="submit">{initial?'Apply and update':'Insert contents'}</button></div>
 </form></div>
}
