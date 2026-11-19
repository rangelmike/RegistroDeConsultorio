import { getClinics } from "../../../lib/clinics";
import { RecordsWorkspace } from "./records-workspace";
import "./records.css";

export default async function Expedientes({searchParams}:{searchParams:Promise<{desde?:string}>}) {
  const {active,unavailable}=await getClinics();
  const fromAgenda=(await searchParams).desde==="agenda";
  return <>
    <div className="page-heading"><div><h1>Expedientes<span className="heading-dot">.</span></h1><p>{active?.name}</p></div></div>
    {active ? <RecordsWorkspace key={active.id+String(fromAgenda)} clinic={active.id} fromAgenda={fromAgenda}/> :
      <section className="empty-state"><h2>{unavailable?"No se pudieron cargar tus consultorios":"Selecciona o crea un consultorio"}</h2>
        <a href="/panel/consultorios" className="button secondary">Ir a Consultorios</a></section>}
  </>;
}
