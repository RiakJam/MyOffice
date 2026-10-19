import Image from '@tiptap/extension-image'
import { NodeSelection } from '@tiptap/pm/state'

export const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (element: HTMLElement) => Number(element.getAttribute('width')) || parseFloat(element.style.width) || null,
        renderHTML: (attributes: { width?: number | null }) => attributes.width ? { width: Math.round(attributes.width) } : {},
      },
    }
  },
  addNodeView() {
    return ({ node, editor, getPos }) => {
      const wrapper = document.createElement('div')
      const picture = document.createElement('img')
      const resize = document.createElement('button')
      const crop = document.createElement('button')
      wrapper.className = 'myoffice-image-node'
      wrapper.contentEditable = 'false'
      resize.className = 'image-resize-handle'
      resize.type = 'button'
      resize.setAttribute('aria-label', 'Resize image')
      resize.title = 'Drag to resize image'
      crop.className = 'image-crop-button'
      crop.type = 'button'
      crop.textContent = 'Crop'
      crop.setAttribute('aria-label', 'Crop image')
      const render = (current: typeof node) => {
        picture.src = current.attrs.src
        picture.alt = current.attrs.alt || ''
        picture.title = current.attrs.title || ''
        picture.style.width = current.attrs.width ? `${current.attrs.width}px` : ''
      }
      render(node)
      const select = () => {
        if (typeof getPos !== 'function') return
        const pos = getPos()
        if (typeof pos !== 'number') return
        editor.view.dispatch(editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, pos)))
      }
      wrapper.addEventListener('click', select)
      resize.addEventListener('pointerdown', event => {
        event.preventDefault()
        event.stopPropagation()
        select()
        if (typeof getPos !== 'function') return
        const start = event.clientX
        const initial = picture.getBoundingClientRect().width
        const surface = wrapper.closest('.pagination-surface')
        const scale = surface ? surface.getBoundingClientRect().width / surface.clientWidth : 1
        const zoom = scale || 1
        let width = initial / zoom
        const move = (pointer: PointerEvent) => {
          width = Math.max(60, Math.round(initial / zoom + (pointer.clientX - start) / zoom))
          picture.style.width = `${width}px`
        }
        const stop = () => {
          window.removeEventListener('pointermove', move)
          window.removeEventListener('pointerup', stop)
          const pos = getPos()
          if (typeof pos !== 'number') return
          const current = editor.state.doc.nodeAt(pos)
          if (current?.type.name !== 'image') return
          editor.view.dispatch(editor.state.tr.setNodeMarkup(pos, undefined, { ...current.attrs, width }))
        }
        window.addEventListener('pointermove', move)
        window.addEventListener('pointerup', stop, { once: true })
      })
      crop.addEventListener('pointerdown', event => event.preventDefault())
      crop.addEventListener('click', event => {
        event.preventDefault()
        event.stopPropagation()
        select()
        const pos = typeof getPos === 'function' ? getPos() : null
        if (typeof pos === 'number') window.dispatchEvent(new CustomEvent('myoffice-crop-image', { detail: { pos, src: picture.src } }))
      })
      wrapper.append(picture, resize, crop)
      return {
        dom: wrapper,
        update(updated) {
          if (updated.type.name !== 'image') return false
          render(updated)
          return true
        },
        selectNode() { wrapper.classList.add('selected') },
        deselectNode() { wrapper.classList.remove('selected') },
      }
    }
  },
})
