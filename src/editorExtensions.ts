import BulletList from '@tiptap/extension-bullet-list'
import OrderedList from '@tiptap/extension-ordered-list'
import Paragraph from '@tiptap/extension-paragraph'
import Heading from '@tiptap/extension-heading'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { Node } from '@tiptap/core'

export const ColumnSection = Node.create({
  name: 'columnSection',
  group: 'block',
  content: 'block+',
  defining: true,
  addAttributes: () => ({ count: { default: 2, parseHTML: element => { const value = element.getAttribute('data-columns'); return value === 'left' || value === 'right' ? value : Number(value) || 2 } } }),
  parseHTML: () => [{ tag: 'div[data-column-section]' }],
  renderHTML: ({ node }) => ['div', { 'data-column-section': 'true', 'data-columns': node.attrs.count, class: 'column-section' }, 0],
})

export const ColumnBox = Node.create({
  name: 'columnBox',
  group: 'block',
  content: 'block+',
  defining: true,
  parseHTML: () => [{ tag: 'div[data-column-box]' }],
  renderHTML: () => ['div', { 'data-column-box': 'true', class: 'column-box' }, 0],
})

export const ManualPageBreak = Node.create({
  name: 'manualPageBreak',
  group: 'block',
  atom: true,
  selectable: true,
  parseHTML: () => [{ tag: 'div[data-manual-page-break]' }],
  renderHTML: () => ['div', { 'data-manual-page-break': 'true', class: 'manual-page-break' }],
})

export const FootnoteReference = Node.create({
  name: 'footnoteReference',
  priority: 1000,
  group: 'inline',
  inline: true,
  atom: true,
  addAttributes: () => ({
    number: { default: 1, parseHTML: element => Number(element.getAttribute('data-number')) || 1, renderHTML: attributes => ({ 'data-number': attributes.number }) },
    note: { default: '', parseHTML: element => element.getAttribute('data-note') || '', renderHTML: attributes => ({ 'data-note': attributes.note }) },
  }),
  parseHTML: () => [{ tag: 'span[data-footnote-ref]' }],
  renderHTML: ({ node }) => ['span', { 'data-footnote-ref': 'true', 'data-number': node.attrs.number, 'data-note': node.attrs.note }, String(node.attrs.number)],
})

export const ImageCaption = Node.create({
  name: 'imageCaption',
  group: 'block',
  content: 'inline*',
  parseHTML: () => [{ tag: 'figcaption[data-image-caption]' }],
  renderHTML: () => ['figcaption', { 'data-image-caption': 'true', class: 'image-caption' }, 0],
})

const spacingAttributes = () => ({
  lineSpacing: {
    default: null,
    parseHTML: (element: HTMLElement) => element.style.lineHeight || null,
    renderHTML: (attributes: { lineSpacing?: string }) => attributes.lineSpacing ? { style: `line-height: ${attributes.lineSpacing}` } : {},
  },
  spaceBefore: {
    default: null,
    parseHTML: (element: HTMLElement) => element.style.marginTop || null,
    renderHTML: (attributes: { spaceBefore?: string }) => attributes.spaceBefore ? { style: `margin-top: ${attributes.spaceBefore}` } : {},
  },
  spaceAfter: {
    default: null,
    parseHTML: (element: HTMLElement) => element.style.marginBottom || null,
    renderHTML: (attributes: { spaceAfter?: string }) => attributes.spaceAfter ? { style: `margin-bottom: ${attributes.spaceAfter}` } : {},
  },
})

export const SpacedParagraph = Paragraph.extend({
  addAttributes() { return { ...this.parent?.(), ...spacingAttributes() } },
})

export const SpacedHeading = Heading.extend({
  addAttributes() { return { ...this.parent?.(), ...spacingAttributes() } },
})

export const StyledBulletList = BulletList.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      listStyle: {
        default: 'disc',
        parseHTML: (element: HTMLElement) => element.getAttribute('data-list-style') || element.style.listStyleType || 'disc',
        renderHTML: (attributes: { listStyle: string }) => ({ 'data-list-style': attributes.listStyle, style: ['disc', 'circle', 'square'].includes(attributes.listStyle) ? `list-style-type: ${attributes.listStyle}` : 'list-style-type: none' }),
      },
    }
  },
})

export const StyledOrderedList = OrderedList.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      listStyle: {
        default: 'decimal',
        parseHTML: (element: HTMLElement) => element.getAttribute('data-list-style') || element.style.listStyleType || 'decimal',
        renderHTML: (attributes: { listStyle: string }) => ({ 'data-list-style': attributes.listStyle, style: ['disc', 'circle', 'square'].includes(attributes.listStyle) ? `list-style-type: ${attributes.listStyle}` : 'list-style-type: none' }),
      },
    }
  },
})

