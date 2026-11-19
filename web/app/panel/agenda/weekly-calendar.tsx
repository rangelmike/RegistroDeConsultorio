"use client";



import {useEffect,useState} from "react";

import {addDays,dateLabel,timeLabel,errorMessage,operation,type Appointment} from "../../../lib/agenda";



type Props={clinic:string;week:string;today:string;changeWeek:(date:string)=>void;book:(slot:string)=>void;open:(id:string)=>void;availability:boolean;setAvailability:(value:boolean)=>void};

export function WeeklyCalendar({clinic,week,today,changeWeek,book,open,availability,setAvailability}:Props) {

  const [items,setItems]=useState<Appointment[]|null>(null);

  const [error,setError]=useState("");

  const [retry,setRetry]=useState(0);

  const [allHours,setAllHours]=useState(false);

  const [selectedDay,setSelectedDay]=useState(today>=week && today<addDays(week,5)?today:week);

  useEffect(()=>{

    const controller=new AbortController();

    async function load() {

      const result:Appointment[]=[];

      let after:string|null=null;

      let afterId:string|null=null;

      for(;;) {

        const page:Appointment[]=await operation(clinic,"week",{week,after,afterId},controller.signal);

        result.push(...page);

        if(page.length<25) break;

        after=page[page.length-1].slot;afterId=page[page.length-1].id;

      }

      if(!controller.signal.aborted) setItems(result.filter(item=>item.slot.slice(0,10)<addDays(week,5)));

    }

    load().catch(e=>{if(!controller.signal.aborted) setError(errorMessage(e));});

    return ()=>controller.abort();

  },[clinic,week,retry]);

  const days=Array.from({length:5},(_,i)=>addDays(week,i));

  const minutes=(slot:string)=>Number(slot.slice(11,13))*60+Number(slot.slice(14,16));

  const start=allHours?0:Math.min(570,...(items ?? []).map(item=>Math.floor(minutes(item.slot)/30)*30));

  const end=allHours?Math.max(1440,...(items ?? []).map(item=>minutes(item.slot)+item.duration)):

    Math.max(1200,...(items ?? []).map(item=>Math.ceil((minutes(item.slot)+item.duration)/30)*30));

  const rows=Array.from({length:Math.ceil((end-start)/30)},(_,i)=>start+i*30);

  const isoTime=(minute:number)=>String(Math.floor(minute/60)%24).padStart(2,"0")+":"+String(minute%60).padStart(2,"0");

  return <section className="settings-card week-card">

    <div className="week-toolbar"><div>

      <h2>{dateLabel(week,{day:"numeric",month:"short",...(week.slice(0,4)!==days[4].slice(0,4) && {year:"numeric"})})} – {dateLabel(days[4],{day:"numeric",month:"short",year:"numeric"})}</h2>

      <p>Ciudad de México · Horario habitual 9:30am–3:00pm y 4:00pm–8:00pm</p>

    </div><div className="week-controls">

      <button className="button secondary" aria-label="Semana anterior" onClick={()=>changeWeek(addDays(week,-7))}>‹</button>

      <button className="button secondary" onClick={()=>changeWeek(today)}>Esta semana</button>

      <button className="button secondary" aria-label="Semana siguiente" onClick={()=>changeWeek(addDays(week,7))}>›</button>

    </div></div>

    {error ? <div role="alert" className="record-error">{error} <button className="text-button" onClick={()=>{setError("");setRetry(n=>n+1);}}>Reintentar</button></div> :

    items===null ? <p role="status">Cargando semana…</p> : <>

      <div className="calendar-views" aria-label="Vista de agenda">
        <button className="button secondary" aria-pressed={!availability} onClick={()=>setAvailability(false)}>Calendario</button>
        <button className="button secondary" aria-pressed={availability} onClick={()=>setAvailability(true)}>Horarios disponibles</button>
      </div>
      {availability ? <Availability items={items} days={days} book={book}/> : <>
      <div className="week-caption"><p>{items.length===0?"Semana sin citas":items.length===1?"1 cita agendada":items.length+" citas agendadas"}</p>

        <button className="text-button" aria-pressed={allHours} onClick={()=>setAllHours(!allHours)}>{allHours?"Ver horario habitual":"Ver las 24 horas"}</button></div>

      <div className="mobile-days" aria-label="Día de la semana">{days.map(day=><button key={day} aria-pressed={selectedDay===day} onClick={()=>setSelectedDay(day)}>{dateLabel(day,{weekday:"short",day:"numeric"})}</button>)}</div>
      <div className="calendar-scroll"  tabIndex={0} role="region" aria-label="Calendario semanal">

        <div className="duration-calendar">

          <div className="calendar-corner">Hora</div>

          {days.map(day=><div className="calendar-day-heading" data-selected={day===selectedDay} key={day} aria-current={day===today?"date":undefined}>

            {dateLabel(day,{weekday:"short",day:"numeric"})}</div>)}

          <div className="calendar-hours" style={{height:rows.length*60}}>{rows.map(minute=>

            <span key={minute} style={{top:(minute-start)*2}}>{timeLabel(minute)}</span>)}</div>

          {days.map(day=>{

            const bookings=(items ?? []).filter(item=>item.slot.slice(0,10)===day);

            const lanes:number[]=[];

            const placements=bookings.map(item=>{

              const begins=minutes(item.slot);

              let lane=lanes.findIndex(end=>end<=begins);

              if(lane===-1) lane=lanes.length;

              lanes[lane]=begins+item.duration;

              return {item,lane,begins};

            });

            const count=Math.max(1,lanes.length);

            return <div className="calendar-day" data-selected={day===selectedDay} key={day} style={{height:rows.length*60,minWidth:count*95}}>

              {rows.filter(minute=>allHours || minute<900 || minute>=960).map(minute=><button key={minute} className="calendar-empty" style={{top:(minute-start)*2,height:60}}

                aria-label={"Agendar el "+day+" a las "+timeLabel(minute)} onClick={()=>book(day+"T"+isoTime(minute))}><span aria-hidden="true">+</span></button>)}

              {!allHours && <div className="calendar-break" style={{top:(900-start)*2,height:120}}>Receso</div>}
              {placements.map(({item,lane,begins})=><button key={item.id} className={"calendar-booking"+(item.work?" needs-work":"")}

                style={{top:(begins-start)*2,height:item.duration*2,left:(lane/count*100)+"%",width:(100/count)+"%"}}

                onClick={()=>open(item.id)} title={item.nombre+" · "+item.duration+" min"}>

                <strong>{item.nombre}</strong><span>{item.motivo}</span>{item.orthodontics && <span className="orthodontics">Ortodoncia</span>}

              </button>)}

            </div>;

          })}

        </div>

      </div>

    </>}
    </>}

  </section>;

}

