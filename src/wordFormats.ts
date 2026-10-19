import { bulletSymbol } from './bulletStyles'
import type { JSONContent } from '@tiptap/core'
import type { PageNumberSettings } from './PageNumberDialog'
import type { WatermarkSettings } from './WatermarkDialog'

export type WordFileSettings={
 pageSize:'A4'|'Letter'|'Legal';orientation:'portrait'|'landscape';columns?:1|2|3|'left'|'right'
 leftMargin:number;rightMargin:number;topMargin:number;bottomMargin:number
 header:string;footer:string;pageNumbers:PageNumberSettings;watermark?:WatermarkSettings|null;pageColor?:string
}

const finiteNumber=(value:unknown,fallback:number)=>{const number=Number(value);return Number.isFinite(number)?number:fallback}
const pxToTwips=(value:number)=>Math.round(finiteNumber(value,0)*15)
const fontSizeHalfPoints=(value:unknown)=>{
 if(typeof value!=='string')return undefined
 const pixels=Number.parseFloat(value)
 return Number.isFinite(pixels)&&pixels>0?Math.round(pixels*1.5):undefined
}
const colorHex=(value:unknown)=>{
 if(typeof value!=='string')return undefined
 const hex=value.match(/^#?([\da-f]{6})$/i)
 if(hex)return hex[1].toUpperCase()
 const rgb=value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i)
 return rgb?.slice(1,4).map(part=>Number(part).toString(16).padStart(2,'0')).join('').toUpperCase()
}

async function imageData(source:string,widthHint:number|undefined,maxWidth:number){
 const image=new Image();image.src=source;await image.decode()
 const width=Math.min(maxWidth,widthHint||image.naturalWidth||300)
 const height=Math.max(1,Math.round(width*(image.naturalHeight||1)/(image.naturalWidth||1)))
 const kind=source.match(/^data:image\/(png|jpeg|jpg|gif|bmp);/i)?.[1]?.toLowerCase()
 if(kind){const response=await fetch(source);return {data:await response.arrayBuffer(),type:kind==='jpeg'?'jpg':kind as 'png'|'jpg'|'gif'|'bmp',width,height}}
 const canvas=document.createElement('canvas');canvas.width=Math.max(1,image.naturalWidth);canvas.height=Math.max(1,image.naturalHeight)
 const context=canvas.getContext('2d');if(!context)throw new Error('Image conversion is unavailable')
 context.drawImage(image,0,0)
 return {data:await (await fetch(canvas.toDataURL('image/png'))).arrayBuffer(),type:'png' as const,width,height}
}

