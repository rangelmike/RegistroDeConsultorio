"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { batchSize, readRecordFile } from "../../../lib/record-file";
import type { Bundle, RecordData, Summary } from "../../../lib/dental-record";
import { RecordEditor } from "./record-editor";
import { RecordViewer } from "./record-viewer";

type Stored = {document:RecordData;revision:number};
type Counts = {added:number;duplicates:number};
type Download = {url:string;name:string};
type Preview = {file:Bundle;counts:Counts};
const blank = ():RecordData=>({id:crypto.randomUUID(),nombre:"",telefono:""});
const pause = (ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
const errorText = (e:unknown)=>e instanceof Error ? e.message : "No se pudo completar la operación.";

export function RecordsWorkspace({clinic,fromAgenda}:{clinic:string;fromAgenda:boolean}) {
  const [section,setSection]=useState<"consulta"|"crear">("consulta");
  const [editor,setEditor]=useState<Stored|null>(null);
  const [viewing,setViewing]=useState<Stored|null>(null);
  const [search,setSearch]=useState("");
  const [pages,setPages]=useState<(string|null)[]>([null]);
  const after=pages[pages.length-1];
  const [rows,setRows]=useState<Summary[]>([]);
  const [selected,setSelected]=useState<string[]>([]);
  const [refresh,setRefresh]=useState(0);
  const [busy,setBusy]=useState(false);
  const [loading,setLoading]=useState(true);
  const [message,setMessage]=useState("");
  const [error,setError]=useState("");
  const [deleting,setDeleting]=useState<string[]|null>(null);
  const [preview,setPreview]=useState<Preview|null>(null);
  const [downloads,setDownloads]=useState<Download[]>([]);
  const lifetime=useRef<AbortController|null>(null);
  const working=useRef(false);
  useEffect(()=>{
    const controller=new AbortController();
    lifetime.current=controller;
    return ()=>controller.abort();
  },[]);
  useEffect(()=>()=>downloads.forEach(d=>URL.revokeObjectURL(d.url)),[downloads]);
  const api=useCallback(async function request<T>(action:string,payload:unknown,retry=false,signal?:AbortSignal):Promise<T> {
    const activeSignal=signal ?? lifetime.current?.signal;
    for(let attempt=0;;attempt++) {
      activeSignal?.throwIfAborted();
      const res=await fetch("/panel/expedientes/operacion",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({target:clinic,action,payload}),signal:activeSignal,cache:"no-store"});
      const result=await res.json();
      if(res.ok) return result as T;
      if(!retry || res.status!==429 || attempt>=3) throw new Error(result.message || "No se pudo completar la operación.");
      const seconds=Math.min(60,Math.max(1,Number(res.headers.get("Retry-After"))||10));
      setMessage(`Se alcanzó la cuota. Continuando en ${seconds} s…`);
      await pause(seconds*1000+200);
    }
  },[clinic]);
  const agendaTarget=useRef<{id:string;edit:boolean}|null>(null);
  useEffect(()=>{
    if(!fromAgenda) return;
    const controller=new AbortController();
    const key="agenda-expediente-"+clinic;
    const target=sessionStorage.getItem(key);
    if(target) {
      sessionStorage.removeItem(key);
      const [mode,id]=target.split("/");
      agendaTarget.current={id,edit:mode==="edit"};
    }
    const pending=agendaTarget.current;
    if(pending) {
      api<Stored[]>("read",{ids:[pending.id]},false,controller.signal).then(([entry])=>{
        if(controller.signal.aborted) return;
        agendaTarget.current=null;
        if(pending.edit) setEditor(entry); else setViewing(entry);
      }).catch(e=>{if(!controller.signal.aborted) setError(errorText(e));});
    }
    return ()=>controller.abort();
  },[api,clinic,fromAgenda]);
  useEffect(()=>{
    if(section!=="consulta" || editor || viewing) return;
    const controller=new AbortController();
    const timer=setTimeout(()=>{
      api<Summary[]>("list",{name:search.trim(),after},false,controller.signal).then(data=>{
        if(!controller.signal.aborted){setRows(data);setLoading(false);}
      }).catch(e=>{if(!controller.signal.aborted){setError(errorText(e));setRows([]);setLoading(false);}});
    },260);
    return ()=>{clearTimeout(timer);controller.abort();};
  },[api,after,search,refresh,section,editor,viewing]);
  async function perform(task:()=>Promise<void>) {
    if(working.current) return;
    working.current=true;setBusy(true);setError("");setMessage("");
    try { await task(); } catch(e) { if(!lifetime.current?.signal.aborted) setError(errorText(e)); }
    finally {working.current=false;setBusy(false);}
  }
  function restart() {setSelected([]);setPages([null]);setLoading(true);setRefresh(n=>n+1);}
  function switchTo(view:"consulta"|"crear") {
    setViewing(null);
    setSection(view);setEditor(view==="crear"?{document:blank(),revision:0}:null);
    setPreview(null);setDeleting(null);setError("");setMessage("");setDownloads([]);
    if(view==="consulta") restart();
  }
  async function save(document:RecordData) {
    await perform(async()=>{
      const revision=editor?.revision ?? 0;
      await api(revision?"update":"import",{version:1,expedientes:[document],...(revision?{revision}:{})});
      switchTo("consulta");setSearch("");setMessage(revision?"Cambios guardados.":"Expediente creado.");
    });
  }
  function openRecord(id:string,show:(entry:Stored)=>void) {
    void perform(async()=>{
      const [entry]=await api<Stored[]>("read",{ids:[id]});
      setPreview(null);setDeleting(null);show(entry);
    });
  }
  async function selectAll() {
    await perform(async()=>{
      let cursor:string|null=null;
      const ids:string[]=[];
      while(true) {
        const matches:Summary[]=await api("list",{name:search.trim(),after:cursor},true);
        ids.push(...matches.map(r=>r.id));
        if(matches.length<10) break;
        cursor=matches[matches.length-1].id;
      }
      setSelected(ids);setMessage(`${ids.length} expedientes seleccionados.`);
    });
  }
  function exportRecords(ids:string[]) {
    void perform(async()=>{
      const files:Blob[]=[];
      for(let i=0;i<ids.length;i+=batchSize) {
        const data=await api<Stored[]>("read",{ids:ids.slice(i,i+batchSize)},true);
        files.push(new Blob([JSON.stringify({version:1,expedientes:data.map(r=>r.document)})],{type:"application/json"}));
      }
      const ready=files.map((file,i)=>({url:URL.createObjectURL(file),name:files.length===1?"expedientes.json":`expedientes-${i+1}.json`}));
      setDownloads(ready);
      if(ready.length===1) {
        const a=document.createElement("a");a.href=ready[0].url;a.download=ready[0].name;a.click();
      }
      setMessage(files.length===1?"Exportación preparada.":`Descarga los ${files.length} archivos. Cada uno se puede importar por separado.`);
    });
  }
  function remove(ids:string[]) {
    void perform(async()=>{
      let done=0;
      try {
        for(let i=0;i<ids.length;i+=batchSize) {
          const batch=ids.slice(i,i+batchSize);
          await api("delete",{ids:batch},true);
          done+=batch.length;
          setDeleting(ids.slice(done));setSelected(prev=>prev.filter(id=>!batch.includes(id)));
        }
        setDeleting(null);restart();setMessage(`Expedientes eliminados: ${done}.`);
      } catch(e) {
        setLoading(true);setRefresh(n=>n+1);
        throw new Error(`${done} eliminados de ${ids.length}. ${errorText(e)}`);
      }
    });
  }
  function chooseFile(file:File|undefined) {
    setPreview(null);
    if(file) void perform(async()=>{
      const bundle=await readRecordFile(file);
      const counts=await api<Counts>("preview",bundle,true);
      setPreview({file:bundle,counts});setMessage("");
    });
  }
  function importPreview() {
    if(!preview) return;
    void perform(async()=>{
      const result=await api<Counts>("import",preview.file,true);
      const imported=preview.file.expedientes;
      const entry=imported.length===1
        ? (await api<Stored[]>("read",{ids:[imported[0].id]},true))[0]
        : null;
      switchTo("consulta");setSearch("");
      if(entry) setViewing(entry);
      setMessage(`Importación completada. Creados: ${result.added}. Idénticos omitidos: ${result.duplicates}.`);
    });
  }
  const listView=section==="consulta" && !editor && !viewing;
  const blocked=busy || loading;
  return <div className="records-space">
    <nav className="record-tabs" aria-label="Secciones de expedientes">
      <button disabled={busy} aria-current={section==="consulta"?"page":undefined} onClick={()=>switchTo("consulta")}>Consulta y edición</button>
      <button disabled={busy} aria-current={section==="crear"?"page":undefined} onClick={()=>switchTo("crear")}>Crear expediente</button>
    </nav>
    {error && <p role="alert" className="record-error">{error}</p>}
    {message && <p role="status" className="record-message">{message}</p>}
    {listView && <section className="settings-card record-list"><h2>Expedientes registrados</h2>
      <label className="search-record">Buscar por nombre<input type="search" value={search} maxLength={160} disabled={busy} onChange={e=>{setSearch(e.target.value);setError("");setDeleting(null);restart();}}/></label>
      <div className="record-actions">
        <button className="button secondary" disabled={blocked || !rows.length} onClick={selectAll}>Seleccionar todos</button>
        {selected.length>0 && <><button disabled={busy} className="text-button" onClick={()=>{setSelected([]);setDeleting(null);}}>Quitar selección</button>
          <button className="button secondary" disabled={blocked} onClick={()=>exportRecords(selected)}>Exportar selección ({selected.length})</button>
          <button className="text-danger" disabled={blocked} onClick={()=>setDeleting([...selected])}>Eliminar selección ({selected.length})</button></>}
      </div>
      {loading?<p role="status">Buscando expedientes…</p>:rows.length===0?<p>{search?"No hay coincidencias.":"Todavía no hay expedientes en este consultorio."}</p>:
      <ul className="record-rows">{rows.map(row=><li key={row.id}>
        <label className="record-check"><input type="checkbox" checked={selected.includes(row.id)} disabled={busy} aria-label={"Seleccionar "+row.nombre} onChange={e=>{setDeleting(null);setSelected(e.target.checked?[...selected,row.id]:selected.filter(id=>id!==row.id));}}/></label>
        <div className="record-person"><strong>{row.nombre}</strong><span>{row.telefono}</span></div>
        <div className="row-actions"><button className="text-button" disabled={busy} onClick={()=>openRecord(row.id,setViewing)}>Ver expediente</button><button className="text-button" disabled={busy} onClick={()=>openRecord(row.id,setEditor)}>Editar</button>
        <button className="text-button" disabled={busy} onClick={()=>exportRecords([row.id])}>Exportar JSON</button>
        <button className="text-danger" disabled={busy} onClick={()=>setDeleting([row.id])}>Eliminar</button></div>
      </li>)}</ul>}
      <div className="record-actions"><button className="button secondary" disabled={blocked || pages.length===1} onClick={()=>{setLoading(true);setPages(pages.slice(0,-1));}}>Anterior</button>
        <span>Página {pages.length}</span><button className="button secondary" disabled={blocked || rows.length<10} onClick={()=>{setLoading(true);setPages([...pages,rows[rows.length-1].id]);}}>Siguiente</button>
        <button className="text-button" disabled={busy} onClick={()=>{setError("");restart();}}>Actualizar consulta</button></div>
      {deleting && <div className="delete-records" role="group" aria-label="Confirmar eliminación"><strong>¿Eliminar {deleting.length} {deleting.length===1?"expediente":"expedientes"}?</strong>
        <p>Se eliminarán también sus citas, datos clínicos y movimientos. Esta acción es permanente.</p>
        <div className="record-actions"><button disabled={busy} className="button danger" onClick={()=>remove(deleting)}>Confirmar eliminación</button>
        <button className="button secondary" disabled={busy} onClick={()=>setDeleting(null)}>Cancelar eliminación</button></div></div>}
    </section>}
    {downloads.length>0 && <div className="record-downloads">{downloads.map(d=><a className="button secondary" key={d.url} href={d.url} download={d.name}>Descargar {d.name}</a>)}</div>}
    {editor && <RecordEditor key={editor.document.id} initial={editor.document} editing={editor.revision>0} busy={busy} save={save} cancel={()=>switchTo("consulta")}/>}
    {viewing && <RecordViewer doc={viewing.document} back={()=>setViewing(null)} edit={()=>{setEditor(viewing);setViewing(null);}}/>}
    {!viewing && (!editor || section==="crear") && <section className="settings-card record-import"><h2>Importar expedientes</h2>
      <p>Elige un JSON con un expediente o un lote de hasta 50 (2 MiB). Podrás revisar el contenido antes de guardarlo.</p>
      <label>Archivo JSON<input type="file" accept=".json,application/json" disabled={busy} onChange={e=>{chooseFile(e.target.files?.[0]);e.target.value="";}}/></label>
      <details className="json-help"><summary>Formato del archivo</summary>
        <pre>{JSON.stringify({version:1,expedientes:[{nombre:"Paciente de ejemplo",telefono:"5550100000"}]},null,2)}</pre>
        <p>También puedes importar un objeto o una lista. El límite por expediente es de 40 000 bytes. Exporta un expediente para ver sus campos clínicos.</p>
        <p>Si el identificador y el contenido coinciden, se omite el duplicado. Si el contenido difiere, se detiene el lote para que puedas revisarlo.</p>
      </details>
      {preview && <div className="import-preview"><h3>Vista previa</h3><p>Por crear: {preview.counts.added}. Duplicados idénticos: {preview.counts.duplicates}.</p>
        <ul>{preview.file.expedientes.map(row=><li key={row.id}>{row.nombre} · {row.telefono}</li>)}</ul>
        <div className="record-actions"><button className="button primary" disabled={busy} onClick={importPreview}>Confirmar importación</button>
        <button disabled={busy} className="button secondary" onClick={()=>setPreview(null)}>Cancelar importación</button></div></div>}
    </section>}
  </div>;
}