function Availability({items,days,book}:{items:Appointment[];days:string[];book:(slot:string)=>void}) {
  const label=(minute:number)=>String(Math.floor(minute/60)).padStart(2,"0")+":"+String(minute%60).padStart(2,"0");
  return <section className="availability" aria-label="Horarios disponibles de la semana">
    <p>Horarios de inicio para citas de 30 minutos. Selecciona un intervalo para agendar a la primera hora disponible.</p>
    <div className="availability-days">{days.map(day=>{
      const dayStart=new Date(day+"T00:00:00Z").getTime();
      const occupied=items.map(item=>{
        const start=(new Date(item.slot+"Z").getTime()-dayStart)/60000;
        return {start,end:start+item.duration};
      }).filter(item=>item.end>0 && item.start<1440).sort((a,b)=>a.start-b.start);
      const gaps:{start:number;end:number}[]=[];
      for(const [start,end] of [[570,900],[960,1200]]) {
        let cursor=start;
        for(const item of occupied) {
          if(item.end<=cursor || item.start>=end) continue;
          if(item.start>cursor) gaps.push({start:cursor,end:item.start});
          cursor=Math.min(end,Math.max(cursor,item.end));
        }
        if(cursor<end) gaps.push({start:cursor,end});
      }
      return <section className="availability-day" key={day}>
        <h3>{dateLabel(day,{weekday:"long",day:"numeric",month:"short"})}</h3>
        {gaps.filter(gap=>gap.end-gap.start>=30).length===0?<p>Sin espacios libres</p>:<ul>{gaps.filter(gap=>gap.end-gap.start>=30).map(gap=><li key={gap.start}>
          <button className="button secondary" onClick={()=>book(day+"T"+label(gap.start))}>
            <span>{timeLabel(gap.start)}{gap.end-gap.start>30 && <>–{timeLabel(gap.end-30)}</>}</span>
          </button></li>)}</ul>}
      </section>;
    })}</div>
  </section>;
}
