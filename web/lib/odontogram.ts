export type Point = [number, number];
export type Stroke = {id:string; color:string; width:number; points:Point[]};
export type OdontogramDrawing = {template:"odontograma-v1"; strokes:Stroke[]};

export const templateWidth=643;
export const templateHeight=511;
export const maxStrokes=500;
export const maxPoints=10000;
export const maxDrawingBytes=256*1024;
export const drawingColors=[
  {value:"#dc2626",label:"Rojo"},
  {value:"#2563eb",label:"Azul"},
  {value:"#111827",label:"Negro"},
  {value:"#75449b",label:"Morado"}
];
export const emptyDrawing=():OdontogramDrawing=>({template:"odontograma-v1",strokes:[]});

export function fitsDrawing(drawing:OdontogramDrawing) {
  return drawing.strokes.length<=maxStrokes &&
    drawing.strokes.reduce((sum,stroke)=>sum+stroke.points.length,0)<=maxPoints &&
    new TextEncoder().encode(JSON.stringify(drawing)).length<=maxDrawingBytes;
}

// Erase an entire stroke when the pointer comes close to any of its segments.
// A segment test also catches strokes whose sampled points are far apart.
export function touchesStroke(point:Point,stroke:Stroke,tolerance=7) {
  const radius=tolerance+stroke.width/2;
  return stroke.points.some((end,index)=>{
    const start=stroke.points[Math.max(0,index-1)];
    const dx=end[0]-start[0],dy=end[1]-start[1];
    const length=dx*dx+dy*dy;
    const t=length ? Math.max(0,Math.min(1,((point[0]-start[0])*dx+(point[1]-start[1])*dy)/length)) : 0;
    return Math.hypot(point[0]-start[0]-t*dx,point[1]-start[1]-t*dy)<=radius;
  });
}
