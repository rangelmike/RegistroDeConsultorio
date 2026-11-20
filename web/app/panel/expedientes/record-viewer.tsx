"use client";

import { useState } from "react";
import { groups, arches, toothFields, paymentTotals, type Field, type RecordData } from "../../../lib/dental-record";
import { displayDate } from "./record-date";
import { OdontogramCanvas } from "./odontogram-canvas";
import type { OdontogramDrawing } from "../../../lib/odontogram";

function Information({fields,values={}}:{fields:Field[];values?:Record<string,string>}) {
  return <dl className="record-information">{fields.map(field=>{const value=(field.type==="date" ? displayDate(values[field.key] ?? "") : values[field.key]) || "";
    return <div key={field.key} className={value?"":"unrecorded"}><dt>{field.label}</dt><dd>{value || "Sin registrar"}</dd></div>;})}</dl>;
}
const money=(value:number)=>value.toLocaleString("es-MX",{style:"currency",currency:"MXN"});
const generalSections = ["Identificación y contacto","Signos vitales","Historia médica","Antecedentes personales o familiares"];

export function RecordViewer({doc,drawing,back,edit}:{doc:RecordData;drawing?:OdontogramDrawing;back:()=>void;edit:()=>void}) {
  const [tab,setTab]=useState("Datos generales");
  const [tooth,setTooth]=useState("11");
  const entries=doc.evolucion ?? [];
  const datedEntries=entries.map((row,i)=>({row,i})).sort((a,b)=>
    (a.row.fecha || "9999-12-31").localeCompare(b.row.fecha || "9999-12-31") || a.i-b.i);
  const cost=entries.reduce((sum,row)=>sum+paymentTotals(row).cost,0);
  const paid=entries.reduce((sum,row)=>sum+paymentTotals(row).advance,0);
  const installments=entries.reduce((sum,row)=>sum+paymentTotals(row).installments,0);
  const visible=groups.filter(group=>generalSections.includes(group.title)===(tab==="Datos generales"));
  return <article className="settings-card record-viewer">
    <div className="section-heading viewer-heading"><div><span className="viewer-kicker">Expediente clínico</span><h2>{doc.nombre}</h2><p>{doc.telefono}</p></div>
      <div className="record-actions"><button className="button secondary" onClick={back}>Volver a la consulta</button><button className="button primary" onClick={edit}>Editar expediente</button></div></div>
    <nav className="record-tabs" aria-label="Información del expediente">{["Datos generales","Datos dentales","Pagos"].map(name=>
      <button key={name} aria-current={tab===name?"page":undefined} onClick={()=>setTab(name)}>{name}</button>)}</nav>
    {tab!=="Pagos" && <div className="viewer-sections">{visible.map(group=><section className="view-section" key={group.title}><h3>{group.title}</h3><Information fields={group.fields} values={doc.campos}/></section>)}</div>}
    {tab==="Datos dentales" && <section className="view-section"><h3>Odontogramas y presupuesto</h3>
      <OdontogramCanvas value={drawing}/>
      {arches.map(arch=><div key={arch.title}><h4>{arch.title}</h4>{arch.rows.map((row,i)=><div className="tooth-row" key={i}>{row.map(n=>
        <button key={n} aria-label={"Pieza "+n} aria-pressed={tooth===n} data-marked={!!doc.odontograma?.[n]} onClick={()=>setTooth(n)}>{n}</button>)}</div>)}</div>)}
      <div className="selected-tooth"><h4>Pieza {tooth}</h4><Information fields={toothFields} values={doc.odontograma?.[tooth]}/></div>
    </section>}
    {tab==="Pagos" && <section className="view-section"><h3>Evolución y estado de cuenta</h3>
      <dl className="account-totals">{[["Costo total",cost],["Anticipos",paid],["Abonos",installments],["Resta total",cost-paid-installments]].map(([label,value])=>
        <div key={label}><dt>{label}</dt><dd>{money(Number(value)/100)}</dd></div>)}</dl>
      {entries.length ? <div className="payments-table"><table><thead><tr>{["Fecha","Tratamiento","Costo total","Anticipo","Resta","Firma"].map(label=><th key={label}>{label}</th>)}</tr></thead>
        <tbody>{datedEntries.map(({row,i})=><tr key={i}><td data-label="Fecha">{displayDate(row.fecha??"")||"Sin registrar"}</td><td data-label="Tratamiento">{row.tratamiento||"Sin registrar"}{!!row.abonos?.length && <div className="payment-installments"><strong>Abonos</strong><ul>{[...row.abonos].sort((a,b)=>a.fecha.localeCompare(b.fecha)).map((abono,j)=><li key={j}>{displayDate(abono.fecha)}: {money(Number(abono.cantidad))}</li>)}</ul></div>}</td>
          <td data-label="Costo total">{money(Number(row.total||0))}</td><td data-label="Anticipo">{money(Number(row.anticipo||0))}</td>
          <td data-label="Resta">{money(paymentTotals(row).balance/100)}</td><td data-label="Firma">{row.firma||"Sin registrar"}</td></tr>)}</tbody></table></div> : <p className="viewer-empty">Aún no hay movimientos registrados.</p>}
    </section>}
  </article>;
}
