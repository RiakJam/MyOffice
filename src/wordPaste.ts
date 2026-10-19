/** Translate Word's clipboard-only CSS into HTML understood by the editor schema. */
export function normalizeWordPaste(html: string): string {
  if (!/(?:class=["']?Mso|mso-|xmlns:w=|urn:schemas-microsoft-com:office:word)/i.test(html)) return html
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const body = doc.body
  // Read markers before rewriting spans: the marker's mso-list:Ignore style is lost otherwise.
  // Word list paragraphs are usually plain <p> elements with a hidden marker.
  const paragraphs = Array.from(body.querySelectorAll<HTMLElement>('p[class*="MsoListParagraph"], p[style*="mso-list:"]'))
  paragraphs.forEach(paragraph => {
    const marker = paragraph.querySelector<HTMLElement>('span[style*="mso-list:Ignore"], span[style*="mso-list: ignore"]')
    const label = marker?.textContent?.trim() || ''
    if (!marker || !label) return
    const ordered = /^\(?\d+[.)]?$/.test(label) || /^[a-z][.)]$/i.test(label)
    marker.remove()
    const previous = paragraph.previousElementSibling
    const listTag = ordered ? 'ol' : 'ul'
    const list = previous?.tagName.toLowerCase() === listTag ? previous : doc.createElement(listTag)
    if (list !== previous) paragraph.before(list)
    if (!ordered) {
      const bulletStyle = label.includes('◆') || label.includes('♦') ? 'diamond' : label.includes('➢') || label.includes('→') ? 'arrow' : label.includes('✓') || label.includes('✔') ? 'check' : label.includes('★') || label.includes('☆') ? 'star' : label.includes('–') || label.includes('—') || label.includes('-') ? 'dash' : label.includes('■') || label.includes('▪') ? 'square' : label.includes('○') || label.includes('◦') ? 'circle' : 'disc'
      list.setAttribute('data-list-style', bulletStyle)
    }
    const item = doc.createElement('li')
    item.appendChild(paragraph)
    list.appendChild(item)
  })
  // Word frequently puts paragraph alignment in a class rule rather than inline.
  const classRules = Array.from(doc.querySelectorAll('style')).map(node => node.textContent || '').join('\n')
  const alignmentRules = new Map<string, string>()
  for (const rule of classRules.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const align = rule[2].match(/(?:^|;)\s*text-align\s*:\s*(center|right|justify|left)/i)?.[1]
    if (!align) continue
    for (const selector of rule[1].split(',')) {
      const className = selector.trim().match(/^(?:p|div|li|h[1-6])?\.([\w-]+)$/i)?.[1]
      if (className) alignmentRules.set(className.toLowerCase(), align.toLowerCase())
    }
  }
  body.querySelectorAll<HTMLElement>('p, h1, h2, h3, h4, h5, h6').forEach(paragraph => {
    if (!paragraph.style.textAlign) {
      const fromClass = Array.from(paragraph.classList).map(name => alignmentRules.get(name.toLowerCase())).find(Boolean)
      const parent = paragraph.parentElement
      const parentClass = parent ? Array.from(parent.classList).map(name => alignmentRules.get(name.toLowerCase())).find(Boolean) : undefined
      const align = paragraph.getAttribute('align') || fromClass || parent?.getAttribute('align') || parent?.style.textAlign || parentClass
      if (align) paragraph.style.textAlign = align
    }
    const border = paragraph.style.borderBottom || paragraph.getAttribute('style')?.match(/mso-border-bottom-alt\s*:[^;]+/i)?.[0]
    if (border && !/none|0(?:px|pt)?(?:\s|$)/i.test(border)) paragraph.after(doc.createElement('hr'))
  })
  body.querySelectorAll<HTMLElement>('table').forEach(table => {
    table.setAttribute('data-word-table', 'true')
    const width = table.style.width || table.getAttribute('width') || ''
    const points = width.match(/^([\d.]+)pt$/i)
    const pixels = points ? Math.round(Number(points[1]) * 4 / 3) : /^([\d.]+)px$/i.test(width) ? Number.parseFloat(width) : /^\d+$/.test(width) ? Number(width) : 0
    if (pixels > 0 && pixels < 3000) table.setAttribute('data-word-width', String(pixels))
  })
  body.querySelectorAll<HTMLElement>('tr').forEach(row => {
    const height = row.style.height || row.getAttribute('height') || ''
    const points = height.match(/^([\d.]+)pt$/i)
    if (points) row.style.height = `${Math.round(Number(points[1]) * 4 / 3)}px`
  })
  // Word often stores visible character formatting in CSS instead of semantic tags.
  body.querySelectorAll<HTMLElement>('span, font, p, div, h1, h2, h3, h4, h5, h6, li').forEach(element => {
    const style = element.style
    const tag = element.tagName.toLowerCase()
    if (tag === 'span' || tag === 'font') {
      const wrapper = doc.createElement('span')
      const decorations = style.textDecorationLine || style.textDecoration
      if (/underline/i.test(decorations)) wrapper.appendChild(doc.createElement('u'))
      if (/line-through/i.test(decorations)) wrapper.appendChild(doc.createElement('s'))
      const weight = style.fontWeight
      if (/bold/i.test(weight) || (Number(weight) >= 600)) wrapper.appendChild(doc.createElement('strong'))
      if (/italic/i.test(style.fontStyle)) wrapper.appendChild(doc.createElement('em'))
      let target: HTMLElement = wrapper
      while (target.lastElementChild) target = target.lastElementChild as HTMLElement
      while (element.firstChild) target.appendChild(element.firstChild)
      // Keep supported inline styles; Word uses points, while the editor stores pixels.
      const fontSize = style.fontSize || (tag === 'font' ? element.getAttribute('size') || '' : '')
      const points = fontSize.match(/^([\d.]+)pt$/i)
      const size = points ? `${Math.round(Number(points[1]) * 4 / 3 * 100) / 100}px` : /^\d+(?:\.\d+)?px$/i.test(fontSize) ? fontSize : ''
      const color = style.color || (tag === 'font' ? element.getAttribute('color') || '' : '')
      const family = style.fontFamily || (tag === 'font' ? element.getAttribute('face') || '' : '')
      const replacement = doc.createElement('span')
      if (size) replacement.style.fontSize = size
      if (color) replacement.style.color = color
      if (family) replacement.style.fontFamily = family
      if (style.backgroundColor) replacement.style.backgroundColor = style.backgroundColor
      replacement.appendChild(wrapper)
      element.replaceWith(replacement)
    } else if (tag === 'p' || /^h[1-6]$/.test(tag)) {
      const align = style.textAlign || element.getAttribute('align')
      if (align) element.style.textAlign = align
      // Word's margin and line-height properties are already parsed by SpacedParagraph.
    }
  })
  body.querySelectorAll('style, meta, link, script, xml, o\\:p').forEach(node => node.remove())
  return body.innerHTML
}
