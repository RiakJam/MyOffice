import { useEffect, useRef, useState } from 'react'

export type TextWatermark = { kind?: 'text'; text: string; color: string; opacity: number; angle: 'diagonal' | 'horizontal' }
export type PictureWatermark = { kind: 'image'; image: string; opacity: number; scale: number }
export type WatermarkSettings = TextWatermark | PictureWatermark

async function pictureData(file: File): Promise<string> {
 if (!file.type.startsWith('image/')) throw new Error('Choose an image file such as PNG, JPEG, or WebP.')
 if (file.size > 10 * 1024 * 1024) throw new Error('Choose an image smaller than 10 MB.')
 const bitmap = await createImageBitmap(file)
 try {
  const ratio = Math.min(1, 900 / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(bitmap.width * ratio))
  canvas.height = Math.max(1, Math.round(bitmap.height * ratio))
  const context = canvas.getContext('2d')
  if (!context) throw new Error('This image could not be prepared.')
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  const data = canvas.toDataURL('image/webp', .85)
  if (data.length > 2 * 1024 * 1024) throw new Error('This image is too large to save in the document. Choose a smaller picture.')
  return data
 } finally { bitmap.close() }
}

export function WatermarkDialog({ value, onSave, onClose }: { value: WatermarkSettings | null; onSave: (value: WatermarkSettings | null) => void; onClose: () => void }) {
 const [kind, setKind] = useState<'text' | 'image'>(value?.kind === 'image' ? 'image' : 'text')
 const [text, setText] = useState(value?.kind === 'image' ? '' : value?.text || '')
 const [color, setColor] = useState(value?.kind === 'image' ? '#64748b' : value?.color || '#64748b')
 const [opacity, setOpacity] = useState(value?.opacity ?? .18)
 const [angle, setAngle] = useState<TextWatermark['angle']>(value?.kind === 'image' ? 'diagonal' : value?.angle || 'diagonal')
 const [image, setImage] = useState(value?.kind === 'image' ? value.image : '')
 const [scale, setScale] = useState(value?.kind === 'image' ? value.scale : 55)
 const [error, setError] = useState('')
 const pictureInput = useRef<HTMLInputElement>(null)
 useEffect(() => { const close = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }; document.addEventListener('keydown', close); return () => document.removeEventListener('keydown', close) }, [onClose])
 const choosePicture = async (file?: File) => {
  if (!file) return
  try { setImage(await pictureData(file)); setError('') }
  catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not open this image.') }
 }
 const apply = () => {
  if (kind === 'image') { if (image) onSave({ kind: 'image', image, opacity, scale }); return }
  if (text.trim()) onSave({ kind: 'text', text: text.trim(), color, opacity, angle })
 }
 return <div className="watermark-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
  <form className="watermark-dialog" role="dialog" aria-modal="true" aria-labelledby="watermark-title" onSubmit={event => { event.preventDefault(); apply() }}>
   <h2 id="watermark-title">Watermark</h2><p>Add faint text or a picture to every page.</p>
   <div className="watermark-kind" role="tablist" aria-label="Watermark type"><button type="button" role="tab" aria-selected={kind === 'text'} onClick={() => setKind('text')}>Text</button><button type="button" role="tab" aria-selected={kind === 'image'} onClick={() => setKind('image')}>Picture</button></div>
   {kind === 'text' ? <>
    <div className="watermark-presets" aria-label="Watermark presets">{['DRAFT', 'CONFIDENTIAL', 'SAMPLE'].map(preset => <button key={preset} type="button" className={text === preset ? 'chosen' : ''} onClick={() => setText(preset)}>{preset}</button>)}</div>
    <label>Watermark text<input autoFocus maxLength={60} value={text} onChange={event => setText(event.target.value)} placeholder="Enter custom text" /></label>
    <div className="watermark-options"><label>Color<input aria-label="Watermark color" type="color" value={color} onChange={event => setColor(event.target.value)} /></label><label>Opacity <span>{Math.round(opacity * 100)}%</span><input aria-label="Watermark opacity" type="range" min="5" max="60" value={Math.round(opacity * 100)} onChange={event => setOpacity(Number(event.target.value) / 100)} /></label></div>
    <fieldset><legend>Direction</legend><label><input type="radio" name="watermark-angle" checked={angle === 'diagonal'} onChange={() => setAngle('diagonal')} /> Diagonal</label><label><input type="radio" name="watermark-angle" checked={angle === 'horizontal'} onChange={() => setAngle('horizontal')} /> Horizontal</label></fieldset>
   </> : <>
    <input ref={pictureInput} type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/avif" hidden onChange={event => { void choosePicture(event.target.files?.[0]); event.target.value = '' }} />
    <button className="watermark-pick-picture" type="button" onClick={() => pictureInput.current?.click()}>{image ? 'Change picture…' : 'Choose picture…'}</button>
    <div className="watermark-options picture-options"><label>Size <span>{scale}% of page width</span><input aria-label="Picture watermark size" type="range" min="20" max="90" value={scale} onChange={event => setScale(Number(event.target.value))} /></label><label>Opacity <span>{Math.round(opacity * 100)}%</span><input aria-label="Watermark opacity" type="range" min="5" max="60" value={Math.round(opacity * 100)} onChange={event => setOpacity(Number(event.target.value) / 100)} /></label></div>
   </>}
   {error && <div className="watermark-error" role="alert">{error}</div>}
   <div className="watermark-preview">{kind === 'image' ? image ? <img src={image} alt="Picture watermark preview" style={{ opacity, height: `${Math.round(scale * 1.1)}px` }} /> : <span className="watermark-placeholder">Your picture preview will appear here</span> : <span style={{ color, opacity, transform: `rotate(${angle === 'diagonal' ? -32 : 0}deg)` }}>{text || 'WATERMARK'}</span>}</div>
   <div className="watermark-actions">{value && <button type="button" className="remove" onClick={() => onSave(null)}>Remove watermark</button>}<button type="button" onClick={onClose}>Cancel</button><button className="apply" type="submit" disabled={kind === 'image' ? !image : !text.trim()}>Apply</button></div>
  </form>
 </div>
}
