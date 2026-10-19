import { useEffect, useState } from 'react'

const colors = [
 ['White','#ffffff'],['Ivory','#fffdf3'],['Cream','#fff5df'],['Sand','#f2eadf'],['Blush','#fff0ef'],['Rose','#fce0e5'],
 ['Lavender','#f1edff'],['Lilac','#e7dcfa'],['Ice blue','#eef8ff'],['Sky','#dceffd'],['Mint','#e7f8ef'],['Sage','#e7efe2'],
 ['Slate','#e6edf2'],['Peach','#ffe9d7'],['Yellow','#fff4bd'],['Blue','#cce3f4'],['Green','#d1ead9'],['Gray','#e6e7e9'],
] as const

export function PageColorDialog({ value, onSave, onClose }: { value: string; onSave: (color: string) => void; onClose: () => void }) {
 const [color, setColor] = useState(value)
 useEffect(() => { const close = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }; document.addEventListener('keydown', close); return () => document.removeEventListener('keydown', close) }, [onClose])
 return <div className="page-color-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
  <div className="page-color-dialog" role="dialog" aria-modal="true" aria-labelledby="page-color-title">
   <h2 id="page-color-title">Page color</h2><p>Choose a background color for the document pages.</p>
   <div className="page-color-grid">{colors.map(([name,hex]) => <button key={name} type="button" aria-label={name} aria-pressed={color.toLowerCase() === hex} title={name} style={{ background: hex }} onClick={() => setColor(hex)} />)}</div>
   <label className="page-color-custom">Custom color<input aria-label="Custom page color" type="color" value={color} onChange={event => setColor(event.target.value)} /><code>{color.toUpperCase()}</code></label>
   <div className="page-color-preview" style={{ background: color }}><span>Page preview</span></div>
   <div className="page-color-actions"><button type="button" onClick={() => onSave('#ffffff')}>No color</button><button type="button" onClick={onClose}>Cancel</button><button type="button" className="apply" onClick={() => onSave(color)}>Apply color</button></div>
  </div>
 </div>
}
