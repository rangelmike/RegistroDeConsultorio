"use client";

import { useState } from "react";
import { groups, arches, toothFields, type Field, type RecordData } from "../../../lib/dental-record";
import { displayDate } from "./record-date";

function Information({fields,values={}}:{fields:Field[];values?:Record<string,string>}) {
  return <dl className="record-information">{fields.map(field=><div key={field.key}><dt>{field.label}</dt>
    <dd>{(field.type==="date" ? displayDate(values[field.key] ?? "") : values[field.key]) || "Sin registrar"}</dd></div>)}</dl>;
}
const money=(value:number)=>value.toLocaleString("es-MX",{style:"currency",currency:"MXN"});
const generalSections = ["Identificación y contacto","Signos vitales","Historia médica","Antecedentes personales o familiares"];

export function RecordViewer({doc,back,edit}:{doc:RecordData;back:()=>void;edit:()=>void}) {
  const [tab,setTab]=useState("Datos generales");
  const [tooth,setTooth]=useState("11");
  const entries=doc.evolucion ?? [];
  const cost=entries.reduce((sum,row)=>sum+Math.round(Number(row.total||0)*100),0);
  const paid=entries.reduce((sum,row)=>sum+Math.round(Number(row.anticipo||0)*100),0);
  const visible=groups.filter(group=>generalSections.includes(group.title)===(tab==="Datos generales"));
  return <article className="settings-card record-viewer">
    <div className="section-heading"><div><h2>{doc.nombre}</h2><p>{doc.telefono}</p></div>
      <div className="record-actions"><button className="button secondary" onClick={back}>Volver a la consulta</button><button className="button primary" onClick={edit}>Editar expediente</button></div></div>
    <nav className="record-tabs" aria-label="Información del expediente">{["Datos generales","Datos dentales","Pagos"].map(name=>
      <button key={name} aria-current={tab===name?"page":undefined} onClick={()=>setTab(name)}>{name}</button>)}</nav>
    {tab!=="Pagos" && visible.map(group=><section className="view-section" key={group.title}><h3>{group.title}</h3><Information fields={group.fields} values={doc.campos}/></section>)}
    {tab==="Datos dentales" && <section className="view-section"><h3>Odontogramas y presupuesto</h3>
      {arches.map(arch=><div key={arch.title}><h4>{arch.title}</h4>{arch.rows.map((row,i)=><div className="tooth-row" key={i}>{row.map(n=>
        <button key={n} aria-label={"Pieza "+n} aria-pressed={tooth===n} data-marked={!!doc.odontograma?.[n]} onClick={()=>setTooth(n)}>{n}</button>)}</div>)}</div>)}
      <h4>Pieza {tooth}</h4><Information fields={toothFields} values={doc.odontograma?.[tooth]}/>
    </section>}
    {tab==="Pagos" && <section className="view-section"><h3>Evolución y estado de cuenta</h3>
      <dl className="account-totals">{[["Costo total",cost],["Anticipos",paid],["Resta total",cost-paid]].map(([label,value])=>
        <div key={label}><dt>{label}</dt><dd>{money(Number(value)/100)}</dd></div>)}</dl>
      {entries.length ? <div className="payments-table"><table><thead><tr>{["Fecha","Tratamiento","Costo total","Anticipo","Resta","Firma"].map(label=><th key={label}>{label}</th>)}</tr></thead>
        <tbody>{entries.map((row,i)=><tr key={i}><td>{displayDate(row.fecha??"")||"Sin registrar"}</td><td>{row.tratamiento||"Sin registrar"}</td>
          <td>{money(Number(row.total||0))}</td><td>{money(Number(row.anticipo||0))}</td>
          <td>{money((Math.round(Number(row.total||0)*100)-Math.round(Number(row.anticipo||0)*100))/100)}</td><td>{row.firma||"Sin registrar"}</td></tr>)}</tbody></table></div> : <p>Aún no hay movimientos registrados.</p>}
    </section>}
  </article>;
}