export const RadioList = TaskList.extend({
  name: 'radioList',
  addOptions() { return { ...this.parent!(), itemTypeName: 'radioItem' } },
  addCommands() { return {} },
  addKeyboardShortcuts() { return {} },
})

export const RadioItem = TaskItem.extend({
  name: 'radioItem',
  addOptions() { return { ...this.parent!(), taskListTypeName: 'radioList' } },
  addInputRules() { return [] },
  renderHTML({ node, HTMLAttributes }) {
    return ['li', { ...HTMLAttributes, 'data-type': 'radioItem', 'data-checked': node.attrs.checked },
      ['label', ['input', { type: 'radio', checked: node.attrs.checked ? 'checked' : null }], ['span']],
      ['div', 0]]
  },
  addNodeView() {
    return ({ node, getPos, editor }) => {
      const item = document.createElement('li')
      const label = document.createElement('label')
      const input = document.createElement('input')
      const content = document.createElement('div')
      input.type = 'radio'
      input.setAttribute('aria-label', 'Select radio option')
      label.contentEditable = 'false'
      item.dataset.type = 'radioItem'
      const update = (current: typeof node) => {
        item.dataset.checked = String(current.attrs.checked)
        input.checked = Boolean(current.attrs.checked)
      }
      update(node)
      input.addEventListener('mousedown', event => event.preventDefault())
      input.addEventListener('change', () => {
        if (!editor.isEditable || typeof getPos !== 'function') return
        const pos = getPos()
        if (typeof pos !== 'number') return
        const tr = editor.state.tr
        const $pos = tr.doc.resolve(pos)
        const parent = $pos.parent
        if (parent.type.name !== 'radioList') return
        const start = $pos.start()
        parent.forEach((child, offset) => {
          const childPos = start + offset
          tr.setNodeMarkup(childPos, undefined, { ...child.attrs, checked: childPos === pos })
        })
        editor.view.dispatch(tr)
      })
      label.append(input)
      item.append(label, content)
      return {
        dom: item,
        contentDOM: content,
        update(updated) {
          if (updated.type.name !== 'radioItem') return false
          update(updated)
          return true
        },
      }
    }
  },
})

// Persist user-chosen table shading on both normal and header cells.
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table'
export const WordTable = Table.extend({
  addAttributes() { return { ...this.parent?.(), wordPasted: { default: false, parseHTML: (element: HTMLElement) => element.hasAttribute('data-word-table'), renderHTML: (attributes: { wordPasted?: boolean }) => attributes.wordPasted ? { 'data-word-table': 'true' } : {} }, wordWidth: { default: null, parseHTML: (element: HTMLElement) => Number(element.getAttribute('data-word-width')) || null, renderHTML: (attributes: { wordWidth?: number | null }) => attributes.wordWidth ? { 'data-word-width': attributes.wordWidth, style: `width: ${attributes.wordWidth}px; max-width: none` } : {} } } },
})
const shading = {
  backgroundColor: {
    default: null,
    parseHTML: (element: HTMLElement) => element.style.backgroundColor || null,
    renderHTML: (attributes: { backgroundColor?: string | null }) => attributes.backgroundColor ? { style: `background-color: ${attributes.backgroundColor}` } : {},
  },
  borderMask: {
    default: null,
    parseHTML: (element: HTMLElement) => /^[01]{4}$/.test(element.getAttribute('data-border-mask')||'') ? element.getAttribute('data-border-mask') : null,
    renderHTML: (attributes: { borderMask?: string | null }) => /^[01]{4}$/.test(attributes.borderMask||'') ? {
      'data-border-mask': attributes.borderMask,
      style: ['top','right','bottom','left'].map((side,index)=>`border-${side}:${attributes.borderMask?.[index]==='1'?'1px solid #ccd5e0':'none'}`).join(';'),
    } : {},
  },
}
export const ShadedTableCell = TableCell.extend({ addAttributes() { return { ...this.parent?.(), ...shading } } })
export const ShadedTableHeader = TableHeader.extend({ addAttributes() { return { ...this.parent?.(), ...shading } } })

export const SizedTableRow = TableRow.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      rowHeight: {
        default: null,
        parseHTML: (element: HTMLElement) => parseFloat(element.style.height) || null,
        renderHTML: (attributes: { rowHeight?: number | null }) => attributes.rowHeight ? { style: `height: ${attributes.rowHeight}px` } : {},
      },
    }
  },
})