export async function createDocx(content:JSONContent,settings:WordFileSettings):Promise<Blob>{
 const word=await import('docx')
 const {Document,Packer,Paragraph,TextRun,ImageRun,Table,TableRow,TableCell,Header,Footer,PageBreak,PageNumber,HeadingLevel,AlignmentType,PageOrientation,ExternalHyperlink,FootnoteReferenceRun,BorderStyle,HorizontalPositionRelativeFrom,HorizontalPositionAlign,VerticalPositionRelativeFrom,VerticalPositionAlign,Column}=word
 const sizes={A4:[794,1123],Letter:[816,1056],Legal:[816,1344]} as const
 const [portraitWidth,portraitHeight]=sizes[settings.pageSize]
 const sheetWidth=settings.orientation==='portrait'?portraitWidth:portraitHeight
 const sheetHeight=settings.orientation==='portrait'?portraitHeight:portraitWidth
 const margins={top:finiteNumber(settings.topMargin,82),right:finiteNumber(settings.rightMargin,82),bottom:finiteNumber(settings.bottomMargin,82),left:finiteNumber(settings.leftMargin,82)}
 const maxImageWidth=Math.max(100,sheetWidth-margins.left-margins.right)
 const alignment=(value:unknown)=>value==='center'?AlignmentType.CENTER:value==='right'?AlignmentType.RIGHT:value==='justify'?AlignmentType.JUSTIFIED:AlignmentType.LEFT
 type Child=InstanceType<typeof TextRun>|InstanceType<typeof ImageRun>|InstanceType<typeof ExternalHyperlink>|InstanceType<typeof FootnoteReferenceRun>|InstanceType<typeof PageBreak>
 const inline=async(nodes:JSONContent[]=[]):Promise<Child[]>=>{
  const children:Child[]=[]
  for(const node of nodes){
   if(node.type==='text'){
    const marks=node.marks||[]
    const style=marks.find(mark=>mark.type==='textStyle')?.attrs||{}
    const link=marks.find(mark=>mark.type==='link')?.attrs?.href
    const run=new TextRun({text:node.text||'',bold:marks.some(mark=>mark.type==='bold'),italics:marks.some(mark=>mark.type==='italic'),underline:marks.some(mark=>mark.type==='underline')?{}:undefined,strike:marks.some(mark=>mark.type==='strike'),subScript:marks.some(mark=>mark.type==='subscript'),superScript:marks.some(mark=>mark.type==='superscript'),color:colorHex(style.color),font:typeof style.fontFamily==='string'?style.fontFamily:undefined,size:fontSizeHalfPoints(style.fontSize)})
    children.push(typeof link==='string'&&/^https?:\/\//i.test(link)?new ExternalHyperlink({children:[run],link}):run)
   }else if(node.type==='hardBreak')children.push(new TextRun({text:'',break:1}))
   else if(node.type==='footnoteReference')children.push(new FootnoteReferenceRun({children:[new Paragraph({text:String(node.attrs?.note||'')})]}))
   else if(node.type==='image'){
    try{const source=String(node.attrs?.src||'');const image=await imageData(source,Number(node.attrs?.width)||undefined,maxImageWidth);children.push(new ImageRun({type:image.type,data:image.data,transformation:{width:image.width,height:image.height},altText:{name:String(node.attrs?.alt||'Image'),title:String(node.attrs?.alt||'Image'),description:String(node.attrs?.alt||'')}}))}
    catch{children.push(new TextRun({text:String(node.attrs?.alt||'[Image]')}))}
   }else if(node.content)children.push(...await inline(node.content))
  }
  return children
 }
 const blocks=async(nodes:JSONContent[]=[]):Promise<Array<InstanceType<typeof Paragraph>|InstanceType<typeof Table>>>=>{
  const result:Array<InstanceType<typeof Paragraph>|InstanceType<typeof Table>>=[]
  for(const node of nodes){
   if(node.type==='columnSection'||node.type==='columnBox')result.push(...await blocks(node.content))
   else if(node.type==='paragraph'||node.type==='heading'||node.type==='imageCaption'||node.type==='blockquote'||node.type==='codeBlock'){
    const level=Number(node.attrs?.level)||1
    const heading=node.type==='heading'?([HeadingLevel.HEADING_1,HeadingLevel.HEADING_2,HeadingLevel.HEADING_3,HeadingLevel.HEADING_4,HeadingLevel.HEADING_5,HeadingLevel.HEADING_6][Math.max(1,Math.min(6,level))-1]):undefined
    result.push(new Paragraph({children:await inline(node.content),heading,alignment:alignment(node.attrs?.textAlign),spacing:{before:pxToTwips(parseFloat(String(node.attrs?.spaceBefore||'0'))||0),after:pxToTwips(parseFloat(String(node.attrs?.spaceAfter||'8'))||0),line:Math.round((parseFloat(String(node.attrs?.lineSpacing||'1.15'))||1.15)*240)},indent:node.type==='blockquote'?{left:360}:undefined,style:node.type==='imageCaption'?'Caption':undefined}))
   }else if(node.type==='manualPageBreak')result.push(new Paragraph({children:[new PageBreak()]}))
   else if(node.type==='tableOfContents'){
    result.push(new Paragraph({text:'Contents',heading:HeadingLevel.HEADING_1}))
    for(const entry of Array.isArray(node.attrs?.entries)?node.attrs.entries:[]){
     const page=node.attrs?.options?.pages==='hidden'?'':node.attrs?.options?.pages==='inline'?`  Page ${entry.page}`:`  ${entry.page}`
     result.push(new Paragraph({text:`${'  '.repeat(Math.max(0,(Number(entry.level)||1)-1))}${String(entry.title||'')}${page}`}))
    }
   }
   else if(node.type==='horizontalRule')result.push(new Paragraph({text:'────────────────────'}))
   else if(node.type==='image')result.push(new Paragraph({children:await inline([node])}))
   else if(node.type==='bulletList'||node.type==='orderedList'||node.type==='taskList'||node.type==='radioList'){
    let index=0
    for(const item of node.content||[]){index++
     const text=await inline(item.content?.flatMap(child=>child.content||[child]))
     const prefix=node.type==='orderedList'?`${index}. `:node.type==='taskList'?(item.attrs?.checked?'☑ ':'☐ '):node.type==='radioList'?'○ ':`${bulletSymbol(node.attrs?.listStyle)} `
     result.push(new Paragraph({children:[new TextRun(prefix),...text]}))
    }
   }else if(node.type==='table'){
    const rows=[]
    for(const row of node.content||[]){
     const cells=[]
     for(const cell of row.content||[]){
      const cellBlocks=await blocks(cell.content)
      const cellParagraphs=cellBlocks.filter((block):block is InstanceType<typeof Paragraph>=>block instanceof Paragraph)
      const borderMask=String(cell.attrs?.borderMask||'')
      const border=(visible:boolean)=>({style:visible?BorderStyle.SINGLE:BorderStyle.NIL,size:6,color:'CCD5E0'})
      cells.push(new TableCell({children:cellParagraphs.length?cellParagraphs:[new Paragraph('')],shading:colorHex(cell.attrs?.backgroundColor)?{fill:colorHex(cell.attrs?.backgroundColor)}:undefined,borders:/^[01]{4}$/.test(borderMask)?{top:border(borderMask[0]==='1'),right:border(borderMask[1]==='1'),bottom:border(borderMask[2]==='1'),left:border(borderMask[3]==='1')}:undefined}))
     }
     if(cells.length)rows.push(new TableRow({children:cells}))
    }
    if(rows.length)result.push(new Table({rows}))
   }else if(node.content)result.push(...await blocks(node.content))
  }
  return result
 }
 const pageNumberRuns=()=>{
  const field=(kind:'current'|'total')=>new TextRun({children:[kind==='current'?PageNumber.CURRENT:PageNumber.TOTAL_PAGES]})
  const layout=settings.pageNumbers.layout
  if(layout==='total')return [new TextRun('Total pages: '),field('total')]
  if(layout==='page-of-total')return [new TextRun('Page '),field('current'),new TextRun(' of '),field('total')]
  if(layout==='page')return [new TextRun('Page '),field('current')]
  return [field('current')]
 }
 const numberParagraph=()=>new Paragraph({children:pageNumberRuns(),alignment:alignment(settings.pageNumbers.alignment)})
 let watermarkParagraph:InstanceType<typeof Paragraph>|null=null
 const watermark=settings.watermark
 if(watermark&&(watermark.kind==='image'?Boolean(watermark.image):Boolean(watermark.text?.trim()))){
  const canvas=document.createElement('canvas')
  canvas.width=sheetWidth*2;canvas.height=sheetHeight*2
  const context=canvas.getContext('2d')
  if(context){
   context.scale(2,2)
   context.translate(canvas.width/4,canvas.height/4)
   context.globalAlpha=Math.min(.6,Math.max(.05,watermark.opacity))
   if(watermark.kind==='image'){
    const image=new Image();image.src=watermark.image;await image.decode()
    const width=Math.min(sheetWidth*.9,sheetWidth*watermark.scale/100)
    const height=Math.min(sheetHeight*.7,width*image.naturalHeight/image.naturalWidth)
    const fittedWidth=height*image.naturalWidth/image.naturalHeight
    context.drawImage(image,-fittedWidth/2,-height/2,fittedWidth,height)
   }else{
    context.rotate(watermark.angle==='horizontal'?0:-Math.PI/5.625)
    const label=watermark.text.trim()
    let fontSize=Math.min(64,Math.max(25,850/label.length))
    context.font=`700 ${fontSize}px Arial`
    fontSize*=Math.min(1,(sheetWidth*.78)/Math.max(1,context.measureText(label).width))
    context.font=`700 ${fontSize}px Arial`
    context.textAlign='center';context.textBaseline='middle';context.fillStyle=watermark.color
    context.fillText(label,0,0)
   }
   const data=await (await fetch(canvas.toDataURL('image/png'))).arrayBuffer()
   watermarkParagraph=new Paragraph({children:[new ImageRun({type:'png',data,transformation:{width:sheetWidth,height:canvas.height/2},floating:{horizontalPosition:{relative:HorizontalPositionRelativeFrom.PAGE,align:HorizontalPositionAlign.CENTER},verticalPosition:{relative:VerticalPositionRelativeFrom.PAGE,align:VerticalPositionAlign.CENTER},behindDocument:true}})]})
  }
 }
 const headerParagraphs=[...(watermarkParagraph?[watermarkParagraph]:[]),...(settings.pageNumbers.enabled&&settings.pageNumbers.position==='header'?[numberParagraph()]:[]),...(settings.header?[new Paragraph({text:settings.header})]:[])]
 const footerParagraphs=[...(settings.footer?[new Paragraph({text:settings.footer})]:[]),...(settings.pageNumbers.enabled&&settings.pageNumbers.position==='footer'?[numberParagraph()]:[])]
 const children=await blocks(content.content)
 const backgroundColor=colorHex(settings.pageColor)
 const asymmetric=settings.columns==='left'||settings.columns==='right'
 const columnGap=pxToTwips(24)
 const writingWidth=pxToTwips(sheetWidth-margins.left-margins.right)-columnGap
 const narrow=Math.floor(writingWidth/3),wide=writingWidth-narrow
 const column=asymmetric?{count:2,equalWidth:false,children:settings.columns==='left'?[new Column({width:narrow,space:columnGap}),new Column({width:wide})]:[new Column({width:wide,space:columnGap}),new Column({width:narrow})]}:{count:typeof settings.columns==='number'?settings.columns:1,space:columnGap}
 const wordDocument=new Document({background:backgroundColor&&backgroundColor!=='FFFFFF'?{color:backgroundColor}:undefined,sections:[{properties:{column,page:{size:{width:pxToTwips(portraitWidth),height:pxToTwips(portraitHeight),orientation:settings.orientation==='portrait'?PageOrientation.PORTRAIT:PageOrientation.LANDSCAPE},margin:{top:pxToTwips(margins.top),right:pxToTwips(margins.right),bottom:pxToTwips(margins.bottom),left:pxToTwips(margins.left)}}},headers:headerParagraphs.length?{default:new Header({children:headerParagraphs})}:undefined,footers:footerParagraphs.length?{default:new Footer({children:footerParagraphs})}:undefined,children:children.length?children:[new Paragraph('')]}]})
 return Packer.toBlob(wordDocument)
}

export async function readDocx(file:File):Promise<{content:string;settings:Partial<WordFileSettings>}>{
 const [{default:mammoth},{default:DOMPurify},{default:JSZip}]=await Promise.all([import('mammoth'),import('dompurify'),import('jszip')])
 const bytes=await file.arrayBuffer()
 const result=await mammoth.convertToHtml({arrayBuffer:bytes},{convertImage:mammoth.images.dataUri})
 const zip=await JSZip.loadAsync(bytes)
 const parse=async(name:string)=>{
  const entry=zip.file(name);if(!entry)return null
  return new DOMParser().parseFromString(await entry.async('string'),'application/xml')
 }
 const body=await parse('word/document.xml')
 const backgroundColor=body?.getElementsByTagNameNS('*','background')[0]?.getAttribute('w:color')
 const first=(pattern:RegExp)=>Object.keys(zip.files).sort().find(name=>pattern.test(name))
 const header=await parse(first(/^word\/header\d+\.xml$/)||'')
 const footer=await parse(first(/^word\/footer\d+\.xml$/)||'')
 const paragraphs=(xml:Document|null)=>[...(xml?.getElementsByTagNameNS('*','p')||[])].map(element=>({
  text:[...element.getElementsByTagNameNS('*','t')].map(part=>part.textContent||'').join(''),
  field:[...element.getElementsByTagNameNS('*','instrText')].map(part=>part.textContent||'').join(' '),
  alignment:element.getElementsByTagNameNS('*','jc')[0]?.getAttribute('w:val')||'left',
 }))
 const headerParts=paragraphs(header),footerParts=paragraphs(footer)
 const headerNumber=headerParts.find(part=>/\bPAGE\b|NUMPAGES/i.test(part.field))
 const footerNumber=footerParts.find(part=>/\bPAGE\b|NUMPAGES/i.test(part.field))
 const number=headerNumber||footerNumber
 const text=(parts:ReturnType<typeof paragraphs>)=>parts.filter(part=>!/\bPAGE\b|NUMPAGES/i.test(part.field)).map(part=>part.text).filter(Boolean).join('\n')
 const settings:Partial<WordFileSettings>={header:text(headerParts),footer:text(footerParts)}
 if(backgroundColor&&/^[\da-f]{6}$/i.test(backgroundColor))settings.pageColor=`#${backgroundColor}`
 if(number){
  const total=/NUMPAGES/i.test(number.field),current=/\bPAGE\b/i.test(number.field)
  settings.pageNumbers={enabled:true,defaultStyle:'arabic',layout:current&&total?'page-of-total':total?'total':/Page/i.test(number.text)?'page':'number',alignment:number.alignment==='center'?'center':number.alignment==='right'?'right':'left',position:headerNumber?'header':'footer',rules:[]}
 }
 const section=body?.getElementsByTagNameNS('*','sectPr')[0]
 const size=section?.getElementsByTagNameNS('*','pgSz')[0]
 const margins=section?.getElementsByTagNameNS('*','pgMar')[0]
 const cols=section?.getElementsByTagNameNS('*','cols')[0]
 const columnCount=Number(cols?.getAttribute('w:num'))
 const widths=Array.from(cols?.getElementsByTagNameNS('*','col')||[]).map(col=>Number(col.getAttribute('w:w')))
 if(widths.length===2&&widths[0]!==widths[1])settings.columns=widths[0]<widths[1]?'left':'right'
 else if(columnCount===2||columnCount===3)settings.columns=columnCount
 const width=Number(size?.getAttribute('w:w')),height=Number(size?.getAttribute('w:h'))
 if(width&&height){
  const long=Math.max(width,height),short=Math.min(width,height)
  settings.pageSize=long>19000?'Legal':short>12000?'Letter':'A4'
  settings.orientation=size?.getAttribute('w:orient')==='landscape'||width>height?'landscape':'portrait'
 }
 for(const side of ['top','right','bottom','left'] as const){const value=Number(margins?.getAttribute(`w:${side}`));if(value)settings[`${side}Margin`]=Math.round(value/15)}
 const html=DOMPurify.sanitize(result.value,{USE_PROFILES:{html:true}})
 const wrapped=settings.columns==='left'||settings.columns==='right'?`<div data-column-box="true">${html}</div><div data-column-box="true"><p></p></div>`:html
 return {content:settings.columns?`<div data-column-section="true" data-columns="${settings.columns}">${wrapped}</div>`:html,settings}
}
