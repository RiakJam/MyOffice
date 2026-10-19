import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

type Format = 'long' | 'short' | 'numeric' | 'iso'
const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
const formatDate = (date: Date, format: Format) => {
  if (format === 'iso') return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  if (format === 'numeric') return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date)
  if (format === 'short') return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(date)
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(date)
}
export function DateInsertDialog({ onInsert, onClose }: { onInsert: (value: string) => void; onClose: () => void }) {
  const [selected, setSelected] = useState(() => startOfDay(new Date()))
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [format, setFormat] = useState<Format>('long')
  useEffect(() => { const key = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }; document.addEventListener('keydown', key); return () => document.removeEventListener('keydown', key) }, [onClose])
  const monthName = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(visibleMonth)
  const offset = (visibleMonth.getDay() + 6) % 7
  const days = Array.from({ length: 42 }, (_, index) => new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), index - offset + 1))
  const moveMonth = (change: number) => setVisibleMonth(current => new Date(current.getFullYear(), current.getMonth() + change, 1))
  const today = () => { const date = startOfDay(new Date()); setSelected(date); setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1)) }
  return <div className="date-dialog-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}><div className="date-dialog" role="dialog" aria-modal="true" aria-labelledby="date-dialog-title"><h2 id="date-dialog-title">Insert date</h2><p>Choose a date and how it should appear in your document.</p><div className="date-calendar-header"><button aria-label="Previous month" onClick={() => moveMonth(-1)}><ChevronLeft size={17}/></button><strong>{monthName}</strong><button aria-label="Next month" onClick={() => moveMonth(1)}><ChevronRight size={17}/></button></div><div className="date-calendar" role="grid" aria-label={monthName}>{['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(day => <span className="date-weekday" key={day}>{day}</span>)}{days.map(date => <button key={date.toISOString()} role="gridcell" aria-selected={sameDay(date, selected)} className={`${date.getMonth() !== visibleMonth.getMonth() ? 'outside' : ''} ${sameDay(date, startOfDay(new Date())) ? 'today' : ''}`} onClick={() => { setSelected(date); if (date.getMonth() !== visibleMonth.getMonth()) setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1)) }}>{date.getDate()}</button>)}</div><button className="date-today" onClick={today}>Today</button><label className="date-format-label">Date format<select aria-label="Date format" value={format} onChange={event => setFormat(event.target.value as Format)}><option value="long">{formatDate(selected, 'long')}</option><option value="short">{formatDate(selected, 'short')}</option><option value="numeric">{formatDate(selected, 'numeric')}</option><option value="iso">{formatDate(selected, 'iso')}</option></select></label><div className="date-dialog-actions"><button onClick={onClose}>Cancel</button><button className="insert" onClick={() => onInsert(formatDate(selected, format))}>Insert date</button></div></div></div>
}
