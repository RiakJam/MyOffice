import type { Editor } from '@tiptap/react'
import { CellSelection, TableMap } from '@tiptap/pm/tables'

export type BorderPreset='all'|'none'|'outside'|'inside'|'horizontal'|'vertical'
export type BorderSide='top'|'right'|'bottom'|'left'
type Edge=BorderSide
const edges:Edge[]=['top','right','bottom','left']
const opposite:Record<Edge,Edge>={top:'bottom',right:'left',bottom:'top',left:'right'}
const bit=(mask:string,side:Edge)=>mask[edges.indexOf(side)]!=='0'
const setBit=(mask:string,side:Edge,on:boolean)=>{const result=(mask||'1111').split('');result[edges.indexOf(side)]=on?'1':'0';return result.join('')}

export function applyTableBorders(editor:Editor,preset:BorderPreset|BorderSide,scope:'table'|'selection'){
 const {state,view}=editor
 const $from=state.selection.$from
 let depth=$from.depth
 while(depth>0&&$from.node(depth).type.name!=='table')depth--
 if(!depth)return false
 const table=$from.node(depth),tablePos=$from.before(depth),map=TableMap.get(table)
 const cells=[...new Set(map.map)].filter(offset=>offset>=0)
 const selected=new Set<number>()
 if(state.selection instanceof CellSelection)state.selection.forEachCell((_node,pos)=>selected.add(pos-tablePos-1))
 else{let cellDepth=$from.depth;while(cellDepth>depth&&!['tableCell','tableHeader'].includes($from.node(cellDepth).type.name))cellDepth--;if(cellDepth>depth)selected.add($from.before(cellDepth)-tablePos-1)}
 const targets=scope==='table'?cells:cells.filter(offset=>selected.has(offset))
 if(!targets.length)return false
 const next=new Map<number,string>()
 const read=(offset:number)=>next.get(offset)||String(table.nodeAt(offset)?.attrs.borderMask||'1111')
 const write=(offset:number,side:Edge,on:boolean)=>next.set(offset,setBit(read(offset),side,on))
 const neighbors=(offset:number,side:Edge)=>{const rect=map.findCell(offset),found=new Set<number>();if(side==='top'&&rect.top>0)for(let col=rect.left;col<rect.right;col++)found.add(map.map[(rect.top-1)*map.width+col]);if(side==='bottom'&&rect.bottom<map.height)for(let col=rect.left;col<rect.right;col++)found.add(map.map[rect.bottom*map.width+col]);if(side==='left'&&rect.left>0)for(let row=rect.top;row<rect.bottom;row++)found.add(map.map[row*map.width+rect.left-1]);if(side==='right'&&rect.right<map.width)for(let row=rect.top;row<rect.bottom;row++)found.add(map.map[row*map.width+rect.right]);return [...found].filter(other=>other>=0&&other!==offset)}
 if(edges.includes(preset as Edge)){
  const side=preset as Edge,on=!bit(read(targets[0]),side)
  for(const offset of targets){write(offset,side,on);for(const neighbor of neighbors(offset,side))write(neighbor,opposite[side],on)}
 }else{
  const rects=targets.map(offset=>map.findCell(offset))
  const bounds={top:Math.min(...rects.map(rect=>rect.top)),bottom:Math.max(...rects.map(rect=>rect.bottom)),left:Math.min(...rects.map(rect=>rect.left)),right:Math.max(...rects.map(rect=>rect.right))}
  for(const offset of targets){const rect=map.findCell(offset);const visibility:Record<Edge,boolean>={top:true,right:true,bottom:true,left:true};for(const side of edges){const outer=side==='top'?rect.top===bounds.top:side==='bottom'?rect.bottom===bounds.bottom:side==='left'?rect.left===bounds.left:rect.right===bounds.right;visibility[side]=preset==='all'?true:preset==='none'?false:preset==='outside'?outer:preset==='inside'?!outer:preset==='horizontal'?(side==='top'||side==='bottom')&&!outer:(side==='left'||side==='right')&&!outer}next.set(offset,edges.map(side=>visibility[side]?'1':'0').join(''))}
  if(scope==='selection')for(const offset of targets)for(const side of edges)for(const neighbor of neighbors(offset,side))if(!selected.has(neighbor))write(neighbor,opposite[side],bit(read(offset),side))
 }
 const tr=state.tr
 for(const [offset,mask] of next){const pos=tablePos+1+offset,node=tr.doc.nodeAt(pos);if(node&&node.attrs.borderMask!==mask)tr.setNodeMarkup(pos,undefined,{...node.attrs,borderMask:mask})}
 if(tr.docChanged)view.dispatch(tr)
 return true
}
