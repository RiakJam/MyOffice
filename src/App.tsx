import { saveFile } from './saveFile'
import { Capacitor } from '@capacitor/core'
import myofficeMark from './assets/myoffice-mark.svg'
import { useEffect, useRef, useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import { generateJSON } from '@tiptap/core'
import type { Editor, JSONContent } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Link from '@tiptap/extension-link'
import { ResizableImage } from './ResizableImage'
import { TextStyle, FontFamily, FontSize } from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Highlight from '@tiptap/extension-highlight'
import { PaginationPlus } from 'tiptap-pagination-plus'
import { SpacedParagraph, SpacedHeading, StyledBulletList, StyledOrderedList, RadioList, RadioItem, ShadedTableCell, ShadedTableHeader, SizedTableRow, WordTable, ColumnSection, ColumnBox, ManualPageBreak, FootnoteReference, ImageCaption } from './editorExtensions'
import { NodeSelection } from '@tiptap/pm/state'
import { normalizeWordPaste } from './wordPaste'
import { bulletStyles } from './bulletStyles'
import { TableControls } from './TableControls'
import { ImageCropDialog } from './ImageCropDialog'
import { WordShapesDialog } from './WordShapesDialog'
import { TableBordersMenu } from './TableBordersMenu'
import { fontsWithCurrent } from './officeFonts'
import { DateInsertDialog } from './DateInsertDialog'
import { SymbolDialog } from './SymbolDialog'
import { HeaderFooterDialog } from './HeaderFooterDialog'
import { PageNumberDialog, displayForPage } from './PageNumberDialog'
import { TextColorDialog } from './TextColorDialog'
import { HighlightColorDialog } from './HighlightColorDialog'
import { ReferenceDialog } from './ReferenceDialog'
import { TableOfContents, TableOfContentsDialog, defaultTocOptions } from './TableOfContents'
import type { TocOptions, TocEntry } from './TableOfContents'
import { InfoDialog } from './InfoDialog'
import type { InfoDialogContent } from './InfoDialog'
import { WatermarkDialog } from './WatermarkDialog'
import type { WatermarkSettings } from './WatermarkDialog'
import { PageColorDialog } from './PageColorDialog'
import { createDocx, readDocx } from './wordFormats'
import type { PageNumberSettings } from './PageNumberDialog'
import { FileText, Download, Printer, Search, Undo2, Redo2, Bold, Italic, Underline as UnderlineIcon, Strikethrough, List, ListOrdered, AlignLeft, AlignCenter, AlignRight, AlignJustify, Link2, Table2, ImagePlus, Shapes, Grid3X3, Highlighter, FilePlus2, Save, PanelTop, PanelBottom, CalendarDays, Minus, Plus, CheckSquare, Palette, ScanLine, RotateCcw, Type, Quote, FileDown, Ruler, ArrowDown, ArrowUpDown, Columns3 } from 'lucide-react'
import './App.css'

const escapeHeaderFooter=(value:string)=>value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;').replace(/\n/g,'<br>')
const hidePageGuides=(clonedDocument:Document)=>{const style=clonedDocument.createElement('style');style.textContent='.pagination-surface .rm-page-header::after,.pagination-surface .rm-page-footer::before{display:none!important}';clonedDocument.head.append(style)}
const KEY='myoffice-word-v2'
const LIBRARY_KEY='myoffice-word-library-v1'
const DESKTOP_WIDTH_KEY='myoffice-desktop-wide-text-v2'
const desktopHorizontalMargin=(window as Window&{myofficeDesktop?:unknown}).myofficeDesktop?32:82
const starter='<h1>Welcome to Myoffice Word</h1><p>A quiet place for your best ideas.</p><p>Start writing here. Use the ribbon to shape your document, add a table or image, and save your work as you go.</p><h2>Everything starts with a first draft</h2><p>Whether you’re preparing a report, sharing a story, or planning your next project, Myoffice gives your words room to grow.</p><blockquote><p>Great work begins with a single sentence.</p></blockquote><p>Try selecting text to make it <strong>bold</strong>, <em>italic</em>, or <u>underlined</u>.</p>'
type ColumnPreset=1|2|3|'left'|'right'
type Settings={pageNumbers:PageNumberSettings;pageSize:'A4'|'Letter'|'Legal';orientation:'portrait'|'landscape';columns:ColumnPreset;leftMargin:number;rightMargin:number;topMargin:number;bottomMargin:number;pageColor:string;pageBorder:boolean;watermark:WatermarkSettings|null;header:string;footer:string;ruler:boolean}
const defaults:Settings={pageNumbers:{enabled:true,defaultStyle:'arabic',layout:'number',alignment:'right',position:'footer',rules:[]},pageSize:'A4',orientation:'portrait',columns:1,leftMargin:desktopHorizontalMargin,rightMargin:desktopHorizontalMargin,topMargin:82,bottomMargin:82,pageColor:'#ffffff',pageBorder:false,watermark:null,header:'',footer:'',ruler:true}
function load(){try{return JSON.parse(localStorage.getItem(KEY)||localStorage.getItem('myoffice-word-v1')||'null')}catch{return null}}
const normalizeSettings=(value:Partial<Settings>&{margin?:number}={})=>({...defaults,...value,pageNumbers:{...defaults.pageNumbers,...value.pageNumbers,rules:value.pageNumbers?.rules||[]},watermark:value.watermark??null,footer:value.footer==='Page {page} of {pages}'?'':value.footer??'',leftMargin:value.leftMargin??value.margin??defaults.leftMargin,rightMargin:value.rightMargin??value.margin??defaults.rightMargin,topMargin:value.topMargin??value.margin??82,bottomMargin:value.bottomMargin??value.margin??82})
const previous=load()
const oldSettings=previous?.settings||{}
type DocumentRecord={id:string;title:string;content:string;settings:Settings}
type CloseRequest={kind:'tab';id:string}|{kind:'app'}
type DesktopBridge={onCloseRequested:(callback:()=>void)=>()=>void;confirmClose:()=>void}
const desktopBridge=()=> (window as Window&{myofficeDesktop?:DesktopBridge}).myofficeDesktop
function readLibrary():{documents:DocumentRecord[];activeId:string}{
 try{const parsed=JSON.parse(localStorage.getItem(LIBRARY_KEY)||'null');if(parsed?.documents?.length&&parsed.activeId)return {...parsed,documents:parsed.documents.map((doc:DocumentRecord)=>({...doc,settings:normalizeSettings(doc.settings)}))}}catch{/* use legacy document */}
 const first:DocumentRecord={id:crypto.randomUUID(),title:previous?.title||'Untitled document',content:previous?.content||starter,settings:normalizeSettings(oldSettings)}
 return {documents:[first],activeId:first.id}
}
const initialLibrary=readLibrary()
if(desktopHorizontalMargin===32&&localStorage.getItem(DESKTOP_WIDTH_KEY)!=='1'){
 initialLibrary.documents=initialLibrary.documents.map(doc=>doc.settings.leftMargin===doc.settings.rightMargin&&[48,82].includes(doc.settings.leftMargin)?{...doc,settings:{...doc.settings,leftMargin:32,rightMargin:32}}:doc)
 localStorage.setItem(LIBRARY_KEY,JSON.stringify(initialLibrary))
 localStorage.setItem(DESKTOP_WIDTH_KEY,'1')
}
const firstDocument=initialLibrary.documents.find(doc=>doc.id===initialLibrary.activeId)||initialLibrary.documents[0]
function App({onOpenPresentation}:{onOpenPresentation?:()=>void}){
 const [documents,setDocuments]=useState<DocumentRecord[]>(initialLibrary.documents)
 const [activeDocId,setActiveDocId]=useState(firstDocument.id)
 const activeDocIdRef=useRef(firstDocument.id)
 const [title,setTitle]=useState(firstDocument.title)
 const [status,setStatus]=useState('All changes saved')
 const [words,setWords]=useState(0)
 const [revision,setRevision]=useState(0)
 const [tab,setTab]=useState('Home')
 const [menu,setMenu]=useState(false)
 const [search,setSearch]=useState(false)
 const [replaceOpen,setReplaceOpen]=useState(false)
 const [replacement,setReplacement]=useState('')
 const [query,setQuery]=useState('')
 const [mobileWidth,setMobileWidth]=useState(window.innerWidth)
 const [zoom,setZoom]=useState(()=>Capacitor.getPlatform()==='android'&&window.innerWidth<=700?Math.max(30,Math.floor((window.innerWidth-16)/794*100)):desktopBridge()?Math.max(100,Math.min(140,Math.floor((window.innerWidth-120)/794*100))):110)
 const [manualZoom,setManualZoom]=useState(false)
 const [settings,setSettings]=useState<Settings>({...defaults,...firstDocument.settings})
 const [pages,setPages]=useState(1)
 const [currentPage,setCurrentPage]=useState(1)
 const [selectionVersion,setSelectionVersion]=useState(0)
 const [caseMenu,setCaseMenu]=useState<{left:number;top:number}|null>(null)
 const [paragraphMenu,setParagraphMenu]=useState<{kind:'bullet'|'number'|'spacing';left:number;top:number}|null>(null)
 const [columnsMenu,setColumnsMenu]=useState<{left:number;top:number}|null>(null)
 const [linkDialog,setLinkDialog]=useState(false)
 const [linkText,setLinkText]=useState('')
 const [linkUrl,setLinkUrl]=useState('')
 const [linkError,setLinkError]=useState('')
 const [imageError,setImageError]=useState('')
 const [shapesDialog,setShapesDialog]=useState(false)
 const [borderMenu,setBorderMenu]=useState<{left:number;top:number}|null>(null)
 const [cropImage,setCropImage]=useState<{pos:number;src:string}|null>(null)
 const [dateDialog,setDateDialog]=useState(false)
 const [symbolDialog,setSymbolDialog]=useState(false)
 const [headerFooterDialog,setHeaderFooterDialog]=useState<'header'|'footer'|null>(null)
 const [pageNumberDialog,setPageNumberDialog]=useState(false)
 const [referenceDialog,setReferenceDialog]=useState<'caption'|null>(null)
 const [tocDialog,setTocDialog]=useState<{pos:number;options:TocOptions}|null>(null)
 const [infoDialog,setInfoDialog]=useState<InfoDialogContent|null>(null)
 const [footnotePages,setFootnotePages]=useState<Record<number,string[]>>({})
 const captionImagePosRef=useRef<number|null>(null)
 const [textColorDialog,setTextColorDialog]=useState(false)
 const [highlightColorDialog,setHighlightColorDialog]=useState(false)
 const [lastHighlightColor,setLastHighlightColor]=useState('#fff0a8')
 const [watermarkDialog,setWatermarkDialog]=useState(false)
 const [pageColorDialog,setPageColorDialog]=useState(false)
 const [lastTextColor,setLastTextColor]=useState('#000000')
 const textColorSelectionRef=useRef<{from:number;to:number}>({from:0,to:0})
 const highlightSelectionRef=useRef<{from:number;to:number}>({from:0,to:0})
 const symbolSelectionRef=useRef<{from:number;to:number}>({from:0,to:0})
 const dateSelectionRef=useRef<{from:number;to:number}>({from:0,to:0})
 const [closeRequest,setCloseRequest]=useState<CloseRequest|null>(null)
 const lastSavedRef=useRef(new Map(initialLibrary.documents.map(doc=>[doc.id,{...doc}])))
 const stageRef=useRef<HTMLDivElement>(null)
 const rulerTrackRef=useRef<HTMLDivElement>(null)
 const fileMenuRef=useRef<HTMLDivElement>(null)
 const fileButtonRef=useRef<HTMLButtonElement>(null)
 const caseButtonRef=useRef<HTMLButtonElement>(null)
 const caseMenuRef=useRef<HTMLDivElement>(null)
 const paragraphMenuRef=useRef<HTMLDivElement>(null)
 const paragraphButtonRef=useRef<HTMLButtonElement|null>(null)
 const openFileRef=useRef<HTMLInputElement>(null)
 const imageFileRef=useRef<HTMLInputElement>(null)
 const linkSelectionRef=useRef<{from:number;to:number}>({from:0,to:0})
 const pageRef=useRef<HTMLDivElement>(null)
 const editorRef=useRef<Editor|null>(null)
 const editor=useEditor({extensions:[StarterKit.configure({link:false,underline:false,bulletList:false,orderedList:false,paragraph:false,heading:false}),SpacedParagraph,SpacedHeading,StyledBulletList,StyledOrderedList,RadioList,RadioItem,ColumnSection,ColumnBox,ManualPageBreak,FootnoteReference,ImageCaption,TableOfContents,Underline,TextAlign.configure({types:['heading','paragraph']}),Link.configure({openOnClick:false}),ResizableImage.configure({allowBase64:true}),WordTable.configure({resizable:false}),SizedTableRow,ShadedTableHeader,ShadedTableCell,TextStyle,Color,FontFamily,FontSize,Subscript,Superscript,TaskList,TaskItem,Highlight.configure({multicolor:true}),PaginationPlus.configure({pageWidth:794,pageHeight:1123,pageGap:30,pageBreakBackground:'#e6e6e6',marginTop:82,marginBottom:82,marginLeft:82,marginRight:82,footerRight:'Page {page}',onHeaderClick:()=>setHeaderFooterDialog('header'),onFooterClick:()=>setHeaderFooterDialog('footer')})],content:firstDocument.content,editorProps:{attributes:{class:'document-content',spellcheck:'true'},transformPastedHTML:normalizeWordPaste,handleKeyDown:(_view,event)=>{if(event.key!=='Tab')return false;const current=editorRef.current;if(!current?.isActive('table'))return false;event.preventDefault();if(event.shiftKey)return current.commands.goToPreviousCell();if(current.commands.goToNextCell())return true;return current.chain().addRowAfter().goToNextCell().run()}},onUpdate:({editor})=>{setWords(editor.getText().trim().split(/\s+/).filter(Boolean).length);setStatus('Saving…');setRevision(v=>v+1);setDocuments(items=>items.map(item=>item.id===activeDocIdRef.current?{...item,content:editor.getHTML()}:item))},onSelectionUpdate:()=>setSelectionVersion(v=>v+1)})
 editorRef.current=editor
 useEffect(()=>{if(editor)setWords(editor.getText().trim().split(/\s+/).filter(Boolean).length)},[editor])
 useEffect(()=>{setDocuments(items=>items.map(item=>item.id===activeDocId?{...item,title,settings}:item))},[title,settings,activeDocId])
 useEffect(()=>{const timer=setTimeout(()=>{localStorage.setItem(LIBRARY_KEY,JSON.stringify({documents,activeId:activeDocId}));setStatus('All changes saved')},450);return()=>clearTimeout(timer)},[documents,activeDocId])
 const switchDocument=(target:DocumentRecord)=>{if(target.id===activeDocIdRef.current)return;setDocuments(items=>items.map(item=>item.id===activeDocIdRef.current?{...item,title,settings,content:editor?.getHTML()||item.content}:item));activeDocIdRef.current=target.id;setActiveDocId(target.id);setTitle(target.title);setSettings(target.settings);editor?.commands.setContent(target.content);setMenu(false)}
 const newDocument=()=>{const next:DocumentRecord={id:crypto.randomUUID(),title:'Untitled document',content:'<p></p>',settings:{...defaults}};setDocuments(items=>[...items.map(item=>item.id===activeDocIdRef.current?{...item,title,settings,content:editor?.getHTML()||item.content}:item),next]);activeDocIdRef.current=next.id;setActiveDocId(next.id);setTitle(next.title);setSettings(next.settings);editor?.commands.setContent(next.content);setMenu(false);requestAnimationFrame(()=>editor?.commands.focus())}
 const currentDocuments=()=>documents.map(doc=>doc.id===activeDocIdRef.current?{...doc,title,settings,content:editor?.getHTML()||doc.content}:doc)
 const persistNow=(items:DocumentRecord[],id:string)=>localStorage.setItem(LIBRARY_KEY,JSON.stringify({documents:items,activeId:id}))
 const downloadDocument=(doc:DocumentRecord)=>{
  const data=JSON.stringify({format:'myoffice-word',version:1,title:doc.title,content:doc.content,settings:doc.settings},null,2)
  void saveFile(new Blob([data],{type:'application/json'}),`${doc.title.replace(/[^\w-]+/g,'-')||'document'}.myoffice`).catch(error=>setInfoDialog({title:'Save failed',message:String(error)}))
 }
 const downloadDocx=async(doc:DocumentRecord)=>{
  try{
   setStatus('Creating DOCX…')
   const content=generateJSON(doc.content,editor?.extensionManager.extensions||[])
   const blob=await createDocx(content,doc.settings)
   await saveFile(blob,`${doc.title.replace(/[^\w-]+/g,'-')||'document'}.docx`)
   setStatus('All changes saved')
  }catch(error){setStatus('DOCX export failed');setInfoDialog({title:'DOCX export failed',message:error instanceof Error?error.message:'Could not create the DOCX document.'})}
 }
 const closeTab=(id:string,saveCopy:boolean)=>{
  const items=currentDocuments()
  const closing=items.find(doc=>doc.id===id)
  if(!closing)return
  if(saveCopy)void downloadDocx(closing)
  lastSavedRef.current.delete(id)
  let remaining=items.filter(doc=>doc.id!==id)
  if(!remaining.length)remaining=[{id:crypto.randomUUID(),title:'Untitled document',content:'<p></p>',settings:{...defaults}}]
  const next=remaining.find(doc=>doc.id===activeDocIdRef.current)||remaining[0]
  persistNow(remaining,next.id)
  setDocuments(remaining)
  if(next.id!==activeDocIdRef.current){activeDocIdRef.current=next.id;setActiveDocId(next.id);setTitle(next.title);setSettings(next.settings);editor?.commands.setContent(next.content)}
 }
 const finishClose=(choice:'save'|'discard'|'cancel')=>{
  if(!closeRequest||choice==='cancel'){setCloseRequest(null);return}
  if(closeRequest.kind==='tab')closeTab(closeRequest.id,choice==='save')
  else{
   if(choice==='save'){
    const items=currentDocuments()
    items.forEach(doc=>lastSavedRef.current.set(doc.id,{...doc}))
    persistNow(items,activeDocIdRef.current)
   }else{
    const restored=currentDocuments().flatMap(doc=>{const saved=lastSavedRef.current.get(doc.id);return saved?[saved]:[]})
    const items=restored.length?restored:[{id:crypto.randomUUID(),title:'Untitled document',content:'<p></p>',settings:{...defaults}}]
    persistNow(items,items[0].id)
   }
   desktopBridge()?.confirmClose()
  }
  setCloseRequest(null)
 }
 useEffect(()=>{
  const bridge=desktopBridge()
  if(bridge)return bridge.onCloseRequested(()=>setCloseRequest({kind:'app'}))
  const beforeUnload=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue=''}
  window.addEventListener('beforeunload',beforeUnload)
  return()=>window.removeEventListener('beforeunload',beforeUnload)
 },[])
 useEffect(()=>{if(!closeRequest)return;const escape=(event:KeyboardEvent)=>{if(event.key==='Escape')setCloseRequest(null)};document.addEventListener('keydown',escape);return()=>document.removeEventListener('keydown',escape)},[closeRequest])
 useEffect(()=>{if(!columnsMenu)return;const close=(event:PointerEvent)=>{if(!(event.target as Element).closest('.columns-menu,.columns-ribbon-button'))setColumnsMenu(null)};const escape=(event:KeyboardEvent)=>{if(event.key==='Escape')setColumnsMenu(null)};document.addEventListener('pointerdown',close);document.addEventListener('keydown',escape);return()=>{document.removeEventListener('pointerdown',close);document.removeEventListener('keydown',escape)}},[columnsMenu])
 useEffect(()=>{if(!linkDialog)return;const escape=(event:KeyboardEvent)=>{if(event.key==='Escape')setLinkDialog(false)};document.addEventListener('keydown',escape);return()=>document.removeEventListener('keydown',escape)},[linkDialog])
 
 useEffect(()=>{const page=pageRef.current;if(!page)return;const edit=(event:MouseEvent)=>{const target=event.target as Element;if(target.closest('.rm-page-header'))setHeaderFooterDialog('header');else if(target.closest('.rm-page-footer'))setHeaderFooterDialog('footer')};page.addEventListener('dblclick',edit);return()=>page.removeEventListener('dblclick',edit)},[])
 useEffect(()=>{if(!editor)return;const root=pageRef.current;if(!root)return;const click=(event:MouseEvent)=>{const target=event.target as Element;const toc=target.closest('[data-table-of-contents]');if(!toc)return;let pos:number|undefined;editor.state.doc.descendants((node,nodePos)=>{if(node.type.name==='tableOfContents'&&editor.view.nodeDOM(nodePos)===toc)pos=nodePos});if(pos===undefined)return;if(target.closest('[data-toc-update]')){event.preventDefault();contentsAt(pos,editor.state.doc.nodeAt(pos)!.attrs.options as TocOptions)}else if(target.closest('.toc-header strong'))setTocDialog({pos,options:editor.state.doc.nodeAt(pos)!.attrs.options as TocOptions})};root.addEventListener('click',click);return()=>root.removeEventListener('click',click)},[editor,zoom,settings])
 useEffect(()=>{const open=(event:Event)=>setCropImage((event as CustomEvent<{pos:number;src:string}>).detail);window.addEventListener('myoffice-crop-image',open);return()=>window.removeEventListener('myoffice-crop-image',open)},[])
 useEffect(()=>{if(!editor)return;const content=editor.view.dom;const measure=()=>setPages(Math.max(1,content.querySelectorAll('.rm-page-break').length));measure();const observer=new ResizeObserver(measure);observer.observe(content);return()=>observer.disconnect()},[editor,revision,settings])
 useEffect(()=>{
  if(!editor)return
  const chain=editor.chain().updatePageWidth(dimensions.width).updatePageHeight(dimensions.height).updateMargins({top:settings.topMargin,bottom:settings.bottomMargin,left:settings.leftMargin,right:settings.rightMargin})
  const headerText=escapeHeaderFooter(settings.header)
  const footerText=escapeHeaderFooter(settings.footer)
  const numberAt=(page:number)=>settings.pageNumbers.enabled?displayForPage(page,Math.max(1,pages),settings.pageNumbers):''
  const headerFor=(page:number)=>settings.pageNumbers.enabled&&settings.pageNumbers.position==='header'?{left:numberAt(page),right:headerText}:{left:headerText,right:''}
  const footerFor=(page:number)=>{
   const notes=footnotePages[page]
   const left=(notes?.length?`<div class="page-footnotes">${notes.map(escapeHeaderFooter).join('<br>')}</div>`:'')+footerText
   return settings.pageNumbers.enabled&&settings.pageNumbers.position==='footer'?{left,right:numberAt(page)}:{left,right:''}
  }
  editor.storage.PaginationPlus.customHeader={}
  editor.storage.PaginationPlus.customFooter={}
  const commonHeader=headerFor(1),commonFooter=footerFor(1)
  chain.updateHeaderContent(commonHeader.left,commonHeader.right).updateFooterContent(commonFooter.left,commonFooter.right)
  for(let page=1;page<=pages+2;page++){
   const header=headerFor(page),footer=footerFor(page)
   chain.updateHeaderContent(header.left,header.right,page).updateFooterContent(footer.left,footer.right,page)
  }
  chain.run()
 },[editor,settings,pages,footnotePages])
 useEffect(()=>{const page=pageRef.current;if(!page)return;const update=()=>{const pageTop=page.getBoundingClientRect().top+window.scrollY;const viewportPoint=window.scrollY+Math.min(window.innerHeight/2,400);const pageHeight=(dimensions.height+30)*zoom/100;setCurrentPage(Math.min(pages,Math.max(1,Math.floor((viewportPoint-pageTop)/pageHeight)+1)))};window.addEventListener('scroll',update,{passive:true});update();return()=>window.removeEventListener('scroll',update)},[pages,zoom,settings])
 const updateSettings=(change:Partial<Settings>)=>setSettings(s=>({...s,...change}))
 const changeColumns=(count:ColumnPreset)=>{
  if(!editor)return
  const doc=editor.getJSON()
  const blocks=doc.content||[]
  const flattened:JSONContent[]=blocks.flatMap(block=>block.type==='columnSection'?(block.content||[]).flatMap(child=>child.type==='columnBox'?(child as JSONContent).content||[]:[child]):[block])
  const midpoint=Math.ceil(flattened.length/2)
  const content=count===1?flattened:[{type:'columnSection',attrs:{count},content:count==='left'||count==='right'?[{type:'columnBox',content:flattened.slice(0,midpoint).length?flattened.slice(0,midpoint):[{type:'paragraph'}]},{type:'columnBox',content:flattened.slice(midpoint).length?flattened.slice(midpoint):[{type:'paragraph'}]}]:flattened}]
  editor.commands.setContent({...doc,content:content.length?content:[{type:'paragraph'}]})
  updateSettings({columns:count})
 }
 const changeMargin=(side:'left'|'right'|'top'|'bottom',value:number)=>{
  const key=`${side}Margin` as 'leftMargin'|'rightMargin'|'topMargin'|'bottomMargin'
  const limit=(side==='left'||side==='right'?dimensions.width:dimensions.height)/3
  setSettings(current=>({...current,[key]:Math.min(Math.floor(limit),Math.max(32,Math.round(value)))}))
 }
 const beginMarginDrag=(side:'left'|'right'|'top'|'bottom')=>(event:React.PointerEvent<HTMLButtonElement>)=>{
  event.preventDefault()
  const track=side==='left'||side==='right'?rulerTrackRef.current:event.currentTarget.parentElement
  if(!track)return
  const move=(pointer:PointerEvent)=>{
   const rect=track.getBoundingClientRect()
   const distance=side==='left'?pointer.clientX-rect.left:side==='right'?rect.right-pointer.clientX:side==='top'?pointer.clientY-rect.top:rect.bottom-pointer.clientY
   changeMargin(side,distance/(zoom/100))
  }
  const stop=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',stop)}
  window.addEventListener('pointermove',move)
  window.addEventListener('pointerup',stop,{once:true})
 }
 const marginKey=(side:'left'|'right'|'top'|'bottom')=>(event:React.KeyboardEvent<HTMLButtonElement>)=>{
  const key=`${side}Margin` as 'leftMargin'|'rightMargin'|'topMargin'|'bottomMargin'
  const towardStart=side==='left'||side==='right'?'ArrowLeft':'ArrowUp'
  const towardEnd=side==='left'||side==='right'?'ArrowRight':'ArrowDown'
  if(event.key!==towardStart&&event.key!==towardEnd)return
  event.preventDefault()
  const reverse=side==='right'||side==='bottom'
  const delta=event.key===towardStart?(reverse?5:-5):(reverse?-5:5)
  changeMargin(side,settings[key]+delta)
 }

 useEffect(()=>{
  if(!menu)return
  const outside=(event:PointerEvent)=>{const target=event.target as Node;if(!fileMenuRef.current?.contains(target)&&!fileButtonRef.current?.contains(target))setMenu(false)}
  const escape=(event:KeyboardEvent)=>{if(event.key==='Escape')setMenu(false)}
  document.addEventListener('pointerdown',outside)
  document.addEventListener('keydown',escape)
  return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape)}
 },[menu])
 useEffect(()=>{
  if(!caseMenu)return
  const outside=(event:PointerEvent)=>{const target=event.target as Node;if(!caseMenuRef.current?.contains(target)&&!caseButtonRef.current?.contains(target))setCaseMenu(null)}
  const escape=(event:KeyboardEvent)=>{if(event.key==='Escape')setCaseMenu(null)}
  document.addEventListener('pointerdown',outside)
  document.addEventListener('keydown',escape)
  return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape)}
 },[caseMenu])
 useEffect(()=>{
  if(!paragraphMenu)return
  const outside=(event:PointerEvent)=>{const target=event.target as Node;if(!paragraphMenuRef.current?.contains(target)&&!paragraphButtonRef.current?.contains(target))setParagraphMenu(null)}
  const escape=(event:KeyboardEvent)=>{if(event.key==='Escape')setParagraphMenu(null)}
  document.addEventListener('pointerdown',outside)
  document.addEventListener('keydown',escape)
  return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape)}
 },[paragraphMenu])
 const save=()=>{const items=currentDocuments();const current=items.find(doc=>doc.id===activeDocIdRef.current);if(current)lastSavedRef.current.set(current.id,{...current});persistNow(items,activeDocIdRef.current);setDocuments(items);setStatus('All changes saved');setMenu(false)}
 const saveAs=()=>{
  const current=currentDocuments().find(doc=>doc.id===activeDocIdRef.current)
  if(!current)return
  void downloadDocx(current)
  lastSavedRef.current.set(current.id,{...current})
  setMenu(false)
 }
 const openFile=async(file:File)=>{
  try{
   let name=file.name.replace(/\.(docx|myoffice|html?|txt)$/i,'')
   let content:string
   let importedSettings:Settings={...defaults}
   if(/\.docx$/i.test(file.name)){const imported=await readDocx(file);content=imported.content;importedSettings=normalizeSettings(imported.settings)}
   else if(/\.myoffice$/i.test(file.name)){
    const data=JSON.parse(await file.text())
    if(data.format!=='myoffice-word'||typeof data.content!=='string')throw new Error('This is not a Myoffice document.')
    content=data.content;importedSettings=normalizeSettings(data.settings||{});name=typeof data.title==='string'?data.title:name
   }else if(/\.html?$/i.test(file.name)){
    const {default:DOMPurify}=await import('dompurify')
    content=DOMPurify.sanitize(await file.text(),{USE_PROFILES:{html:true}})
   }else if(/\.txt$/i.test(file.name))content=(await file.text()).split(/\n\s*\n/).map(line=>`<p>${escapeHeaderFooter(line)}</p>`).join('')
   else throw new Error('Choose a DOCX, Myoffice, HTML, or TXT document.')
   const next:DocumentRecord={id:crypto.randomUUID(),content:content||'<p></p>',title:name||'Untitled document',settings:importedSettings}
   setDocuments(items=>[...items,next]);activeDocIdRef.current=next.id;setActiveDocId(next.id);editor?.commands.setContent(next.content);setTitle(next.title);setSettings(next.settings);setMenu(false)
  }catch(error){setInfoDialog({title:'Could not open document',message:error instanceof Error?error.message:'Could not open this document.'})}
 }
 const exportPdf=async()=>{
  if(!pageRef.current)return
  setMenu(false);setStatus('Creating PDF…')
  try{
   const [{default:html2canvas},{jsPDF}]=await Promise.all([import('html2canvas'),import('jspdf')])
   const pageNode=pageRef.current
   const previousTransform=pageNode.style.transform
   pageNode.style.transform='none'
   let canvas:HTMLCanvasElement
   try{canvas=await html2canvas(pageNode,{scale:2,backgroundColor:settings.pageColor,useCORS:true,logging:false,ignoreElements:element=>element.hasAttribute('data-toc-update'),onclone:hidePageGuides})}finally{pageNode.style.transform=previousTransform}
   const pdf=new jsPDF({orientation:settings.orientation,unit:'px',format:[dimensions.width,dimensions.height],hotfixes:['px_scaling']})
   const scale=canvas.width/dimensions.width
   const sliceHeight=Math.round(dimensions.height*scale)
   for(let index=0;index<pages;index++){
    if(index)pdf.addPage([dimensions.width,dimensions.height],settings.orientation)
    const part=document.createElement('canvas');part.width=canvas.width;part.height=sliceHeight
    const context=part.getContext('2d');if(!context)throw new Error('Canvas unavailable')
    context.fillStyle=settings.pageColor;context.fillRect(0,0,part.width,part.height)
    const sourceTop=Math.round(index*(dimensions.height+30)*scale)
    const sourceHeight=Math.min(sliceHeight,Math.max(0,canvas.height-sourceTop))
    if(sourceHeight>0)context.drawImage(canvas,0,sourceTop,canvas.width,sourceHeight,0,0,part.width,sourceHeight)
    pdf.addImage(part.toDataURL('image/jpeg',0.95),'JPEG',0,0,dimensions.width,dimensions.height)
   }
   await saveFile(pdf.output('blob'),`${title.replace(/[^\w-]+/g,'-')||'document'}.pdf`)
   setStatus('All changes saved')
  }catch{setStatus('PDF export failed');setInfoDialog({title:'PDF export failed',message:'Could not export PDF. Please try Print and choose Save as PDF.'})}
 }
 const printDocument=async()=>{
  if(Capacitor.getPlatform()==='android'){await exportPdf();return}
  if(!pageRef.current)return
  setMenu(false);setStatus('Preparing print…')
  let printPages:HTMLDivElement|null=null
  let printStyle:HTMLStyleElement|null=null
  try{
   const {default:html2canvas}=await import('html2canvas')
   const pageNode=pageRef.current
   const previousTransform=pageNode.style.transform
   pageNode.style.transform='none'
   let canvas:HTMLCanvasElement
   try{canvas=await html2canvas(pageNode,{scale:2,backgroundColor:settings.pageColor,useCORS:true,logging:false,ignoreElements:element=>element.hasAttribute('data-toc-update'),onclone:hidePageGuides})}finally{pageNode.style.transform=previousTransform}
   printPages=document.createElement('div');printPages.className='myoffice-print-pages'
   const scale=canvas.width/dimensions.width
   for(let index=0;index<pages;index++){
    const sheet=document.createElement('div');sheet.className='myoffice-print-page'
    const image=document.createElement('img');image.alt=`Document page ${index+1}`
    const part=document.createElement('canvas');part.width=Math.round(dimensions.width*scale);part.height=Math.round(dimensions.height*scale)
    const context=part.getContext('2d');if(!context)throw new Error('Canvas unavailable')
    context.fillStyle=settings.pageColor;context.fillRect(0,0,part.width,part.height)
    const sourceTop=Math.round(index*(dimensions.height+30)*scale)
    const sourceHeight=Math.min(part.height,Math.max(0,canvas.height-sourceTop))
    if(sourceHeight>0)context.drawImage(canvas,0,sourceTop,part.width,sourceHeight,0,0,part.width,sourceHeight)
    image.src=part.toDataURL('image/png');sheet.appendChild(image);printPages.appendChild(sheet)
   }
   printStyle=document.createElement('style')
   printStyle.textContent=`.myoffice-print-pages{display:none}@media print{@page{size:${settings.pageSize} ${settings.orientation};margin:0}body>#root{display:none!important}.myoffice-print-pages{display:block!important}.myoffice-print-page{width:${dimensions.width}px;height:${dimensions.height}px;overflow:hidden;break-after:page;page-break-after:always}.myoffice-print-page:last-child{break-after:auto;page-break-after:auto}.myoffice-print-page img{display:block;width:100%;height:100%}}`
   document.body.appendChild(printPages);document.body.appendChild(printStyle)
   await Promise.all([...printPages.querySelectorAll('img')].map(image=>image.decode()))
   const pagesToRemove=printPages,styleToRemove=printStyle
   window.addEventListener('afterprint',()=>{pagesToRemove.remove();styleToRemove.remove()},{once:true})
   setStatus('All changes saved')
   window.print()
  }catch(error){
   console.error('Print failed:',error)
   printPages?.remove();printStyle?.remove();setStatus('Print failed');setInfoDialog({title:'Print failed',message:error instanceof Error?error.message:'Could not prepare the pages for printing.'})
  }
 }
 const exportFile=(kind:'html'|'txt')=>{if(!editor)return;const html=`<!doctype html><meta charset="utf-8"><title>${title.replace(/</g,'&lt;')}</title><style>body{font:16px/1.6 Arial;max-width:800px;margin:50px auto}img{max-width:100%}table{border-collapse:collapse}td,th{border:1px solid #aaa;padding:8px}</style>${editor.getHTML()}`;const blob=new Blob([kind==='html'?html:editor.getText()],{type:kind==='html'?'text/html':'text/plain'});void saveFile(blob,`${title.replace(/[^\w-]+/g,'-')||'document'}.${kind}`).catch(error=>setInfoDialog({title:'Export failed',message:String(error)}));setMenu(false)}
 const addImage=()=>imageFileRef.current?.click()
 const insertImage=async(file:File)=>{
  if(!file.type.startsWith('image/')){setImageError('Choose an image file such as PNG, JPEG, GIF, or WebP.');return}
  try{
   const source=await new Promise<string>((resolve,reject)=>{
    const reader=new FileReader()
    reader.onload=()=>typeof reader.result==='string'?resolve(reader.result):reject(new Error('Could not read image'))
    reader.onerror=()=>reject(reader.error)
    reader.readAsDataURL(file)
   })
   editor?.chain().focus().setImage({src:source,alt:file.name}).run()
   setImageError('')
  }catch{setImageError('Could not open this image. Please choose another file.')}
 }
 const addLink=()=>{
  if(!editor)return
  const {from,to}=editor.state.selection
  linkSelectionRef.current={from,to}
  setLinkText(editor.state.doc.textBetween(from,to))
  setLinkUrl(editor.getAttributes('link').href||'')
  setLinkError('')
  setLinkDialog(true)
 }
 const insertLink=()=>{
  if(!editor)return
  const entered=linkUrl.trim()
  const href=/^(https?:\/\/|mailto:)/i.test(entered)?entered:`https://${entered}`
  try{
   const parsed=new URL(href)
   if(!['http:','https:','mailto:'].includes(parsed.protocol)||(!parsed.hostname&&parsed.protocol!=='mailto:'))throw new Error('invalid')
  }catch{setLinkError('Enter a valid web address, such as example.com.');return}
  const text=linkText.trim()||href
  const {from,to}=linkSelectionRef.current
  if(from<to&&text===editor.state.doc.textBetween(from,to))editor.chain().focus().setTextSelection({from,to}).setLink({href}).run()
  else editor.chain().focus().insertContentAt({from,to},{type:'text',text,marks:[{type:'link',attrs:{href}}]}).run()
  setLinkDialog(false)
  setLinkError('')
 }
 const addTable=()=>editor?.chain().focus().insertTable({rows:3,cols:3,withHeaderRow:true}).run()
 const contentsAt=(pos:number,options:TocOptions)=>{
  if(!editor)return
  const breaks=Array.from(editor.view.dom.querySelectorAll('.rm-page-break'))
  const firstTop=breaks[0]?.getBoundingClientRect().top||editor.view.dom.getBoundingClientRect().top
  const pageSpan=(dimensions.height+30)*zoom/100
  const entries:TocEntry[]=[]
  editor.state.doc.descendants((node,headingPos)=>{
   if(node.type.name!=='heading'||Number(node.attrs.level)>options.depth||!node.textContent.trim())return
   const dom=editor.view.nodeDOM(headingPos)
   const top=dom instanceof Element?dom.getBoundingClientRect().top:firstTop
   const page=Math.max(1,Math.min(Math.max(1,breaks.length),Math.floor((top-firstTop)/pageSpan)+1))
   entries.push({title:node.textContent.trim(),level:Number(node.attrs.level)||1,page})
  })
  if(options.order==='alphabetical')entries.sort((a,b)=>a.title.localeCompare(b.title))
  const node=editor.state.doc.nodeAt(pos)
  if(node?.type.name!=='tableOfContents')return
  editor.view.dispatch(editor.state.tr.setNodeMarkup(pos,undefined,{...node.attrs,options,entries}))
 }
 const insertContents=(options:TocOptions)=>{
  if(!editor)return
  const pos=editor.state.selection.from
  editor.chain().focus().insertContent({type:'tableOfContents',attrs:{options,entries:[]}}).run()
  setTocDialog(null)
  requestAnimationFrame(()=>{let found:number|undefined;editor.state.doc.descendants((node,nodePos)=>{if(node.type.name==='tableOfContents'&&nodePos>=pos&&found===undefined)found=nodePos});if(found!==undefined)contentsAt(found,options)})
 }
 const openContents=()=>{if(!editor)return;const selected=editor.state.selection;const pos=selected instanceof NodeSelection&&selected.node.type.name==='tableOfContents'?selected.from:-1;setTocDialog({pos,options:pos>=0?editor.state.doc.nodeAt(pos)!.attrs.options as TocOptions:defaultTocOptions})}
 const addPageBreak=()=>editor?.chain().focus().insertContent({type:'manualPageBreak'}).run()
 const addBlankPage=()=>{
  if(!editor)return
  const hasFollowingContent=editor.state.selection.to<editor.state.doc.content.size-1
  const content=[{type:'manualPageBreak'},{type:'paragraph'},...(hasFollowingContent?[{type:'manualPageBreak'}]:[])]
  editor.chain().focus().insertContent(content).run()
 }
 const openFootnote=()=>setHeaderFooterDialog('footer')
 const openCaption=()=>{
  if(!editor||!(editor.state.selection instanceof NodeSelection)||editor.state.selection.node.type.name!=='image')return
  captionImagePosRef.current=editor.state.selection.from
  setReferenceDialog('caption')
 }
 const insertReference=(text:string)=>{
  if(!editor||!referenceDialog)return
  const pos=captionImagePosRef.current
  if(pos===null||editor.state.doc.nodeAt(pos)?.type.name!=='image')return
  let count=0;editor.state.doc.descendants(node=>{if(node.type.name==='imageCaption')count++})
  editor.chain().focus().insertContentAt(pos+editor.state.doc.nodeAt(pos)!.nodeSize,{type:'imageCaption',content:[{type:'text',text:`Figure ${count+1}. ${text}`}]}).run()
  setReferenceDialog(null)
 }
 const find=()=>{if(!editor||!query)return;const text=editor.getText();const i=text.toLowerCase().indexOf(query.toLowerCase());if(i>=0)editor.chain().focus().setTextSelection({from:i+1,to:i+query.length+1}).run()}
 const replaceNext=()=>{if(!editor||!query)return;find();const selected=editor.state.doc.textBetween(editor.state.selection.from,editor.state.selection.to);if(selected.toLowerCase()===query.toLowerCase())editor.chain().focus().insertContent(replacement).run()}
 const fontSizes=[8,9,10,11,12,14,15,16,18,20,22,24,28,32,36,48,72]
 const selectedFontSize=Math.round(parseFloat(editor?.getAttributes('textStyle').fontSize||'15'))||15
 const selectedFontFamily=String(editor?.getAttributes('textStyle').fontFamily||'Arial')
 const selectedTextColor=editor?.getAttributes('textStyle').color||'#000000'
 const resizeFont=(direction:1|-1)=>{
  if(!editor)return
  const next=direction===1?fontSizes.find(size=>size>selectedFontSize):[...fontSizes].reverse().find(size=>size<selectedFontSize)
  editor.chain().focus().setFontSize(`${next??(direction===1?72:8)}px`).run()
 }
 const changeCase=(mode:'upper'|'lower'|'sentence'|'toggle'|'title')=>{
  if(!editor)return
  const {doc,selection,schema}=editor.state
  let {from,to}=selection
  if(selection.empty){
   const $from=selection.$from
   const text=$from.parent.textContent
   let start=$from.parentOffset,end=start
   while(start>0&&/[\p{L}\p{N}]/u.test(text[start-1]))start--
   while(end<text.length&&/[\p{L}\p{N}]/u.test(text[end]))end++
   if(start===end){setCaseMenu(null);return}
   from=$from.start()+start;to=$from.start()+end
  }
  let sentenceStart=true,wordStart=true,previousEnd=from
  const edits:{from:number;to:number;text:string;marks:ReturnType<typeof schema.text>['marks']}[]=[]
  doc.nodesBetween(from,to,(node,pos)=>{
   if(!node.isText||!node.text)return
   const start=Math.max(from,pos),end=Math.min(to,pos+node.text.length)
   if(start>=end)return
   if(start>previousEnd){const gap=doc.textBetween(previousEnd,start,'\n');if(gap.includes('\n')){sentenceStart=true;wordStart=true}}
   const original=node.text.slice(start-pos,end-pos)
   let changed=''
   for(const char of original){
    const letter=/\p{L}/u.test(char),number=/\p{N}/u.test(char)
    if(mode==='upper')changed+=char.toUpperCase()
    else if(mode==='lower')changed+=char.toLowerCase()
    else if(mode==='toggle')changed+=letter?(char===char.toUpperCase()?char.toLowerCase():char.toUpperCase()):char
    else if(mode==='sentence')changed+=letter?(sentenceStart?char.toUpperCase():char.toLowerCase()):char
    else changed+=letter?(wordStart?char.toUpperCase():char.toLowerCase()):char
    if(letter||number){sentenceStart=false;wordStart=false}
    if(/[.!?]/u.test(char))sentenceStart=true
    if(!letter&&!number)wordStart=true
   }
   edits.push({from:start,to:end,text:changed,marks:node.marks})
   previousEnd=end
  })
  const tr=editor.state.tr
  for(const edit of edits.reverse())if(edit.text!==doc.textBetween(edit.from,edit.to))tr.replaceWith(edit.from,edit.to,schema.text(edit.text,edit.marks))
  if(tr.docChanged)editor.view.dispatch(tr)
  editor.commands.focus()
  setCaseMenu(null)
 }
 const openParagraphMenu=(kind:'bullet'|'number'|'spacing',event:React.MouseEvent<HTMLButtonElement>)=>{
  const rect=event.currentTarget.getBoundingClientRect()
  paragraphButtonRef.current=event.currentTarget
  setParagraphMenu(current=>current?.kind===kind?null:{kind,left:rect.left,top:rect.bottom})
 }
 const setListStyle=(kind:'bullet'|'number',style:string)=>{
  if(!editor)return
  const name=kind==='bullet'?'bulletList':'orderedList'
  const chain=editor.chain().focus()
  if(!editor.isActive(name)){
   if(kind==='bullet')chain.toggleBulletList()
   else chain.toggleOrderedList()
  }
  chain.updateAttributes(name,{listStyle:style}).run()
  setParagraphMenu(null)
 }
 const applySpacing=(attribute:'lineSpacing'|'spaceBefore'|'spaceAfter',value:string|null)=>{
  if(!editor)return
  const name=editor.isActive('heading')?'heading':'paragraph'
  editor.chain().focus().updateAttributes(name,{[attribute]:value}).run()
  setParagraphMenu(null)
 }
 const spacingAttributes=editor?.getAttributes(editor?.isActive('heading')?'heading':'paragraph')||{}
 const tool=(name:string,icon:React.ReactNode,action:()=>void,active=false)=><button className={'tool '+(active?'active':'')} title={name} aria-label={name} onClick={action}>{icon}</button>
 const showWordCount=()=>{
  const content=editor?.getText()||''
  setInfoDialog({title:'Word count',stats:[{label:'Pages',value:pages},{label:'Words',value:content.trim().split(/\s+/).filter(Boolean).length},{label:'Characters',value:content.length},{label:'Characters without spaces',value:content.replace(/\s/g,'').length}]})
 }
 useEffect(()=>{
  const shortcut=(event:KeyboardEvent)=>{
   if(event.defaultPrevented||event.repeat)return
   const target=event.target instanceof Element?event.target:null
   if(target?.closest('[role="dialog"]'))return
   const inField=Boolean(target?.closest('input,textarea,select'))
   const modifier=event.ctrlKey||event.metaKey
   const key=event.key.toLowerCase()
   const run=(action:()=>void)=>{event.preventDefault();action()}
   if(event.key==='F12'&&!modifier&&!event.altKey){run(saveAs);return}
   if(event.key==='F3'&&event.shiftKey&&!modifier&&!event.altKey){if(!inField)run(()=>changeCase('toggle'));return}
   if(!modifier||event.altKey&&!(event.ctrlKey&&/^[123]$/.test(key)))return
   if(event.ctrlKey&&event.altKey&&/^[123]$/.test(key)){
    if(inField)return
    run(()=>editor?.chain().focus().setHeading({level:Number(key) as 1|2|3}).run());return
   }
   if(event.ctrlKey&&event.altKey&&key==='f'){if(!inField)run(openFootnote);return}
   if(event.altKey)return
   if(event.shiftKey){
    if(key==='s'){run(saveAs);return}
    if(inField)return
    if(key==='n'){run(()=>editor?.chain().focus().setParagraph().run());return}
    if(key==='l'){run(()=>editor?.chain().focus().toggleBulletList().run());return}
    if(event.code==='Period'){run(()=>resizeFont(1));return}
    if(event.code==='Comma'){run(()=>resizeFont(-1));return}
    return
   }
   if(key==='s'){run(save);return}
   if(key==='n'){run(newDocument);return}
   if(key==='o'){run(()=>openFileRef.current?.click());return}
   if(key==='p'){run(()=>void printDocument());return}
   if(key==='f'){run(()=>{setSearch(true);setReplaceOpen(false)});return}
   if(key==='h'){run(()=>{setSearch(true);setReplaceOpen(true)});return}
   if(key==='w'){run(()=>setCloseRequest({kind:'tab',id:activeDocIdRef.current}));return}
   if(inField)return
   if(key==='k'){run(addLink);return}
   if(key==='1'||key==='2'||key==='5'){run(()=>applySpacing('lineSpacing',key==='1'?'1':key==='2'?'2':'1.5'));return}
   if(key==='q'){run(()=>editor?.chain().focus().setParagraph().run());return}
   if(key==='enter'){run(addPageBreak);return}
   if(key==='e'){run(()=>editor?.chain().focus().setTextAlign('center').run());return}
   if(key==='l'){run(()=>editor?.chain().focus().setTextAlign('left').run());return}
   if(key==='r'){run(()=>editor?.chain().focus().setTextAlign('right').run());return}
   if(key==='j'){run(()=>editor?.chain().focus().setTextAlign('justify').run());return}
   if(key===']'){run(()=>editor?.chain().focus().setFontSize(`${Math.min(72,selectedFontSize+1)}px`).run());return}
   if(key==='['){run(()=>editor?.chain().focus().setFontSize(`${Math.max(8,selectedFontSize-1)}px`).run());return}
   if(key===' '){run(()=>editor?.chain().focus().unsetAllMarks().run())}
  }
  window.addEventListener('keydown',shortcut,true)
  return()=>window.removeEventListener('keydown',shortcut,true)
 })
 const large=(name:string,icon:React.ReactNode,action:()=>void,disabled=false)=><button className="large-tool" onClick={action} title={disabled?'Select an image first':name} disabled={disabled}>{icon}<span>{name}</span></button>
 const imageSelected=editor?.state.selection instanceof NodeSelection&&editor.state.selection.node.type.name==='image'
 const pageWidth=settings.pageSize==='Legal'?816:settings.pageSize==='Letter'?816:794
 const pageHeight=settings.pageSize==='Legal'?1344:settings.pageSize==='Letter'?1056:1123
 const dimensions=settings.orientation==='portrait'?{width:pageWidth,height:pageHeight}:{width:pageHeight,height:pageWidth}
 const mobileLayout=Capacitor.getPlatform()==='android'&&mobileWidth<=700
 const mobileFitZoom=Math.max(30,Math.floor((mobileWidth-16)/dimensions.width*100))
 useEffect(()=>{if(!mobileLayout)return;setZoom(mobileFitZoom)},[mobileLayout,mobileFitZoom])
 useEffect(()=>{if(mobileLayout||manualZoom)return;setZoom(Math.max(30,Math.min(140,Math.floor((mobileWidth-100)/dimensions.width*100))))},[mobileLayout,manualZoom,mobileWidth,dimensions.width])
 useEffect(()=>{const onResize=()=>setMobileWidth(window.innerWidth);window.addEventListener('resize',onResize);return()=>window.removeEventListener('resize',onResize)},[])
 const userZoom=(value:number)=>{setManualZoom(true);setZoom(value)}
 const watermark=settings.watermark
 useEffect(()=>{
  if(!editor)return
  const frame=requestAnimationFrame(()=>{
   const content=editor.view.dom
   const contentTop=content.getBoundingClientRect().top
   const pageSpan=dimensions.height+30
   let changed=false
   for(const marker of content.querySelectorAll<HTMLElement>('[data-manual-page-break]')){
    const before=marker.style.height
    marker.style.height='0px'
    const top=(marker.getBoundingClientRect().top-contentTop)/(zoom/100)
    const currentPage=Math.max(0,Math.floor((top-settings.topMargin)/pageSpan))
    marker.style.height=`${Math.max(0,(currentPage+1)*pageSpan+settings.topMargin-top)}px`
    changed ||= before!==marker.style.height
   }
   if(changed)editor.view.dispatch(editor.state.tr.setMeta('manualPageBreakLayout',true))
  })
  return()=>cancelAnimationFrame(frame)
 },[editor,revision,settings,zoom,dimensions.height])
 useEffect(()=>{
  if(!editor)return
  const frame=requestAnimationFrame(()=>{
   const content=editor.view.dom
   const top=content.getBoundingClientRect().top
   const scale=zoom/100
   const byPage:Record<number,string[]>={}
   for(const note of content.querySelectorAll<HTMLElement>('[data-footnote-ref]')){
    const page=Math.max(1,Math.floor((note.getBoundingClientRect().top-top)/scale/(dimensions.height+30))+1)
    const label=`${note.dataset.number}. ${note.dataset.note||''}`
    ;(byPage[page] ||= []).push(label)
   }
   setFootnotePages(current=>JSON.stringify(current)===JSON.stringify(byPage)?current:byPage)
  })
  return()=>cancelAnimationFrame(frame)
 },[editor,revision,pages,settings.pageSize,settings.orientation,zoom,dimensions.height])
 return <div className="app"><style>{`@media print { @page { size: ${settings.pageSize} ${settings.orientation}; margin: ${Math.round(settings.topMargin/3.78)}mm ${Math.round(settings.rightMargin/3.78)}mm ${Math.round(settings.bottomMargin/3.78)}mm ${Math.round(settings.leftMargin/3.78)}mm; } }`}</style><header className="word-titlebar"><div className="quick-access"><button aria-label="Save now" title="Save" onClick={save}><Save size={15}/></button><button aria-label="Undo" title="Undo" onClick={()=>editor?.chain().focus().undo().run()}><Undo2 size={15}/></button><button aria-label="Redo" title="Redo" onClick={()=>editor?.chain().focus().redo().run()}><Redo2 size={15}/></button><span className="quick-divider"/><span className="workspace-brand"><img className="brand-mark" src={myofficeMark} alt=""/> MYOFFICE <em>STUDIO</em></span></div><div className="window-title"><input aria-label="Document title" value={title} onChange={e=>setTitle(e.target.value)}/><span> - Myoffice Word</span></div><div className="title-actions"><span className="title-save-state">{status}</span><button onClick={()=>{save();onOpenPresentation?.()}}>Open Presentation</button><button onClick={()=>exportFile('html')}><Download size={14}/> Share / Export</button></div></header>
 <div className="fixed-ribbon"><nav><div><button ref={fileButtonRef} onClick={()=>setMenu(!menu)}>File</button>{['Home','Insert','Design','Layout','References','Review','View',...(editor?.isActive('table')||tab==='Table'?['Table']:[])].map(t=><button className={tab===t?'selected':''} onClick={()=>{setTab(t);setMenu(false)}} key={t}>{t}</button>)}</div><div><button onClick={()=>setSearch(!search)}><Search size={16}/> Find</button><button onClick={()=>void printDocument()}><Printer size={16}/> Print</button></div></nav>
 <input ref={openFileRef} type="file" accept=".docx,.myoffice,.html,.htm,.txt,application/vnd.openxmlformats-officedocument.wordprocessingml.document" hidden onChange={e=>{const file=e.target.files?.[0];if(file)void openFile(file);e.target.value=''}}/>
 <input ref={imageFileRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml,image/avif" hidden onChange={e=>{const file=e.target.files?.[0];if(file)void insertImage(file);e.target.value=''}}/>
 {menu&&<div className="menu" ref={fileMenuRef}><button onClick={newDocument}><FilePlus2 size={16}/>New document</button><button onClick={()=>{openFileRef.current?.click();setMenu(false)}}><FileText size={16}/>Open document</button><div className="menu-separator"/><button onClick={save}><Save size={16}/>Save</button><button onClick={saveAs}><FileDown size={16}/>Save As DOCX…</button><div className="menu-separator"/><button onClick={saveAs}><Download size={16}/>Export DOCX</button><button onClick={()=>void exportPdf()}><Download size={16}/>Export PDF</button><button onClick={()=>exportFile('html')}><Download size={16}/>Export HTML</button><button onClick={()=>exportFile('txt')}><Download size={16}/>Export text</button><button onClick={()=>downloadDocument(currentDocuments().find(doc=>doc.id===activeDocIdRef.current)!)}><Download size={16}/>Myoffice backup</button><div className="menu-separator"/><button onClick={()=>{setMenu(false);void printDocument()}}><Printer size={16}/>Print</button></div>}
 <div className="ribbon">{tab==='Table'?<section className="table-ribbon"><div className="table-toolbar" aria-label="Table tools"><strong>Table</strong><button onClick={()=>editor.chain().focus().addRowBefore().run()}>Row above</button><button onClick={()=>editor.chain().focus().addRowAfter().run()}>Row below</button><button onClick={()=>editor.chain().focus().deleteRow().run()}>Delete row</button><span/><button onClick={()=>editor.chain().focus().addColumnBefore().run()}>Column left</button><button onClick={()=>editor.chain().focus().addColumnAfter().run()}>Column right</button><button onClick={()=>editor.chain().focus().deleteColumn().run()}>Delete column</button><span/><button onClick={()=>editor.chain().focus().toggleHeaderRow().run()}>Header row</button><button onClick={()=>editor.chain().focus().deleteTable().run()}>Delete table</button></div><label>Table layout</label></section>:tab==='Home'?<><section><div className="row">{tool('Undo',<Undo2/>,()=>editor?.chain().focus().undo().run())}{tool('Redo',<Redo2/>,()=>editor?.chain().focus().redo().run())}</div><label>History</label></section><section className="font"><div className="row"><select aria-label="Font family" className="font-family" onChange={e=>editor?.chain().focus().setFontFamily(e.target.value).run()} value={selectedFontFamily}>{fontsWithCurrent(selectedFontFamily).map(font=><option key={font} value={font} style={{fontFamily:font}}>{font}</option>)}</select><select aria-label="Font size" className="font-size" onChange={e=>editor?.chain().focus().setFontSize(e.target.value+'px').run()} value={selectedFontSize}>{[...new Set([...fontSizes,selectedFontSize])].sort((a,b)=>a-b).map(size=><option key={size} value={size}>{size}</option>)}</select>{tool('Increase font size',<span className="font-size-icon">A<sup>+</sup></span>,()=>resizeFont(1))}{tool('Decrease font size',<span className="font-size-icon smaller">A<sup>−</sup></span>,()=>resizeFont(-1))}<button ref={caseButtonRef} className="case-toggle" aria-label="Change case" title="Change case" aria-expanded={!!caseMenu} onClick={()=>{const rect=caseButtonRef.current?.getBoundingClientRect();setCaseMenu(current=>current?null:{left:rect?.left||0,top:rect?.bottom||0})}}>Aa <span>▾</span></button></div><div className="row">{tool('Bold',<Bold/>,()=>editor?.chain().focus().toggleBold().run(),!!editor?.isActive('bold'))}{tool('Italic',<Italic/>,()=>editor?.chain().focus().toggleItalic().run(),!!editor?.isActive('italic'))}{tool('Underline',<UnderlineIcon/>,()=>editor?.chain().focus().toggleUnderline().run(),!!editor?.isActive('underline'))}{tool('Strikethrough',<Strikethrough/>,()=>editor?.chain().focus().toggleStrike().run(),!!editor?.isActive('strike'))}{tool('Subscript',<span className="script-icon">X₂</span>,()=>editor?.chain().focus().toggleSubscript().run())}{tool('Superscript',<span className="script-icon">X²</span>,()=>editor?.chain().focus().toggleSuperscript().run())}<div className="text-color-control"><button className="text-color-button" type="button" aria-label="Apply current text color" title="Apply current text color" onClick={()=>editor?.chain().focus().setColor(lastTextColor).run()}><span>A</span><i className="text-color-indicator" style={{backgroundColor:selectedTextColor}}/></button><button className="text-color-arrow" type="button" aria-label="More text colors" title="More text colors" aria-haspopup="dialog" onClick={()=>{if(editor){const {from,to}=editor.state.selection;textColorSelectionRef.current={from,to}}setTextColorDialog(true)}}>▾</button></div><div className="highlight-color-control"><button className="highlight-color-button" aria-label="Apply text background color" title="Apply text background color" onClick={()=>editor?.chain().focus().setHighlight({color:lastHighlightColor}).run()}><Highlighter size={17}/><i style={{backgroundColor:editor?.getAttributes('highlight').color||lastHighlightColor}}/></button><button className="highlight-color-arrow" aria-label="More text background colors" title="More text background colors" onClick={()=>{if(editor){const {from,to}=editor.state.selection;highlightSelectionRef.current={from,to}}setHighlightColorDialog(true)}}>▾</button></div></div><label>Font</label></section><section className="paragraph-tools"><div className="row"><div className="split-tool">{tool('Bulleted list',<List/>,()=>editor?.chain().focus().toggleBulletList().run(),!!editor?.isActive('bulletList'))}<button aria-label="Bullet styles" title="Bullet styles" className="tool-arrow" onClick={e=>openParagraphMenu('bullet',e)}>▾</button></div><div className="split-tool">{tool('Numbered list',<ListOrdered/>,()=>editor?.chain().focus().toggleOrderedList().run(),!!editor?.isActive('orderedList'))}<button aria-label="Numbering styles" title="Numbering styles" className="tool-arrow" onClick={e=>openParagraphMenu('number',e)}>▾</button></div>{tool('Checklist',<CheckSquare/>,()=>editor?.chain().focus().toggleTaskList().run(),!!editor?.isActive('taskList'))}{tool('Radio list',<span className="radio-icon">◉</span>,()=>editor?.chain().focus().toggleList('radioList','radioItem').run(),!!editor?.isActive('radioList'))}</div><div className="row">{tool('Align left',<AlignLeft/>,()=>editor?.chain().focus().setTextAlign('left').run(),!spacingAttributes.textAlign||spacingAttributes.textAlign==='left')}{tool('Align center',<AlignCenter/>,()=>editor?.chain().focus().setTextAlign('center').run(),editor?.getAttributes(editor?.isActive('heading')?'heading':'paragraph').textAlign==='center')}{tool('Align right',<AlignRight/>,()=>editor?.chain().focus().setTextAlign('right').run(),editor?.getAttributes(editor?.isActive('heading')?'heading':'paragraph').textAlign==='right')}{tool('Justify',<AlignJustify/>,()=>editor?.chain().focus().setTextAlign('justify').run(),editor?.getAttributes(editor?.isActive('heading')?'heading':'paragraph').textAlign==='justify')}<button className={'spacing-tool '+(spacingAttributes.lineSpacing||spacingAttributes.spaceBefore||spacingAttributes.spaceAfter?'active':'')} aria-label="Paragraph spacing" title="Paragraph spacing" onClick={e=>openParagraphMenu('spacing',e)}><span className="spacing-glyph"><List size={15}/><ArrowUpDown size={13}/></span><span className="spacing-caret">▾</span></button></div><label>Paragraph</label></section><section><div className="row">{tool('Insert link',<Link2/>,addLink)}{tool('Insert table',<Table2/>,addTable)}<button className="tool" aria-label="Table borders" title={editor?.isActive('table')?'Table borders':'Click inside a table to set borders'} disabled={!editor?.isActive('table')} onClick={event=>{const rect=event.currentTarget.getBoundingClientRect();setBorderMenu({left:rect.left,top:rect.bottom+6})}}><Grid3X3/></button>{tool('Insert image',<ImagePlus/>,addImage)}</div><label>Quick insert</label></section><section className="styles-gallery"><div className="styles-row"><button onClick={()=>editor?.chain().focus().setParagraph().run()}><strong>AaBbCcDd</strong><span>Normal</span></button><button onClick={()=>editor?.chain().focus().setHeading({level:1}).setFontSize('38px').run()}><strong>Title</strong><span>Title</span></button><button onClick={()=>editor?.chain().focus().setParagraph().setFontSize('22px').run()}><strong>Subtitle</strong><span>Subtitle</span></button>{([1,2,3,4,5,6] as const).map(level=><button key={level} aria-label={`Heading ${level}`} onClick={()=>editor?.chain().focus().setHeading({level}).run()}><strong>Heading {level}</strong><span>Heading {level}</span></button>)}<button onClick={()=>editor?.chain().focus().toggleBlockquote().run()}><strong>“Quote”</strong><span>Quote</span></button><button onClick={()=>editor?.chain().focus().toggleCodeBlock().run()}><strong>code</strong><span>Code</span></button></div><label>Styles</label></section><section className="editing-tools"><button onClick={()=>setSearch(true)}><Search size={14}/> Find</button><button onClick={()=>{setSearch(true);setReplaceOpen(true)}}><Type size={14}/> Replace</button><label>Editing</label></section></>:tab==='Insert'?<><section className="big-tools">{large('Table',<Table2/>,addTable)}{large('Image',<ImagePlus/>,addImage)}{large('Shapes',<Shapes/>,()=>setShapesDialog(true))}{large('Link',<Link2/>,addLink)}{large('Divider',<Minus/>,()=>editor?.chain().focus().setHorizontalRule().run())}<label>Illustrations</label></section><section className="big-tools">{large('Date',<CalendarDays/>,()=>{if(editor){const {from,to}=editor.state.selection;dateSelectionRef.current={from,to}}setDateDialog(true)})}{large('Symbol',<Type/>,()=>{if(editor){const {from,to}=editor.state.selection;symbolSelectionRef.current={from,to}}setSymbolDialog(true)})}{large('Quote',<Quote/>,()=>editor?.chain().focus().toggleBlockquote().run())}{large('Checklist',<CheckSquare/>,()=>editor?.chain().focus().toggleTaskList().run())}<label>Text</label></section><section className="big-tools">{large('Blank page',<FilePlus2/>,addBlankPage)}{large('Header',<PanelTop/>,()=>setHeaderFooterDialog('header'))}{large('Footer',<PanelBottom/>,()=>setHeaderFooterDialog('footer'))}{large('Page number',<FileText/>,()=>setPageNumberDialog(true))}<label>Page</label></section></>:tab==='Layout'?<><section className="layout-tools"><div className="row">Size <select aria-label="Page size" value={settings.pageSize} onChange={e=>updateSettings({pageSize:e.target.value as Settings['pageSize']})}><option>A4</option><option>Letter</option><option>Legal</option></select></div><div className="row layout-orientation">Orientation <select aria-label="Orientation" value={settings.orientation} onChange={e=>updateSettings({orientation:e.target.value as Settings['orientation']})}><option value="portrait">Portrait</option><option value="landscape">Landscape</option></select></div><label>Page setup</label></section><section className="big-tools layout-column-tools"><button className="large-tool columns-ribbon-button" aria-label="Columns" aria-haspopup="menu" aria-expanded={!!columnsMenu} onClick={e=>{const rect=e.currentTarget.getBoundingClientRect();setColumnsMenu(current=>current?null:{left:rect.left,top:rect.bottom+4})}}><Columns3/><span>Columns ▾</span></button><label>Columns</label></section><section className="layout-tools"><div className="row">Margins <select aria-label="Margins" value={settings.leftMargin===settings.rightMargin&&settings.leftMargin===settings.topMargin&&settings.leftMargin===settings.bottomMargin?settings.leftMargin:'custom'} onChange={e=>{const margin=Number(e.target.value);updateSettings({leftMargin:margin,rightMargin:margin,topMargin:margin,bottomMargin:margin})}}><option value="48">Narrow</option><option value="82">Normal</option><option value="112">Wide</option><option value="custom" disabled>Custom</option></select></div><div className="row"><label className="inline-check"><input type="checkbox" checked={settings.ruler} onChange={e=>updateSettings({ruler:e.target.checked})}/> Show ruler</label></div><label>Margins & view</label></section><section className="big-tools">{large('Page break',<FileDown/>,addPageBreak)}{large('Line break',<ArrowDown/>,()=>editor?.chain().focus().setHardBreak().run())}{large('Clear formatting',<RotateCcw/>,()=>editor?.chain().focus().unsetAllMarks().clearNodes().run())}<label>Breaks</label></section></>:tab==='Design'?<><section className="design-watermark"><button className="watermark-ribbon-button" onClick={()=>setWatermarkDialog(true)}><FileText size={23}/><span>Watermark</span></button><label>Watermark</label></section><section className="design-controls"><div className="row"><button className="page-color-ribbon-button" onClick={()=>setPageColorDialog(true)}><Palette size={16}/> Page color <i style={{background:settings.pageColor}}/></button></div><div className="row"><ScanLine size={16}/><label className="inline-check"><input type="checkbox" checked={settings.pageBorder} onChange={e=>updateSettings({pageBorder:e.target.checked})}/> Page border</label></div><label>Page background</label></section></>:tab==='References'?<><section className="big-tools">{large('Contents',<ListOrdered/>,openContents)}{large('Footnote',<FileText/>,openFootnote)}{large('Caption',<Type/>,openCaption,!imageSelected)}<label>References</label></section></>:tab==='Review'?<><section className="big-tools">{large('Find',<Search/>,()=>setSearch(true))}{large('Replace',<Type/>,()=>{setSearch(true);setReplaceOpen(true)})}{large('Word count',<FileText/>,showWordCount)}{large('Spellcheck',<CheckSquare/>,()=>editor?.commands.focus())}<label>Proofing</label></section></>:tab==='View'?<><section className="big-tools">{!mobileLayout&&large(settings.ruler?'Hide ruler':'Show ruler',<Ruler/>,()=>updateSettings({ruler:!settings.ruler}))}{large('Zoom in',<Plus/>,()=>userZoom(Math.min(160,zoom+10)))}{large('Zoom out',<Minus/>,()=>userZoom(Math.max(30,zoom-10)))}{large('Print view',<Printer/>,()=>void printDocument())}<label>View</label></section></>:null}</div></div>
 {columnsMenu&&<div className="columns-menu" role="menu" aria-label="Column layouts" style={{left:columnsMenu.left,top:columnsMenu.top}}>{([1,2,3,"left","right"] as ColumnPreset[]).map(preset=><button key={preset} role="menuitemradio" aria-checked={settings.columns===preset} onClick={()=>{changeColumns(preset);setColumnsMenu(null)}}><span className={`columns-preview columns-preview-${preset}`} aria-hidden="true"><i/><i/><i/></span><span>{preset===1?"One":preset===2?"Two":preset===3?"Three":preset==="left"?"Left":"Right"}</span></button>)}</div>}{paragraphMenu&&<div className="paragraph-menu" ref={paragraphMenuRef} style={{left:paragraphMenu.left,top:paragraphMenu.top}} role="menu" aria-label={paragraphMenu.kind==='bullet'?'Bullet styles':paragraphMenu.kind==='number'?'Numbering styles':'Paragraph spacing'}>{paragraphMenu.kind==='bullet'?<>{bulletStyles.map(({style,symbol,label})=><button key={style} role="menuitem" data-active={editor?.isActive('bulletList')&&editor?.getAttributes('bulletList').listStyle===style} onClick={()=>setListStyle('bullet',style)}>{symbol}  {label}</button>)}</>:paragraphMenu.kind==='number'?<>{[['decimal','1, 2, 3'],['lower-alpha','a, b, c'],['upper-alpha','A, B, C'],['lower-roman','i, ii, iii'],['upper-roman','I, II, III']].map(([style,label])=><button key={style} role="menuitem" data-active={editor?.isActive('orderedList')&&editor?.getAttributes('orderedList').listStyle===style} onClick={()=>setListStyle('number',style)}>{label}</button>)}</>:<><strong>Line spacing</strong><button role="menuitem" data-active={!spacingAttributes.lineSpacing} onClick={()=>applySpacing('lineSpacing',null)}>Default</button>{[['1','Single'],['1.15','1.15'],['1.5','1.5'],['2','Double']].map(([value,label])=><button key={value} role="menuitem" data-active={spacingAttributes.lineSpacing===value} onClick={()=>applySpacing('lineSpacing',value)}>{label}</button>)}<hr/><button role="menuitem" onClick={()=>applySpacing('spaceBefore',parseFloat(spacingAttributes.spaceBefore||'0')>0?null:'12px')}>{parseFloat(spacingAttributes.spaceBefore||'0')>0?'Remove':'Add'} space before paragraph</button><button role="menuitem" onClick={()=>applySpacing('spaceAfter',parseFloat(spacingAttributes.spaceAfter||'0')>18?null:'30px')}>{parseFloat(spacingAttributes.spaceAfter||'0')>18?'Remove':'Add'} space after paragraph</button></>}</div>}
 {caseMenu&&<div className="case-menu" ref={caseMenuRef} style={{left:caseMenu.left,top:caseMenu.top}} role="menu" aria-label="Change case"><button role="menuitem" onClick={()=>changeCase('sentence')}>Sentence case</button><button role="menuitem" onClick={()=>changeCase('lower')}>lowercase</button><button role="menuitem" onClick={()=>changeCase('upper')}>UPPERCASE</button><button role="menuitem" onClick={()=>changeCase('title')}>Capitalize Each Word</button><button role="menuitem" onClick={()=>changeCase('toggle')}>tOGGLE cASE</button></div>}
 <div className="document-tabs" role="tablist" aria-label="Open documents">{documents.map(doc=><div key={doc.id} className={`document-tab ${doc.id===activeDocId?'active':''}`}><button role="tab" aria-selected={doc.id===activeDocId} onClick={()=>switchDocument(doc)}><FileText size={12}/><span>{doc.title}</span></button><button className="document-tab-close" aria-label={`Close ${doc.title}`} title={`Close ${doc.title}`} onClick={()=>setCloseRequest({kind:'tab',id:doc.id})}>×</button></div>)}<button className="new-document-tab" aria-label="New document" onClick={newDocument}><Plus size={14}/></button></div>
 {search&&<div className="search"><Search size={17}/><input autoFocus placeholder="Find in document" value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==='Enter'&&find()}/>{replaceOpen&&<input placeholder="Replace with" aria-label="Replace with" value={replacement} onChange={e=>setReplacement(e.target.value)}/>}<button onClick={find}>Find next</button>{replaceOpen&&<button onClick={replaceNext}>Replace</button>}<button onClick={()=>{setSearch(false);setReplaceOpen(false)}}>×</button></div>}
 <main><div className="stage" ref={stageRef} style={mobileLayout?{height:(pages*dimensions.height+Math.max(0,pages-1)*30)*zoom/100+36}:undefined}><div className="ruler-holder">{settings.ruler&&!mobileLayout&&<div className="ruler-track" ref={rulerTrackRef} style={{width:dimensions.width*zoom/100}}><div className="ruler-ticks" style={{backgroundSize:`${96*zoom/100}px 100%`}}>{Array.from({length:Math.floor(dimensions.width/96)+1},(_,i)=><span key={i} style={{left:`${i*96*zoom/100}px`}}>{i}</span>)}</div><div className="margin-shade left-shade" style={{width:settings.leftMargin*zoom/100}}/><div className="margin-shade right-shade" style={{width:settings.rightMargin*zoom/100}}/><button className="margin-handle left-handle" style={{left:settings.leftMargin*zoom/100}} aria-label="Drag left margin" title="Drag left margin" onPointerDown={beginMarginDrag('left')} onKeyDown={marginKey('left')}/><button className="margin-handle right-handle" style={{right:settings.rightMargin*zoom/100}} aria-label="Drag right margin" title="Drag right margin" onPointerDown={beginMarginDrag('right')} onKeyDown={marginKey('right')}/></div>}</div><div className="document-stack" style={{width:dimensions.width*zoom/100}}>{settings.ruler&&!mobileLayout&&Array.from({length:pages},(_,pageIndex)=><div className="vertical-ruler" key={pageIndex} style={{top:(pageIndex*(dimensions.height+30))*zoom/100,height:dimensions.height*zoom/100,backgroundSize:`100% ${96*zoom/100}px`}}>{Array.from({length:Math.floor(dimensions.height/96)+1},(_,i)=><span key={i} style={{top:`${i*96*zoom/100}px`}}>{i}</span>)}<div className="vertical-margin top" style={{height:settings.topMargin*zoom/100}}/><div className="vertical-margin bottom" style={{height:settings.bottomMargin*zoom/100}}/><button className="vertical-handle top-handle" style={{top:settings.topMargin*zoom/100}} aria-label="Drag top margin" title="Drag top margin" onPointerDown={beginMarginDrag('top')} onKeyDown={marginKey('top')}/><button className="vertical-handle bottom-handle" style={{bottom:settings.bottomMargin*zoom/100}} aria-label="Drag bottom margin" title="Drag bottom margin" onPointerDown={beginMarginDrag('bottom')} onKeyDown={marginKey('bottom')}/></div>)}<div className="page-wrap" style={{width:dimensions.width*zoom/100,height:(pages*dimensions.height+Math.max(0,pages-1)*30)*zoom/100}}><div ref={pageRef} className={`pagination-surface ${settings.pageBorder?'page-bordered':''} ${settings.pageNumbers.enabled?`page-number-in-${settings.pageNumbers.position} page-number-align-${settings.pageNumbers.alignment}`:''}`} style={{width:dimensions.width,background:settings.pageColor,transform:`scale(${zoom/100})`,transformOrigin:'top left','--sheet-height':`${dimensions.height}px`,'--sheet-gap':'30px','--sheet-color':settings.pageColor} as React.CSSProperties}><EditorContent editor={editor}/>{watermark&&Array.from({length:pages},(_,index)=><div className="page-watermark" key={index} style={{top:index*(dimensions.height+30),height:dimensions.height}} aria-hidden="true">{watermark?.kind==='image'?<img src={watermark.image} alt="" style={{opacity:watermark.opacity,width:`${watermark.scale}%`}}/>:<span style={{color:watermark.color,opacity:watermark.opacity,transform:`rotate(${watermark.angle==='diagonal'?-32:0}deg)`,fontSize:Math.min(64,Math.max(25,850/watermark.text.length))}}>{watermark.text}</span>}</div>)}</div></div></div></div></main>
 <TableControls editor={editor}/>
 {closeRequest&&<div className="close-dialog-backdrop"><div className="close-dialog" role="dialog" aria-modal="true" aria-labelledby="close-dialog-title"><h2 id="close-dialog-title">{closeRequest.kind==='app'?'Close Myoffice?':'Close document?'}</h2><p>{closeRequest.kind==='app'?'Save your open documents in Myoffice before exiting? Choosing Don’t Save discards edits since your last manual save.':`Save a DOCX file for “${documents.find(doc=>doc.id===closeRequest.id)?.title||'this document'}” before closing its tab?`}</p><div className="close-dialog-actions"><button autoFocus onClick={()=>finishClose('cancel')}>Cancel</button><button onClick={()=>finishClose('discard')}>Don’t Save</button><button className="close-dialog-save" onClick={()=>finishClose('save')}>{closeRequest.kind==='app'?'Save and Exit':'Save and Close'}</button></div></div></div>}
 {linkDialog&&<div className="link-dialog-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setLinkDialog(false)}}><form className="link-dialog" role="dialog" aria-modal="true" aria-labelledby="link-dialog-title" onSubmit={e=>{e.preventDefault();insertLink()}}><h2 id="link-dialog-title">Insert link</h2><p>Add a link to your document.</p><label>Text to display<input autoFocus value={linkText} onChange={e=>setLinkText(e.target.value)} placeholder="Link text"/></label><label>Web address<input type="text" value={linkUrl} onChange={e=>{setLinkUrl(e.target.value);setLinkError('')}} placeholder="https://example.com"/></label>{linkError&&<div className="link-error" role="alert">{linkError}</div>}<div className="link-dialog-actions"><button type="button" onClick={()=>setLinkDialog(false)}>Cancel</button><button className="insert-link-button" type="submit">Insert link</button></div></form></div>}
 {pageColorDialog&&<PageColorDialog value={settings.pageColor} onClose={()=>setPageColorDialog(false)} onSave={color=>{updateSettings({pageColor:color});setPageColorDialog(false)}}/>}
 {watermarkDialog&&<WatermarkDialog value={settings.watermark} onClose={()=>setWatermarkDialog(false)} onSave={value=>{updateSettings({watermark:value});setWatermarkDialog(false)}}/>}
 {highlightColorDialog&&<HighlightColorDialog currentColor={editor?.getAttributes('highlight').color||lastHighlightColor} onClose={()=>setHighlightColorDialog(false)} onChoose={color=>{if(editor){const chain=editor.chain().focus().setTextSelection(highlightSelectionRef.current);if(color){chain.setHighlight({color}).run();setLastHighlightColor(color)}else chain.unsetHighlight().run()}setHighlightColorDialog(false)}}/>}
 {textColorDialog&&<TextColorDialog currentColor={editor?.getAttributes('textStyle').color||'#000000'} onClose={()=>setTextColorDialog(false)} onChoose={color=>{if(editor){const chain=editor.chain().focus().setTextSelection(textColorSelectionRef.current);if(color){chain.setColor(color).run();setLastTextColor(color)}else{chain.unsetColor().run();setLastTextColor('#000000')}}setTextColorDialog(false)}}/>}
 {pageNumberDialog&&<PageNumberDialog value={settings.pageNumbers} pageCount={pages} onClose={()=>setPageNumberDialog(false)} onSave={value=>{updateSettings({pageNumbers:value});setPageNumberDialog(false)}}/>}
 {headerFooterDialog&&<HeaderFooterDialog key={headerFooterDialog} kind={headerFooterDialog} value={settings[headerFooterDialog]} onClose={()=>setHeaderFooterDialog(null)} onSave={value=>{updateSettings({[headerFooterDialog]:value});setHeaderFooterDialog(null)}}/>}
 {referenceDialog&&<ReferenceDialog kind={referenceDialog} onClose={()=>setReferenceDialog(null)} onSave={insertReference}/>}
 {tocDialog&&<TableOfContentsDialog initial={tocDialog.pos>=0?tocDialog.options:undefined} onClose={()=>setTocDialog(null)} onSave={value=>{if(tocDialog.pos>=0){contentsAt(tocDialog.pos,value);setTocDialog(null)}else insertContents(value)}}/>}
 {infoDialog&&<InfoDialog content={infoDialog} onClose={()=>setInfoDialog(null)}/>}
 {symbolDialog&&<SymbolDialog onClose={()=>setSymbolDialog(false)} onInsert={value=>{editor?.chain().focus().setTextSelection(symbolSelectionRef.current).insertContent(value).run();setSymbolDialog(false)}}/>}
 {dateDialog&&<DateInsertDialog onClose={()=>setDateDialog(false)} onInsert={value=>{editor?.chain().focus().setTextSelection(dateSelectionRef.current).insertContent(value).run();setDateDialog(false)}}/>}
 {borderMenu&&editor&&<TableBordersMenu editor={editor} left={borderMenu.left} top={borderMenu.top} onClose={()=>setBorderMenu(null)}/>}
 {shapesDialog&&<WordShapesDialog onClose={()=>setShapesDialog(false)} onInsert={(source,name)=>{editor?.chain().focus().insertContent({type:'image',attrs:{src:source,alt:name+' shape',width:260}}).run();setShapesDialog(false)}}/>}
 {cropImage&&<ImageCropDialog image={cropImage} editor={editor} onClose={()=>setCropImage(null)}/>}
 {imageError&&<div className="image-error" role="alert">{imageError}<button aria-label="Dismiss image error" onClick={()=>setImageError('')}>×</button></div>}
 <footer><div><i/> Ready <em/> Page {currentPage} of {pages} <em/> {words} words <em/> {selectionVersion>=0?'English':''}</div><div><button aria-label="Zoom out" onClick={()=>userZoom(Math.max(30,zoom-10))}><Minus size={13}/></button><input aria-label="Zoom" type="range" min={30} max="160" step="10" value={zoom} onChange={e=>userZoom(Number(e.target.value))}/><button aria-label="Zoom in" onClick={()=>userZoom(Math.min(160,zoom+10))}><Plus size={13}/></button><button className="zoom-value" onClick={()=>setZoom(100)} title="Reset zoom">{zoom}%</button></div></footer></div>
}
export default App
