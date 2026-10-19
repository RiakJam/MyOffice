import { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'

type Group = { name: string; ranges: Array<[number, number]>; featured: string }
const groups: Group[] = [
  { name: 'Financial', ranges: [[0x20A0, 0x20CF]], featured: '$ € £ ¥ ₹ ₦ ₩ ₽ ₿ ¢ ₱ ₲ ₵ ₡ ₭ ₺ ₴ ₸ ₼ ₪ ﷼' },
  { name: 'Mathematics', ranges: [], featured: '± × ÷ − ≠ ≈ ≤ ≥ ∞ √ ∛ ∜ ∑ ∏ ∫ ∬ ∭ ∂ ∆ ∇ ∈ ∉ ∋ ∀ ∃ ∄ ∅ ∩ ∪ ⊂ ⊃ ⊆ ⊇ ∧ ∨ ∝ ∴ ∵ ≡ ≅ ≃ ∼ ≪ ≫ ⊕ ⊗ ⊥ ∥ ∠ ∟ ∡ ∢ ∙ ⋅ ⌈ ⌉ ⌊ ⌋ ° ² ³ ½ ¼ ¾ ⅓ ⅔ ⅛ ⅜ ⅝ ⅞' },
  { name: 'Greek letters', ranges: [[0x0370, 0x03FF]], featured: 'α β γ δ ε θ λ μ π σ φ ω Ω Δ Σ Π Γ Ψ' },
  { name: 'Arrows', ranges: [[0x2190, 0x21FF], [0x27F0, 0x27FF]], featured: '← ↑ → ↓ ↔ ↕ ↗ ↘ ⇐ ⇒ ⇔ ↩ ↪ ➜' },
  { name: 'Punctuation', ranges: [[0x2010, 0x206F]], featured: '© ® ™ § ¶ • · … — – “ ” ‘ ’ « » † ‡ ‰ ※ ¿ ¡' },
  { name: 'Shapes', ranges: [[0x25A0, 0x25FF]], featured: '■ □ ▪ ▫ ▲ △ ▼ ▽ ◆ ◇ ● ○ ◉ ◌ ◐ ★ ☆' },
  { name: 'Technical', ranges: [[0x2100, 0x214F], [0x2300, 0x23FF]], featured: '℅ ℃ ℉ № ℗ ℠ ℞ Ω ℹ ⌘ ⌥ ⌫ ⌦ ⏎ ⌂' },
  { name: 'Dingbats', ranges: [[0x2700, 0x27BF]], featured: '✓ ✔ ✕ ✖ ✗ ✘ ✉ ✂ ✈ ✦ ✧ ✩ ✪ ❖ ❏ ❐ ❑' },
  { name: 'Music & others', ranges: [[0x2600, 0x26FF], [0x2669, 0x266F]], featured: '♪ ♫ ♬ ♩ ♭ ♯ ♮ ☀ ☁ ☂ ☃ ☎ ☕ ☯ ☮ ♀ ♂ ♠ ♣ ♥ ♦' },
]
const names: Record<string, string> = {
  '$': 'Dollar sign', '€': 'Euro sign', '£': 'Pound sterling', '¥': 'Yen sign', '₹': 'Indian rupee', '₦': 'Naira', '₩': 'Won', '₽': 'Ruble', '₿': 'Bitcoin', '¢': 'Cent sign', '₪': 'Shekel',
  '±': 'Plus minus', '×': 'Multiplication', '÷': 'Division', '≠': 'Not equal', '≈': 'Approximately equal', '≤': 'Less than or equal', '≥': 'Greater than or equal', '∞': 'Infinity', '√': 'Square root', '∑': 'Summation', '∫': 'Integral', '∂': 'Partial derivative', '∈': 'Element of', '∉': 'Not an element of',
  '→': 'Right arrow', '←': 'Left arrow', '↑': 'Up arrow', '↓': 'Down arrow', '↔': 'Left right arrow', '⇒': 'Right double arrow', '⇐': 'Left double arrow',
  '©': 'Copyright', '®': 'Registered trademark', '™': 'Trademark', '§': 'Section sign', '¶': 'Pilcrow', '•': 'Bullet', '…': 'Ellipsis', '—': 'Em dash', '–': 'En dash',
  '✓': 'Check mark', '✔': 'Heavy check mark', '✗': 'Ballot X', '★': 'Black star', '☆': 'White star', '♪': 'Music note', '♫': 'Beamed music notes', '♥': 'Heart suit', '☎': 'Telephone',
}
const code = (symbol: string) => `U+${symbol.codePointAt(0)?.toString(16).toUpperCase().padStart(4, '0')}`
const symbolsFor = (group: Group) => {
  const featured = group.featured.split(/\s+/).filter(Boolean)
  const rangeSymbols = group.ranges.flatMap(([start, end]) => Array.from({ length: end - start + 1 }, (_, offset) => String.fromCodePoint(start + offset)))
  return [...new Set([...featured, ...rangeSymbols])].filter(symbol => !/[\p{C}\p{M}\p{Z}]/u.test(symbol))
}
const catalog = groups.map(group => ({ name: group.name, symbols: symbolsFor(group) }))
export function SymbolDialog({ onInsert, onClose }: { onInsert: (value: string) => void; onClose: () => void }) {
  const [group, setGroup] = useState(groups[0].name)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState('€')
  useEffect(() => { const key = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }; document.addEventListener('keydown', key); return () => document.removeEventListener('keydown', key) }, [onClose])
  const visible = useMemo(() => {
    const terms = query.trim().toLowerCase()
    const source = terms ? [...new Set(catalog.flatMap(item => item.symbols))] : catalog.find(item => item.name === group)?.symbols || []
    return terms ? source.filter(symbol => `${symbol} ${names[symbol] || ''} ${code(symbol)}`.toLowerCase().includes(terms)) : source
  }, [group, query])
  useEffect(() => { if (visible.length && !visible.includes(selected)) setSelected(visible[0]) }, [visible, selected])
  return <div className="symbol-dialog-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}><div className="symbol-dialog" role="dialog" aria-modal="true" aria-labelledby="symbol-dialog-title"><div className="symbol-dialog-heading"><div><h2 id="symbol-dialog-title">Insert symbol</h2><p>Choose a symbol for your document.</p></div><button aria-label="Close symbol dialog" onClick={onClose}>×</button></div><div className="symbol-search"><Search size={16}/><input autoFocus aria-label="Search symbols" placeholder="Search by symbol or name" value={query} onChange={event => setQuery(event.target.value)}/></div><div className="symbol-browser"><nav aria-label="Symbol categories">{groups.map(item => <button key={item.name} className={group === item.name && !query ? 'active' : ''} onClick={() => { setGroup(item.name); setQuery(''); setSelected(item.featured.split(/\s+/)[0]) }}>{item.name}</button>)}</nav><div className="symbol-grid" role="grid" aria-label={query ? 'Search results' : group}>{visible.length ? visible.map(symbol => <button key={symbol} role="gridcell" aria-selected={selected === symbol} title={`${names[symbol] || 'Symbol'} (${code(symbol)})`} onClick={() => setSelected(symbol)} onDoubleClick={() => onInsert(symbol)}>{symbol}</button>) : <p>No matching symbols. Try a different search or enter a Unicode code below.</p>}</div></div><div className="symbol-details"><div className="symbol-preview" aria-label="Selected symbol">{selected}</div><div><strong>{names[selected] || 'Selected symbol'}</strong></div></div><div className="symbol-dialog-actions"><button onClick={onClose}>Cancel</button><button className="insert" disabled={!visible.length} onClick={() => onInsert(selected)}>Insert symbol</button></div></div></div>
}
