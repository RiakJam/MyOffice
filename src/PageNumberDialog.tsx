import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'

export type NumberStyle = 'arabic' | 'roman-upper' | 'roman-lower'
export type NumberRule = { start: number; end: number; style: NumberStyle }
export type NumberLayout = 'number' | 'page' | 'page-of-total' | 'total'
export type NumberAlignment = 'left' | 'center' | 'right'
export type NumberPosition = 'footer' | 'header'
export type PageNumberSettings = { enabled: boolean; defaultStyle: NumberStyle; layout: NumberLayout; alignment: NumberAlignment; position: NumberPosition; rules: NumberRule[] }
const styleNames: Record<NumberStyle, string> = { arabic: '1, 2, 3', 'roman-upper': 'I, II, III', 'roman-lower': 'i, ii, iii' }
const roman = (value: number) => {
  let remaining = value
  let result = ''
  for (const [number, letter] of [[1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],[50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']] as const) {
    while (remaining >= number) { result += letter; remaining -= number }
  }
  return result
}
export const numberForPage = (page: number, settings: PageNumberSettings) => {
  const rule = settings.rules.find(item => page >= item.start && page <= item.end)
  const style = rule?.style || settings.defaultStyle
  if (style === 'arabic' || page > 3999) return String(page)
  const numeral = roman(page)
  return style === 'roman-lower' ? numeral.toLowerCase() : numeral
}
export const displayForPage = (page: number, total: number, settings: PageNumberSettings) => {
  const number = numberForPage(page, settings)
  if (settings.layout === 'page') return `Page ${number}`
  if (settings.layout === 'page-of-total') return `Page ${number} of ${numberForPage(total, settings)}`
  if (settings.layout === 'total') return `Total pages: ${numberForPage(total, settings)}`
  return number
}
export function PageNumberDialog({ value, pageCount, onSave, onClose }: { value: PageNumberSettings; pageCount: number; onSave: (value: PageNumberSettings) => void; onClose: () => void }) {
  const [enabled, setEnabled] = useState(value.enabled)
  const [defaultStyle, setDefaultStyle] = useState<NumberStyle>(value.defaultStyle)
  const [layout, setLayout] = useState<NumberLayout>(value.layout)
  const [alignment, setAlignment] = useState<NumberAlignment>(value.alignment)
  const [position, setPosition] = useState<NumberPosition>(value.position)
  const [rules, setRules] = useState<NumberRule[]>(value.rules.map(rule => ({ ...rule })))
  const [error, setError] = useState('')
  useEffect(() => { const key = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }; document.addEventListener('keydown', key); return () => document.removeEventListener('keydown', key) }, [onClose])
  const updateRule = (index: number, change: Partial<NumberRule>) => setRules(current => current.map((rule, i) => i === index ? { ...rule, ...change } : rule))
  const save = () => {
    const sorted = [...rules].sort((a, b) => a.start - b.start)
    if (sorted.some(rule => !Number.isInteger(rule.start) || !Number.isInteger(rule.end) || rule.start < 1 || rule.end < rule.start || rule.end > 3999)) { setError('Each range needs a valid first and last page.'); return }
    if (sorted.some((rule, index) => index > 0 && rule.start <= sorted[index - 1].end)) { setError('Page ranges cannot overlap.'); return }
    onSave({ enabled, defaultStyle, layout, alignment, position, rules: sorted })
  }
  const preview = { enabled, defaultStyle, layout, alignment, position, rules }
  const previewPages = Math.min(8, Math.max(6, pageCount))
  return <div className="page-number-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}><div className="page-number-dialog" role="dialog" aria-modal="true" aria-labelledby="page-number-title"><h2 id="page-number-title">Page numbers</h2><p>Choose the numbering style for the document. Add a page range to use Roman numerals only on those pages.</p><label className="page-number-toggle"><input type="checkbox" checked={enabled} onChange={event => setEnabled(event.target.checked)}/> Show page numbers</label><label className="page-number-default">Other pages<select aria-label="Numbering for other pages" value={defaultStyle} onChange={event => setDefaultStyle(event.target.value as NumberStyle)} disabled={!enabled}>{Object.entries(styleNames).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><div className="page-number-options"><label>Page number style<select aria-label="Page number style" value={layout} onChange={event => setLayout(event.target.value as NumberLayout)} disabled={!enabled}><option value="number">1</option><option value="page">Page 1</option><option value="page-of-total">Page 1 of 1</option><option value="total">Total pages: 1</option></select></label><label>Alignment<select aria-label="Page number alignment" value={alignment} onChange={event => setAlignment(event.target.value as NumberAlignment)} disabled={!enabled}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></label></div><label className="page-number-position">Place page numbers<select aria-label="Page number position" value={position} onChange={event => setPosition(event.target.value as NumberPosition)} disabled={!enabled}><option value="footer">Footer, below footer text</option><option value="header">Header, above header text</option></select></label><div className="page-number-ranges"><div className="page-number-ranges-heading"><strong>Different numbering for a page range</strong><button onClick={() => setRules(current => [...current, { start: Math.max(1, pageCount + 1), end: Math.max(1, pageCount + 4), style: 'roman-upper' }])} disabled={!enabled}><Plus size={14}/> Add range</button></div>{rules.length ? rules.map((rule, index) => <div className="page-number-rule" key={index}><label>From<input aria-label={`Range ${index + 1} first page`} type="number" min="1" max="3999" value={rule.start} onChange={event => updateRule(index, { start: Number(event.target.value) })}/></label><label>To<input aria-label={`Range ${index + 1} last page`} type="number" min="1" max="3999" value={rule.end} onChange={event => updateRule(index, { end: Number(event.target.value) })}/></label><label>Style<select aria-label={`Range ${index + 1} style`} value={rule.style} onChange={event => updateRule(index, { style: event.target.value as NumberStyle })}>{Object.entries(styleNames).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><button className="page-number-delete" aria-label={`Remove range ${index + 1}`} onClick={() => setRules(current => current.filter((_, i) => i !== index))}><Trash2 size={15}/></button></div>) : <span className="page-number-empty">All pages use the style above.</span>}</div><div className="page-number-preview"><strong>Preview ({previewPages}-page example)</strong><div>{Array.from({ length: previewPages }, (_, index) => <span key={index}>Page {index + 1}<b>{enabled ? displayForPage(index + 1, previewPages, preview) : '—'}</b></span>)}</div></div>{error && <div className="page-number-error" role="alert">{error}</div>}<div className="page-number-actions"><button onClick={onClose}>Cancel</button><button className="save" onClick={save}>Apply page numbers</button></div></div></div>
}
