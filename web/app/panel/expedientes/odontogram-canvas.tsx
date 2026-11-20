"use client";

import {useRef,useState,type PointerEvent as ReactPointerEvent} from "react";
import {drawingColors,emptyDrawing,fitsDrawing,touchesStroke,templateWidth,templateHeight,
  type OdontogramDrawing,type Point,type Stroke} from "../../../lib/odontogram";
import "./odontogram.css";

type Tool="draw"|"erase"|"pan";
type Gesture={pointer:number; start:Point; original:OdontogramDrawing; stroke?:Stroke; view:[number,number,number,number]};
const defaultView:[number,number,number,number]=[0,0,templateWidth,templateHeight];

export function OdontogramCanvas({value=emptyDrawing(),change,disabled=false}:{value?:OdontogramDrawing;change?:(drawing:OdontogramDrawing)=>void;disabled?:boolean}) {
  const editable=!!change && !disabled;
  const [tool,setTool]=useState<Tool>("draw");
  const [color,setColor]=useState("#dc2626");
  const [width,setWidth]=useState(2);
  const [view,setView]=useState<[number,number,number,number]>(defaultView);
  const [draft,setDraft]=useState<Stroke|null>(null);
  const [history,setHistory]=useState<OdontogramDrawing[]>([]);
  const [error,setError]=useState("");
  const gesture=useRef<Gesture|null>(null);
  const current=useRef(value);

  function position(event:ReactPointerEvent<SVGSVGElement>):Point {
    const matrix=event.currentTarget.getScreenCTM();
    if(!matrix) return [0,0];
    const p=new DOMPoint(event.clientX,event.clientY).matrixTransform(matrix.inverse());
    return [Math.round(p.x*10)/10,Math.round(p.y*10)/10];
  }
  function bounded(point:Point):Point {
    return [Math.max(0,Math.min(templateWidth,point[0])),Math.max(0,Math.min(templateHeight,point[1]))];
  }
  function commit(drawing:OdontogramDrawing,previous:OdontogramDrawing) {
    if(!change || drawing===previous) return;
    if(!fitsDrawing(drawing)) {setError("El dibujo alcanzó su límite. Borra algunos trazos antes de continuar.");return;}
    setHistory(items=>[...items.slice(-19),previous]);
    change(drawing);
    setError("");
  }
  function erase(point:Point) {
    const drawing=current.current;
    const strokes=drawing.strokes.filter(stroke=>!touchesStroke(point,stroke));
    if(strokes.length===drawing.strokes.length) return;
    const next={...drawing,strokes};
    current.current=next;
    change?.(next);
  }
  function down(event:ReactPointerEvent<SVGSVGElement>) {
    if(disabled || gesture.current || event.button!==0) return;
    const point=position(event);
    current.current=value;
    event.currentTarget.setPointerCapture(event.pointerId);
    const stroke=editable && tool==="draw" ? {id:crypto.randomUUID(),color,width,points:[bounded(point)]} : undefined;
    gesture.current={pointer:event.pointerId,start:point,original:value,stroke,view};
    if(stroke) setDraft({...stroke});
    if(editable && tool==="erase") erase(point);
  }
  function move(event:ReactPointerEvent<SVGSVGElement>) {
    const active=gesture.current;
    if(!active || active.pointer!==event.pointerId) return;
    const point=position(event);
    if(!editable || tool==="pan") {
      // Position uses the changing viewBox. Subtract the current view origin to
      // recover a stable coordinate before moving the view.
      const dx=point[0]-view[0]-(active.start[0]-active.view[0]);
      const dy=point[1]-view[1]-(active.start[1]-active.view[1]);
      setView([Math.max(0,Math.min(templateWidth-view[2],active.view[0]-dx)),
        Math.max(0,Math.min(templateHeight-view[3],active.view[1]-dy)),view[2],view[3]]);
    } else if(tool==="erase") erase(point);
    else if(active.stroke) {
      const next=bounded(point);
      const last=active.stroke.points[active.stroke.points.length-1];
      if(Math.hypot(next[0]-last[0],next[1]-last[1])<0.8) return;
      const stroke={...active.stroke,points:[...active.stroke.points,next]};
      if(!fitsDrawing({...value,strokes:[...value.strokes,stroke]})) {
        setError("El dibujo alcanzó su límite. Borra algunos trazos antes de continuar.");return;
      }
      active.stroke=stroke;
      setDraft(stroke);
    }
  }
  function finish(event:ReactPointerEvent<SVGSVGElement>,cancel=false) {
    const active=gesture.current;
    if(!active || active.pointer!==event.pointerId) return;
    gesture.current=null;
    setDraft(null);
    if(cancel) {
      if(editable && tool==="erase") {current.current=active.original;change?.(active.original);}
    } else if(active.stroke) commit({...active.original,strokes:[...active.original.strokes,active.stroke]},active.original);
    else if(editable && tool==="erase" && current.current!==active.original) {
      setHistory(items=>[...items.slice(-19),active.original]);
    }
    if(event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }
  function zoom(factor:number) {
    const nextWidth=Math.max(templateWidth/4,Math.min(templateWidth,view[2]*factor));
    const nextHeight=nextWidth*templateHeight/templateWidth;
    setView([Math.max(0,Math.min(templateWidth-nextWidth,view[0]+(view[2]-nextWidth)/2)),
      Math.max(0,Math.min(templateHeight-nextHeight,view[1]+(view[3]-nextHeight)/2)),nextWidth,nextHeight]);
  }
  const strokes=draft?[...value.strokes,draft]:value.strokes;
  return <div className="odontogram-drawing">
    <div className="odontogram-toolbar" role="group" aria-label="Herramientas del odontograma">
      {change && <>
        <div className="odontogram-tools">{([["draw","Dibujar"],["erase","Borrar trazos"],["pan","Desplazar"]] as const).map(([mode,label])=>
          <button type="button" disabled={disabled} key={mode} aria-pressed={tool===mode} onClick={()=>setTool(mode)}>{label}</button>)}</div>
        <label>Color<select disabled={disabled} value={color} onChange={event=>setColor(event.target.value)}>
          {drawingColors.map(item=><option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        <label>Grosor<select disabled={disabled} value={width} onChange={event=>setWidth(Number(event.target.value))}>
          {[1,2,4,6].map(size=><option key={size} value={size}>{size} px</option>)}</select></label>
        <button type="button" disabled={disabled || !history.length} onClick={()=>{
          const previous=history[history.length-1];change(previous);current.current=previous;
          setHistory(history.slice(0,-1));setError("");
        }}>Deshacer</button>
      </>}
      <div className="odontogram-zoom">
        <button type="button" aria-label="Reducir odontograma" disabled={disabled || view[2]===templateWidth} onClick={()=>zoom(1.5)}>−</button>
        <output aria-label="Ampliación">{Math.round(templateWidth/view[2]*100)} %</output>
        <button type="button" aria-label="Ampliar odontograma" disabled={disabled || view[2]===templateWidth/4} onClick={()=>zoom(1/1.5)}>+</button>
        <button type="button" disabled={disabled} onClick={()=>setView(defaultView)}>Ajustar imagen</button>
      </div>
    </div>
    <p className="odontogram-hint">{change ? "Dibuja sobre las piezas. Para mover la imagen ampliada, elige Desplazar. Los trazos se guardan con el expediente." : "Amplía el odontograma y arrastra para recorrerlo."}</p>
    {error && <p role="alert" className="record-error">{error}</p>}
    <svg className="odontogram-surface" data-tool={editable?tool:"pan"} viewBox={view.join(" ")}
      aria-label={change?"Odontograma para dibujar":"Odontograma anotado"} role="img"
      onPointerDown={down} onPointerMove={move} onPointerUp={event=>finish(event)}
      onPointerCancel={event=>finish(event,true)} onLostPointerCapture={event=>finish(event,true)}>
      <image href="/odontograma-v1.jpg" width={templateWidth} height={templateHeight} pointerEvents="none"/>
      <g fill="none" strokeLinecap="round" strokeLinejoin="round" pointerEvents="none">
        {strokes.map(stroke=>stroke.points.length===1 ?
          <circle data-stroke={stroke.id} key={stroke.id} cx={stroke.points[0][0]} cy={stroke.points[0][1]} r={stroke.width/2} fill={stroke.color}/> :
          <polyline data-stroke={stroke.id} key={stroke.id} points={stroke.points.map(point=>point.join(",")).join(" ")} stroke={stroke.color} strokeWidth={stroke.width}/>)}
      </g>
    </svg>
  </div>;
}
