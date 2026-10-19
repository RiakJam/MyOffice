import type { CSSProperties } from 'react'

export const presentationShapes = [
 {id:'rect',name:'Rectangle',group:'Basic',path:'M 4 4 H 96 V 96 H 4 Z'},
 {id:'roundRect',name:'Rounded rectangle',group:'Basic',path:'M 18 4 H 82 Q 96 4 96 18 V 82 Q 96 96 82 96 H 18 Q 4 96 4 82 V 18 Q 4 4 18 4 Z'},
 {id:'ellipse',name:'Oval',group:'Basic',path:'M 50 4 A 46 46 0 1 1 50 96 A 46 46 0 1 1 50 4 Z'},
 {id:'triangle',name:'Triangle',group:'Basic',path:'M 50 4 L 96 96 H 4 Z'},
 {id:'rtTriangle',name:'Right triangle',group:'Basic',path:'M 4 4 L 96 96 H 4 Z'},
 {id:'diamond',name:'Diamond',group:'Basic',path:'M 50 4 L 96 50 L 50 96 L 4 50 Z'},
 {id:'pentagon',name:'Pentagon',group:'Basic',path:'M 50 4 L 96 38 L 78 96 H 22 L 4 38 Z'},
 {id:'hexagon',name:'Hexagon',group:'Basic',path:'M 25 4 H 75 L 96 50 L 75 96 H 25 L 4 50 Z'},
 {id:'octagon',name:'Octagon',group:'Basic',path:'M 30 4 H 70 L 96 30 V 70 L 70 96 H 30 L 4 70 V 30 Z'},
 {id:'parallelogram',name:'Parallelogram',group:'Basic',path:'M 25 4 H 96 L 75 96 H 4 Z'},
 {id:'trapezoid',name:'Trapezoid',group:'Basic',path:'M 25 4 H 75 L 96 96 H 4 Z'},
 {id:'star5',name:'Star',group:'Stars',path:'M 50 3 L 61 36 L 96 36 L 68 57 L 79 92 L 50 72 L 21 92 L 32 57 L 4 36 L 39 36 Z'},
 {id:'star4',name:'Four point star',group:'Stars',path:'M 50 4 L 61 39 L 96 50 L 61 61 L 50 96 L 39 61 L 4 50 L 39 39 Z'},
 {id:'heart',name:'Heart',group:'Stars',path:'M 50 91 C 33 76 4 53 4 30 C 4 8 33 2 50 26 C 67 2 96 8 96 30 C 96 53 67 76 50 91 Z'},
 {id:'sun',name:'Sun',group:'Stars',path:'M 50 3 L 58 24 L 76 8 L 76 32 L 96 25 L 84 45 L 97 57 L 75 60 L 78 83 L 59 70 L 50 96 L 41 70 L 22 83 L 25 60 L 3 57 L 16 45 L 4 25 L 24 32 L 24 8 L 42 24 Z'},
 {id:'rightArrow',name:'Right arrow',group:'Arrows',path:'M 4 28 H 58 V 6 L 96 50 L 58 94 V 72 H 4 Z'},
 {id:'leftArrow',name:'Left arrow',group:'Arrows',path:'M 96 28 H 42 V 6 L 4 50 L 42 94 V 72 H 96 Z'},
 {id:'upArrow',name:'Up arrow',group:'Arrows',path:'M 28 96 V 42 H 6 L 50 4 L 94 42 H 72 V 96 Z'},
 {id:'downArrow',name:'Down arrow',group:'Arrows',path:'M 28 4 V 58 H 6 L 50 96 L 94 58 H 72 V 4 Z'},
 {id:'leftRightArrow',name:'Double arrow',group:'Arrows',path:'M 4 50 L 28 14 V 35 H 72 V 14 L 96 50 L 72 86 V 65 H 28 V 86 Z'},
 {id:'chevron',name:'Chevron',group:'Arrows',path:'M 4 4 H 64 L 96 50 L 64 96 H 4 L 36 50 Z'},
 {id:'plus',name:'Plus',group:'Symbols',path:'M 38 4 H 62 V 38 H 96 V 62 H 62 V 96 H 38 V 62 H 4 V 38 H 38 Z'},
 {id:'lightningBolt',name:'Lightning',group:'Symbols',path:'M 54 4 L 20 55 H 45 L 36 96 L 82 38 H 56 L 70 4 Z'},
 {id:'cloud',name:'Cloud',group:'Symbols',path:'M 24 77 C 6 77 1 55 14 46 C 13 29 30 20 43 29 C 54 9 82 15 85 39 C 106 45 100 77 79 77 Z'},
 {id:'donut',name:'Ring',group:'Symbols',path:'M 50 4 A 46 46 0 1 1 50 96 A 46 46 0 1 1 50 4 Z M 50 30 A 20 20 0 1 0 50 70 A 20 20 0 1 0 50 30 Z'},
 {id:'line',name:'Line',group:'Lines',path:'M 5 50 L 95 50'},
 {id:'flowChartDocument',name:'Document',group:'Flowchart',path:'M 4 4 H 96 V 80 Q 73 60 50 80 Q 27 100 4 80 Z'},
 {id:'flowChartTerminator',name:'Terminator',group:'Flowchart',path:'M 28 4 H 72 A 22 22 0 0 1 94 26 V 74 A 22 22 0 0 1 72 96 H 28 A 22 22 0 0 1 6 74 V 26 A 22 22 0 0 1 28 4 Z'},
] as const

export type PresentationShapeId = (typeof presentationShapes)[number]['id']

export function ShapeGraphic({shape='rect',fill='#70d9cf',stroke='#217a78',strokeWidth=1,style}:{shape?:PresentationShapeId;fill?:string;stroke?:string;strokeWidth?:number;style?:CSSProperties}){
 const entry=presentationShapes.find(candidate=>candidate.id===shape)||presentationShapes[0]
 const line=entry.id==='line'
 return <svg className="presentation-shape-graphic" viewBox="0 0 100 100" preserveAspectRatio="none" style={style} aria-hidden="true"><path d={entry.path} fill={line?'none':fill} fillRule={entry.id==='donut'?'evenodd':undefined} stroke={stroke} strokeWidth={line?Math.max(2,strokeWidth*2):strokeWidth} strokeLinejoin="round" strokeLinecap="round"/></svg>
}
