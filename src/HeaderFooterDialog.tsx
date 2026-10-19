import { useEffect, useState } from 'react'

type Kind = 'header' | 'footer'
export function HeaderFooterDialog({ kind, value, onSave, onClose }: { kind: Kind; value: string; onSave: (value: string) => void; onClose: () => void }) {
  const [text, setText] = useState(value)
  useEffect(() => { const key = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }; document.addEventListener('keydown', key); return () => document.removeEventListener('keydown', key) }, [onClose])
  const name = kind === 'header' ? 'Header' : 'Footer'
  return <div className="header-footer-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}><form className="header-footer-dialog" role="dialog" aria-modal="true" aria-labelledby="header-footer-title" onSubmit={event => { event.preventDefault(); onSave(text) }}><h2 id="header-footer-title">Edit {name.toLowerCase()}</h2><p>{kind === 'header' ? 'Add text that appears at the top of each page.' : 'Add text that appears at the bottom of each page. Page numbers are configured separately.'}</p><label>{name} text<textarea autoFocus rows={4} value={text} onChange={event => setText(event.target.value)} placeholder={`Type ${name.toLowerCase()} text here`}/></label><div className="header-footer-actions"><button type="button" onClick={() => setText('')}>Clear text</button><span/><button type="button" onClick={onClose}>Cancel</button><button className="save" type="submit">Save {name.toLowerCase()}</button></div></form></div>
}
