"use client";

import { useState } from "react";
import { RecordDate } from "./record-date";
import { OdontogramCanvas } from "./odontogram-canvas";
import { emptyDrawing, type OdontogramDrawing } from "../../../lib/odontogram";
import { accountFields, arches, groups, toothFields, paymentTotals, type Installment, type Field, type RecordData } from "../../../lib/dental-record";

type Values = Record<string,string>;
function withValue(values: Values = {}, key: string, value: string) {
  const next = {...values};
  if (value === "") delete next[key]; else next[key] = value;
  return next;
}

function Fields({fields,values={},change,defaultValue}:{fields:Field[];values?:Record<string,unknown>;change:(key:string,value:string)=>void;defaultValue?:string}) {
  return <div className="record-fields">{fields.map(field=>{
    const value=typeof values[field.key]==="string" ? values[field.key] as string : defaultValue ?? "";
    const props = { value, onChange:(e:React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>)=>change(field.key,e.target.value) };
    return <label key={field.key}>{field.label}
      {field.options ? <select {...props}>{!defaultValue && <option value="">Sin registrar</option>}{field.options.map(v=><option key={v}>{v}</option>)}</select> :
        field.type==="date" ? <RecordDate value={value} change={v=>change(field.key,v)}/> :
        field.type==="textarea" ? <textarea {...props} rows={3} maxLength={4000}/> :
        <input {...props} type={field.type==="money"?"number":field.type ?? "text"} min={0} step={field.type==="money"?"0.01":undefined} max={field.type==="number"?9999:undefined} maxLength={4000}/>}
    </label>;
  })}</div>;
}

