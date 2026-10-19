import { useEffect, useRef, useState } from 'react'
import type { Editor } from '@tiptap/react'

type Crop = { left: number; right: number; top: number; bottom: number }
type Handle = 'move' | 'n' | 's' | 'e' | 'w' | 'nw' | 'ne' | 'sw' | 'se'
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const empty: Crop = { left: 0, right: 0, top: 0, bottom: 0 }
export function ImageCropDialog({ image, editor, onClose }: { image: { pos: number; src: string }; editor: Editor | null; onClose: () => void }) {
  const [crop, setCrop] = useState<Crop>(empty)
  const [error, setError] = useState('')
  const pictureRef = useRef<HTMLDivElement>(null)
  useEffect(() => { const key = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }; document.addEventListener('keydown', key); return () => document.removeEventListener('keydown', key) }, [onClose])
  const change = (side: keyof Crop, value: number) => {
    setCrop(current => ({ ...current, [side]: Math.min(value, 95 - current[side === 'left' ? 'right' : side === 'right' ? 'left' : side === 'top' ? 'bottom' : 'top']) }))
  }
  const beginDrag = (event: React.PointerEvent, handle: Handle) => {
    const picture = pictureRef.current
    if (!picture) return
    event.preventDefault()
    event.stopPropagation()
    const rect = picture.getBoundingClientRect()
    const startX = event.clientX
    const startY = event.clientY
    const initial = { ...crop }
    const move = (pointer: PointerEvent) => {
      const dx = (pointer.clientX - startX) / rect.width * 100
      const dy = (pointer.clientY - startY) / rect.height * 100
      const next = { ...initial }
      if (handle === 'move') {
        const width = 100 - initial.left - initial.right
        const height = 100 - initial.top - initial.bottom
        next.left = clamp(initial.left + dx, 0, 100 - width)
        next.right = 100 - width - next.left
        next.top = clamp(initial.top + dy, 0, 100 - height)
        next.bottom = 100 - height - next.top
      } else {
        if (handle.includes('w')) next.left = clamp(initial.left + dx, 0, 95 - initial.right)
        if (handle.includes('e')) next.right = clamp(initial.right - dx, 0, 95 - initial.left)
        if (handle.includes('n')) next.top = clamp(initial.top + dy, 0, 95 - initial.bottom)
        if (handle.includes('s')) next.bottom = clamp(initial.bottom - dy, 0, 95 - initial.top)
      }
      setCrop({ left: Math.round(next.left), right: Math.round(next.right), top: Math.round(next.top), bottom: Math.round(next.bottom) })
    }
    const stop = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', stop)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', stop, { once: true })
  }
  const apply = async () => {
    if (!editor) return
    try {
      const source = new window.Image()
      source.src = image.src
      await source.decode()
      const x = Math.round(source.naturalWidth * crop.left / 100)
      const y = Math.round(source.naturalHeight * crop.top / 100)
      const width = Math.max(1, Math.round(source.naturalWidth * (100 - crop.left - crop.right) / 100))
      const height = Math.max(1, Math.round(source.naturalHeight * (100 - crop.top - crop.bottom) / 100))
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const context = canvas.getContext('2d')
      if (!context) throw new Error('Canvas unavailable')
      context.drawImage(source, x, y, width, height, 0, 0, width, height)
      const node = editor.state.doc.nodeAt(image.pos)
      if (node?.type.name !== 'image') throw new Error('Image no longer available')
      editor.view.dispatch(editor.state.tr.setNodeMarkup(image.pos, undefined, { ...node.attrs, src: canvas.toDataURL('image/png') }))
      onClose()
    } catch { setError('Could not crop this image. Choose a local image and try again.') }
  }
  return <div className="image-crop-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}><div className="image-crop-dialog" role="dialog" aria-modal="true" aria-labelledby="image-crop-title"><h2 id="image-crop-title">Crop image</h2><p>Drag the edges or corners to crop. Drag inside the frame to move it.</p><div className="image-crop-preview"><div className="image-crop-picture" ref={pictureRef}><img src={image.src} alt="Crop preview"/><div className="image-crop-area" style={{ left: `${crop.left}%`, right: `${crop.right}%`, top: `${crop.top}%`, bottom: `${crop.bottom}%` }} onPointerDown={event => beginDrag(event, 'move')} role="img" aria-label="Drag to move crop area">{(['nw','n','ne','e','se','s','sw','w'] as const).map(handle => <span key={handle} className={`image-crop-handle ${handle}`} role="separator" aria-label={`Drag ${handle} crop handle`} onPointerDown={event => beginDrag(event, handle)} />)}</div></div></div><div className="image-crop-sliders">{(['left','right','top','bottom'] as const).map(side => <label key={side}><span>{side[0].toUpperCase() + side.slice(1)}</span><input type="range" min="0" max="90" value={crop[side]} onChange={event => change(side, Number(event.target.value))}/><output>{crop[side]}%</output></label>)}</div>{error&&<div className="image-crop-error" role="alert">{error}</div>}<div className="image-crop-actions"><button onClick={() => setCrop(empty)}>Reset</button><span/><button onClick={onClose}>Cancel</button><button className="apply" onClick={() => void apply()}>Apply crop</button></div></div></div>
}
