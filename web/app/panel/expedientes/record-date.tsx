"use client";

import { useState } from "react";

export function displayDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value.split("-").reverse().join("/") : value;
}

export function RecordDate({value,change}:{value:string;change:(value:string)=>void}) {
  const [text,setText]=useState(()=>displayDate(value));
  function update(input:HTMLInputElement) {
    const entered=input.value;
    setText(entered);
    const match=/^(\d{2})\/(\d{2})\/(\d{4})$/.exec(entered);
    const iso=match ? [match[3],match[2],match[1]].join("-") : "";
    const date=new Date(iso+"T12:00:00Z");
    const valid=!!match && !isNaN(date.getTime()) && date.toISOString().slice(0,10)===iso;
    input.setCustomValidity(entered && !valid ? "Escribe una fecha válida con formato dd/mm/yyyy." : "");
    if(!entered || valid) change(iso);
  }
  return <span className="date-entry"><input type="text" inputMode="numeric" placeholder="dd/mm/yyyy" maxLength={10} value={text} onChange={e=>update(e.currentTarget)}/>
    <button type="button" className="text-button" onClick={e=>{
      const today=new Date();
      const formatted=[String(today.getDate()).padStart(2,"0"),String(today.getMonth()+1).padStart(2,"0"),today.getFullYear()].join("/");
      const input=e.currentTarget.previousElementSibling as HTMLInputElement;
      input.value=formatted;
      update(input);
    }}>Hoy</button></span>;
}
