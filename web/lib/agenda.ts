import type { Summary } from "./dental-record";



export type Appointment = { id: string; slot: string; nombre: string; motivo: string; duration: number; orthodontics: boolean; work: boolean };

export type Detail = Omit<Appointment,"nombre"> & { patient: Summary; revision: number; edited: string; bookedBy: string };

export type Booking = { id: string; patientId: string };

export const times = Array.from({length:48}, (_, i) => String(Math.floor(i/2)).padStart(2,"0") + (i%2 ? ":30" : ":00"));

export function clinicToday() {

  return new Intl.DateTimeFormat("sv-SE", {timeZone:"America/Mexico_City",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());

}

export function addDays(iso: string, days: number) {

  const date = new Date(iso+"T12:00:00Z");

  date.setUTCDate(date.getUTCDate()+days);

  return date.toISOString().slice(0,10);

}

export function monday(iso: string) {

  return addDays(iso, -((new Date(iso+"T12:00:00Z").getUTCDay()+6)%7));

}

export function dateLabel(iso: string, options: Intl.DateTimeFormatOptions) {

  return new Intl.DateTimeFormat("es-MX",{...options,timeZone:"UTC"}).format(new Date(iso+"T12:00:00Z"));

}

export async function operation<T>(clinic: string, action: string, payload: unknown, signal?: AbortSignal): Promise<T> {

  const path = action==="list" ? "expedientes" : "agenda";

  for (let attempt=0;;attempt++) {

    const response = await fetch("/panel/"+path+"/operacion", {method:"POST", cache:"no-store", signal,

      headers:{"Content-Type":"application/json"},body:JSON.stringify({target:clinic,action,payload})});

    const data = await response.json();

    if (response.ok) return data;

    if (action!=="week" || response.status!==429 || attempt>=3) throw new Error(data.message || "No se pudo cargar la agenda.");

    const seconds = Math.min(60,Math.max(1,Number(response.headers.get("Retry-After")) || 10));

    await new Promise<void>((resolve,reject)=>{

      const timer=setTimeout(()=>{signal?.removeEventListener("abort",abort);resolve();},seconds*1000+100);

      function abort() { clearTimeout(timer); reject(new DOMException("Cancelado","AbortError")); }

      if(signal?.aborted) abort();

      else signal?.addEventListener("abort",abort,{once:true});

    });

  }

}

export const errorMessage = (error: unknown) => error instanceof Error ? error.message : "No se pudo completar la operación.";


export function timeLabel(value: string | number) {
  const minutes=typeof value==="number"?value:Number(value.slice(0,2))*60+Number(value.slice(3,5));
  const hour=Math.floor(minutes/60)%24;
  return String(hour%12 || 12)+":"+String(minutes%60).padStart(2,"0")+(hour<12?"am":"pm");
}
export function editedLabel(value:string) {
  return value.replace(/([0-9]{2})h$/,(_,hour)=>String(Number(hour)%12 || 12)+(Number(hour)<12?"am":"pm"));
}
