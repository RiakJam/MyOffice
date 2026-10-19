import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { ArrowLeft, Minus, Square, X } from 'lucide-react'
import myofficeMark from './assets/myoffice-mark.svg'
import { Capacitor } from '@capacitor/core'
import { App as NativeApp } from '@capacitor/app'
import './index.css'
import './mobile.css'
import App from './App.tsx'
import PresentationApp from './PresentationApp.tsx'
import SpreadsheetApp from './SpreadsheetApp.tsx'
import OfficeHome from './OfficeHome.tsx'
import './OfficeShell.css'

type Workspace='home'|'word'|'spreadsheet'|'presentation'
if (Capacitor.getPlatform() === 'android') document.documentElement.classList.add('myoffice-android')
type DesktopBridge={onCloseRequested:(callback:()=>void)=>()=>void;confirmClose:()=>void;showMenu:(label:string,x:number,y:number)=>void;windowControl:(action:'minimize'|'maximize'|'close')=>void}
function OfficeApp(){
  const [workspace,setWorkspace]=useState<Workspace>('home')
  const desktop=(window as Window&{myofficeDesktop?:DesktopBridge}).myofficeDesktop
  const switchTo=(next:Workspace)=>{sessionStorage.setItem('myoffice-workspace',next);setWorkspace(next)}
  useEffect(()=>{
    if(workspace==='word')return
    const bridge=(window as Window&{myofficeDesktop?:DesktopBridge}).myofficeDesktop
    return bridge?.onCloseRequested(()=>bridge.confirmClose())
  },[workspace])
  useEffect(()=>{
    if(Capacitor.getPlatform()!=='android')return
    let active=true
    let remove:(()=>Promise<void>)|undefined
    void NativeApp.addListener('backButton',()=>{
      if(workspace==='home')void NativeApp.minimizeApp()
      else switchTo('home')
    }).then(listener=>{if(active)remove=()=>listener.remove();else void listener.remove()})
    return()=>{active=false;void remove?.()}
  },[workspace])
  const titleBar=desktop&&<div className="desktop-window-titlebar"><div className="desktop-window-brand"><img src={myofficeMark} alt=""/><span>Myoffice Studio</span></div><div className="desktop-window-controls"><button type="button" aria-label="Minimize window" title="Minimize" onClick={()=>desktop.windowControl('minimize')}><Minus size={15}/></button><button type="button" aria-label="Maximize window" title="Maximize or restore" onClick={()=>desktop.windowControl('maximize')}><Square size={12}/></button><button type="button" aria-label="Close window" title="Close" onClick={()=>desktop.windowControl('close')}><X size={16}/></button></div></div>
  const menu=desktop&&<div className="desktop-menu-bar" role="menubar" aria-label="Desktop menu">{['File','Edit','View','Window'].map(label=><button key={label} type="button" role="menuitem" onClick={event=>{const rect=event.currentTarget.getBoundingClientRect();desktop.showMenu(label,rect.left,rect.bottom)}}>{label}</button>)}</div>
  if(workspace==='home')return <>{titleBar}{menu}<OfficeHome open={switchTo}/></>
  return <>{titleBar}{menu}<div className="office-shell"><button className="office-apps-button" onClick={()=>{if(workspace==='word')(document.querySelector('button[aria-label="Save now"]') as HTMLButtonElement|null)?.click();switchTo('home')}} title="Back to Myoffice app chooser"><ArrowLeft size={13}/> Back to Myoffice</button>{workspace==='word'?<App onOpenPresentation={()=>switchTo('presentation')}/>:workspace==='spreadsheet'?<SpreadsheetApp/>:<PresentationApp onOpenWord={()=>switchTo('word')}/>}</div></>
}

createRoot(document.getElementById('root')!).render(
  <StrictMode><OfficeApp /></StrictMode>,
)
