"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { changeClinic, signOut } from "./actions";
import type { Clinic } from "../../lib/clinics";
const links = [{ href: "/panel/agenda", label: "Agenda", icon: "▦" }, { href: "/panel/expedientes", label: "Expedientes", icon: "▤" }, { href: "/panel/consultorios", label: "Consultorios", icon: "⊞" }];
export function Sidebar({ clinics, selected, email }: { clinics: Clinic[]; selected: string; email: string }) {
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [open,setOpen]=useState(false);
  const toggle=useRef<HTMLButtonElement>(null);
  function close() {setOpen(false);toggle.current?.focus();}
  useEffect(()=>{
    if(!open) return;
    function escape(event:KeyboardEvent) {if(event.key==="Escape") {setOpen(false);toggle.current?.focus();}}
    window.addEventListener("keydown",escape);
    return ()=>window.removeEventListener("keydown",escape);
  },[open]);
  return <>
    <button ref={toggle} type="button" className="sidebar-toggle" aria-controls="workspace-sidebar" aria-expanded={open}
      onClick={()=>setOpen(!open)} aria-label={open?"Ocultar menú":"Mostrar menú"}><span aria-hidden="true">{open?"×":"☰"}</span> Menú</button>
    {open && <button className="sidebar-shade" tabIndex={-1} aria-label="Cerrar menú" onClick={close}/>}
    <aside id="workspace-sidebar" className="sidebar" hidden={!open}>
    <div className="switcher"><label htmlFor="clinic-switch">CONSULTORIO ACTIVO</label>
      <select id="clinic-switch" value={selected} disabled={pending || !clinics.length} onChange={e => { const form = new FormData(); form.set("clinicId", e.target.value); startTransition(async () => { await changeClinic(form); }); }}>
        {!clinics.length && <option value="">Sin consultorio</option>}{clinics.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select><span className="switch-hint" aria-live="polite">{pending ? "Cambiando consultorio…" : "Tu espacio de trabajo compartido"}</span>
    </div>
    <nav aria-label="Navegación principal">{links.map(link => <Link key={link.href} href={link.href} onClick={()=>{if(window.matchMedia("(max-width:760px)").matches) close();}} className={pathname === link.href ? "nav-link active" : "nav-link"} aria-current={pathname === link.href ? "page" : undefined}><span aria-hidden="true">{link.icon}</span>{link.label}</Link>)}</nav>
    <div className="sidebar-bottom"><div className="account"><span className="avatar">{email.slice(0, 1).toUpperCase()}</span><div><strong>Mi cuenta</strong><span title={email}>{email}</span></div></div><form action={signOut}><button className="signout" type="submit">Cerrar sesión <span aria-hidden="true">↗</span></button></form></div>
  </aside></>;
}