export function RecordEditor({initial,initialDrawing,editing,busy,save,cancel}:{initial:RecordData;initialDrawing?:OdontogramDrawing;editing:boolean;busy:boolean;save:(record:RecordData,drawing:OdontogramDrawing)=>Promise<void>;cancel:()=>void}) {
  const [doc,setDoc] = useState(initial);
  const [drawing,setDrawing] = useState(initialDrawing ?? emptyDrawing);
  const [tooth,setTooth] = useState("11");
  const entries = doc.evolucion ?? [];
  const [rowKeys,setRowKeys]=useState(()=>entries.map((_,i)=>String(i)));
  const totals = entries.reduce((sum,row)=>{const t=paymentTotals(row);return [sum[0]+t.cost,sum[1]+t.advance,sum[2]+t.installments,sum[3]+t.balance];},[0,0,0,0]);
  function changeInstallments(index:number,abonos:Installment[]) {
    setDoc({...doc,evolucion:entries.map((row,i)=>i===index?{...row,abonos}:row)});
  }
  function saveRecord() {
    const campos = {...doc.campos};
    for (const group of groups) {
      if (group.defaultValue) {
        for (const field of group.fields) campos[field.key] ??= group.defaultValue;
      }
    }
    void save({...doc,nombre:doc.nombre.trim(),telefono:doc.telefono.trim(),campos,
      ...(doc.evolucion ? {evolucion:entries.map(row=>{const updated={...row};delete updated.resta;return updated;})} : {})},drawing);
  }
  function changeTooth(key:string,value:string) {
    const next={...doc.odontograma};
    const entry=withValue(next[tooth],key,value);
    if(Object.keys(entry).length) next[tooth]=entry; else delete next[tooth];
    setDoc({...doc,odontograma:next});
  }
  return <form className="settings-card record-editor" onSubmit={e=>{e.preventDefault();saveRecord();}}>
    <fieldset disabled={busy}>
      <div className="section-heading"><div><h2>{editing?"Editar expediente":"Nuevo expediente"}</h2><p>Solo el nombre y el teléfono son obligatorios.</p></div></div>
      <div className="record-fields identity-fields">
        <label>Nombre del paciente<input required maxLength={160} value={doc.nombre} onChange={e=>setDoc({...doc,nombre:e.target.value})}/></label>
        <label>Teléfono<input required type="tel" maxLength={120} value={doc.telefono} onChange={e=>setDoc({...doc,telefono:e.target.value})}/></label>
      </div>
      {groups.map(group=><details className="clinical-section" key={group.title}><summary>{group.title}</summary>
        <Fields fields={group.fields} values={doc.campos} defaultValue={group.defaultValue} change={(key,v)=>setDoc({...doc,campos:withValue(doc.campos,key,v)})}/>
      </details>)}
      <details className="clinical-section"><summary>Odontogramas y presupuesto por pieza</summary>
        <OdontogramCanvas value={drawing} change={setDrawing} disabled={busy}/>
        {arches.map(arch=><fieldset key={arch.title} className="arch"><legend>{arch.title}</legend>
          {arch.rows.map((row,i)=><div className="tooth-row" key={i}>{row.map(n=><button type="button" key={n} aria-label={"Pieza "+n} aria-pressed={n===tooth} data-marked={!!doc.odontograma?.[n]} onClick={()=>setTooth(n)}>{n}</button>)}</div>)}
        </fieldset>)}
        <h3>Pieza {tooth}</h3><Fields fields={toothFields} values={doc.odontograma?.[tooth]} change={changeTooth}/>
      </details>
      <details className="clinical-section"><summary>Evolución y estado de cuenta</summary>
        {entries.map((row,i)=><fieldset className="account-row" key={rowKeys[i]}><legend>Movimiento {i+1}</legend>
          <Fields fields={accountFields} values={row} change={(key,v)=>setDoc({...doc,evolucion:entries.map((r,j)=>i===j?{...r,[key]:v || undefined}:r)})}/>
          <div className="payment-installments"><h4>Abonos del movimiento {i+1}</h4>
            {(row.abonos ?? []).map((abono,j)=><div className="payment-installment" key={`${j}-${abono.fecha}`}>
              <label>Fecha del abono {j+1}<RecordDate required value={abono.fecha} change={fecha=>changeInstallments(i,row.abonos!.map((a,k)=>k===j?{...a,fecha}:a))}/></label>
              <label>Cantidad del abono {j+1}<input required type="number" min="0.01" step="0.01" max="999999999999.99" value={abono.cantidad} onChange={e=>changeInstallments(i,row.abonos!.map((a,k)=>k===j?{...a,cantidad:e.target.value}:a))}/></label>
              <button type="button" className="text-danger" onClick={()=>changeInstallments(i,row.abonos!.filter((_,k)=>k!==j))}>Quitar abono {j+1}</button>
            </div>)}
            <button type="button" className="button secondary" disabled={(row.abonos?.length ?? 0)>=100} onClick={()=>changeInstallments(i,[...(row.abonos ?? []),{fecha:"",cantidad:""}])}>Añadir abono</button>
          </div>
          <p>Resta: <output>{(paymentTotals(row).balance/100).toLocaleString("es-MX",{minimumFractionDigits:2,maximumFractionDigits:2})}</output></p>
          <button type="button" className="text-danger" onClick={()=>{setDoc({...doc,evolucion:entries.filter((_,j)=>j!==i)});setRowKeys(rowKeys.filter((_,j)=>j!==i));}}>Quitar movimiento {i+1}</button>
        </fieldset>)}
        <button type="button" className="button secondary" disabled={entries.length>=300} onClick={()=>{setDoc({...doc,evolucion:[...entries,{}]});setRowKeys([...rowKeys,crypto.randomUUID()]);}}>Añadir movimiento</button>
        {entries.length>0 && <dl className="account-totals">{["Costo total","Anticipos","Abonos","Resta total"].map((label,i)=><div key={label}><dt>{label}</dt><dd>{(totals[i]/100).toLocaleString("es-MX",{minimumFractionDigits:2,maximumFractionDigits:2})}</dd></div>)}</dl>}
      </details>
      <div className="record-actions"><button className="button primary">{editing?"Guardar cambios":"Crear expediente"}</button>
        <button type="button" className="button secondary" onClick={cancel}>Cancelar</button></div>
    </fieldset>
  </form>;
}
