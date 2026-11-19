import { getClinics } from "../../../lib/clinics";
import { clinicToday } from "../../../lib/agenda";
import { AgendaWorkspace } from "./agenda-workspace";
import "../expedientes/records.css";
import "./agenda.css";

export default async function Agenda() {
  const {active}=await getClinics();
  return <>
    <div className="page-heading"><div><h1>Agenda<span className="heading-dot">.</span></h1><p>{active?.name}</p></div></div>
    {active ? <AgendaWorkspace key={active.id} clinic={active.id} today={clinicToday()}/> :
      <section className="empty-state"><h2>Selecciona o crea un consultorio</h2>
        <a href="/panel/consultorios" className="button secondary">Ir a Consultorios</a></section>}
  </>;
}
