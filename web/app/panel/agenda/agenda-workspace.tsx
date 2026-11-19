"use client";



import {useEffect,useState} from "react";

import {useRouter} from "next/navigation";

import {addDays,dateLabel,timeLabel,editedLabel,errorMessage,monday,operation,type Booking,type Detail} from "../../../lib/agenda";

import {AppointmentForm} from "./appointment-form";

import {WeeklyCalendar} from "./weekly-calendar";



type View={kind:"week"}|{kind:"detail";id:string}|{kind:"form";slot:string;detail?:Detail};

export function AgendaWorkspace({clinic,today}:{clinic:string;today:string}) {

  const router=useRouter();

  const [week,setWeek]=useState(monday(today));
  const [availability,setAvailability]=useState(false);

  const [view,setView]=useState<View>({kind:"week"});

  const [busy,setBusy]=useState(false);

  const [receipt,setReceipt]=useState<{patientId:string;created:boolean;edited:boolean}|null>(null);

  function navigate(next:View) {setReceipt(null);setView(next);}

  function record(id:string,edit=false) {

    sessionStorage.setItem("agenda-expediente-"+clinic,(edit?"edit/":"view/")+id);

    router.push("/panel/expedientes?desde=agenda");

  }

  function saved(booking:Booking,slot:string,created:boolean) {

    setReceipt({patientId:booking.patientId,created,edited:view.kind==="form" && !!view.detail});

    setWeek(monday(slot.slice(0,10)));setView({kind:"week"});

  }

  const creating=view.kind==="form" && !view.detail;

  return <div className="records-space">

    <nav className="record-tabs" aria-label="Secciones de agenda">

      <button disabled={busy} aria-current={!creating?"page":undefined} onClick={()=>navigate({kind:"week"})}>Agenda semanal</button>

      <button disabled={busy} aria-current={creating?"page":undefined} onClick={()=>navigate({kind:"form",slot:(monday(today)===week && today<addDays(week,5)?today:week)+"T09:30"})}>Agendar cita</button>

    </nav>

    {receipt && <div className="record-message"><span role="status">{receipt.edited?"Cambios guardados.":"Cita agendada."} {receipt.created && "Expediente creado."}</span>

      {receipt.created && <button className="text-button" onClick={()=>record(receipt.patientId,true)}>Completar expediente</button>}</div>}

    {view.kind==="week" && <WeeklyCalendar key={week} clinic={clinic} today={today} week={week} availability={availability} setAvailability={setAvailability}

      changeWeek={day=>{setReceipt(null);setWeek(monday(day));}} book={slot=>navigate({kind:"form",slot})} open={id=>navigate({kind:"detail",id})}/>}

    {view.kind==="form" && <AppointmentForm key={view.detail?.id ?? view.slot} clinic={clinic} slot={view.slot} detail={view.detail}

      saved={saved} busy={busy} setBusy={setBusy} cancel={()=>navigate(view.detail?{kind:"detail",id:view.detail.id}:{kind:"week"})}/>}

    {view.kind==="detail" && <AppointmentDetail clinic={clinic} id={view.id} back={()=>navigate({kind:"week"})}

      edit={detail=>navigate({kind:"form",slot:detail.slot,detail})} record={record}/>}

  </div>;

}

function AppointmentDetail({clinic,id,back,edit,record}:{clinic:string;id:string;back:()=>void;edit:(detail:Detail)=>void;record:(id:string)=>void}) {

  const [detail,setDetail]=useState<Detail|null>(null);

  const [error,setError]=useState("");

  useEffect(()=>{

    const controller=new AbortController();

    operation<Detail>(clinic,"detail",{id},controller.signal).then(result=>{

      if(!controller.signal.aborted) setDetail(result);

    }).catch(e=>{if(!controller.signal.aborted) setError(errorMessage(e));});

    return ()=>controller.abort();

  },[clinic,id]);

  return <section className="settings-card appointment-detail">

    <button className="text-button" onClick={back}>‹ Volver a la semana</button>

    {error?<p role="alert" className="record-error">{error}</p>:!detail?<p role="status">Cargando cita…</p>:<>

      <h2>{detail.patient.nombre}</h2>

      <p>{dateLabel(detail.slot.slice(0,10),{weekday:"long",day:"numeric",month:"long",year:"numeric"})} · {timeLabel(detail.slot.slice(11))}</p>

      <dl><dt>Motivo de la cita</dt><dd>{detail.motivo}</dd><dt>Teléfono del paciente</dt><dd>{detail.patient.telefono}</dd>

        <dt>Agendó</dt><dd>{detail.bookedBy}</dd><dt>Última edición</dt><dd>{editedLabel(detail.edited)}</dd></dl>

      <div className="record-actions"><button className="button primary" onClick={()=>edit(detail)}>Editar cita</button>

        <button className="button secondary" onClick={()=>record(detail.patient.id)}>Ver expediente</button></div>

    </>}

  </section>;

}
