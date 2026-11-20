import type { ReactNode } from "react";
import { getClinics } from "../../lib/clinics";
import { Sidebar } from "./shell";
export const dynamic = "force-dynamic";
export default async function PanelLayout({ children }: { children: ReactNode }) {
  const { clinics, active, user, unavailable } = await getClinics();
  return <div className="workspace"><a href="#main" className="skip-link">Ir al contenido</a><Sidebar clinics={clinics} selected={active?.id ?? ""} email={user.email ?? "Cuenta Google"} /><div className="workspace-body"><main id="main" className="page-content">{unavailable ? <section className="empty-state" role="alert"><h1>No pudimos cargar tus consultorios</h1><p>Comprueba la conexión y que la base de datos esté preparada. Después, vuelve a intentarlo.</p><a className="button primary" href="/panel/consultorios">Volver a intentar</a></section> : children}</main><footer className="workspace-footer">Expedientes y agenda virtual <span>Un espacio para cuidar, juntos.</span></footer></div></div>;
}
