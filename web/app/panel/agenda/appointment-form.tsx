"use client";

import {useEffect,useRef,useState} from "react";
import type {FormEvent} from "react";
import type {Summary} from "../../../lib/dental-record";
import {errorMessage,operation,type Booking,type Detail} from "../../../lib/agenda";

type Props = {
  clinic:string; slot:string; detail?:Detail;
  saved:(booking:Booking,slot:string,newPatient:boolean)=>void;
  cancel:()=>void; busy:boolean; setBusy:(value:boolean)=>void;
};
export function AppointmentForm({clinic,slot,detail,saved,cancel,busy,setBusy}:Props) {
  const [name,setName]=useState(detail?.patient.nombre ?? "");
  const [patient,setPatient]=useState<Summary|"new"|null>(detail?.patient ?? null);
  const [phone,setPhone]=useState(detail?.patient.telefono ?? "");
  const [day,setDay]=useState(slot.slice(0,10));
  const [time,setTime]=useState(slot.slice(11));
  const [reason,setReason]=useState(detail?.motivo ?? "");
  const [duration,setDuration]=useState(detail?.duration ?? 30);
  const choices=[15,30,45,60,90,120];
  const [custom,setCustom]=useState(!choices.includes(detail?.duration ?? 30));
  const [orthodontics,setOrthodontics]=useState(detail?.orthodontics ?? false);
  const [work,setWork]=useState(detail?.work ?? false);
  const [error,setError]=useState("");
  const [pages,setPages]=useState<(string|null)[]>([null]);
  const [matches,setMatches]=useState<Summary[]|null>(null);
  const cursor=pages.at(-1);
  const saving=useRef(false);
  const query=name.trim();
  useEffect(()=>{
    if(patient || !name.trim()) return;
    const controller=new AbortController();
    const timer=setTimeout(()=>{
      operation<Summary[]>(clinic,"list",{name:name.trim(),after:cursor},controller.signal)
        .then(rows=>{if(!controller.signal.aborted) setMatches(rows);})
        .catch(e=>{if(!controller.signal.aborted) {setError(errorMessage(e));setMatches([]);}});
    },280);
    return ()=>{clearTimeout(timer);controller.abort();};
  },[clinic,name,patient,cursor]);
  function changeName(value:string) {
    setName(value);setPatient(null);setPhone("");setMatches(null);setPages([null]);setError("");
  }
  async function submit(event:FormEvent) {
    event.preventDefault();
    if(!patient || saving.current) return;
    saving.current=true;setBusy(true);setError("");
    const starts=day+"T"+time;
    try {
      const booking=await operation<Booking>(clinic,detail?"update":"create",{
        ...(detail && {id:detail.id,revision:detail.revision}),duration,orthodontics,work,slot:starts,motivo:reason.trim(),telefono:phone.trim(),
        ...(patient==="new" ? {nombre:name.trim()} : {patientId:patient.id,patientRevision:patient.revision})
      });
      saved(booking,starts,patient==="new");
    } catch(e) {setError(errorMessage(e));}
    finally {saving.current=false;setBusy(false);}
  }
  return <form className="settings-card appointment-form" onSubmit={submit}>
    <h2>{detail?"Editar cita":"Agendar cita"}</h2>
    <fieldset disabled={busy}>
      <label>Nombre del paciente<input required maxLength={160} autoComplete="off" value={name} onChange={e=>changeName(e.target.value)}/></label>
      {!patient && query && <div className="patient-options">
        {matches===null ? <p role="status">Buscando expedientes…</p> : matches.length===0 ? <p>Sin coincidencias en esta página.</p> :
          matches.map(row=><button type="button" className="patient-match" key={row.id} onClick={()=>{
            setPatient(row);setName(row.nombre);setPhone(row.telefono);setError("");
          }}><strong>{row.nombre}</strong><span>{row.telefono}</span></button>)}
        {(pages.length>1 || matches?.length===10) && <div className="record-actions">
          <button type="button" className="text-button" disabled={pages.length===1} onClick={()=>{setMatches(null);setPages(pages.slice(0,-1));}}>Anteriores</button>
          <button type="button" className="text-button" disabled={matches?.length!==10} onClick={()=>{setMatches(null);setPages([...pages,matches![9].id]);}}>Más coincidencias</button>
        </div>}
        <button type="button" className="text-button" onClick={()=>{setPatient("new");setPhone("");setError("");}}>+ Nuevo paciente</button>
      </div>}
      {patient && <p className="field-hint">{patient==="new"?"Se creará un expediente con este nombre y teléfono.":"Expediente vinculado. Si cambias el teléfono, se actualizará también en el expediente."}</p>}
      <label>Teléfono del paciente<input required type="tel" maxLength={120} value={phone} disabled={!patient} onChange={e=>setPhone(e.target.value)}/></label>
      <div className="appointment-datetime">
        <label>Fecha de la cita<input type="date" required min="0001-01-01" max="9999-12-31" value={day} onChange={e=>setDay(e.target.value)}/></label>
        <div><label htmlFor="appointment-time">Hora de inicio</label>
          <input id="appointment-time" type="time" required step={60} value={time} onChange={e=>setTime(e.target.value)}/></div>
      </div>
      <div><label htmlFor="appointment-duration">Duración en minutos</label>
        <select id="appointment-duration" value={custom?"other":duration} onChange={e=>{setCustom(e.target.value==="other");if(e.target.value!=="other") setDuration(Number(e.target.value));}}>
          {choices.map(n=><option key={n} value={n}>{n}</option>)}<option value="other">Otro</option>
        </select></div>
      {custom && <label>Duración personalizada en minutos<input type="number" required min={1} max={1440} step={1} value={duration} onChange={e=>setDuration(Number(e.target.value))}/></label>}
      <label className="appointment-check"><input type="checkbox" checked={orthodontics} onChange={e=>setOrthodontics(e.target.checked)}/>Ortodoncia</label>
      <label className="appointment-check"><input type="checkbox" checked={work} onChange={e=>setWork(e.target.checked)}/>Necesita trabajos</label>
      <label>Motivo de la cita<textarea required maxLength={500} rows={3} value={reason} onChange={e=>setReason(e.target.value)}/></label>
      {error && <p role="alert" className="record-error">{error}</p>}
      <div className="record-actions"><button className="button primary" disabled={!patient || busy}>{busy?"Guardando…":detail?"Guardar cambios":"Guardar cita"}</button>
        <button type="button" className="button secondary" onClick={cancel}>Cancelar</button></div>
    </fieldset>
  </form>;
}
