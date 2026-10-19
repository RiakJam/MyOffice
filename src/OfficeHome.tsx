import myofficeMark from './assets/myoffice-mark.svg'
import { useState } from 'react'
import { FeedbackDialog } from './FeedbackDialog'
import { ArrowRight, FileSpreadsheet, FileText, LayoutTemplate, Presentation, Plus, Sparkles, MessageSquareText } from 'lucide-react'
import './OfficeHome.css'

type Workspace='word'|'spreadsheet'|'presentation'
type Card={id:Workspace;name:string;description:string;icon:typeof FileText;className:string;features:string[]}
const cards:Card[]=[
 {id:'word',name:'Word',description:'Write, format, and share polished documents.',icon:FileText,className:'word',features:['Documents','DOCX','PDF']},
 {id:'spreadsheet',name:'Spreadsheet',description:'Organize numbers and work with tables.',icon:FileSpreadsheet,className:'sheet',features:['Sheets','Formulas','CSV']},
 {id:'presentation',name:'Presentation',description:'Build slides and tell your story clearly.',icon:Presentation,className:'slides',features:['Slides','Images','PPTX']},
]
function recentTitle(key:string,fallback:string){try{const data=JSON.parse(localStorage.getItem(key)||'null');return typeof data?.title==='string'&&data.title.trim()?data.title:fallback}catch{return fallback}}
export default function OfficeHome({open}:{open:(workspace:Workspace)=>void}){
 const [feedbackOpen,setFeedbackOpen]=useState(false)
 const presentation=recentTitle('myoffice-presentation-v1','Untitled presentation')
 const spreadsheet=recentTitle('myoffice-spreadsheet-v1','Untitled spreadsheet')
 let word='Untitled document';try{const data=JSON.parse(localStorage.getItem('myoffice-word-library-v1')||'null');word=data?.documents?.find((doc:{id:string;title:string})=>doc.id===data.activeId)?.title||word}catch{/* no saved document */}
 const recent=[{kind:'word' as Workspace,title:word,icon:FileText},{kind:'spreadsheet' as Workspace,title:spreadsheet,icon:FileSpreadsheet},{kind:'presentation' as Workspace,title:presentation,icon:Presentation}]
 return <div className="office-home"><header className="office-home-bar"><div className="office-home-brand"><img className="office-home-mark" src={myofficeMark} alt=""/><span>MYOFFICE <em>STUDIO</em></span></div><div className="office-home-bar-actions"><span className="office-home-bar-label">Your workspace</span><button className="office-home-feedback-button" onClick={()=>setFeedbackOpen(true)}><MessageSquareText size={16}/> Feedback</button></div></header><main className="office-home-main"><div className="office-home-intro"><div className="office-home-eyebrow"><Sparkles size={15}/> ALL YOUR WORK IN ONE PLACE</div><h1>What would you like to create?</h1><p>Choose a workspace to get started. Your work is saved on this device as you go.</p></div><div className="office-home-cards">{cards.map(card=>{const Icon=card.icon;return <button className={`office-home-card ${card.className}`} key={card.id} onClick={()=>open(card.id)}><span className="office-card-art"><span className="office-card-orbit"/><Icon size={43} strokeWidth={1.6}/></span><span className="office-card-copy"><strong>{card.name}</strong><span>{card.description}</span><span className="office-card-mobile-features">{card.features.map(feature=><small key={feature}>{feature}</small>)}</span></span><span className="office-card-footer"><span>{card.features.map(feature=><small key={feature}>{feature}</small>)}</span><span className="office-card-arrow"><ArrowRight size={19}/></span></span></button>})}</div><section className="office-home-recent"><div><h2>Pick up where you left off</h2><p>Open your last workspace and continue editing.</p></div><div className="office-recent-list">{recent.map(item=>{const Icon=item.icon;return <button key={item.kind} onClick={()=>open(item.kind)}><span className={`office-recent-icon ${item.kind}`}><Icon size={19}/></span><span><strong>{item.title}</strong><small>{item.kind==='word'?'Word document':item.kind==='spreadsheet'?'Spreadsheet':'Presentation'}</small></span><ArrowRight size={16}/></button>})}</div></section></main><footer className="office-home-footer"><span>MYOFFICE STUDIO</span><span><LayoutTemplate size={14}/> Three workspaces. One place to create.</span><span><Plus size={14}/> Start with any app above</span></footer>{feedbackOpen&&<FeedbackDialog onClose={()=>setFeedbackOpen(false)}/>}</div>
}
