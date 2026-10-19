import { useState } from 'react'

const colors=[
 ['Black','#000000'],['Dark gray','#555555'],['Gray','#888888'],['Light gray','#b7b7b7'],['White','#ffffff'],
 ['Dark red','#9c0006'],['Red','#e53935'],['Orange','#f57c00'],['Gold','#d4a000'],['Yellow','#f5d900'],
 ['Dark green','#006100'],['Green','#2e7d32'],['Teal','#00897b'],['Blue','#1a73e8'],['Dark blue','#174ea6'],
 ['Purple','#7b1fa2'],['Magenta','#c2185b'],['Brown','#795548'],['Sky blue','#4fc3f7'],['Pale blue','#dcecff'],
] as const

type Props={currentColor:string;onClose:()=>void;onChoose:(color:string|null)=>void}

export function TextColorDialog({currentColor,onClose,onChoose}:Props){
 const [customColor,setCustomColor]=useState(/^#[0-9a-f]{6}$/i.test(currentColor)?currentColor:'#1a73e8')
 return <div className="text-color-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)onClose()}}>
  <div className="text-color-dialog" role="dialog" aria-modal="true" aria-labelledby="text-color-title" onKeyDown={event=>{if(event.key==='Escape')onClose()}}>
   <div className="text-color-heading"><h2 id="text-color-title">Font color</h2><button type="button" aria-label="Close font color dialog" onClick={onClose}>×</button></div>
   <p>Choose a color for the selected text.</p>
   <div className="text-color-grid" aria-label="Font colors">{colors.map(([name,color])=><button key={name} type="button" title={name} aria-label={name} aria-pressed={currentColor.toLowerCase()===color} style={{backgroundColor:color}} onClick={()=>onChoose(color)}/>)}</div>
   <div className="text-color-custom"><label htmlFor="custom-font-color">Custom color</label><input id="custom-font-color" type="color" value={customColor} onChange={event=>setCustomColor(event.target.value)}/><code>{customColor.toUpperCase()}</code><button type="button" onClick={()=>onChoose(customColor)}>Apply</button></div>
   <button className="text-color-default" type="button" onClick={()=>onChoose(null)}>Automatic text color</button>
  </div>
 </div>
}
