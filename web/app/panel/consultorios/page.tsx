import { getClinics, type Access } from "../../../lib/clinics";
import { requireSession } from "../../../lib/session";
import { changeClinic, claimInvitations } from "../actions";
import { ClinicSettings, NewClinic } from "./forms";
export default async function Consultorios({ searchParams }: { searchParams: Promise<{ logout?: string; setup?: string }> }) {
  const { clinics, active, user, unavailable } = await getClinics();
  if (unavailable) return null;
  let access: Access[] = [], accessError = false;
  if (active) {
    const { supabase } = await requireSession();
    const { data, error } = await supabase.from("clinic_access").select("id,email,user_id,clinic_id").eq("clinic_id", active.id).order("created_at").limit(100);
    access = (data ?? []) as Access[]; accessError = !!error;
  }
  const { logout, setup } = await searchParams;
  return <><div className="page-heading"><div><span className="eyebrow">TU EQUIPO, EN UN MISMO LUGAR</span><h1>Mis consultorios<span className="heading-dot">.</span></h1><p>Organiza tus espacios de trabajo y a las personas que los hacen posibles.</p></div><NewClinic /></div>{logout === "error" && <p role="alert" className="notice error">No se pudo cerrar la sesión. Vuelve a intentarlo.</p>}
    {setup === "error" && <form action={claimInvitations} className="notice error"><p role="alert">No pudimos vincular tus invitaciones pendientes.</p><button className="text-button">Volver a intentar</button></form>}
    <div className="section-label"><h2>Tus espacios <span>{clinics.length.toString().padStart(2, "0")}</span></h2><span>Solo tú y tu equipo tienen acceso</span></div>
    {clinics.length ? <><div className="clinic-grid">{clinics.map((c, index) => <form action={changeClinic} key={c.id} className={`clinic-card ${active?.id === c.id ? "selected" : ""}`}><input type="hidden" name="clinicId" value={c.id} /><div className="card-top"><span className="clinic-icon" aria-hidden="true">⊞</span><span className={c.owner_id === user.id ? "badge" : "badge neutral"}>{c.owner_id === user.id ? "Administrador" : "Integrante"}</span></div><h3>{c.name}</h3><p>Espacio compartido · {String(index + 1).padStart(2, "0")}</p><button className="card-select" aria-pressed={active?.id === c.id} type="submit">{active?.id === c.id ? "Consultorio activo" : "Seleccionar consultorio"}<span aria-hidden="true">{active?.id === c.id ? "✓" : "↗"}</span></button></form>)}</div><div className="details-grid">{active && (accessError ? <div className="notice error" role="alert">No pudimos cargar los integrantes. Actualiza la página para volver a intentarlo.</div> : <ClinicSettings key={active.id} clinic={active} access={access} isOwner={active.owner_id === user.id} />)}<aside className="info-card"><span className="info-icon" aria-hidden="true">◎</span><h3>Un consultorio.<br />Un equipo conectado.</h3><p>Cada espacio tiene sus propios integrantes y datos. Cambiar de consultorio te lleva al contexto de ese equipo.</p><hr /><div className="info-point"><span>01</span><p><strong>Acceso por invitación</strong>Solo las cuentas añadidas pueden entrar a este espacio.</p></div><div className="info-point"><span>02</span><p><strong>Control de integrantes</strong>Al retirar a una persona, pierde acceso en sus siguientes consultas.</p></div><div className="info-point"><span>03</span><p><strong>Datos separados</strong>La información de cada consultorio permanece en su propio espacio.</p></div></aside></div></> : <section className="empty-state"><span className="empty-icon" aria-hidden="true">⊞</span><h2>Tu primer consultorio empieza aquí</h2><p>Crea un espacio para tu equipo o inicia sesión con el correo que recibió acceso a uno existente.</p></section>}
  </>;
}
