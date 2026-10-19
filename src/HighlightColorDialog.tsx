import { useEffect, useState } from 'react'

const colors = [
 ['Yellow','#fff0a8'],['Bright yellow','#ffff00'],['Gold','#ffd966'],['Orange','#f9cb9c'],['Peach','#fce5cd'],
 ['Pink','#f4cccc'],['Rose','#ead1dc'],['Red','#ea9999'],['Lavender','#d9d2e9'],['Purple','#c9b2d9'],
 ['Pale blue','#dcecff'],['Sky blue','#cfe2f3'],['Blue','#a4c2f4'],['Teal','#a2c4c9'],['Mint','#d8f5e2'],
 ['Green','#b6d7a8'],['Lime','#d9ead3'],['Gray','#d9d9d9'],['Light gray','#eeeeee'],['Brown','#d7b89c'],
] as const

type Props={currentColor:string;onClose:()=>void;onChoose:(color:string|null)=>void}
export function HighlightColorDialog({currentColor,onClose,onChoose}:Props){
 const [customColor,setCustomColor]=useState(/^#[0-9a-f]{6}$/i.test(currentColor)?currentColor:'#fff0a8')
 useEffect(()=>{const key=(event:KeyboardEvent)=>{if(event.key==='Escape')onClose()};document.addEventListener('keydown',key);return()=>document.removeEventListener('keydown',key)},[onClose])
 return <div className="text-color-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)onClose()}}>
  <div className="text-color-dialog" role="dialog" aria-modal="true" aria-labelledby="highlight-color-title">
   <div className="text-color-heading"><h2 id="highlight-color-title">Text background color</h2><button type="button" aria-label="Close highlight colors" onClick={onClose}>×</button></div>
   <p>Choose a background color for selected words.</p>
   <div className="text-color-grid" aria-label="Text background colors">{colors.map(([name,color])=><button key={name} type="button" title={name} aria-label={name} aria-pressed={currentColor.toLowerCase()===color} style={{backgroundColor:color}} onClick={()=>onChoose(color)}/>)}</div>
   <div className="text-color-custom"><label htmlFor="custom-highlight-color">Custom color</label><input id="custom-highlight-color" type="color" value={customColor} onChange={event=>setCustomColor(event.target.value)}/><code>{customColor.toUpperCase()}</code><button type="button" onClick={()=>onChoose(customColor)}>Apply</button></div>
   <button className="text-color-default" type="button" onClick={()=>onChoose(null)}>No background color</button>
  </div>
 </div>
}
