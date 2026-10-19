import { useEffect, useRef, useState } from 'react'
import type { Editor } from '@tiptap/react'
import { CellSelection } from '@tiptap/pm/tables'
import { Plus } from 'lucide-react'

type Axis = 'row' | 'column'
type Geometry = { table: DOMRect; rows: DOMRect[]; columns: DOMRect[]; row: number; column: number }
type Menu = { axis: Axis; index: number; x: number; y: number }

export function TableControls({ editor }: { editor: Editor | null }) {
  const tableRef = useRef<HTMLTableElement | null>(null)
  const [geometry, setGeometry] = useState<Geometry | null>(null)
  const [menu, setMenu] = useState<Menu | null>(null)
  const hoverRef = useRef<{ x: number; y: number } | null>(null)
  const draggingRef = useRef(false)

  const measure = () => {
    const table = tableRef.current
    if (!table || !table.isConnected) { setGeometry(null); return }
    const rows = Array.from(table.rows)
    const columns = Array.from(rows[0]?.cells || [])
    const tableRect = table.getBoundingClientRect()
    const rowRects = rows.map(row => row.getBoundingClientRect())
    const columnRects = columns.map(item => item.getBoundingClientRect())
    const pointer = hoverRef.current
    const nearTopEdge = pointer && pointer.y >= tableRect.top - 10 && pointer.y <= tableRect.top + 12
    const nearLeftEdge = pointer && pointer.x >= tableRect.left - 10 && pointer.x <= tableRect.left + 12
    const column = nearTopEdge ? columnRects.findIndex(rect => Math.abs(pointer.x - rect.right) <= 8) : -1
    const row = nearLeftEdge ? rowRects.findIndex(rect => Math.abs(pointer.y - rect.bottom) <= 8) : -1
    setGeometry({ table: tableRect, rows: rowRects, columns: columnRects, row, column })
  }
  useEffect(() => {
    if (!editor) return
    const onMove = (event: PointerEvent) => {
      if (draggingRef.current) return
      const target = event.target as Element
      if (target.closest?.('.table-edge-controls, .table-context-menu')) return
      const cell = target.closest?.('.document-content table td, .document-content table th') as HTMLTableCellElement | null
      if (cell) { hoverRef.current = { x: event.clientX, y: event.clientY }; tableRef.current = cell.closest('table'); measure() }
      else if (!menu) { hoverRef.current = null; tableRef.current = null; setGeometry(null) }
    }
    const onScroll = () => { if (tableRef.current) measure() }
    const onContext = (event: MouseEvent) => {
      const cell = (event.target as Element).closest?.('.document-content table td, .document-content table th') as HTMLTableCellElement | null
      if (!cell) return
      tableRef.current = cell.closest('table')
      const selection = editor.state.selection
      const selectedRow = selection instanceof CellSelection && selection.isRowSelection() && cell.classList.contains('selectedCell')
      const axis: Axis = selectedRow ? 'row' : 'column'
      const index = selectedRow ? Array.from(tableRef.current?.rows || []).indexOf(cell.parentElement as HTMLTableRowElement) : cell.cellIndex
      event.preventDefault()
      select(axis, index)
      setMenu({ axis, index, x: event.clientX, y: event.clientY })
    }
    const onDown = (event: PointerEvent) => {
      if (!(event.target as Element).closest?.('.table-context-menu, .table-edge-controls')) setMenu(null)
    }
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setMenu(null) }
    document.addEventListener('pointermove', onMove)
    document.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onScroll)
    editor.view.dom.addEventListener('contextmenu', onContext)
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('pointermove', onMove); document.removeEventListener('scroll', onScroll, true); window.removeEventListener('resize', onScroll); editor.view.dom.removeEventListener('contextmenu', onContext); document.removeEventListener('pointerdown', onDown); document.removeEventListener('keydown', onKey) }
  }, [editor, menu])

  const select = (axis: Axis, index: number) => {
    const table = tableRef.current
    if (!table || !editor) return false
    const cell = axis === 'column' ? table.rows[0]?.cells[index] : table.rows[index]?.cells[0]
    if (!cell) return false
    const pos = editor.view.posAtDOM(cell, 0)
    const $pos = editor.state.doc.resolve(pos)
    let depth = $pos.depth
    while (depth > 0 && !['tableCell', 'tableHeader'].includes($pos.node(depth).type.name)) depth--
    if (!depth) return false
    const cellPos = $pos.before(depth)
    const selection = axis === 'column' ? CellSelection.colSelection(editor.state.doc.resolve(cellPos)) : CellSelection.rowSelection(editor.state.doc.resolve(cellPos))
    editor.view.dispatch(editor.state.tr.setSelection(selection))
    return true
  }
  const act = (action: 'before' | 'after' | 'delete' | 'shade', axis: Axis, index: number, color?: string) => {
    if (!editor || !select(axis, index)) return
    const chain = editor.chain().focus()
    if (action === 'shade') chain.setCellAttribute('backgroundColor', color || null).run()
    else if (axis === 'column') (action === 'before' ? chain.addColumnBefore() : action === 'after' ? chain.addColumnAfter() : chain.deleteColumn()).run()
    else (action === 'before' ? chain.addRowBefore() : action === 'after' ? chain.addRowAfter() : chain.deleteRow()).run()
    setMenu(null)
    requestAnimationFrame(() => measure())
  }
  const startResize = (axis: Axis, index: number, event: React.PointerEvent) => {
    const table = tableRef.current
    if (!table || !editor) return
    event.preventDefault()
    event.stopPropagation()
    draggingRef.current = true
    const rect = axis === 'column' ? table.rows[0]?.cells[index]?.getBoundingClientRect() : table.rows[index]?.getBoundingClientRect()
    if (!rect) { draggingRef.current = false; return }
    const start = axis === 'column' ? event.clientX : event.clientY
    const original = axis === 'column' ? rect.width : rect.height
    const scale = table.closest('.pagination-surface')?.getBoundingClientRect().width || 1
    const baseWidth = table.closest('.pagination-surface')?.clientWidth || scale
    const zoom = scale / baseWidth
    const initialWidths = Array.from(table.rows[0].cells, cell => Math.round(cell.getBoundingClientRect().width / zoom))
    const rowPreview = axis === 'row' ? document.createElement('style') : null
    if (rowPreview) { table.dataset.myofficeResize = 'active'; document.head.appendChild(rowPreview) }
    const columns = Array.from(table.querySelectorAll('colgroup col'))
    const originalColumnStyles = columns.map(column => (column as HTMLElement).style.width)
    let finalDelta = 0
    const move = (pointer: PointerEvent) => {
      const requested = ((axis === 'column' ? pointer.clientX : pointer.clientY) - start) / zoom
      finalDelta = axis === 'row'
        ? Math.max(25 - original / zoom, requested)
        : Math.max(55 - initialWidths[index], Math.min(requested, initialWidths[index + 1] - 55))
      if (axis === 'row' && rowPreview) rowPreview.textContent = `.document-content table[data-myoffice-resize=active] > tbody > tr:nth-child(${index + 1}){height:${Math.round(original / zoom + finalDelta)}px!important}`
      if (axis === 'column') {
        const first = columns[index] as HTMLElement | undefined
        const second = columns[index + 1] as HTMLElement | undefined
        if (first && second) {
          first.style.width = `${Math.round(initialWidths[index] + finalDelta)}px`
          second.style.width = `${Math.round(initialWidths[index + 1] - finalDelta)}px`
        }
      }
      measure()
    }
    const stop = (pointer: PointerEvent) => {
      draggingRef.current = false
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', stop)
      const delta = finalDelta || ((axis === 'column' ? pointer.clientX : pointer.clientY) - start) / zoom
      if (Math.abs(delta) < 2) {
        rowPreview?.remove()
        delete table.dataset.myofficeResize
        columns.forEach((column, columnIndex) => { (column as HTMLElement).style.width = originalColumnStyles[columnIndex] })
        return
      }
      const firstCell = table.rows[0]?.cells[0]
      if (!firstCell) return
      const $pos = editor.state.doc.resolve(editor.view.posAtDOM(firstCell, 0))
      let depth = $pos.depth
      while (depth > 0 && $pos.node(depth).type.name !== 'table') depth--
      if (!depth) return
      const tablePos = $pos.before(depth)
      const tableNode = $pos.node(depth)
      const tr = editor.state.tr
      if (axis === 'row') {
        tableNode.forEach((row, offset, rowIndex) => {
          if (rowIndex === index) tr.setNodeMarkup(tablePos + 1 + offset, undefined, { ...row.attrs, rowHeight: Math.max(25, Math.round(original / zoom + delta)) })
        })
      } else {
        const widths = [...initialWidths]
        widths[index] = Math.round(widths[index] + delta)
        widths[index + 1] = Math.round(widths[index + 1] - delta)
        tableNode.forEach((row, rowOffset) => {
          let column = 0
          row.forEach((cell, cellOffset) => {
            const colspan = Number(cell.attrs.colspan) || 1
            const cellWidths = widths.slice(column, column + colspan)
            tr.setNodeMarkup(tablePos + 2 + rowOffset + cellOffset, undefined, { ...cell.attrs, colwidth: cellWidths })
            column += colspan
          })
        })
      }
      if (tr.docChanged) editor.view.dispatch(tr)
      rowPreview?.remove()
      delete table.dataset.myofficeResize
      requestAnimationFrame(() => measure())
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', stop, { once: true })
  }
  const open = (axis: Axis, index: number, event: React.MouseEvent) => {
    event.preventDefault()
    if (!select(axis, index)) return
    setMenu({ axis, index, x: event.clientX, y: event.clientY })
  }
  if (!geometry || !editor) return null
  return <>
    <div className="table-edge-controls" aria-label="Table row and column controls">
      {geometry.columns.map((rect, index) => <button key={`col-${index}`} className="table-axis-selector column" style={{ left: rect.left, top: geometry.table.top - 18, width: rect.width }} title={`Select column ${index + 1}; right click for options`} aria-label={`Select column ${index + 1}`} onClick={() => select('column', index)} onContextMenu={event => open('column', index, event)} />)}
      {geometry.rows.map((rect, index) => <button key={`row-${index}`} className="table-axis-selector row" style={{ left: geometry.table.left - 19, top: rect.top, height: rect.height }} title={`Select row ${index + 1}; right click for options`} aria-label={`Select row ${index + 1}`} onClick={() => select('row', index)} onContextMenu={event => open('row', index, event)} />)}
      {geometry.columns.slice(0, -1).map((rect, index) => <div key={`resize-col-${index}`} className="table-resize-handle column" style={{ left: rect.right - 4, top: geometry.table.top + 12, height: Math.max(0, geometry.table.height - 12) }} title="Drag to resize column" role="separator" aria-label={`Resize column ${index + 1}`} onPointerDown={event => startResize('column', index, event)} />)}
      {geometry.rows.map((rect, index) => <div key={`resize-row-${index}`} className="table-resize-handle row" style={{ left: geometry.table.left + 12, top: rect.bottom - 4, width: Math.max(0, geometry.table.width - 12) }} title="Drag to resize row" role="separator" aria-label={`Resize row ${index + 1}`} onPointerDown={event => startResize('row', index, event)} />)}
      {geometry.column >= 0 && geometry.columns[geometry.column] && <button className="table-add-control column" style={{ left: geometry.columns[geometry.column].right - 10, top: geometry.table.top - 19 }} aria-label={`Add column after column ${geometry.column + 1}`} title="Add column here" onClick={() => act('after', 'column', geometry.column)}><Plus size={14} strokeWidth={2.5}/></button>}
      {geometry.row >= 0 && geometry.rows[geometry.row] && <button className="table-add-control row" style={{ left: geometry.table.left - 19, top: geometry.rows[geometry.row].bottom - 10 }} aria-label={`Add row after row ${geometry.row + 1}`} title="Add row here" onClick={() => act('after', 'row', geometry.row)}><Plus size={14} strokeWidth={2.5}/></button>}
    </div>
    {menu && <div className="table-context-menu" role="menu" aria-label={`${menu.axis} options`} style={{ left: Math.min(menu.x, window.innerWidth - 225), top: Math.min(menu.y, window.innerHeight - 250) }} onPointerDown={event => event.preventDefault()}>
      <strong>{menu.axis === 'column' ? `Column ${menu.index + 1}` : `Row ${menu.index + 1}`}</strong>
      <button role="menuitem" onClick={() => act('before', menu.axis, menu.index)}>Insert {menu.axis} before</button>
      <button role="menuitem" onClick={() => act('after', menu.axis, menu.index)}>Insert {menu.axis} after</button>
      <button role="menuitem" onClick={() => act('delete', menu.axis, menu.index)}>Delete {menu.axis}</button>
      <div className="table-menu-divider" />
      <span>Shading</span>
      <div className="table-shade-swatches">{['#ffffff', '#fff2b3', '#dcecff', '#e4f2e7', '#ececf1'].map(color => <button key={color} style={{ backgroundColor: color }} aria-label={`Shade ${menu.axis} ${color}`} title={color} onClick={() => act('shade', menu.axis, menu.index, color)} />)}<label title="Custom shading"><input type="color" aria-label="Custom table shading" onChange={event => act('shade', menu.axis, menu.index, event.target.value)} /></label></div>
      <button role="menuitem" onClick={() => act('shade', menu.axis, menu.index)}>Clear shading</button>
    </div>}
  </>
}
