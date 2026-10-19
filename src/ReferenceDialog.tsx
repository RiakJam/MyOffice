import { useEffect, useState } from 'react'

type Props={kind:'footnote'|'caption';onClose:()=>void;onSave:(text:string)=>void}

export function ReferenceDialog({kind,onClose,onSave}:Props){
 const [text,setText]=useState('')
 const footnote=kind==='footnote'
 useEffect(()=>{const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape')onClose()};document.addEventListener('keydown',onKey);return()=>document.removeEventListener('keydown',onKey)},[onClose])
 return <div className="reference-dialog-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)onClose()}}>
  <form className="reference-dialog" role="dialog" aria-modal="true" aria-labelledby="reference-dialog-title" onSubmit={event=>{event.preventDefault();if(text.trim())onSave(text.trim())}}>
   <h2 id="reference-dialog-title">{footnote?'Insert footnote':'Insert image caption'}</h2>
   <p>{footnote?'The note will appear at the bottom of this page.':'The caption will appear below the selected image.'}</p>
   <label>{footnote?'Footnote text':'Caption text'}<textarea autoFocus rows={3} value={text} onChange={event=>setText(event.target.value)} placeholder={footnote?'Type the note here':'Describe this image'}/></label>
   <div className="reference-dialog-actions"><button type="button" onClick={onClose}>Cancel</button><button className="save" type="submit" disabled={!text.trim()}>Insert {footnote?'footnote':'caption'}</button></div>
  </form>
 </div>
}
